'use strict';

/**
 * TikTok routes. Mounted at /api/tiktok (see server/index.js).
 *
 * Public endpoints serve REAL data only — official profile/video embeds data,
 * Display API data of the connected account, and owner-curated canonical video
 * URLs. Owner endpoints are protected by the existing owner session
 * (requireOwner) plus OAuth state (CSRF) for the authentication round-trip.
 */

const express = require('express');
const crypto = require('node:crypto');
const multer = require('multer');
const { db, now } = require('../db');
const {
  AUTHORIZE_URL, TOKEN_URL, PROFILE_URL_RE,
  getSettings, getConnectedPublic, getUsableToken, fetchFromTikTok, ownerConfigured,
  saveAccount, validateCuratedVideo,
} = require('../tiktok');
const { requireOwner } = require('./owner');
const { audit, encryptSecret, decryptSecret, rateLimit, getCookies } = require('../security');

const router = express.Router();


// Direct post upload cap on this server (TikTok itself allows up to 1 GB).
const MAX_VIDEO_BYTES = 256 * 1024 * 1024;
const UPLOAD = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES, files: 1 },
});

function publicProfileBase() {
  return getSettings().profileUrl || 'https://www.tiktok.com/@legend0.26';
}

/**
 * TikTok exposes no authorized public LIVE-status endpoint for standard apps,
 * so the honest answer is "unavailable" — a fabricated boolean is never sent.
 */
router.get('/live', (req, res) => {
  const base = publicProfileBase();
  res.json({
    status: 'unavailable',
    message:
      'Live status is unavailable: TikTok does not provide an authorized public live-status endpoint for this integration.',
    openUrl: `${base}/live`,
  });
});

// ------------------------------- profile + videos ----------------------------
router.get('/profile', async (req, res) => {
  try {
    res.json(await fetchFromTikTok());
  } catch {
    res.status(502).json({
      available: false,
      reason: 'fetch_failed',
      message: 'TikTok data could not be loaded right now.',
    });
  }
});

router.get('/videos', async (req, res) => {
  try {
    const p = await fetchFromTikTok();
    res.json({ available: p.available, videos: p.videos || [], profile: p.profile });
  } catch {
    res.json({ available: false, videos: [] });
  }
});

// --------------------------------- owner config ------------------------------
router.get('/config', requireOwner, (req, res) => {
  const s = getSettings();
  const connected = getConnectedPublic();
  res.json({
    profileUrl: s.profileUrl,
    handle: s.handle,
    refreshInterval: s.refreshInterval,
    curated: s.curated,
    displayName: s.ownerProfile.displayName,
    avatarUrl: s.ownerProfile.avatarUrl,
    stats: {
      followers: s.ownerProfile.followers,
      following: s.ownerProfile.following,
      likes: s.ownerProfile.likes,
      views: s.ownerProfile.views,
      updatedAt: s.ownerProfile.updatedAt,
    },
    appConfigured: ownerConfigured(),
    connected: connected
      ? { displayName: connected.displayName, scopes: connected.scopes, tokenExpired: connected.tokenExpired }
      : null,
    capabilities: {
      displayApi: ownerConfigured() && !!connected && !connected.tokenExpired,
      // Direct posting / draft upload depend on TikTok developer-app approval;
      // until then these honestly stay false regardless of local code.
      directPostApproved: ownerConfigured() && !!connected && (connected.scopes || []).includes('video.publish'),
      draftUploadApproved: ownerConfigured() && !!connected && (connected.scopes || []).includes('video.upload'),
      liveStatus: 'unavailable',
    },
  });
});

