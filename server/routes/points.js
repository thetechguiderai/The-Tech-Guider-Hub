'use strict';

const express = require('express');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { DatabaseSync } = require('node:sqlite');
const { db, now } = require('../db');
const { audit, decryptSecret, encryptSecret, getCookies, lookupSession, ipHash, rateLimit } = require('../security');

const router = express.Router();
const ownerRouter = express.Router();

// ----------------------- user identity (AI accounts) -------------------------
// Coins belong to the AI account system: the site's tg_session cookie is a
// JWT signed with the shared SESSION_SECRET. We verify it locally (jsonwebtoken
// is already a dependency), and enrich the display name/email by reading the
// AI database when it is a local SQLite file. No trust in client claims.
const JWT_SECRET = process.env.SESSION_SECRET || '';
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const AI_DB_PATH =
  process.env.DATABASE_PATH ||
  (IS_SERVERLESS
    ? require('node:os').tmpdir() + path.join('', 'tech-guider.db')
    : path.join(__dirname, '..', '..', 'ai', 'Server', 'tech-guider.db'));

let aiDb = null;
function readAiUser(sub) {
  try {
    if (!aiDb) aiDb = new DatabaseSync(AI_DB_PATH);
    return aiDb.prepare('SELECT id, email, name FROM users WHERE id = ?').get(sub) || null;
  } catch {
    return null;
  }
}

function userFromToken(req) {
  if (!JWT_SECRET) return null;
  const raw = String(req.headers.cookie || '');
  const m = raw.match(/(?:^|;\s*)tg_session=([^;]+)/);
  if (!m) return null;
  let payload;
  try {
    payload = jwt.verify(decodeURIComponent(m[1]), JWT_SECRET);
  } catch {
    return null;
  }
  const sub = String(payload?.sub || '');
  if (!sub) return null;
  const u = readAiUser(sub);
  return {
    id: sub,
    email: (u && u.email) || '',
    name: (u && u.name) || '',
  };
}

function requireUser(req, res, next) {
  const user = userFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Coins tab karne ke liye AI workspace mein sign in karein.', needsAuth: true });
  }
  req.pointsUser = user;
  next();
}

