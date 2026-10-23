'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// On serverless hosts (Vercel) the filesystem is read-only except /tmp, and the
// DB is ephemeral — point SQLite at /tmp so it can create and write the file.
const dataDir = process.env.VERCEL
  ? '/tmp/hub-data'
  : path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.NODE_ENV === 'test'
  ? path.join(dataDir, 'test-hub.db')
  : path.join(dataDir, 'hub.db');

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS owners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  thumbnail TEXT DEFAULT '',
  youtube_url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'coming_soon',
  release_date TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos (status, sort_order);
CREATE INDEX IF NOT EXISTS idx_videos_title ON videos (title);

CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT DEFAULT '',
  logo TEXT DEFAULT '',
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'General',
  featured INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_resources_name ON resources (name);
CREATE INDEX IF NOT EXISTS idx_resources_sort ON resources (sort_order);

CREATE TABLE IF NOT EXISTS video_resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_vr_video ON video_resources (video_id, sort_order);

CREATE TABLE IF NOT EXISTS youtube_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  channel_id TEXT NOT NULL DEFAULT '',
  refresh_interval INTEGER NOT NULL DEFAULT 900,
  featured_video TEXT NOT NULL DEFAULT '',
  config_status TEXT NOT NULL DEFAULT 'not_configured',
  last_fetch_at TEXT NOT NULL DEFAULT '',
  cached_stats TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS sensitivity_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  device_type TEXT NOT NULL,
  brand TEXT DEFAULT '',
  device_model TEXT DEFAULT '',
  ram TEXT DEFAULT '',
  dpi TEXT DEFAULT '',
  resolution TEXT DEFAULT '',
  refresh_rate TEXT DEFAULT '',
  play_style TEXT DEFAULT 'balanced',
  performance_class TEXT DEFAULT 'mid',
  values_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sens_type ON sensitivity_profiles (device_type, play_style);

CREATE TABLE IF NOT EXISTS minecraft_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  edition TEXT NOT NULL DEFAULT 'java',
  listing_type TEXT NOT NULL DEFAULT 'resource',
  price TEXT DEFAULT '',
  availability TEXT NOT NULL DEFAULT 'available',
  description TEXT DEFAULT '',
  url TEXT DEFAULT '',
  contact TEXT DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mc_edition ON minecraft_listings (edition, listing_type);

CREATE TABLE IF NOT EXISTS reward_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  code_encrypted TEXT NOT NULL DEFAULT '',
  code_hint TEXT NOT NULL DEFAULT '',
  edition TEXT NOT NULL DEFAULT 'java',
  price TEXT DEFAULT '',
  availability TEXT NOT NULL DEFAULT 'available',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  message TEXT DEFAULT '',
  ann_type TEXT NOT NULL DEFAULT 'website',
  start_date TEXT NOT NULL DEFAULT (date('now')),
  end_date TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  target TEXT DEFAULT '',
  detail TEXT DEFAULT '',
  ip_hash TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events (event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_target ON analytics_events (target);

CREATE TABLE IF NOT EXISTS shop_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  price TEXT DEFAULT '',
  availability TEXT NOT NULL DEFAULT 'available',
  link_url TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shop_cat ON shop_items (category, sort_order);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  target TEXT DEFAULT '',
  result TEXT NOT NULL DEFAULT 'success',
  detail TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs (created_at);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS owner_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL,
  failed_at TEXT NOT NULL DEFAULT (datetime('now')),
  lockout_until TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_owner_failures_ip ON owner_failures (ip_hash);

-- ---- TikTok integration (backward compatible: safe on existing DBs) --------
-- Public settings + curated canonical video list + cache for real API data.
CREATE TABLE IF NOT EXISTS tiktok_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  profile_url TEXT NOT NULL DEFAULT '',
  display_handle TEXT NOT NULL DEFAULT '',
  total_shares_enabled INTEGER NOT NULL DEFAULT 1,
  refresh_interval INTEGER NOT NULL DEFAULT 900,
  config_status TEXT NOT NULL DEFAULT 'embed_only',
  last_fetch_at TEXT NOT NULL DEFAULT '',
  cached_payload TEXT NOT NULL DEFAULT '{}',
  curated_json TEXT NOT NULL DEFAULT '[]',
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  stat_followers TEXT NOT NULL DEFAULT '',
  stat_following TEXT NOT NULL DEFAULT '',
  stat_likes TEXT NOT NULL DEFAULT '',
  stat_views TEXT NOT NULL DEFAULT '',
  stats_updated_at TEXT NOT NULL DEFAULT ''
);

