'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dataDir = path.join(__dirname, '..', 'data');
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
);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events (event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_target ON analytics_events (target);

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
`);

const now = () => new Date().toISOString();

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
  discord: '',
  instagram: '',
  tiktok: '',
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

module.exports = { db, dbPath, now, getSettings, setSetting, DEFAULT_SETTINGS };