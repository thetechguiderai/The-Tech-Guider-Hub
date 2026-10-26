'use strict';

const express = require('express');
const path = require('node:path');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { DatabaseSync } = require('node:sqlite');
const { db, now } = require('../db');
const { audit, decryptSecret, encryptSecret, getCookies, lookupSession, ipHash, rateLimit } = require('../security');

const router = express.Router();
const ownerRouter = express.Router();

// ----------------- The Guider Currency (TTG) — missions only ----------------
// TTG is earned ONLY through missions (today: the Daily Check-in mission).
// It can never be bought, and it is used exclusively to DISCOUNT the price of
// paid shop items — cash buyers pay the normal price, TTG holders pay less.

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
    return res.status(401).json({ error: 'Guider Currency (TTG) ke liye AI workspace mein sign in karein.', needsAuth: true });
  }
  req.pointsUser = user;
  next();
}

function dayShift(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

// Daily Mission reward schedule (owner-set):
// Din 1 → 10, din 2 → 12, din 3 → 15, din 4 → 18, din 5 → 20,
// us ke baad har din flat 5 TTG.
const REWARD_BY_DAY = { 1: 10, 2: 12, 3: 15, 4: 18, 5: 20 };
const FLAT_AFTER_DAY_5 = 5;

function rewardFor(streak) {
  const day = Math.max(1, streak || 1);
  return day <= 5 ? (REWARD_BY_DAY[day] ?? FLAT_AFTER_DAY_5) : FLAT_AFTER_DAY_5;
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
    `SELECT id, source, title, cost, discount_percent, status, note, created_at, decided_at, delivered_code_enc
     FROM coin_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`
  ).all(user.id).map((r) => {
    const out = { id: r.id, source: r.source, title: r.title, cost: r.cost, discountPercent: r.discount_percent, status: r.status, note: r.note, createdAt: r.created_at, decidedAt: r.decided_at };
    if (r.status === 'approved' && r.delivered_code_enc) {
      try { out.code = decryptSecret(r.delivered_code_enc); } catch { out.code = null; }
    }
    return out;
  });
  res.json({
    signedIn: true,
    currency: 'TTG',
    currencyName: 'Guider Currency',
    user: { id: user.id, email: user.email || null, name: user.name || null },
    points: row ? row.points : 0,
    totalEarned: row ? row.total_earned : 0,
    streak: row ? row.streak : 0,
    checkedInToday: !!row && row.last_checkin === today,
    requests,
  });
});

