'use strict';

const crypto = require('node:crypto');
const { db, now } = require('./db');

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_LOCKOUT_MS = 15 * 60 * 1000;

function requireSecret() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 16) {
    throw new Error(
      'SESSION_SECRET is not set or too short. Generate one with:\n  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\nand add it to the .env file.'
    );
  }
  return process.env.SESSION_SECRET;
}

const ENCRYPTION_KEY = crypto.createHash('sha256').update(requireSecret()).digest();

// ----------------------------- password hashing -----------------------------
function hashOwnerCode(code) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(code), salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

function verifyOwnerCode(code, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, expected] = storedHash.split(':');
  const derived = crypto.scryptSync(String(code), salt, 32);
  const expectedBuf = Buffer.from(expected, 'hex');
  return derived.length === expectedBuf.length && crypto.timingSafeEqual(derived, expectedBuf);
}

// ------------------------------ session tokens ------------------------------
function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare('INSERT INTO sessions (token_hash, expires_at) VALUES (?, ?)').run(tokenHash, expiresAt);
  return token;
}

function lookupSession(token) {
  if (!token) return null;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const row = db.prepare('SELECT * FROM sessions WHERE token_hash = ?').get(tokenHash);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return null;
  }
  db.prepare(
    'UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?'
  ).run(now(), tokenHash);
  return row;
}

function destroySession(token) {
  if (!token) return;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

// ------------------------------- cookie parsing ------------------------------
function getCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

function setSessionCookie(res, token) {
  const secure = process.env.COOKIE_SECURE === 'true';
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  res.setHeader(
    'Set-Cookie',
    `tgss=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}` +
      (secure ? '; Secure' : '') +
      '; Priority=High'
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'tgss=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
}

// ------------------------------- audit logging ------------------------------
function audit(action, opts = {}) {
  try {
    db.prepare(
      'INSERT INTO audit_logs (action, target, result, detail, ip) VALUES (?, ?, ?, ?, ?)'
    ).run(
      action,
      opts.target || '',
      opts.result || 'success',
      opts.detail || '',
      opts.ip || ''
    );
  } catch {
    /* never break a request due to logging */
  }
}

// ------------------------------- rate limiting ------------------------------
const rateBuckets = new Map(); // ip -> { count, resetAt }

function cleanupRateBuckets() {
  const nowMs = Date.now();
  for (const [key, b] of rateBuckets) {
    if (b.resetAt < nowMs) rateBuckets.delete(key);
  }
}

function rateLimit(req, res, next) {
  cleanupRateBuckets();
  const max = parseInt(process.env.RATE_LIMIT_MAX, 10) || 300;
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 600000;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const key = `rl:${ip}`;
  const bucket = rateBuckets.get(key);
  const nowMs = Date.now();
  if (!bucket || bucket.resetAt < nowMs) {
    rateBuckets.set(key, { count: 1, resetAt: nowMs + windowMs });
    return next();
  }
  bucket.count += 1;
  if (bucket.count > max) {
    res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - nowMs) / 1000)));
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  next();
}

// ----------------------- owner login protection / lockout --------------------
function ipHash(ip) {
  return crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 24);
}

function getLockout(req) {
  const row = db
    .prepare('SELECT MAX(lockout_until) AS t FROM owner_failures WHERE ip_hash = ?')
    .get(ipHash(req.ip || 'unknown'));
  if (!row || !row.t) return null;
  const ms = new Date(row.t + 'Z').getTime();
  return ms > Date.now() ? ms : null;
}

function recordFailure(req) {
  const max = parseInt(process.env.OWNER_MAX_ATTEMPTS, 10) || DEFAULT_MAX_ATTEMPTS;
  const lockMs = parseInt(process.env.OWNER_LOCKOUT_MS, 10) || DEFAULT_LOCKOUT_MS;
  const h = ipHash(req.ip || 'unknown');
  db.prepare('INSERT INTO owner_failures (ip_hash) VALUES (?)').run(h);
  const recent = db.prepare(
    `SELECT COUNT(*) AS c FROM owner_failures WHERE ip_hash = ? AND failed_at > datetime('now', ?)`
  ).get(h, `-${Math.floor(lockMs / 1000)} seconds`);
  if (recent.c >= max) {
    const until = new Date(Date.now() + lockMs).toISOString().slice(0, 19);
    db.prepare('UPDATE owner_failures SET lockout_until = ? WHERE ip_hash = ?').run(until, h);
    audit('owner_login', { target: 'owner', result: 'locked', detail: 'Temporary lockout triggered', ip: req.ip });
    return true;
  }
  return false;
}

function clearFailures(req) {
  db.prepare('DELETE FROM owner_failures WHERE ip_hash = ?').run(ipHash(req.ip || 'unknown'));
}

// ------------------------------- AES-GCM helpers ----------------------------
function encryptSecret(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

function decryptSecret(payload) {
  if (!payload || !payload.includes(':')) return '';
  const [ivHex, tagHex, dataHex] = payload.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    ENCRYPTION_KEY,
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  try {
    const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return '';
  }
}

module.exports = {
  requireSecret,
  hashOwnerCode,
  verifyOwnerCode,
  createSession,
  lookupSession,
  destroySession,
  getCookies,
  setSessionCookie,
  clearSessionCookie,
  audit,
  rateLimit,
  getLockout,
  recordFailure,
  clearFailures,
  ipHash,
  encryptSecret,
  decryptSecret,
  SESSION_TTL_MS,
};