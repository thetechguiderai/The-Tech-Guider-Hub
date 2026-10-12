'use strict';

const express = require('express');
const crypto = require('node:crypto');
const { db, getSettings, setSetting, now } = require('../db');
const { fetchFromYouTube } = require('../youtube');
const { generate } = require('../sensitivity');
const { ipHash, rateLimit } = require('../security');

const router = express.Router();

// ------------------------------- bootstrap ----------------------------------
router.get('/bootstrap', (req, res) => {
  const s = getSettings();
  const announcements = db.prepare(
    `SELECT id, title, message, ann_type, start_date, end_date FROM announcements
     WHERE active = 1 AND start_date <= date('now')
       AND (end_date = '' OR end_date >= date('now'))
     ORDER BY created_at DESC`
  ).all();
  res.json({
    siteName: 'The Tech Guider Hub',
    tagline: s.site_tagline || 'Everything from The Tech Guider, in one place.',
    social: {
      youtube: s.youtube || '',
      discord: s.discord || '',
      instagram: s.instagram || '',
      tiktok: s.tiktok || '',
      x: s.x || '',
      website: s.website || '',
    },
    aiUrl: s.ai_url || '',
    logoUrl: s.logo_url || '',
    announcements,
  });
});

// --------------------------------- videos -----------------------------------
function videoRow(row) {
  const resources = db.prepare(
    `SELECT r.id, r.name, r.url, r.logo, r.description, r.category, r.featured
     FROM video_resources vr JOIN resources r ON r.id = vr.resource_id
     WHERE vr.video_id = ? ORDER BY vr.sort_order ASC, r.sort_order ASC`
  ).all(row.id);
  return {
    id: row.id,
    title: row.title,
    thumbnail: row.thumbnail,
    youtubeUrl: row.youtube_url,
    description: row.description,
    category: row.category,
    status: row.status,
    releaseDate: row.release_date,
    featured: !!row.featured,
    resources,
    clicks: row.clicks || 0,
    updatedAt: row.updated_at,
  };
}

router.get('/videos', async (req, res) => {
  // Database videos always come first (published + coming soon).
  const rows = db.prepare(
    `SELECT v.*, COALESCE(SUM(r.clicks), 0) AS clicks
     FROM videos v
     LEFT JOIN video_resources vr ON vr.video_id = v.id
     LEFT JOIN resources r ON r.id = vr.resource_id
     WHERE v.status IN ('published', 'coming_soon')
     GROUP BY v.id
     ORDER BY (v.status = 'coming_soon') DESC, v.sort_order ASC, v.updated_at DESC`
  ).all();
  const videos = rows.map(videoRow);

  // When the channel is live, also surface the latest YouTube upload.
  const youtubeResult = await fetchFromYouTube();
  if (youtubeResult.available && youtubeResult.latestVideo) {
    const v = youtubeResult.latestVideo;
    const already = videos.some((x) => x.youtubeUrl && x.youtubeUrl === v.url);
    if (!already) {
      const resources = db.prepare(
        `SELECT r.id, r.name, r.url, r.logo, r.description, r.category, r.featured
         FROM video_resources vr JOIN resources r ON r.id = vr.resource_id
         WHERE vr.video_id = ? ORDER BY vr.sort_order ASC, r.sort_order ASC`
      ).all(v.id);
      videos.push({
        id: 'yt-latest-' + v.id,
        title: v.title,
        thumbnail: v.thumbnail,
        youtubeUrl: v.url,
        description: v.title,
        category: 'Latest',
        status: 'published',
        releaseDate: v.publishedAt,
        featured: false,
        resources,
        clicks: 0,
        updatedAt: new Date().toISOString(),
        isYouTubeApi: true,
      });
    }
  }

  res.json({ videos });
});