function dayShift(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

// Base daily check-in reward + growing streak bonus (caps at day 7).
const BASE_REWARD = 10;
const STREAK_BONUS = 2;
const STREAK_CAP = 7;

function rewardFor(streak) {
  return BASE_REWARD + Math.min(streak, STREAK_CAP) * STREAK_BONUS;
}

function getPoints(userId) {
  return db.prepare('SELECT * FROM user_points WHERE user_id = ?').get(userId) || null;
}

// ---------------------------------- me ---------------------------------------
router.get('/me', requireUser, (req, res) => {
  const user = req.pointsUser;
  const row = getPoints(user.id);
  const today = new Date().toISOString().slice(0, 10);
  const requests = db.prepare(
    `SELECT id, source, title, cost, status, note, created_at, decided_at, delivered_code_enc
     FROM coin_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`
  ).all(user.id).map((r) => {
    const out = { id: r.id, source: r.source, title: r.title, cost: r.cost, status: r.status, note: r.note, createdAt: r.created_at, decidedAt: r.decided_at };
    if (r.status === 'approved' && r.source === 'reward' && r.delivered_code_enc) {
      try { out.code = decryptSecret(r.delivered_code_enc); } catch { out.code = null; }
    }
    return out;
  });
  res.json({
    signedIn: true,
    user: { id: user.id, email: user.email || null, name: user.name || null },
    points: row ? row.points : 0,
    totalEarned: row ? row.total_earned : 0,
    streak: row ? row.streak : 0,
    checkedInToday: !!row && row.last_checkin === today,
    requests,
  });
});

// -------------------------------- check-in -----------------------------------
router.post('/checkin', rateLimit, requireUser, (req, res) => {
  const user = req.pointsUser;
  const today = new Date().toISOString().slice(0, 10);
  const row = getPoints(user.id);
  if (row && row.last_checkin === today) {
    return res.status(409).json({ error: 'Aaj ka check-in already ho chuka hai — kal phir aayein!', points: row.points, streak: row.streak, checkedInToday: true });
  }
  const streak = row && row.last_checkin === dayShift(-1) ? (row.streak || 0) + 1 : 1;
  const earned = rewardFor(streak);
  const points = (row ? row.points : 0) + earned;
  const totalEarned = (row ? row.total_earned : 0) + earned;
  db.prepare(
    `INSERT INTO user_points (user_id, email, name, points, total_earned, streak, last_checkin, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       email = excluded.email, name = excluded.name, points = excluded.points,
       total_earned = excluded.total_earned, streak = excluded.streak,
       last_checkin = excluded.last_checkin, updated_at = excluded.updated_at`
  ).run(user.id, user.email, user.name, points, totalEarned, streak, today, now());
  res.json({ ok: true, earned, points, streak, checkedInToday: true });
});

// --------------------------------- redeem ------------------------------------
router.post('/redeem', rateLimit, requireUser, (req, res) => {
  const user = req.pointsUser;
  const body = req.body || {};
  const source = body.source === 'reward' ? 'reward' : 'shop';
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid item.' });

  let item = null;
  let cost = 0;
  let title = '';
  if (source === 'shop') {
    item = db.prepare("SELECT id, title, coin_cost, availability, link_url FROM shop_items WHERE id = ?").get(id);
    if (!item) return res.status(404).json({ error: 'Shop item not found.' });
    if (item.availability !== 'available') return res.status(400).json({ error: 'Ye item abhi available nahi hai.' });
    cost = item.coin_cost || 0;
    title = item.title;
  } else {
    item = db.prepare("SELECT id, label AS title, coin_cost, availability FROM reward_codes WHERE id = ?").get(id);
    if (!item) return res.status(404).json({ error: 'Reward not found.' });
    if (!['available', 'limited'].includes(item.availability)) return res.status(400).json({ error: 'Ye reward abhi available nahi hai.' });
    cost = item.coin_cost || 0;
    title = item.title;
  }
  if (cost <= 0) return res.status(400).json({ error: 'Ye item coins se redeem nahi hota (owner ne coin cost set nahi ki).' });

  const row = getPoints(user.id);
  const balance = row ? row.points : 0;
  if (balance < cost) {
    return res.status(400).json({ error: `Coins kam hain — ${cost} chahiye, aap ke paas ${balance} hain. Roz check-in karein!`, points: balance });
  }

  const info = db.prepare(
    `INSERT INTO coin_requests (user_id, email, source, source_id, title, cost, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`
  ).run(user.id, user.email, source, id, title, cost);
  db.prepare('UPDATE user_points SET points = points - ?, updated_at = ? WHERE user_id = ?').run(cost, now(), user.id);

  res.status(201).json({
    ok: true,
    requestId: info.lastInsertRowid,
    title,
    cost,
    points: balance - cost,
    message: 'Redeem request ban gayi — approval ke baad deliver ho jayega.',
  });
});

// ----------------------------- owner: requests -------------------------------
function ownerRequire(req, res, next) {
  const cookies = getCookies(req);
  const session = lookupSession(cookies.tgss);
  if (!session) return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  req.ownerSession = session;
  next();
}

ownerRouter.get('/requests', ownerRequire, (req, res) => {
  const rows = db.prepare(
    `SELECT * FROM coin_requests ORDER BY
       CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC LIMIT 200`
  ).all();
  res.json({ requests: rows });
});

ownerRouter.post('/:id/decide', ownerRequire, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM coin_requests WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Request not found.' });
  if (row.status !== 'pending') return res.status(400).json({ error: 'Ye request pehle decide ho chuki hai.' });

  const b = req.body || {};
  const action = b.action === 'approve' ? 'approve' : b.action === 'reject' ? 'reject' : null;
  if (!action) return res.status(400).json({ error: 'action must be approve or reject' });
  const note = String(b.note || '').slice(0, 300);

  let delivered = '';
  if (action === 'approve' && row.source === 'reward' && row.source_id) {
    const r = db.prepare('SELECT id, label, code_encrypted FROM reward_codes WHERE id = ?').get(row.source_id);
    if (r && r.code_encrypted) {
      try {
        const code = decryptSecret(r.code_encrypted);
        if (code) delivered = encryptSecret(code);
      } catch { /* delivered stays empty: owner delivers via Discord */ }
    }
  }

  if (action === 'reject') {
    // Honest refund: the coins come back to the user.
    const bal = getPoints(row.user_id);
    if (bal) {
      db.prepare('UPDATE user_points SET points = points + ?, updated_at = ? WHERE user_id = ?').run(row.cost, now(), row.user_id);
    }
  }

  db.prepare(
    `UPDATE coin_requests SET status = ?, note = ?, delivered_code_enc = ?, decided_at = ?
     WHERE id = ?`
  ).run(action === 'approve' ? 'approved' : 'rejected', note, delivered, now(), id);

  audit('coin_request_' + action, {
    target: `coin:${id}`,
    result: 'success',
    detail: `${row.title} (${row.cost} coins) for ${row.email || row.user_id}`,
    ip: ownerId(req),
  });
  res.json({ ok: true, status: action === 'approve' ? 'approved' : 'rejected' });
});

function ownerId(req) {
  return req.ip || 'unknown';
}

module.exports = { userRouter: router, ownerRouter };