router.put('/config', requireOwner, (req, res) => {
  const b = req.body || {};
  const errors = [];
  const profileUrl = String(b.profileUrl || '').trim();
  if (profileUrl && !PROFILE_URL_RE.test(profileUrl)) {
    errors.push('The profile URL must be a canonical https://www.tiktok.com/@handle URL.');
  }

  const list = Array.isArray(b.curated) ? b.curated : [];
  const curated = [];
  const seenIds = new Set();
  for (const item of list) {
    const v = validateCuratedVideo(item && typeof item === 'object' ? item.url : item);
    if (v.error) {
      errors.push(String(typeof item === 'object' ? item.url : item).slice(0, 90) + ' — ' + v.error);
      continue;
    }
    if (seenIds.has(v.videoId)) continue;
    seenIds.add(v.videoId);
    curated.push({ videoId: v.videoId, url: v.url, addedAt: now() });
  }
  if (errors.length) return res.status(400).json({ error: errors[0], errors });

  // Owner-reported profile card (labelled as owner-reported in the UI; shows
  // exactly what the owner enters and is replaced by official API data later).
  const displayName = String(b.displayName || '').slice(0, 60).trim();
  const avatarUrl = String(b.avatarUrl || '').slice(0, 500).trim();
  const cleanStat = (v) => String(v === 0 ? '0' : v || '').trim().slice(0, 24);
  const stats = b.stats || {};
  const updatedAt = anyOwnerStatSet(stats, displayName, avatarUrl) ? now() : String(stats.updatedAt || '');

  db.prepare(
    `UPDATE tiktok_settings SET profile_url = ?, refresh_interval = ?, curated_json = ?,
        display_name = ?, avatar_url = ?, stat_followers = ?, stat_following = ?,
        stat_likes = ?, stat_views = ?, stats_updated_at = ? WHERE id = 1`
  ).run(
    profileUrl,
    Math.max(300, Number(b.refreshInterval) || 900),
    JSON.stringify(curated),
    displayName,
    avatarUrl,
    cleanStat(stats.followers),
    cleanStat(stats.following),
    cleanStat(stats.likes),
    cleanStat(stats.views),
    updatedAt
  );
  // Invalidate the cache so the next public read reflects the new list.
  db.prepare('UPDATE tiktok_settings SET cached_payload = ? WHERE id = 1').run('{}');
  audit('tiktok_config_updated', {
    target: 'tiktok',
    result: 'success',
    detail: `${curated.length} curated video${curated.length === 1 ? '' : 's'}`,
    ip: req.ip,
  });
  res.json({ ok: true, curated });
});

function anyOwnerStatSet(stats, displayName, avatarUrl) {
  return !!(displayName || avatarUrl || stats.followers || stats.following || stats.likes || stats.views);
}

router.post('/refresh', requireOwner, async (req, res) => {
  const payload = await fetchFromTikTok();
  audit('tiktok_refresh', {
    target: 'tiktok',
    result: payload.available ? 'success' : 'failed',
    detail: payload.reason || '',
    ip: req.ip,
  });
  res.json(payload);
});

// ---------------------------------- OAuth ------------------------------------
// A short-lived HttpOnly cookie binds this browser session to the OAuth state
// (CSRF protection for the Login Kit round-trip) and carries the PKCE verifier.
router.get('/auth/start', requireOwner, (req, res) => {
  if (!ownerConfigured()) {
    return res.status(400).json({
      error: 'TikTok developer app credentials are not configured on the server.',
      reason: 'not_configured',
    });
  }
  const state = crypto.randomBytes(16).toString('hex');
  const verifier = crypto.randomBytes(32).toString('base64url');

  const payload = encryptSecret(JSON.stringify({ state, verifier, issuedAt: Date.now() }));
  res.setHeader(
    'Set-Cookie',
    `tt_oauth=${encodeURIComponent(payload)}; Path=/api/tiktok; HttpOnly; SameSite=Lax; Max-Age=600`
  );

  const scopes = ['user.info.basic', 'video.list'];
  if (String(req.query.post || '') === '1') scopes.push('video.publish');

  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY || '',
    scope: scopes.join(','),
    response_type: 'code',
    redirect_uri: process.env.TIKTOK_REDIRECT_URI || '',
    state,
    code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
  });

  audit('tiktok_auth_started', { target: 'oauth', result: 'success', detail: scopes.join(','), ip: req.ip });
  res.json({ url: `${AUTHORIZE_URL}?${params}` });
});