router.get('/videos/:id', async (req, res) => {
  const raw = String(req.params.id);

  // YouTube-powered video (surfaced from the live channel).
  if (raw.startsWith('yt-latest-')) {
    const youtubeResult = await fetchFromYouTube();
    const v = youtubeResult && youtubeResult.available && youtubeResult.latestVideo;
    if (!v || raw !== 'yt-latest-' + v.id) {
      return res.status(404).json({ error: 'Video not found' });
    }
    const resources = db.prepare(
      `SELECT r.id, r.name, r.url, r.logo, r.description, r.category, r.featured
       FROM video_resources vr JOIN resources r ON r.id = vr.resource_id
       WHERE vr.video_id = ? ORDER BY vr.sort_order ASC, r.sort_order ASC`
    ).all(v.id);
    return res.json({
      video: {
        id: raw,
        title: v.title,
        thumbnail: v.thumbnail,
        youtubeUrl: v.url,
        description: v.title,
        category: 'Latest',
        status: 'published',
        releaseDate: v.publishedAt,
        featured: false,
        resources,
        clicks: 0,
        updatedAt: new Date().toISOString(),
        isYouTubeApi: true,
      },
    });
  }

  const id = Number(raw);
  const row = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
  if (!row || !['published', 'coming_soon'].includes(row.status)) {
    return res.status(404).json({ error: 'Video not found' });
  }
  const data = videoRow(row);
  if (req.query.track === '1') {
    db.prepare(
      'INSERT INTO analytics_events (event_type, target, detail, ip_hash) VALUES (?, ?, ?, ?)'
    ).run('video_view', String(id), row.title, ipHash(req.ip || 'unknown'));
  }
  res.json({ video: data });
});

// -------------------------------- resources ---------------------------------
router.get('/resources', (req, res) => {
  let rows;
  if (req.query.video) {
    rows = db.prepare(
      `SELECT r.* FROM video_resources vr
       JOIN resources r ON r.id = vr.resource_id
       WHERE vr.video_id = ? ORDER BY vr.sort_order ASC, r.sort_order ASC`
    ).all(Number(req.query.video));
  } else {
    rows = db.prepare('SELECT * FROM resources ORDER BY featured DESC, sort_order ASC, name ASC').all();
  }
  res.json({ resources: rows.map((r) => ({ ...r, clicks: r.clicks || 0 })) });
});

router.post('/resources/:id/click', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Resource not found' });
  db.prepare('UPDATE resources SET clicks = clicks + 1 WHERE id = ?').run(id);
  db.prepare(
    'INSERT INTO analytics_events (event_type, target, detail, ip_hash) VALUES (?, ?, ?, ?)'
  ).run('resource_click', String(id), row.name, ipHash(req.ip || 'unknown'));
  res.json({ ok: true, clicks: row.clicks + 1 });
});

// -------------------------------- minecraft ---------------------------------
router.get('/minecraft', (req, res) => {
  const rows = db.prepare(
    `SELECT id, title, edition, listing_type, price, availability, description, url, contact, featured, sort_order
     FROM minecraft_listings ORDER BY featured DESC, sort_order ASC, created_at DESC`
  ).all();
  res.json({ listings: rows });
});

// ------------------------------- sensitivities ------------------------------
router.post('/sensitivity/generate', rateLimit, (req, res) => {
  const body = req.body || {};
  try {
    const result = generate(body);
    db.prepare(
      'INSERT INTO analytics_events (event_type, target, detail, ip_hash) VALUES (?, ?, ?, ?)'
    ).run('tool_usage', 'free_fire_sensitivity', `${body.deviceType || '?'}`, ipHash(req.ip || 'unknown'));
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'Unable to generate sensitivity settings.', detail: String(err.message) });
  }
});

// ------------------------------- youtube stats ------------------------------
router.get('/youtube-stats', async (req, res) => {
  const result = await fetchFromYouTube();
  res.json(result);
});

// ------------------------------ announcements -------------------------------
router.get('/announcements', (req, res) => {
  const rows = db.prepare(
    `SELECT id, title, message, ann_type, start_date, end_date FROM announcements
     WHERE active = 1 AND start_date <= date('now')
       AND (end_date = '' OR end_date >= date('now'))
     ORDER BY created_at DESC`
  ).all();
  res.json({ announcements: rows });
});

