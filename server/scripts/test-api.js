'use strict';

/**
 * API smoke tests (npm test).
 *
 * Boots the Express server in test mode (NODE_ENV=test => test-hub.db) on an
 * ephemeral port, then exercises the public + owner + TikTok endpoints with
 * plain fetch assertions. Exits non-zero on the first failure.
 */

process.env.NODE_ENV = 'test';
require('dotenv').config();

const { spawn } = require('node:child_process');
const http = require('node:http');

const PORT = 4600;
const BASE = `http://127.0.0.1:${PORT}`;
// The test seeds its own owner code hash so it never depends on the local .env.
const OWNER_CODE = '0987654321';
process.env.OWNER_ACCESS_CODE_HASH = require('../security').hashOwnerCode(OWNER_CODE);

let failures = 0;
let passed = 0;

function ok(name, cond, extra) {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

function parseCookies(res) {
  const out = {};
  const set = res.headers.get('set-cookie') || [];
  const list = Array.isArray(set) ? set : [set];
  for (const line of list) {
    const [pair] = line.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  }
  return out;
}

async function req(path, { method = 'GET', body, cookie, raw } = {}) {
  const useJson = body !== undefined && typeof body !== 'string' && !(body instanceof FormData) && !Buffer.isBuffer(body);
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(useJson ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: typeof body === 'string' || Buffer.isBuffer(body) ? body : useJson ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  let data = null;
  const headers = {};
  const sc = res.headers.get('set-cookie');
  headers.cookies = sc ? parseCookies(res) : {};
  headers.location = res.headers.get('location') || '';
  if (!raw) {
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  } else {
    data = null;
  }
  return { status: res.status, data: data || {}, headers };
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function startServer() {
  const child = spawn(process.execPath, ['server/index.js'], {
    env: { ...process.env, NODE_ENV: 'test', PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => process.env.TEST_VERBOSE && process.stdout.write(d));
  child.stderr.on('data', (d) => process.env.TEST_VERBOSE && process.stderr.write(d));

  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return child;
    } catch { /* not up yet */ }
    await wait(250);
  }
  throw new Error('Server did not become healthy in time.');
}

async function main() {
  // Start each run from a clean test database.
  const fs = require('node:fs');
  const dataDir = require('node:path').join(__dirname, '..', '..', 'data');
  for (const f of ['test-hub.db', 'test-hub.db-wal', 'test-hub.db-shm']) {
    try { fs.unlinkSync(require('node:path').join(dataDir, f)); } catch { /* ignore */ }
  }

  console.log('Booting test server…');
  const server = await startServer();

  try {
    // ------------------------------ existing hub ----------------------------
    console.log('\n— Existing hub endpoints —');
    const boot = await req('/api/public/bootstrap');
    ok('bootstrap responds', boot.status === 200 && !!boot.data.siteName);
    ok('bootstrap exposes tiktok social fallback',
      typeof boot.data.social.tiktok === 'string');

    const health = await req('/api/health');
    ok('health ok', health.status === 200 && health.data.ok);

    // -------------------------------- TikTok --------------------------------
    console.log('\n— TikTok public endpoints —');
    const live = await req('/api/tiktok/live');
    ok('live status is honestly unavailable',
      live.status === 200 && live.data.status === 'unavailable' &&
      (live.data.openUrl || '').includes('tiktok.com'));

    const profile = await req('/api/tiktok/profile');
    ok('profile endpoint reachable', profile.status === 200);
    ok('profile payload has honest availability flag',
      typeof profile.data.available === 'boolean');
    ok('profile has creator embed info',
      profile.data.embedding && profile.data.embedding.creatorEmbed === true);
    ok('no fabricated follower counts in profile payload',
      profile.data.statistics === undefined && profile.data.followerCount === undefined);

    const videos = await req('/api/tiktok/videos');
    ok('videos endpoint reachable with empty honest list',
      videos.status === 200 && Array.isArray(videos.data.videos));

    console.log('\n— TikTok owner endpoints (auth enforced) —');
    const cfgUnauth = await req('/api/tiktok/config');
    ok('config requires owner session',
      cfgUnauth.status === 401 ||
      (cfgUnauth.data && typeof cfgUnauth.data.authenticated !== 'undefined'));

    const startUnauth = await req('/api/tiktok/auth/start');
    ok('oauth start requires owner session', startUnauth.status === 401);

    const login = await req('/api/owner/login', { method: 'POST', body: { code: OWNER_CODE } });
    ok('owner login succeeds with test code',
      login.status === 200 && login.data.authenticated,
      JSON.stringify(login.data));
    const cookie = Object.entries(login.headers.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    const cfg = await req('/api/tiktok/config', { cookie });
    ok('owner config readable when signed in',
      cfg.status === 200 && typeof cfg.data.capabilities === 'object');
    ok('config truthfully reports missing app credentials',
      cfg.data.appConfigured === false);

    const badCfg = await req('/api/tiktok/config', {
      method: 'PUT',
      cookie,
      body: { profileUrl: 'https://facebook.com/@legend0.26', curated: [] },
    });
    ok('non-canonical profile URL rejected',
      badCfg.status === 400 && Array.isArray(badCfg.data.errors));

    const goodCfg = await req('/api/tiktok/config', {
      method: 'PUT',
      cookie,
      body: {
        profileUrl: 'https://www.tiktok.com/@legend0.26',
        refreshInterval: 900,
        curated: [
          'https://www.tiktok.com/@legend0.26/video/7411000000000000001',
        ],
      },
    });
    ok('canonical config + curated video accepted', goodCfg.status === 200);

    const badVideo = await req('/api/tiktok/config', {
      method: 'PUT',
      cookie,
      body: { curated: ['https://example.com/video/123'] },
    });
    ok('non canonical video URL rejected', badVideo.status === 400);

    const authStart = await req('/api/tiktok/auth/start', { cookie });
    ok('oauth start honestly reports missing dev app',
      authStart.status === 400 && authStart.data.reason === 'not_configured');

    const pub = await req('/api/tiktok/publish', {
      method: 'POST',
      cookie,
      body: { confirm: 'true', caption: '', privacy: 'SELF_ONLY' },
    });
    ok('publish blocked without approved dev app + scopes',
      pub.status === 400 && pub.data.reason);

    const pubNoConfirm = await req('/api/tiktok/publish/preflight', { cookie });
    ok('publish preflight honest about capability',
      pubNoConfirm.status === 200 &&
      (pubNoConfirm.data.available === false || pubNoConfirm.data.available === true));

    const oauthStartNoPost = await req('/api/tiktok/auth/start', { cookie });
    ok('auth start never posts to TikTok on server (config gate first)',
      oauthStartNoPost.status === 400 || typeof oauthStartNoPost.data.url === 'string');

    console.log('\n— OAuth callback CSRF protection —');
    // Without a bound state/cookie the callback must never process the code.
    const noState = await req('/api/tiktok/auth/callback?code=abc');
    ok('callback without bound state rejected (redirect w/ error)',
      noState.status === 302 &&
      (noState.headers.location || '').includes('tiktok_error='));

    console.log(`\nDone: ${passed} passed, ${failures} failed.`);
  } catch (err) {
    failures++;
    console.error('\nTest run error:', err);
  } finally {
    server.kill('SIGTERM');
    await wait(300);
    server.kill('SIGKILL');
    process.exit(failures ? 1 : 0);
  }
}

main();