-- One connected TikTok creator account (tokens stored encrypted, never logged).
CREATE TABLE IF NOT EXISTS tiktok_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  open_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  scopes TEXT NOT NULL DEFAULT '',
  access_token_enc TEXT NOT NULL DEFAULT '',
  refresh_token_enc TEXT NOT NULL DEFAULT '',
  access_expires_at TEXT NOT NULL DEFAULT '',
  refresh_expires_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Content Posting API jobs (real statuses only; never fabricated).
CREATE TABLE IF NOT EXISTS tiktok_uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  publish_id TEXT NOT NULL DEFAULT '',
  open_id TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  privacy TEXT NOT NULL DEFAULT 'SELF_ONLY',
  status TEXT NOT NULL DEFAULT 'queued',
  status_detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tiktok_uploads_status ON tiktok_uploads (status);
`);

const now = () => new Date().toISOString();

// Backward-compatible column migration for databases created before the
// owner-reported TikTok profile stats existed.
function addColumnIfMissing(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }
}
[
  ['tiktok_settings', 'display_name', "TEXT NOT NULL DEFAULT ''"],
  ['tiktok_settings', 'avatar_url', "TEXT NOT NULL DEFAULT ''"],
  ['tiktok_settings', 'stat_followers', "TEXT NOT NULL DEFAULT ''"],
  ['tiktok_settings', 'stat_following', "TEXT NOT NULL DEFAULT ''"],
  ['tiktok_settings', 'stat_likes', "TEXT NOT NULL DEFAULT ''"],
  ['tiktok_settings', 'stat_views', "TEXT NOT NULL DEFAULT ''"],
  ['tiktok_settings', 'stats_updated_at', "TEXT NOT NULL DEFAULT ''"],
].forEach(([t, c, d]) => addColumnIfMissing(t, c, d));

// One-time defaults for the creator's own card, exactly as reported by the
// owner. Editable any time in Owner Dashboard -> TikTok. Displayed to the
// public as "owner-reported" data until the official API takes over.
try {
  db.prepare(
    `INSERT OR IGNORE INTO tiktok_settings (id) VALUES (1)`
  ).run();
  db.prepare(
    `UPDATE tiktok_settings
       SET display_name = ?, stat_followers = ?, stat_following = ?, stat_likes = ?,
           stat_views = ?, stats_updated_at = ?
     WHERE (display_name = '' AND stat_followers = '')`
  ).run('乂ɴɪɢʜᴛᴍᴀʀᴇ乂', '65', '15', '3,531', '34.4K', now());
} catch {
  /* tolerate read-only FS (Vercel serverless) */
}

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const row of rows) out[row.key] = row.value;
  return out;
}

function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, String(value));
}

const DEFAULT_SETTINGS = {
  youtube: 'https://www.youtube.com/@thetechguider01',
  discord: 'https://discord.gg/dczyhM8ZwV',
  instagram: 'https://www.instagram.com/legend0.26/',
  tiktok: 'https://www.tiktok.com/@legend0.26',
  x: '',
  website: '',
  ai_url: '',
  logo_url: '',
  site_tagline: 'Everything from The Tech Guider, in one place.',
};

function ensureDefaults() {
  const existing = getSettings();
  db.prepare(
    `INSERT OR IGNORE INTO youtube_settings (id, channel_id, refresh_interval, featured_video, config_status, cached_stats)
     VALUES (1, '', 900, '', 'not_configured', '{}')`
  ).run();
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    if (!(k in existing)) setSetting(k, v);
  }
}

ensureDefaults();

module.exports = { db, dbPath, dataDir, now, getSettings, setSetting, DEFAULT_SETTINGS };