router.get('/auth/callback', async (req, res) => {
  // Clear the temporary cookie no matter which branch we take.
  res.setHeader('Set-Cookie', 'tt_oauth=; Path=/api/tiktok; HttpOnly; SameSite=Lax; Max-Age=0');

  const cookies = getCookies(req);
  const raw = cookies.tt_oauth || '';
  let stored = null;
  if (raw) {
    const dec = decryptSecret(raw);
    if (dec) {
      try {
        const parsed = JSON.parse(dec);
        if (parsed && parsed.state && parsed.verifier && Date.now() - parsed.issuedAt < 10 * 60 * 1000) {
          stored = parsed;
        }
      } catch {
        /* stored stays null */
      }
    }
  }

  if (!ownerConfigured()) {
    return res.redirect('/owner/dashboard/tiktok?tiktok_error=not_configured');
  }
  if (req.query.error) {
    return res.redirect(`/owner/dashboard/tiktok?tiktok_error=${encodeURIComponent(String(req.query.error))}`);
  }
  if (!stored || !req.query.state || req.query.state !== stored.state) {
    return res.redirect('/owner/dashboard/tiktok?tiktok_error=state_mismatch');
  }
  if (String(cookies.tgss || '') === '') {
    return res.redirect('/owner/dashboard/tiktok?tiktok_error=owner_session_required');
  }
  const code = String(req.query.code || '');
  if (!code) {
    return res.redirect('/owner/dashboard/tiktok?tiktok_error=missing_code');
  }

  try {
    const params = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY || '',
      client_secret: process.env.TIKTOK_CLIENT_SECRET || '',
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TIKTOK_REDIRECT_URI || '',
      // PKCE (official Login Kit flow): the verifier travels with the exchange.
      code_verifier: stored.verifier,
    });
    const resToken = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(10000),
    });
    const tok = await resToken.json().catch(() => ({}));
    if (!resToken.ok || !tok.access_token) {
      const why = String(tok.error_description || tok.error || 'token_exchange_failed');
      return res.redirect(`/owner/dashboard/tiktok?tiktok_error=${encodeURIComponent(why)}`);
    }

    // Display name comes straight from the official user info endpoint only.
    let profile = null;
    try {
      const uRes = await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url',
        { headers: { Authorization: `Bearer ${tok.access_token}` }, signal: AbortSignal.timeout(10000) }
      );
      const uj = await uRes.json().catch(() => ({}));
      profile = uj && uj.data && uj.data.user;
    } catch {
      /* display name stays empty — never invented */
    }

    saveAccount({
      open_id: tok.open_id || (profile && profile.open_id) || '',
      display_name: (profile && profile.display_name) || '',
      avatar_url: (profile && profile.avatar_url) || '',
      scopes: String(tok.scope || ''),
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      expires_in: tok.expires_in,
      refresh_expires_in: tok.refresh_expires_in,
    });
    audit('tiktok_account_connected', {
      target: 'tiktok',
      result: 'success',
      detail: String(tok.scope || '').slice(0, 120),
      ip: req.ip,
    });
    return res.redirect('/owner/dashboard/tiktok?tiktok_connect=1');
  } catch {
    return res.redirect('/owner/dashboard/tiktok?tiktok_error=unexpected_error');
  }
});

router.post('/auth/disconnect', requireOwner, (req, res) => {
  db.prepare('DELETE FROM tiktok_accounts').run();
  audit('tiktok_account_disconnected', { target: 'tiktok', result: 'success', ip: req.ip });
  res.json({ ok: true });
});

// -------------------------------- publishing ---------------------------------
const PRIVACY_OPTIONS = ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'];
const ALLOWED_MIME = new Set([
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
]);
const MAX_CAPTION = 2200;

async function publishAccess() {
  if (!ownerConfigured()) {
    return {
      ok: false,
      reason: 'not_configured',
      error:
        'TikTok developer app credentials (TIKTOK_CLIENT_KEY / TIKTIK_CLIENT_SECRET) are not configured on the server.',
    };
  }
  const connected = getConnectedPublic();
  if (!connected || connected.tokenExpired) {
    return {
      ok: false,
      reason: 'not_connected',
      error: 'No TikTok account is connected. Connect TikTok first from the dashboard.',
    };
  }
  const has = new Set(connected.scopes || []);
  // video.publish -> direct post; video.upload -> draft (inbox) upload.
  if (has.has('video.publish')) return { ok: true, mode: 'DIRECT' };
  if (has.has('video.upload')) return { ok: true, mode: 'DRAFT' };
  return {
    ok: false,
    reason: 'approval_required',
    error:
      'Direct posting needs the video.publish scope, which TikTok grants only after its developer audit. Until the app is approved, publishing stays disabled — nothing is posted.',
  };
}

router.get('/publish/preflight', requireOwner, (req, res) => {
  publishAccess()
    .then((a) => {
      if (!a.ok) return res.json({ available: false, reason: a.reason, error: a.error });
      res.json({
        available: true,
        mode: a.mode,
        privacyOptions: a.mode === 'DRAFT' ? ['SELF_ONLY'] : PRIVACY_OPTIONS,
        maxFileBytes: MAX_VIDEO_BYTES,
        maxCaption: MAX_CAPTION,
      });
    });
});

