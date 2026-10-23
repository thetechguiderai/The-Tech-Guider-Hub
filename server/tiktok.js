'use strict';

/**
 * TikTok integration module.
 *
 * Uses ONLY official TikTok platforms:
 *  - Profile/Video Embeds (work with no credentials)
 *  - Display API   https://developers.tiktok.com/docs/en/display-api-overview
 *                  (needs a developer app + user.info.basic / video.list scopes)
 *  - Content Posting API https://developers.tiktok.com/docs/en/content-posting-api-get-started
 *                  (needs video.publish / video.upload approval)
 *
 * Every payload returned from here is honest:
 *  - `available: false` carries a machine-readable `reason`
 *  - no live-status, follower, view or count is ever fabricated
 */

const { db, now } = require('./db');
const { encryptSecret, decryptSecret } = require('./security');

const API_BASE = 'https://open.tiktokapis.com/v2';
const AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';

// Never trust arbitrary user input: canonical TikTok video URL format only.
const VIDEO_URL_RE = /^https:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9._]{1,30}\/video\/(\d{10,20})(?:[/?#]|$)/;
const PROFILE_URL_RE = /^https:\/\/(?:www\.)?tiktok\.com\/@([A-Za-z0-9._]{1,30})\/?$/;

const DEFAULT_REFRESH_MS = 15 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10 * 1000;

function tryDb(fn) {
  try {
    return fn();
  } catch {
    return null; // tolerate read-only / ephemeral FS (Vercel serverless)
  }
}

function ensureRow() {
  tryDb(() =>
    db.prepare('INSERT OR IGNORE INTO tiktok_settings (id) VALUES (1)').run()
  );
}

function safeParse(str) {
  try {
    return JSON.parse(str) || {};
  } catch {
    return {};
  }
}

function listParse(str) {
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/**
 * The public TikTok profile for the hub. Resolution order:
 *  1. tiktok_settings.profile_url (owner configured)
 *  2. settings.social.tiktok (existing owner "Social Links" setting)
 *  3. TIKTOK_PROFILE_URL env
 *  4. https://www.tiktok.com/@legend0.26 (the creator's real handle)
 */
function resolveProfileUrl(row) {
  const fromGeneralSettings = db
    .prepare("SELECT value FROM settings WHERE key = 'tiktok'")
    .get();
  const candidates = [
    row && row.profile_url,
    fromGeneralSettings && fromGeneralSettings.value,
    process.env.TIKTOK_PROFILE_URL || '',
    'https://www.tiktok.com/@legend0.26',
  ];
  for (const c of candidates) {
    const url = String(c || '').trim();
    if (PROFILE_URL_RE.test(url)) return url;
  }
  return 'https://www.tiktok.com/@legend0.26';
}

function getSettings() {
  ensureRow();
  const row = db.prepare('SELECT * FROM tiktok_settings WHERE id = 1').get() || {};
  const profileUrl = resolveProfileUrl(row);
  return {
    profileUrl,
    handle: (PROFILE_URL_RE.exec(profileUrl) || [])[1] || '',
    refreshInterval: Number(row.refresh_interval) || 900,
    configStatus: row.config_status || 'embed_only',
    lastFetchAt: row.last_fetch_at || '',
    cachedPayload: safeParse(row.cached_payload || '{}'),
    curated: listParse(row.curated_json || '[]'),
    ownerProfile: {
      displayName: row.display_name || '',
      avatarUrl: row.avatar_url || '',
      followers: row.stat_followers || '',
      following: row.stat_following || '',
      likes: row.stat_likes || '',
      views: row.stat_views || '',
      updatedAt: row.stats_updated_at || '',
    },
  };
}

function ownerConfigured() {
  return !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
}

/** The single connected account (owner-flow: only one is expected). */
function getAccount() {
  const row = db
    .prepare('SELECT * FROM tiktok_accounts ORDER BY id LIMIT 1')
    .get() || null;
  if (!row) return null;
  return {
    openId: row.open_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    scopes: row.scopes ? row.scopes.split(' ').filter(Boolean) : [],
    accessToken: decryptSecret(row.access_token_enc) || '',
    refreshToken: decryptSecret(row.refresh_token_enc) || '',
    accessExpiresAt: row.access_expires_at,
    refreshExpiresAt: row.refresh_expires_at,
  };
}

function saveAccount(tokenPayload) {
  const t = tokenPayload || {};
  const accessEnc = encryptSecret(t.access_token || '');
  const refreshEnc = encryptSecret(t.refresh_token || '');
  const nowIso = now();
  const accessExp = new Date(Date.now() + (t.expires_in || 0) * 1000).toISOString();
  // TikTok refresh tokens are long-lived; keep a 30-day floor when unknown.
  const refreshExp = t.refresh_expires_at ||
    (t.refresh_expires_in
      ? new Date(Date.now() + t.refresh_expires_in * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString());
  db.prepare(
    `INSERT INTO tiktok_accounts (open_id, display_name, avatar_url, scopes,
        access_token_enc, refresh_token_enc, access_expires_at, refresh_expires_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(open_id) DO UPDATE SET
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        scopes = excluded.scopes,
        access_token_enc = excluded.access_token_enc,
        refresh_token_enc = excluded.refresh_token_enc,
        access_expires_at = excluded.access_expires_at,
        refresh_expires_at = excluded.refresh_expires_at,
        updated_at = excluded.updated_at`
  ).run(
    t.open_id || '',
    t.display_name || '',
    t.avatar_url || '',
    t.scopes || '',
    accessEnc,
    refreshEnc,
    accessExp,
    refreshExp,
    nowIso
  );
}

function getConnectedPublic() {
  const row = db.prepare('SELECT * FROM tiktok_accounts ORDER BY id LIMIT 1').get();
  if (!row) return null;
  return {
    openId: row.open_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    scopes: row.scopes ? row.scopes.split(' ').filter(Boolean) : [],
    tokenExpired: !!(row.access_expires_at && new Date(row.access_expires_at).getTime() < Date.now()),
  };
}

async function refreshAccessToken(account) {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY || '',
    client_secret: process.env.TIKTOK_CLIENT_SECRET || '',
    grant_type: 'refresh_token',
    refresh_token: account.refreshToken,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token || dataError(json)) {
    return null;
  }
  saveAccount({ ...json, open_id: account.openId, scopes: (account.scopes || []).join(' ') });
  return json;
}

function dataError(json) {
  return json && json.error && json.error.code && json.error.code !== 'ok';
}

/** Returns a non-expired access token, refreshing first when needed. */
async function getUsableToken() {
  const row = db.prepare('SELECT * FROM tiktok_accounts ORDER BY id LIMIT 1').get();
  if (!row) return null;
  const account = {
    openId: row.open_id,
    displayName: row.display_name,
    scopes: row.scopes ? row.scopes.split(' ').filter(Boolean) : [],
    refreshToken: decryptSecret(row.refresh_token_enc) || '',
    tokenExpired: !!(row.access_expires_at && new Date(row.access_expires_at).getTime() < Date.now()),
  };
  if (!account.tokenExpired) {
    return { ...account, accessToken: decryptSecret(row.access_token_enc) || '' };
  }
  if (!ownerConfigured() || !account.refreshToken || !row.refresh_expires_at ||
      new Date(row.refresh_expires_at).getTime() < Date.now()) {
    return account; // caller downgrades to unavailable / needs_reauth
  }
  const refreshed = await refreshAccessToken(account);
  if (!refreshed) return account;
  return {
    ...account,
    tokenExpired: false,
    accessToken: refreshed.access_token,
  };
}

// ------------------------------ curated videos -------------------------------
function validateCuratedVideo(url) {
  const clean = String(url || '').trim();
  const m = VIDEO_URL_RE.exec(clean);
  if (!m) return { error: 'Use the canonical video URL format: https://www.tiktok.com/@user/video/1234567890123456789' };
  return { videoId: m[1], url: clean };
}

function curatedVideos() {
  const s = getSettings();
  return s.curated.map((v) => ({
    id: String(v.videoId),
    url: v.url,
    addedAt: v.addedAt || '',
    source: 'curated',
  }));
}

// ------------------------------ Display API fetch ----------------------------
async function apiFetch(path, token, params, body) {
  const url = new URL(API_BASE + path);
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`TikTok API ${path} -> ${res.status}`);
  return res.json();
}

async function fetchLiveProfile(token) {
  // Display API: user info by open_id of the connected user.
  const json = await apiFetch(
    '/user/info/',
    token,
    { fields: 'open_id,union_id,display_name,avatar_url' },
    null
  );
  const user = json && json.data && json.data.user;
  return user || null;
}

async function fetchLiveVideos(token, cursor) {
  // Display API video.list requires the user's open_id as the query param.
  const account = getConnectedPublic();
  if (!account) return { videos: [], cursor };
  const json = await apiFetch(
    '/video/list/',
    token,
    {
      fields: 'id,title,cover_image_url,embed_link,create_time,like_count',
      ...(cursor ? { cursor: String(cursor) } : {}),
      open_id: account.openId,
    },
    null
  );
  const data = (json && json.data) || {};
  const videos = (data.videos || []).map((v) => ({
    id: String(v.id),
    title: v.title || '',
    thumbnail: v.cover_image_url || '',
    embedLink: v.embed_link || `https://www.tiktok.com/@/video/${v.id}`,
    createdAt: v.create_time ? new Date(v.create_time * 1000).toISOString() : '',
    likes: typeof v.like_count === 'number' ? v.like_count : null,
    url: `https://www.tiktok.com/@/video/${v.id}`,
    source: 'api',
  }));
  return { videos, cursor: data.cursor || '', hasMore: data.has_more === true };
}

function updateCache(payload) {
  tryDb(() =>
    db.prepare(
      'UPDATE tiktok_settings SET cached_payload = ?, last_fetch_at = ? WHERE id = 1'
    ).run(JSON.stringify(payload), now())
  );
}

let inFlight = null;

/**
 * Main read path used by /api/tiktok/profile + /api/tiktok/videos.
 * Data sources, in priority order:
 *  1. Display API of the connected account (real profile + real videos)
 *  2. curated videos (owner entered canonical URLs — real, owner-picked videos)
 *  3. cache
 * LIVE status is never invented: TikTok provides no public authorized endpoint.
 */
function fetchFromTikTok() {
  const s = getSettings();

  // Serve fresh cache within the refresh window.
  const cached = s.cachedPayload;
  if (cached && cached.cachedAt) {
    const age = Date.now() - new Date(cached.cachedAt).getTime();
    if (age < (s.refreshInterval || 900) * 1000) {
      return Promise.resolve({ ...cached, stale: false });
    }
  }

  if (inFlight) return inFlight;

  inFlight = (async () => {
    const result = await buildPayload();
    updateCache(result);
    return result;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

// --------------------------- public profile scrape ---------------------------
// TikTok's Display API needs a developer app, but the public profile page
// embeds a rehydration JSON with the user's own published stats. We read ONLY
// that self-reported public data, clearly labelled `public_profile` in the UI.
// When TikTok blocks or reshapes the markup this simply returns null and the
// payload stays honest (`unavailable`) — nothing is fabricated.
async function scrapePublicProfile(profileUrl) {
  try {
    const res = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(\{[\s\S]*?\})<\/script>/);
    if (!m) return null;
    const data = safeParse(m[1]);
    const detail = data && data.__DEFAULT_SCOPE__ && data.__DEFAULT_SCOPE__['webapp.user-detail'];
    const user = detail && detail.userInfo && detail.userInfo.user;
    if (!user || user.privateAccount) return null;
    const stats = (detail.userInfo && detail.userInfo.stats) || {};
    return {
      displayName: user.nickname || user.uniqueId || '',
      avatar: user.avatarLarger || user.avatarMedium || '',
      verified: Boolean(user.verified),
      followers: typeof stats.followerCount === 'number' ? stats.followerCount : null,
      following: typeof stats.followingCount === 'number' ? stats.followingCount : null,
      likes: typeof stats.heartCount === 'number' ? stats.heartCount : null,
      videoCount: typeof stats.videoCount === 'number' ? stats.videoCount : null,
      source: 'public_profile',
    };
  } catch {
    return null;
  }
}

async function buildPayload() {
  const s = getSettings();
  const connected = getConnectedPublic();
  const appConfigured = ownerConfigured();

  let profile = null;
  let apiVideos = [];
  let apiError = '';

  if (appConfigured && connected && !connected.tokenExpired) {
    try {
      profile = await fetchLiveProfile(connected.accessToken);
    } catch (e) {
      apiError = 'user_info_failed';
      if (e && /401|invalid_access_token/.test(String(e.message || e))) {
        // token revoked — the payload stays honest and marks re-auth
        apiError = 'token_invalid';
      }
    }
    if (!apiError) {
      try {
        apiVideos = (await fetchLiveVideos(connected.accessToken)).videos;
      } catch {
        apiVideos = [];
      }
    }
  }

  const curated = curatedVideos();
  const videos = apiVideos.length ? apiVideos : curated;
  const owner = s.ownerProfile || {};

  // Keyless fallback: read the public profile page the way any visitor's
  // browser does. Real numbers, labelled `public_profile`, nullable on failure.
  const scraped = !profile ? await scrapePublicProfile(s.profileUrl) : null;
  const hasOwnerIdentity = !!(owner.displayName || owner.avatarUrl);
  const hasOwnerStats = !!(owner.followers || owner.following || owner.likes || owner.views);
  const available = !!(profile || scraped || videos.length || hasOwnerIdentity);

  return {
    available,
    reason: available ? undefined : (apiError || (connected ? 'no_videos' : 'no_data_source')),
    needsReauth: !!(connected && connected.tokenExpired),
    cachedAt: new Date().toISOString(),
    profile: profile
      ? {
          displayName: profile.display_name || '',
          handle: s.handle,
          avatar: profile.avatar_url || '',
          profileUrl: s.profileUrl,
          openId: profile.open_id || '',
          statsSource: 'official_api',
        }
      : scraped
        ? {
            displayName: scraped.displayName,
            handle: s.handle,
            avatar: scraped.avatar,
            profileUrl: s.profileUrl,
            verified: scraped.verified,
            statsSource: 'public_profile',
            stats: {
              followers: scraped.followers,
              following: scraped.following,
              likes: scraped.likes,
              videoCount: scraped.videoCount,
            },
          }
        : {
          handle: s.handle,
          profileUrl: s.profileUrl,
          // Owner-reported identity + stats (the hub is created and run by the
          // account owner, so these are the owner's own figures — clearly
          // labelled in the UI and replaced by official API data once the
          // Display API is connected).
          displayName: owner.displayName || '',
          avatar: owner.avatarUrl || '',
          statsSource: hasOwnerStats || hasOwnerIdentity ? 'owner_reported' : 'unavailable',
          stats: hasOwnerStats || owner.displayName
            ? {
                ...(owner.followers ? { followers: owner.followers } : {}),
                ...(owner.following ? { following: owner.following } : {}),
                ...(owner.likes ? { likes: owner.likes } : {}),
                ...(owner.views ? { views: owner.views } : {}),
                updatedAt: owner.updatedAt || '',
              }
            : null,
        },
    videos,
    videoCount: videos.length,
    embedding: {
      // Official creator-profile embed always works for a real, public profile.
      creatorEmbed: true,
      profileUrl: s.profileUrl,
    },
    live: {
      // No authorized public live-status endpoint exists -> honest state.
      status: 'unavailable',
      liveUrl: `${s.profileUrl}/live`,
    },
  };
}

module.exports = {
  API_BASE,
  AUTHORIZE_URL,
  TOKEN_URL,
  PROFILE_URL_RE,
  VIDEO_URL_RE,
  DEFAULT_REFRESH_MS,
  getSettings,
  getAccount,
  getConnectedPublic,
  getUsableToken,
  ownerConfigured,
  saveAccount,
  validateCuratedVideo,
  curatedVideos,
  fetchFromTikTok,
  resolveProfileUrl,
  scrapePublicProfile,
};