// ----------------------------- daily mission ---------------------------------
router.post('/checkin', rateLimit, requireUser, (req, res) => {
  const user = req.pointsUser;
  const today = new Date().toISOString().slice(0, 10);
  const row = getPoints(user.id);
  if (row && row.last_checkin === today) {
    return res.status(409).json({ error: 'Aaj ka Daily Mission complete ho chuka hai — kal naya mission aayega!', points: row.points, streak: row.streak, checkedInToday: true });
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
  res.json({ ok: true, earned, points, streak, checkedInToday: true, currency: 'TTG', mission: 'Daily Check-in' });
});

// ------------------------ redeem: TTG price discount -------------------------
router.post('/redeem', rateLimit, requireUser, (req, res) => {
  const user = req.pointsUser;
  const body = req.body || {};
  const source = body.source === 'reward' ? 'reward' : 'shop';
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid item.' });

  // TTG sirf paid shop items ki price kam karne ke liye hota hai.
  if (source === 'reward') {
    return res.status(400).json({ error: 'TTG sirf shop items par discount deta hai — rewards free giveaway process se milte hain.' });
  }

  const item = db.prepare(
    "SELECT id, title, coin_cost, discount_percent, availability, price FROM shop_items WHERE id = ?"
  ).get(id);
  if (!item) return res.status(404).json({ error: 'Shop item not found.' });
  if (item.availability !== 'available') return res.status(400).json({ error: 'Ye item abhi available nahi hai.' });

  const cost = item.coin_cost || 0;
  const discountPercent = item.discount_percent || 0;
  if (cost <= 0 || discountPercent <= 0) {
    return res.status(400).json({ error: 'Is item par TTG discount available nahi (owner ne set nahi ki).' });
  }
  if (discountPercent > 90) return res.status(400).json({ error: 'Discount too high.' });

  const row = getPoints(user.id);
  const balance = row ? row.points : 0;
  if (balance < cost) {
    return res.status(400).json({ error: `TTG kam hain — ${cost} chahiye, aap ke paas ${balance} hain. Roz mission complete karein!`, points: balance });
  }

  // Conditional deduct first (single atomic UPDATE, works on both SQLite and
  // Turso). Two rapid clicks can never spend the same TTG twice.
  const deduction = db.prepare(
    'UPDATE user_points SET points = points - ?, updated_at = ? WHERE user_id = ? AND points >= ?'
  ).run(cost, now(), user.id, cost);
  if (Number(deduction.changes) !== 1) {
    const fresh = getPoints(user.id);
    return res.status(409).json({ error: 'TTG balance badal gaya — dobara koshish karein.', points: fresh ? fresh.points : 0 });
  }

  let info;
  try {
    info = db.prepare(
      `INSERT INTO coin_requests (user_id, email, source, source_id, title, cost, discount_percent, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).run(user.id, user.email, source, id, item.title, cost, discountPercent);
  } catch (error) {
    // Refund the just-deducted TTG if the request could not be recorded.
    db.prepare('UPDATE user_points SET points = points + ?, updated_at = ? WHERE user_id = ?').run(cost, now(), user.id);
    throw error;
  }

  res.status(201).json({
    ok: true,
    requestId: info.lastInsertRowid,
    title: item.title,
    cost,
    discountPercent,
    price: item.price || '',
    points: balance - cost,
    currency: 'TTG',
    message: `TTG request ban gayi — approve hone par ${discountPercent}% discount voucher milega (paisa JazzCash se, discounted price).`,
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
  let detail = row.title;
  if (action === 'approve') {
    if (row.source === 'reward' && row.source_id) {
      // Legacy reward delivery (keeps older requests working).
      const r = db.prepare('SELECT id, label, code_encrypted FROM reward_codes WHERE id = ?').get(row.source_id);
      if (r && r.code_encrypted) {
        try {
          const code = decryptSecret(r.code_encrypted);
          if (code) delivered = encryptSecret(code);
        } catch { /* delivered stays empty: owner delivers via Discord */ }
      }
    } else if (row.discount_percent > 0) {
      // TTG discount flow: approval issues an honest reusable voucher code.
      const voucher = 'TTG-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      delivered = encryptSecret(voucher);
      detail = `${row.title} - ${row.discount_percent}% off voucher ${voucher} (${row.cost} TTG)`;
    }
  }

  // Claim the request with a conditional UPDATE first. Only the click that
  // actually flips pending -> decided gets to refund, so double-clicks cannot
  // refund the same TTG twice.
  const decided = db.prepare(
    `UPDATE coin_requests SET status = ?, note = ?, delivered_code_enc = ?, decided_at = ?
     WHERE id = ? AND status = 'pending'`
  ).run(action === 'approve' ? 'approved' : 'rejected', note, delivered, now(), id);
  if (Number(decided.changes) !== 1) {
    return res.status(409).json({ error: 'Ye request pehle decide ho chuki hai.' });
  }

  if (action === 'reject') {
    // Honest refund: the coins come back to the user.
    db.prepare('UPDATE user_points SET points = points + ?, updated_at = ? WHERE user_id = ?').run(row.cost, now(), row.user_id);
  }

  audit('coin_request_' + action, {
    target: `coin:${id}`,
    result: 'success',
    detail,
    ip: ownerId(req),
  });
  res.json({ ok: true, status: action === 'approve' ? 'approved' : 'rejected' });
});

function ownerId(req) {
  return req.ip || 'unknown';
}

module.exports = { userRouter: router, ownerRouter };
