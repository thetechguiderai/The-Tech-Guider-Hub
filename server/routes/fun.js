'use strict';

const express = require('express');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const jwt = require('jsonwebtoken');
const { db, now } = require('../db');
const { rateLimit } = require('../security');

const router = express.Router();

// ------------------- identity: same AI tg_session as TTG --------------------
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
  return { id: sub, email: (u && u.email) || '', name: (u && u.name) || '' };
}

function requireUser(req, res, next) {
  const user = userFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Is ke liye AI workspace mein sign in karein.', needsAuth: true });
  }
  req.funUser = user;
  next();
}

function optionalUser(req) {
  return userFromToken(req);
}

// ----------------------------- Tech Fact of the Day -------------------------
// Curated true facts; the same fact shows all day, next day the next one.
const TECH_FACTS = [
  'Dunia ka pehla computer mouse lakdi ka bana tha — 1964 mein Douglas Engelbart ne banaya.',
  'YouTube ka pehla video "Me at the zoo" hai — April 2005 mein upload hua, sirf 19 seconds.',
  'QWERTY keyboard ka layout typewriter ke zamane ke fast typists ke jamming roke ne ke liye banaya gaya tha.',
  'Google ka original naam "BackRub" tha, 1996 mein Stanford pe chalta tha.',
  'Ek din mein YouTube par poore TV channels se zyada video upload hota hai.',
  'Bluetooth ka naam Denmark ke 10th-century king Harald Bluetooth ke naam pe rakha gaya — jinhone tribes ko jor diya.',
  'Dunia ka pehla mobile phone call 1973 mein Motorola ke engineer Martin Cooper ne kiya.',
  'RAM ka pura naam Random Access Memory hai — jitni zyada aur fast RAM, utna fast computer.',
  'Wi-Fi ka matlab kuch nahi — wo bas ek catchy naam hai jo "802.11" standard pe marketing ke liye banaya gaya.',
  'Photoshop ka pehla version 1990 mein aaya aur Mac-only tha.',
  '4K video ka pura naam Ultra High Definition hai — 1080p se 4 guna zyada pixels.',
  'Minecraft ki pehli version Markus "Notch" Persson ne 2009 mein banai thi — aaj ye dunia ki best selling games mein shamil hai.',
  'Dunia ka pehla video game "Tennis for Two" 1958 mein banaya gaya tha — oscilloscope screen pe chalta tha.',
  'Dunia ki sab se pehli website info.cern.ch thi — 1991 mein aayi, aur wo aaj bhi zinda hai!',
  'Internet ka aproximadamente 50% traffic bots se aata hai — real humans ka hissa alehda hai.',
  'Email ka "@" symbol Ray Tomlinson ne 1971 mein choose kiya — isliye aaj har email mein hota hai.',
  'Windows 1.0 1985 mein release hui thi — aaj ke Windows ka jad-o-amma wahi hai.',
  'Nokia 1100 dunia ke best selling phones mein top 5 mein aata hai — 250 million se zyada sold.',
  'Aap ke browser ka incognito mode IP address ke aap ko nahi chupa sakta — site owner appreciate log kar sakta hai.',
  'Firefox ka pehla naam "Phoenix" tha, phir Firebird hua, 2004 mein Firefox hua.',
  'Instagram ka pehla version "Burbn" tha — ek location check-in app jo baad mein photo sharing app ban gayi.',
  'Dunia mein sab se zeeyada used programming language JavaScript hai — web ke har page pe kite na kite use hoti hai.',
  'PDF banane wale Adobe ki wajah se hi aaj bhi "PDF" universal document format hai.',
  'TikTok ke purane version Music.ly tha — 2018 mein dono merge ho gaye.',
  'SpaceX Falcon 9 rocket ki landing ke thrusters software code C++ mein likha gaya tha.',
  'SQL zubaan 1970s ki hai — aaj ke bade apps ke databases bhi isi pe chalte hain.',
  'Emoji ka inventor Japan ka Shigetaka Kurita hai — 1999 mein pehli dafa bane.',
  'Google ka homepage itna fast load hota hai kyunke wahan bilkul minimal code hoti hai — speed ki wajah sirf simplicity hai.',
  'Dunia ke smartphones ka takreeban 70% Android pe chalte hain.',
];

router.get('/fact', (req, res) => {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today - new Date(today.getFullYear(), 0, 0)) / 86400000
  );
  const index = dayOfYear % TECH_FACTS.length;
  res.json({
    fact: TECH_FACTS[index],
    index,
    date: today.toISOString().slice(0, 10),
    shareText: TECH_FACTS[index],
  });
});