/** Validates + stores the upload and kicks off the official direct-post flow. */
router.post(
  '/publish',
  requireOwner,
  UPLOAD.single('video'),
  async (req, res) => {
    const access = await publishAccess();
    if (!access.ok) {
      audit('tiktok_publish_rejected', { target: 'publish', result: 'blocked', detail: access.reason, ip: req.ip });
      return res.status(400).json({ error: access.error, reason: access.reason });
    }

    const body = req.body || {};
    // Explicit user confirmation is mandatory — never auto-bind consent.
    if (String(body.confirm) !== 'true') {
      return res.status(400).json({ error: 'You must explicitly confirm before posting.' });
    }

    const caption = String(body.caption || '').trim();
    if (caption.length > MAX_CAPTION) {
      return res.status(400).json({ error: `Caption is longer than ${MAX_CAPTION} characters.` });
    }
    const privacy = String(body.privacy || 'SELF_ONLY');
    if (!PRIVACY_OPTIONS.includes(privacy)) {
      return res.status(400).json({ error: 'Invalid privacy option.' });
    }

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No video file was provided.' });
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return res.status(400).json({ error: 'The video must be an MP4 or WebM file.' });
    }

    const connected = getConnectedPublic();
    const token = await getUsableToken();
    if (!token || !token.accessToken) {
      return res.status(401).json({ error: 'TikTok session could not be refreshed. Reconnect TikTok.' });
    }

    // Draft mode (video.upload only) is intentionally not final-published:
    // posting stops at the official inbox-draft endpoint.
    const draftOnly = access.mode === 'DRAFT';

    try {
      // 1) Initiate the upload (official Content Posting API).
      const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          post_info: {
            title: caption,
            privacy_level: draftOnly ? 'SELF_ONLY' : privacy,
            ...(draftOnly ? { draft: true } : {}),
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: file.size,
            chunk_size: file.size,
            total_chunk_count: 1,
          },
        }),
        signal: AbortSignal.timeout(10000),
      });
      const init = await initRes.json().catch(() => ({}));
      const err = init && init.error;
      if (!init || !init.data || !init.data.upload_url ||
          (err && err.code && err.code !== 'ok')) {
        const why = (err && (err.message || err.code)) || 'initialise_failed';
        return res.status(502).json({ error: `TikTok rejected the upload request: ${why}` });
      }

      // 2) Upload the file bytes (single chunk — the file is within the cap).
      const putRes = await fetch(init.data.upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.mimetype,
          'Content-Range': `bytes 0-${file.size - 1}/${file.size}`,
        },
        body: file.buffer,
        signal: AbortSignal.timeout(10 * 60 * 1000),
      });
      if (!putRes.ok) {
        return res.status(502).json({ error: `TikTok upload failed (${putRes.status}).` });
      }

      // 3) Record the job — the REAL status comes from the status endpoint.
      const publishId = init.data.publish_id ? String(init.data.publish_id) : '';
      const info = db.prepare(
        `INSERT INTO tiktok_uploads (publish_id, open_id, caption, privacy, status, status_detail)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(publishId, connected.openId, caption, privacy, draftOnly ? 'draft_uploaded' : 'processing',
        draftOnly ? 'Finish publishing in the TikTok app.' : 'TikTok is processing the upload.');
      audit('tiktok_publish_submitted', {
        target: `upload:${info.lastInsertRowid}`,
        result: 'success',
        detail: draftOnly ? 'draft' : 'direct',
        ip: req.ip,
      });
      res.status(202).json({
        id: Number(info.lastInsertRowid),
        status: draftOnly ? 'draft_uploaded' : 'processing',
        message: draftOnly
          ? 'Draft uploaded. Open TikTok to finish publishing it.'
          : 'Upload accepted. TikTok is processing the video; the real status appears below — processing can take a while.',
      });
    } catch (e) {
      audit('tiktok_publish_failed', { target: 'publish', result: 'failed', detail: String(e && e.message).slice(0, 140), ip: req.ip });
      res.status(502).json({ error: 'The upload to TikTok failed. Nothing was published.' });
    }
  }
);

router.get('/publish/:id/status', requireOwner, async (req, res) => {
  const row = db.prepare('SELECT * FROM tiktok_uploads WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Publish job not found.' });

  // Ask the official status endpoint while the job is still in flight.
  if (row.publish_id && row.status === 'processing' && ownerConfigured()) {
    const token = await getUsableToken();
    if (token && token.accessToken) {
      try {
        const sRes = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify({ publish_id: row.publish_id }),
          signal: AbortSignal.timeout(10000),
        });
        const sj = await sRes.json().catch(() => ({}));
        const srow = (sj && sj.data) || {};
        const map = {
          PUBLISH_PROCESSING: 'processing',
          SENT_TO_CLIENT: 'sent_to_tiktok',
          PUBLISH_FAILED: 'failed',
          FAILED: 'failed',
        };
        const next = map[srow.status];
        if (next) {
          db.prepare('UPDATE tiktok_uploads SET status = ?, status_detail = ?, updated_at = ? WHERE id = ?')
            .run(next, String((srow.fail_msg && srow.fail_msg.message) || srow.error_code || row.status_detail), now(), row.id);
          row.status = next;
          row.status_detail = String((srow.fail_msg && srow.fail_msg.message) || srow.error_code || row.status_detail);
        }
      } catch {
        /* keep stored status — network failure must not fake success */
      }
    }
  }

  res.json({
    id: row.id,
    publishId: row.publish_id,
    caption: row.caption,
    privacy: row.privacy,
    status: row.status,
    detail: row.status_detail,
    updatedAt: row.updated_at,
  });
});

module.exports = router;
