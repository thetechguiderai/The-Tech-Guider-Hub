'use strict';

const express = require('express');
const crypto = require('node:crypto');
const { db, now, getSettings, setSetting } = require('../db');
const {
  verifyOwnerCode, hashOwnerCode, createSession, destroySession, lookupSession,
  getCookies, setSessionCookie, clearSessionCookie, audit, encryptSecret, decryptSecret,
  getLockout, recordFailure, clearFailures, ipHash,
} = require('../security');
const { fetchFromYouTube, getSettings: getYtSettings, markConfigured } = require('../youtube');
const { generate } = require('../sensitivity');

const router = express.Router();

// ------------------------------ helpers -------------------------------------
function getOwnerHash() {
  const row = db.prepare('SELECT code_hash FROM owners ORDER BY id LIMIT 1').get();
  return row ? row.code_hash : null;
}

function requireOwner(req, res, next) {
  const cookies = getCookies(req);
  const session = lookupSession(cookies.tgss);
  if (!session) {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
  req.ownerSession = session;
  next();
}

function ownerIp(req) {
  return req.ip || req.connection.remoteAddress || 'unknown';
}

// -------------------------------- auth --------------------------------------
router.post('/login', (req, res) => {
  const code = String((req.body && req.body.code) || '').trim();
  const ip = ownerIp(req);

  const lockoutUntil = getLockout(req);
  if (lockoutUntil) {
    audit('owner_login', { target: 'login', result: 'blocked', detail: 'Locked out', ip });
    return res.status(423).json({
      error: 'Too many failed attempts. Access is temporarily locked.',
      retryAfter: Math.ceil((lockoutUntil - Date.now()) / 1000),
    });
  }

  if (!/^\d{10}$/.test(code)) {
    audit('owner_login', { target: 'login', result: 'failed', detail: 'Invalid format', ip });
    return res.status(400).json({ error: 'The access code must be exactly 10 digits.' });
  }

  if (!getOwnerHash()) {
    audit('owner_login', { target: 'login', result: 'failed', detail: 'No owner configured', ip });
    return res.status(500).json({ error: 'Owner access is not configured yet on the server.' });
  }

  if (!verifyOwnerCode(code, getOwnerHash())) {
    const locked = recordFailure(req);
    audit('owner_login', { target: 'login', result: 'failed', detail: 'Incorrect access code', ip });
    if (locked) {
      return res.status(423).json({
        error: 'Too many failed attempts. Access is temporarily locked.',
        retryAfter: Math.ceil((parseInt(process.env.OWNER_LOCKOUT_MS, 10) || 900000) / 1000),
      });
    }
    return res.status(401).json({ error: 'Incorrect access code. Please try again.' });
  }

  clearFailures(req);
  const token = createSession();
  setSessionCookie(res, token);
  audit('owner_login', { target: 'login', result: 'success', detail: 'Owner signed in', ip });
  res.json({ authenticated: true });
});

router.post('/logout', requireOwner, (req, res) => {
  const cookies = getCookies(req);
  destroySession(cookies.tgss);
  clearSessionCookie(res);
  audit('owner_logout', { target: 'session', result: 'success', ip: ownerIp(req) });
  res.json({ ok: true });
});

router.get('/session', (req, res) => {
  const cookies = getCookies(req);
  const session = lookupSession(cookies.tgss);
  res.json({ authenticated: !!session });
});

router.post('/regenerate-code', requireOwner, (req, res) => {
  const newCode = String(crypto.randomInt(0, 10000000000)).padStart(10, '0');
  const hash = hashOwnerCode(newCode);
  const row = db.prepare('SELECT id FROM owners ORDER BY id LIMIT 1').get();
  if (row) {
    db.prepare('UPDATE owners SET code_hash = ?, updated_at = ? WHERE id = ?').run(hash, now(), row.id);
  } else {
    db.prepare('INSERT INTO owners (code_hash) VALUES (?)').run(hash);
  }
  audit('owner_code_regenerated', { target: 'owner', result: 'success', detail: 'New access code issued (old invalidated)', ip: ownerIp(req) });
  res.json({
    code: newCode,
    message: 'Old access code invalidated. Copy the new one now — it will not be shown again.',
  });
});

// ------------------------------- overview -----------------------------------
router.get('/overview', requireOwner, (req, res) => {
  const yt = getYtSettings();
  const ytStats = yt && yt.cachedStats && yt.cachedStats.cachedAt ? yt.cachedStats : null;
  const ytSt = ytStats && ytStats.statistics ? ytStats.statistics : null;
  const counts = {
    resources: db.prepare('SELECT COUNT(*) c FROM resources').get().c,
    videos: db.prepare('SELECT COUNT(*) c FROM videos').get().c,
    comingSoon: db.prepare('SELECT COUNT(*) c FROM videos WHERE status = ?').get('coming_soon').c,
    publishedVideos: db.prepare('SELECT COUNT(*) c FROM videos WHERE status = ?').get('published').c,
    resourceClicks: db.prepare('SELECT COALESCE(SUM(clicks), 0) c FROM resources').get().c,
    minecraftListings: db.prepare('SELECT COUNT(*) c FROM minecraft_listings').get().c,
    rewardInventory: db.prepare('SELECT COUNT(*) c FROM reward_codes').get().c,
    sensitivityProfiles: db.prepare('SELECT COUNT(*) c FROM sensitivity_profiles').get().c,
    announcements: db.prepare('SELECT COUNT(*) c FROM announcements WHERE active = 1').get().c,
    youtubeStatsAvailable: !!ytSt,
    youtubeVideoCount: ytSt ? ytSt.videoCount : 0,
    youtubeSubscribers: ytSt ? ytSt.subscriberCount : 0,
    youtubeViews: ytSt ? ytSt.viewCount : 0,
    youtubeLastRefresh: ytStats ? ytStats.cachedAt : '',
  };

  const recent = db.prepare(
    `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ${8}`
  ).all();

  const pageViews14 = db.prepare(
    `SELECT date(created_at) AS day, COUNT(*) AS count
     FROM analytics_events WHERE event_type = 'pageview'
       AND created_at >= datetime('now', '-14 days')
     GROUP BY day ORDER BY day ASC`
  ).all();

  const trend30 = db.prepare(
    `SELECT date(created_at) AS day,
            COALESCE(SUM(CASE WHEN event_type = 'pageview' THEN 1 ELSE 0 END), 0) AS pageviews,
            COALESCE(SUM(CASE WHEN event_type IN ('resource_click','video_click') THEN 1 ELSE 0 END), 0) AS clicks
     FROM analytics_events
     WHERE created_at >= datetime('now', '-30 days')
     GROUP BY day ORDER BY day ASC`
  ).all();

  const topResources = db.prepare(
    'SELECT name, clicks FROM resources ORDER BY clicks DESC LIMIT 6'
  ).all();

  const topSearch = db.prepare(
    `SELECT detail, COUNT(*) AS count FROM analytics_events
     WHERE event_type = 'search' GROUP BY detail ORDER BY count DESC LIMIT 5`
  ).all();

  res.json({ counts, recent, pageViews14, trend30, topResources, topSearch });
});

// -------------------------------- videos ------------------------------------
router.get('/videos', requireOwner, (req, res) => {
  const rows = db.prepare('SELECT * FROM videos ORDER BY sort_order ASC, updated_at DESC').all();
  const resources = (videoId) =>
    db.prepare(
      `SELECT vr.id AS link_id, vr.sort_order AS link_order, r.* FROM video_resources vr
       JOIN resources r ON r.id = vr.resource_id WHERE vr.video_id = ? ORDER BY vr.sort_order ASC`
    ).all(videoId);
  res.json({ videos: rows.map((v) => ({ ...v, resources: resources(v.id) })) });
});

function validVideoStatus(s) {
  return ['coming_soon', 'published', 'hidden'].includes(s);
}

router.post('/videos', requireOwner, (req, res) => {
  const b = req.body || {};
  if (!b.title || !String(b.title).trim()) {
    return res.status(400).json({ error: 'Title is required.' });
  }
  const status = validVideoStatus(b.status) ? b.status : 'coming_soon';
  const info = db.prepare(
    `INSERT INTO videos (title, thumbnail, youtube_url, description, category, status, release_date, sort_order, featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    String(b.title).trim(),
    String(b.thumbnail || ''),
    String(b.youtube_url || ''),
    String(b.description || ''),
    String(b.category || 'General'),
    status,
    String(b.release_date || ''),
    Number(b.sort_order || 0),
    b.featured ? 1 : 0
  );
  const id = Number(info.lastInsertRowid);
  bindResources(id, b.resourceIds);
  audit('video_created', { target: `video:${id}`, detail: b.title.trim().slice(0, 80), ip: ownerIp(req) });
  res.status(201).json({ id });
});

router.put('/videos/:id', requireOwner, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Video not found' });
  const b = req.body || {};
  const status = validVideoStatus(b.status) ? b.status : row.status;
  db.prepare(
    `UPDATE videos SET title = ?, thumbnail = ?, youtube_url = ?, description = ?, category = ?,
       status = ?, release_date = ?, sort_order = ?, featured = ?, updated_at = ? WHERE id = ?`
  ).run(
    String(b.title ?? row.title).trim(),
    String(b.thumbnail ?? row.thumbnail),
    String(b.youtube_url ?? row.youtube_url),
    String(b.description ?? row.description),
    String(b.category ?? row.category),
    status,
    String(b.release_date ?? row.release_date),
    Number(b.sort_order ?? row.sort_order),
    b.featured != null ? (b.featured ? 1 : 0) : row.featured,
    now(), id
  );
  if (Array.isArray(b.resourceIds)) bindResources(id, b.resourceIds);
  audit('video_updated', { target: `video:${id}`, result: 'success', detail: (b.title ?? row.title).slice(0, 80), ip: ownerIp(req) });
  res.json({ ok: true });
});

router.delete('/videos/:id', requireOwner, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Video not found' });
  db.prepare('DELETE FROM videos WHERE id = ?').run(id);
  audit('video_deleted', { target: `video:${id}`, result: 'success', detail: row.title.slice(0, 80), ip: ownerIp(req) });
  res.json({ ok: true });
});

function bindResources(videoId, resourceIds) {
  db.prepare('DELETE FROM video_resources WHERE video_id = ?').run(videoId);
  if (!Array.isArray(resourceIds)) return;
  resourceIds.forEach((rid, i) => {
    db.prepare(
      'INSERT INTO video_resources (video_id, resource_id, sort_order) VALUES (?, ?, ?)'
    ).run(videoId, Number(rid), i);
  });
}

// ------------------------------- resources ----------------------------------
router.get('/resources', requireOwner, (req, res) => {
  const rows = db.prepare('SELECT * FROM resources ORDER BY featured DESC, sort_order ASC, name ASC').all();
  res.json({ resources: rows });
});

router.post('/resources', requireOwner, (req, res) => {
  const b = req.body || {};
  if (!b.name || !String(b.name).trim()) {
    return res.status(400).json({ error: 'Resource name is required.' });
  }
  const info = db.prepare(
    `INSERT INTO resources (name, url, logo, description, category, featured, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    String(b.name).trim(),
    String(b.url || ''),
    String(b.logo || ''),
    String(b.description || ''),
    String(b.category || 'General'),
    b.featured ? 1 : 0,
    Number(b.sort_order || 0)
  );
  if (Array.isArray(b.videoIds)) {
    for (const vid of b.videoIds) {
      db.prepare('INSERT INTO video_resources (video_id, resource_id, sort_order) VALUES (?, ?, ?)').run(Number(vid), Number(info.lastInsertRowid), 0);
    }
  }
  audit('resource_created', { target: `resource:${info.lastInsertRowid}`, result: 'success', detail: b.name.trim().slice(0, 80), ip: ownerIp(req) });
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

router.put('/resources/:id', requireOwner, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Resource not found' });
  const b = req.body || {};
  db.prepare(
    `UPDATE resources SET name = ?, url = ?, logo = ?, description = ?, category = ?, featured = ?, sort_order = ?, updated_at = ? WHERE id = ?`
  ).run(
    String(b.name ?? row.name).trim(),
    String(b.url ?? row.url),
    String(b.logo ?? row.logo),
    String(b.description ?? row.description),
    String(b.category ?? row.category),
    b.featured != null ? (b.featured ? 1 : 0) : row.featured,
    Number(b.sort_order ?? row.sort_order),
    now(), id
  );
  if (Array.isArray(b.videoIds)) {
    db.prepare('DELETE FROM video_resources WHERE resource_id = ?').run(id);
    for (const vid of b.videoIds) {
      db.prepare('INSERT INTO video_resources (video_id, resource_id, sort_order) VALUES (?, ?, ?)').run(Number(vid), id, 0);
    }
  }
  audit('resource_updated', { target: `resource:${id}`, result: 'success', detail: (b.name ?? row.name).slice(0, 80), ip: ownerIp(req) });
  res.json({ ok: true });
});

router.delete('/resources/:id', requireOwner, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Resource not found' });
  db.prepare('DELETE FROM resources WHERE id = ?').run(id);
  audit('resource_deleted', { target: `resource:${id}`, result: 'success', detail: row.name.slice(0, 80), ip: ownerIp(req) });
  res.json({ ok: true });
});

router.post('/resources/reorder', requireOwner, (req, res) => {
  const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids : [];
  const tx = db.prepare('UPDATE resources SET sort_order = ? WHERE id = ?');
  ids.forEach((id, i) => tx.run(i, Number(id)));
  audit('resources_reordered', { result: 'success', ip: ownerIp(req) });
  res.json({ ok: true });
});

// ------------------------------ youtube config -------------------------------
router.get('/youtube-config', requireOwner, (req, res) => {
  const y = getYtSettings();
  res.json({
    channelId: y.channelId,
    refreshInterval: y.refreshInterval,
    featuredVideo: y.featuredVideo,
    configStatus: y.configStatus,
    lastFetchAt: y.lastFetchAt,
    apiConfigured: !!process.env.YOUTUBE_API_KEY,
  });
});

router.put('/youtube-config', requireOwner, (req, res) => {
  const b = req.body || {};
  const channelId = String(b.channelId || '').trim();
  const refreshInterval = Math.max(60, Number(b.refreshInterval) || 900);
  db.prepare(
    'UPDATE youtube_settings SET channel_id = ?, refresh_interval = ?, featured_video = ? WHERE id = 1'
  ).run(channelId, refreshInterval, String(b.featuredVideo || ''));
  markConfigured(channelId);
  audit('youtube_config_updated', { result: 'success', detail: `Channel ${channelId || '(none)'}`, ip: ownerIp(req) });
  res.json({ ok: true });
});

router.post('/youtube-refresh', requireOwner, async (req, res) => {
  const result = await fetchFromYouTube();
  audit('youtube_refresh', { result: result.available ? 'success' : 'failed', detail: result.reason || 'api ok', ip: ownerIp(req) });
  res.json(result);
});

// --------------------------- sensitivity profiles ---------------------------
router.get('/sensitivity-profiles', requireOwner, (req, res) => {
  const rows = db.prepare('SELECT * FROM sensitivity_profiles ORDER BY updated_at DESC').all();
  res.json({ profiles: rows.map((r) => ({ ...r, values: safeJson(r.values_json) })) });
});

function safeJson(s) {
  try {
    return JSON.parse(s || '{}');
  } catch {
    return {};
  }
}

router.post('/sensitivity-profiles', requireOwner, (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.device_type || !b.play_style) {
    return res.status(400).json({ error: 'Name, device type and play style are required.' });
  }
  const values = b.values && typeof b.values === 'object' ? b.values : {};
  const info = db.prepare(
    `INSERT INTO sensitivity_profiles (name, device_type, brand, device_model, ram, dpi, resolution, refresh_rate, play_style, performance_class, values_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    String(b.name).trim(), String(b.device_type), String(b.brand || ''), String(b.device_model || ''),
    String(b.ram || ''), String(b.dpi || ''), String(b.resolution || ''), String(b.refresh_rate || ''),
    String(b.play_style), String(b.performance_class || 'mid'), JSON.stringify(values)
  );
  audit('sensitivity_profile_created', { target: `profile:${info.lastInsertRowid}`, result: 'success', detail: b.name.trim().slice(0, 60), ip: ownerIp(req) });
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

router.put('/sensitivity-profiles/:id', requireOwner, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM sensitivity_profiles WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Profile not found' });
  const b = req.body || {};
  const values = b.values && typeof b.values === 'object' ? b.values : safeJson(row.values_json);
  db.prepare(
    `UPDATE sensitivity_profiles SET name = ?, device_type = ?, brand = ?, device_model = ?, ram = ?, dpi = ?,
       resolution = ?, refresh_rate = ?, play_style = ?, performance_class = ?, values_json = ?, updated_at = ? WHERE id = ?`
  ).run(
    String(b.name ?? row.name).trim(), String(b.device_type ?? row.device_type), String(b.brand ?? row.brand),
    String(b.device_model ?? row.device_model), String(b.ram ?? row.ram), String(b.dpi ?? row.dpi),
    String(b.resolution ?? row.resolution), String(b.refresh_rate ?? row.refresh_rate),
    String(b.play_style ?? row.play_style), String(b.performance_class ?? row.performance_class),
    JSON.stringify(values), now(), id
  );
  audit('sensitivity_profile_updated', { target: `profile:${id}`, result: 'success', detail: (b.name ?? row.name).slice(0, 60), ip: ownerIp(req) });
  res.json({ ok: true });
});

router.delete('/sensitivity-profiles/:id', requireOwner, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM sensitivity_profiles WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Profile not found' });
  db.prepare('DELETE FROM sensitivity_profiles WHERE id = ?').run(id);
  audit('sensitivity_profile_deleted', { target: `profile:${id}`, result: 'success', detail: row.name.slice(0, 60), ip: ownerIp(req) });
  res.json({ ok: true });
});

// ----------------------------- minecraft listings ---------------------------
router.get('/minecraft', requireOwner, (req, res) => {
  const rows = db.prepare('SELECT * FROM minecraft_listings ORDER BY featured DESC, sort_order ASC').all();
  res.json({ listings: rows });
});

router.post('/minecraft', requireOwner, (req, res) => {
  const b = req.body || {};
  if (!b.title || !String(b.title).trim()) return res.status(400).json({ error: 'Title is required.' });
  const info = db.prepare(
    `INSERT INTO minecraft_listings (title, edition, listing_type, price, availability, description, url, contact, featured, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    String(b.title).trim(), String(b.edition || 'java'), String(b.listing_type || 'resource'),
    String(b.price || ''), String(b.availability || 'available'), String(b.description || ''),
    String(b.url || ''), String(b.contact || ''), b.featured ? 1 : 0, Number(b.sort_order || 0)
  );
  audit('minecraft_created', { target: `mc:${info.lastInsertRowid}`, result: 'success', detail: b.title.trim().slice(0, 60), ip: ownerIp(req) });
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

router.put('/minecraft/:id', requireOwner, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM minecraft_listings WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Listing not found' });
  const b = req.body || {};
  db.prepare(
    `UPDATE minecraft_listings SET title = ?, edition = ?, listing_type = ?, price = ?, availability = ?,
       description = ?, url = ?, contact = ?, featured = ?, sort_order = ?, updated_at = ? WHERE id = ?`
  ).run(
    String(b.title ?? row.title).trim(), String(b.edition ?? row.edition), String(b.listing_type ?? row.listing_type),
    String(b.price ?? row.price), String(b.availability ?? row.availability), String(b.description ?? row.description),
    String(b.url ?? row.url), String(b.contact ?? row.contact),
    b.featured != null ? (b.featured ? 1 : 0) : row.featured,
    Number(b.sort_order ?? row.sort_order), now(), id
  );
  audit('minecraft_updated', { target: `mc:${id}`, result: 'success', detail: (b.title ?? row.title).slice(0, 60), ip: ownerIp(req) });
  res.json({ ok: true });
});

router.delete('/minecraft/:id', requireOwner, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM minecraft_listings WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Listing not found' });
  db.prepare('DELETE FROM minecraft_listings WHERE id = ?').run(id);
  audit('minecraft_deleted', { target: `mc:${id}`, result: 'success', detail: row.title.slice(0, 60), ip: ownerIp(req) });
  res.json({ ok: true });
});

// ------------------------------- reward codes -------------------------------
router.get('/rewards', requireOwner, (req, res) => {
  const rows = db.prepare('SELECT * FROM reward_codes ORDER BY updated_at DESC').all();
  res.json({
    rewards: rows.map((r) => ({
      id: r.id, label: r.label, edition: r.edition, price: r.price,
      availability: r.availability, notes: r.notes, code_hint: r.code_hint || '',
      hasCode: !!r.code_encrypted, updatedAt: r.updated_at,
    })),
  });
});

router.post('/rewards', requireOwner, (req, res) => {
  const b = req.body || {};
  if (!b.label || !String(b.label).trim()) return res.status(400).json({ error: 'Label is required.' });
  const code = String(b.code || '');
  const encrypted = code ? encryptSecret(code) : '';
  const hint = code ? `${code.slice(0, 2)}••••••${code.slice(-2)}` : '';
  const info = db.prepare(
    `INSERT INTO reward_codes (label, code_encrypted, code_hint, edition, price, availability, notes, coin_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    String(b.label).trim(), encrypted, hint, String(b.edition || 'java'), String(b.price || ''),
    String(b.availability || 'available'), String(b.notes || ''),
    Math.max(0, Number.isFinite(Number(b.coin_cost)) ? Math.floor(Number(b.coin_cost)) : 0)
  );
  audit('reward_created', { target: `reward:${info.lastInsertRowid}`, result: 'success', detail: b.label.trim().slice(0, 60), ip: ownerIp(req) });
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

router.put('/rewards/:id', requireOwner, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM reward_codes WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Reward not found' });
  const b = req.body || {};
  const encrypted = b.code
    ? encryptSecret(b.code)
    : row.code_encrypted;
  const hint = b.code ? `${String(b.code).slice(0, 2)}••••••${String(b.code).slice(-2)}` : row.code_hint;
  db.prepare(
    `UPDATE reward_codes SET label = ?, code_encrypted = ?, code_hint = ?, edition = ?, price = ?,
       availability = ?, notes = ?, coin_cost = ?, updated_at = ? WHERE id = ?`
  ).run(
    String(b.label ?? row.label).trim(), encrypted, hint, String(b.edition ?? row.edition),
    String(b.price ?? row.price), String(b.availability ?? row.availability),
    String(b.notes ?? row.notes),
    Math.max(0, Number.isFinite(Number(b.coin_cost)) ? Math.floor(Number(b.coin_cost)) : Number(row.coin_cost || 0)),
    now(), id
  );
  audit('reward_updated', { target: `reward:${id}`, result: 'success', detail: (b.label ?? row.label).slice(0, 60), ip: ownerIp(req) });
  res.json({ ok: true });
});

router.post('/rewards/:id/reveal', requireOwner, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM reward_codes WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Reward not found' });
  const code = decryptSecret(row.code_encrypted);
  audit('reward_revealed', { target: `reward:${id}`, result: 'success', detail: row.label.slice(0, 60), ip: ownerIp(req) });
  res.json({ code: code || null });
});

router.delete('/rewards/:id', requireOwner, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM reward_codes WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Reward not found' });
  db.prepare('DELETE FROM reward_codes WHERE id = ?').run(id);
  audit('reward_deleted', { target: `reward:${id}`, result: 'success', detail: row.label.slice(0, 60), ip: ownerIp(req) });
  res.json({ ok: true });
});

// -------------------------------- shop items --------------------------------
const SHOP_CATEGORIES = ['reward', 'promo', 'giftcard', 'service', 'other'];
const SHOP_AVAILABILITY = ['available', 'coming_soon', 'sold_out'];

function shopBody(b) {
  return {
    category: SHOP_CATEGORIES.includes(b.category) ? b.category : 'other',
    title: String(b.title || '').trim(),
    description: String(b.description || '').trim(),
    price: String(b.price || '').trim(),
    availability: SHOP_AVAILABILITY.includes(b.availability) ? b.availability : 'available',
    link_url: String(b.link_url || '').trim(),
    coin_cost: Math.max(0, Number.isFinite(Number(b.coin_cost)) ? Math.floor(Number(b.coin_cost)) : 0),
    sort_order: Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 0,
  };
}

router.get('/shop-items', requireOwner, (req, res) => {
  const rows = db.prepare('SELECT * FROM shop_items ORDER BY sort_order ASC, created_at DESC').all();
  res.json({ items: rows });
});

router.post('/shop-items', requireOwner, (req, res) => {
  const item = shopBody(req.body || {});
  if (!item.title) return res.status(400).json({ error: 'Title is required.' });
  const info = db.prepare(
    `INSERT INTO shop_items (category, title, description, price, availability, link_url, coin_cost, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(item.category, item.title, item.description, item.price, item.availability, item.link_url, item.coin_cost, item.sort_order);
  audit('shop_item_created', { target: `shop:${info.lastInsertRowid}`, result: 'success', detail: item.title.slice(0, 60), ip: ownerIp(req) });
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

router.put('/shop-items/:id', requireOwner, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM shop_items WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Shop item not found' });
  const b = req.body || {};
  const merged = shopBody({
    category: b.category ?? row.category,
    title: b.title ?? row.title,
    description: b.description ?? row.description,
    price: b.price ?? row.price,
    availability: b.availability ?? row.availability,
    link_url: b.link_url ?? row.link_url,
    coin_cost: b.coin_cost ?? row.coin_cost,
    sort_order: b.sort_order ?? row.sort_order,
  });
  if (!merged.title) return res.status(400).json({ error: 'Title is required.' });
  db.prepare(
    `UPDATE shop_items SET category = ?, title = ?, description = ?, price = ?, availability = ?,
       link_url = ?, coin_cost = ?, sort_order = ?, updated_at = ? WHERE id = ?`
  ).run(merged.category, merged.title, merged.description, merged.price, merged.availability, merged.link_url, merged.coin_cost, merged.sort_order, now(), id);
  audit('shop_item_updated', { target: `shop:${id}`, result: 'success', detail: merged.title.slice(0, 60), ip: ownerIp(req) });
  res.json({ ok: true });
});

router.delete('/shop-items/:id', requireOwner, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM shop_items WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Shop item not found' });
  db.prepare('DELETE FROM shop_items WHERE id = ?').run(id);
  audit('shop_item_deleted', { target: `shop:${id}`, result: 'success', detail: row.title.slice(0, 60), ip: ownerIp(req) });
  res.json({ ok: true });
});

// ------------------------------ announcements ------------------------------
router.get('/announcements', requireOwner, (req, res) => {
  const rows = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();
  res.json({ announcements: rows });
});

router.post('/announcements', requireOwner, (req, res) => {
  const b = req.body || {};
  if (!b.title || !String(b.title).trim()) return res.status(400).json({ error: 'Title is required.' });
  const info = db.prepare(
    `INSERT INTO announcements (title, message, ann_type, start_date, end_date, active) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    String(b.title).trim(), String(b.message || ''), String(b.ann_type || 'website'),
    String(b.start_date || new Date().toISOString().slice(0, 10)),
    String(b.end_date || ''), b.active === false ? 0 : 1
  );
  audit('announcement_created', { target: `ann:${info.lastInsertRowid}`, result: 'success', detail: b.title.trim().slice(0, 60), ip: ownerIp(req) });
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

router.put('/announcements/:id', requireOwner, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Announcement not found' });
  const b = req.body || {};
  db.prepare(
    `UPDATE announcements SET title = ?, message = ?, ann_type = ?, start_date = ?, end_date = ?, active = ?, updated_at = ? WHERE id = ?`
  ).run(
    String(b.title ?? row.title).trim(), String(b.message ?? row.message), String(b.ann_type ?? row.ann_type),
    String(b.start_date ?? row.start_date), String(b.end_date ?? row.end_date),
    b.active !== undefined ? (b.active ? 1 : 0) : row.active, now(), id
  );
  audit('announcement_updated', { target: `ann:${id}`, result: 'success', detail: (b.title ?? row.title).slice(0, 60), ip: ownerIp(req) });
  res.json({ ok: true });
});

router.delete('/announcements/:id', requireOwner, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Announcement not found' });
  db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  audit('announcement_deleted', { target: `ann:${id}`, result: 'success', detail: row.title.slice(0, 60), ip: ownerIp(req) });
  res.json({ ok: true });
});

// -------------------------------- settings ----------------------------------
router.get('/settings', requireOwner, (req, res) => {
  const s = getSettings();
  const y = getYtSettings();
  res.json({
    social: { youtube: s.youtube, discord: s.discord, instagram: s.instagram, tiktok: s.tiktok, x: s.x, website: s.website },
    aiUrl: s.ai_url,
    logoUrl: s.logo_url,
    tagline: s.site_tagline,
    youtubeChannelId: y.channelId,
    apiConfigured: !!process.env.YOUTUBE_API_KEY,
  });
});

function cleanUrl(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

router.put('/settings', requireOwner, (req, res) => {
  const b = req.body || {};
  const social = b.social || {};
  setSetting('youtube', cleanUrl(social.youtube));
  setSetting('discord', cleanUrl(social.discord));
  setSetting('instagram', cleanUrl(social.instagram));
  setSetting('tiktok', cleanUrl(social.tiktok));
  setSetting('x', cleanUrl(social.x));
  setSetting('website', cleanUrl(social.website));
  setSetting('ai_url', cleanUrl(b.aiUrl));
  setSetting('logo_url', cleanUrl(b.logoUrl));
  setSetting('site_tagline', String(b.tagline ?? '').trim());
  audit('settings_updated', { result: 'success', detail: 'Social links / branding updated', ip: ownerIp(req) });
  res.json({ ok: true });
});

// -------------------------------- analytics ---------------------------------
router.get('/analytics', requireOwner, (req, res) => {
  const since = String(req.query.since || '14').replace(/[^0-9]/g, '');
  const days = Math.max(1, Math.min(90, Number(since) || 14));
  const views = db.prepare(
    `SELECT date(created_at) AS day, COUNT(*) AS count FROM analytics_events
     WHERE event_type = 'pageview' AND created_at >= datetime('now', ?)
     GROUP BY day ORDER BY day ASC`
  ).all(`-${days} days`);
  const clickSummary = db.prepare(
    `SELECT event_type, COUNT(*) AS count FROM analytics_events
     WHERE created_at >= datetime('now', ?) GROUP BY event_type ORDER BY count DESC`
  ).all(`-${days} days`);
  const topResources = db.prepare(
    `SELECT detail, COUNT(*) AS count FROM analytics_events
     WHERE event_type IN ('resource_click','video_click') AND created_at >= datetime('now', ?)
     GROUP BY detail ORDER BY count DESC LIMIT 10`
  ).all(`-${days} days`);
  const topSearch = db.prepare(
    `SELECT detail, COUNT(*) AS count FROM analytics_events
     WHERE event_type = 'search' AND created_at >= datetime('now', ?)
     GROUP BY detail ORDER BY count DESC LIMIT 10`
  ).all(`-${days} days`);
  const pages = db.prepare(
    `SELECT target, COUNT(*) AS count FROM analytics_events
     WHERE event_type = 'pageview' AND created_at >= datetime('now', ?)
     GROUP BY target ORDER BY count DESC LIMIT 15`
  ).all(`-${days} days`);
  const total = db.prepare(
    `SELECT COUNT(*) AS c FROM analytics_events WHERE created_at >= datetime('now', ?)`
  ).all(`-${days} days`)[0].c;
  res.json({ days, total, views, clickSummary, topResources, topSearch, pages });
});

// -------------------------------- audit logs --------------------------------
router.get('/audit-logs', requireOwner, (req, res) => {
  const limit = Math.min(200, Number(req.query.limit) || 100);
  const rows = db.prepare(
    `SELECT id, action, target, result, detail, ip, created_at FROM audit_logs
     ORDER BY id DESC LIMIT ?`
  ).all(limit);
  res.json({ logs: rows });
});

router.post('/audit-logs/clear', requireOwner, (req, res) => {
  db.prepare('DELETE FROM audit_logs').run();
  audit('audit_logs_cleared', { result: 'success', ip: ownerIp(req) });
  res.json({ ok: true });
});

// --------------------------------- backup ------------------------------------
router.get('/backup', requireOwner, (req, res) => {
  const tables = [
    'videos', 'resources', 'video_resources', 'minecraft_listings',
    'reward_codes', 'announcements', 'sensitivity_profiles',
    'youtube_settings', 'tiktok_settings', 'tiktok_accounts', 'tiktok_uploads',
    'settings', 'owners', 'audit_logs', 'analytics_events',
  ];
  const dump = {};
  for (const t of tables) {
    const exists = db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`
    ).get(t);
    if (exists) dump[t] = db.prepare(`SELECT * FROM "${t}"`).all();
  }
  const meta = {
    app: 'the-tech-guider-hub',
    exportedAt: new Date().toISOString(),
    counts: Object.fromEntries(Object.entries(dump).map(([k, rows]) => [k, rows.length])),
  };
  audit('backup_exported', { result: 'success', detail: `${Object.keys(dump).length} tables`, ip: ownerIp(req) });
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="tech-guider-backup-${new Date().toISOString().slice(0, 10)}.json"`
  );
  res.json({ meta, tables: dump });
});

module.exports = router;
module.exports.requireOwner = requireOwner;