// ------------------------------- Weekly Poll --------------------------------
// Curated community question, har hafte naya (bina juda aise hi rotate hoti hai).
const POLLS = [
  { key: '2026-w43', question: 'Agla bada tutorial kis topic pe banaya jaye?', options: ['Minecraft Servers Deep-Guide', 'YouTube Growth Tips', 'Free AI Tools', 'Phone Editing Apps'] },
  { key: '2026-w44', question: 'Aap ka sab se pasand wala AI model kaun sa hai?', options: ['Guider Astron (Free)', 'Guider Pro', 'Gemini', 'Abhi try nahi kiya'] },
  { key: '2026-w45', question: 'Fun Zone mein kya aur add karein?', options: ['Aur games', 'Aur quizzes', 'Giveaways', 'Live streams'] },
  { key: '2026-w46', question: 'Tech Guider Hub ka best feature kaun sa hai?', options: ['The Tech Guider AI', 'Shop + TTG', 'Tutorials', 'Free Tools'] },
];

function weekKeyNow() {
  const t = new Date();
  const jan1 = new Date(t.getFullYear(), 0, 1);
  const week = Math.floor(((t - jan1) / 86400000 + jan1.getDay() + 1) / 7) + 1;
  return `${t.getFullYear()}-w${String(week).padStart(2, '0')}`;
}

router.get('/poll', (req, res) => {
  const week = weekKeyNow();
  // Agar curated list mein current week ka poll na ho, aakhri available dikhe.
  const poll = POLLS.find((p) => p.key === week) || POLLS[POLLS.length - 1];
  const results = db
    .prepare('SELECT option_index, COUNT(*) AS c FROM fun_poll_votes WHERE poll_key = ? GROUP BY option_index')
    .all(poll.key);
  const counts = poll.options.map((_, i) => results.find((r) => r.option_index === i)?.c || 0);
  const total = counts.reduce((a, b) => a + b, 0);
  const user = optionalUser(req);
  let myVote = null;
  if (user) {
    const row = db
      .prepare('SELECT option_index FROM fun_poll_votes WHERE poll_key = ? AND user_id = ?')
      .get(poll.key, user.id);
    myVote = row ? row.option_index : null;
  }
  res.json({
    week,
    question: poll.question,
    options: poll.options,
    counts,
    total,
    signedIn: Boolean(user),
    myVote,
  });
});

router.post('/poll/vote', rateLimit, requireUser, (req, res) => {
  const body = req.body || {};
  const idx = Number(body.optionIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx > 9) return res.status(400).json({ error: 'Valid option choose karein.' });
  const week = weekKeyNow();
  const poll = POLLS.find((p) => p.key === week) || POLLS[POLLS.length - 1];
  if (idx >= poll.options.length) return res.status(400).json({ error: 'Invalid option.' });
  try {
    db.prepare('INSERT INTO fun_poll_votes (poll_key, user_id, option_index) VALUES (?, ?, ?)')
      .run(poll.key, req.funUser.id, Number(idx));
  } catch (e) {
    return res.status(409).json({ error: 'Aap ne is poll pe pehlean vote de diya hai.' });
  }
  const results = db
    .prepare('SELECT option_index, COUNT(*) AS c FROM fun_poll_votes WHERE poll_key = ? GROUP BY option_index')
    .all(poll.key);
  const counts = poll.options.map((_, i) => results.find((r) => r.option_index === i)?.c || 0);
  res.status(201).json({ ok: true, myVote: idx, counts, question: poll.question });
});

// ----------------------------- Leaderboard ----------------------------------
// Top missions streak — roz aane walo ka proud moment.
router.get('/leaderboard', (req, res) => {
  const rows = db
    .prepare(
      `SELECT user_id, name, email, points, streak
       FROM user_points
       WHERE streak > 0
       ORDER BY streak DESC, points DESC
       LIMIT 10`
    )
    .all();
  const me = optionalUser(req);
  const entries = rows.map((r, i) => ({
    rank: i + 1,
    userId: r.user_id,
    name: (r.name && r.name.trim()) || (r.email ? r.email.split('@')[0] : 'Anonymous'),
    points: r.points,
    streak: r.streak,
    isMe: me ? me.id === r.user_id : false,
  }));
  res.json({ entries });
});