// ---------------------------------- search ----------------------------------
router.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const results = { query: q, videos: [], resources: [], minecraft: [], tools: [] };

  if (!q) return res.json(results);

  db.prepare(
    'INSERT INTO analytics_events (event_type, target, detail, ip_hash) VALUES (?, ?, ?, ?)'
  ).run('search', q, '', ipHash(req.ip || 'unknown'));

  const videos = db.prepare(
    `SELECT v.*, COALESCE(SUM(r.clicks), 0) AS clicks FROM videos v
     LEFT JOIN video_resources vr ON vr.video_id = v.id
     LEFT JOIN resources r ON r.id = vr.resource_id
     WHERE v.status IN ('published','coming_soon') AND (v.title LIKE ? OR v.description LIKE ? OR v.category LIKE ?)
     GROUP BY v.id ORDER BY v.updated_at DESC`
  ).all(`%${q}%`, `%${q}%`, `%${q}%`);
  results.videos = videos.map(videoRow);

  const resources = db.prepare(
    `SELECT * FROM resources WHERE name LIKE ? OR description LIKE ? OR category LIKE ? ORDER BY featured DESC, sort_order ASC`
  ).all(`%${q}%`, `%${q}%`, `%${q}%`);
  results.resources = resources.map((r) => ({ ...r, clicks: r.clicks || 0 }));

  const mc = db.prepare(
    `SELECT * FROM minecraft_listings WHERE title LIKE ? OR description LIKE ? OR edition LIKE ? OR listing_type LIKE ? ORDER BY featured DESC, sort_order ASC`
  ).all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  results.minecraft = mc;

  const toolKeywords = [
    ['free fire sensitivity generator', ['freefire', 'free fire', 'sensitivity', 'generator', 'ff']],
    ['free fire id sale & purchase', ['ff id', 'free fire id', 'sell', 'sale', 'buy', 'purchase', 'account']],
    ['free fire rank push', ['rank push', 'boost', 'rank']],
    ['minecraft hub', ['minecraft', 'mc', 'java', 'bedrock']],
    ['tech guider ai', ['ai', 'chat', 'assistant', 'tech guider ai']],
    ['youtube stats', ['stats', 'subscribers', 'views', 'youtube', 'channel']],
    ['video resources', ['resources', 'video']],
    ['video editing packages', ['video editing', 'edit', 'shorts', 'reels', 'editing']],
  ];
  for (const [name, keys] of toolKeywords) {
    if (keys.some((k) => q.includes(k))) {
      results.tools.push({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, route: toolRoute(name) });
    }
  }
  results.tools = dedupe(results.tools, 'name');
  res.json(results);
});

function toolRoute(name) {
  const map = {
    'free fire sensitivity generator': '/free-fire-sensitivity',
    'free fire id sale & purchase': '/free-fire-sensitivity?tab=sale',
    'free fire rank push': '/free-fire-sensitivity?tab=rank',
    'minecraft hub': '/minecraft',
    'tech guider ai': '/ai',
    'youtube stats': '/#youtube-stats',
    'video resources': '/resources',
    'video editing packages': '/video-editing-packages',
  };
  return map[name] || '/tools';
}

function dedupe(arr, key) {
  const seen = new Set();
  return arr.filter((x) => (seen.has(x[key]) ? false : (seen.add(x[key]), true)));
}

// --------------------------------- analytics --------------------------------
router.post('/analytics', (req, res) => {
  const { type, target, detail } = req.body || {};
  const types = ['pageview', 'resource_click', 'video_click', 'tool_usage', 'search'];
  if (!types.includes(type)) return res.status(400).json({ error: 'Invalid analytics type' });
  db.prepare(
    'INSERT INTO analytics_events (event_type, target, detail, ip_hash) VALUES (?, ?, ?, ?)'
  ).run(type, String(target || ''), String(detail || '').slice(0, 200), ipHash(req.ip || 'unknown'));
  res.json({ ok: true });
});

module.exports = router;