// ----------------------------- Daily Lucky Spin -----------------------------
// Mission #2 — ek din mein ek dafa spin. Wheel segment values aur unke odds
// server pe fair hoti hain (frontend sirf animate karta hai).
const SPIN_SEGMENTS = [5, 10, 15, 20, 5, 10, 15, 5, 10, 15, 5, 10];
const SPIN_WEIGHTS = { 5: 40, 10: 35, 15: 18, 20: 7 };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function pickSpinIndex() {
  const values = Object.keys(SPIN_WEIGHTS);
  const totalWeight = values.reduce((a, k) => a + SPIN_WEIGHTS[k], 0);
  let roll = Math.random() * totalWeight;
  let value = Number(values[values.length - 1]);
  for (const k of values) {
    roll -= SPIN_WEIGHTS[k];
    if (roll <= 0) {
      value = Number(k);
      break;
    }
  }
  const candidateIdx = SPIN_SEGMENTS.map((v, i) => (v === value ? i : -1)).filter((i) => i >= 0);
  const idx = candidateIdx[Math.floor(Math.random() * candidateIdx.length)];
  return idx;
}

router.get('/spin/status', (req, res) => {
  const user = optionalUser(req);
  if (!user) return res.json({ signedIn: false, canSpin: false, balance: null, lastSpin: null });
  const row = db.prepare('SELECT points, spin_last FROM user_points WHERE user_id = ?').get(user.id);
  const today = todayStr();
  res.json({
    signedIn: true,
    canSpin: !row || row.spin_last !== today,
    balance: row ? row.points : 0,
    lastSpin: row ? row.spin_last : '',
  });
});

router.post('/spin', rateLimit, requireUser, (req, res) => {
  const user = req.funUser;
  const today = todayStr();
  const row = db.prepare('SELECT points, spin_last, streak, total_earned FROM user_points WHERE user_id = ?').get(user.id);
  if (row && row.spin_last === today) {
    return res.status(409).json({
      error: 'Aaj ka spin ho chuka hai — kal phir try karein! 🎯',
      balance: row.points,
    });
  }
  const idx = pickSpinIndex();
  const won = SPIN_SEGMENTS[idx];
  const balance = (row ? row.points : 0) + won;
  const streak = (row ? row.streak : 0) || 0;
  db.prepare(
    `INSERT INTO user_points (user_id, email, name, points, total_earned, streak, spin_last, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       email = excluded.email, name = excluded.name, points = excluded.points,
       total_earned = excluded.total_earned, spin_last = excluded.spin_last, updated_at = excluded.updated_at`
  ).run(user.id, user.email, user.name, balance, (row ? row.total_earned : 0) + won, streak, today, now());
  res.json({
    ok: true,
    segmentIndex: idx,
    won,
    balance,
    segments: SPIN_SEGMENTS,
    message: `🎖 Lucky Spin: +${won} TTG mil gaye!`,
  });
});

// ------------------------------- Tech Quiz ----------------------------------
// Quiz score save hota hai (TTG nahi milta — quiz sirf pure fun + bravo hai).
router.get('/quiz/me', (req, res) => {
  const user = optionalUser(req);
  if (!user) return res.json({ signedIn: false, best: 0, plays: 0 });
  const row = db.prepare('SELECT best_score, plays FROM quiz_scores WHERE user_id = ?').get(user.id);
  res.json({ signedIn: true, best: row ? row.best_score : 0, plays: row ? row.plays : 0 });
});

router.post('/quiz/score', rateLimit, requireUser, (req, res) => {
  const score = Number((req.body || {}).score);
  if (!Number.isInteger(score) || score < 0 || score > 100) return res.status(400).json({ error: 'Invalid score.' });
  const row = db.prepare('SELECT best_score, plays FROM quiz_scores WHERE user_id = ?').get(req.funUser.id);
  const best = Math.max(row ? row.best_score : 0, score);
  const plays = (row ? row.plays : 0) + 1;
  db.prepare(
    `INSERT INTO quiz_scores (user_id, name, best_score, plays, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       name = excluded.name, best_score = excluded.best_score, plays = excluded.plays, updated_at = excluded.updated_at`
  ).run(req.funUser.id, req.funUser.name, best, plays, now());
  res.json({ ok: true, best, plays, isNewRecord: row ? score > row.best_score : true });
});

router.get('/quiz/leaderboard', (req, res) => {
  const rows = db
    .prepare('SELECT user_id, name, best_score, plays FROM quiz_scores ORDER BY best_score DESC, updated_at ASC LIMIT 10')
    .all();
  const me = optionalUser(req);
  res.json({
    entries: rows.map((r, i) => ({
      rank: i + 1,
      name: (r.name && r.name.trim()) || 'Anonymous',
      bestScore: r.best_score,
      plays: r.plays,
      isMe: me ? me.id === r.user_id : false,
    })),
  });
});

module.exports = { funRouter: router };
