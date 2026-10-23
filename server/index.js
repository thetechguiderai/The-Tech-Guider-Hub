'use strict';

require('dotenv').config();
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const express = require('express');
const { db, dbPath, dataDir } = require('./db');
const { requireSecret, rateLimit, audit } = require('./security');
const publicRoutes = require('./routes/public');
const ownerRoutes = require('./routes/owner');
const tiktokRoutes = require('./routes/tiktok');

requireSecret();

// ---- Seed initial owner hash if provided via OWNER_ACCESS_CODE_HASH ----
const ownerCount = db.prepare('SELECT COUNT(*) AS c FROM owners').get().c;
if (ownerCount === 0 && process.env.OWNER_ACCESS_CODE_HASH) {
  db.prepare('INSERT INTO owners (code_hash) VALUES (?)').run(process.env.OWNER_ACCESS_CODE_HASH);
  console.log('[owner] Seeded initial owner access code hash from environment.');
}

// ---- Starter content on ephemeral hosts (Vercel): fresh DB on cold start ----
if (process.env.VERCEL) {
  try {
    const { seedAll } = require('./seed');
    seedAll();
  } catch (e) {
    console.error('[seed] Auto-seed failed:', e && e.message);
  }
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '6mb' }));
app.use(rateLimit);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});

const SPA_HEADERS = {
  'Cache-Control': 'no-cache',
};

// ---- Uploaded owner assets (thumbnails, logos) ----
const uploadsDir = path.join(dataDir, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir, { maxAge: '30d', immutable: false }));

const ALLOWED_IMAGE = /^image\/(png|jpe?g|webp|gif|svg\+xml|avif)$/;

app.post('/api/owner/upload', (req, res, next) => {
  const cookies = String(req.headers.cookie || '');
  const tokenMatch = cookies.match(/(?:^|;\s*)tgss=([^;]+)/);
  const { lookupSession } = require('./security');
  if (!tokenMatch || !lookupSession(decodeURIComponent(tokenMatch[1]))) {
    return res.status(401).json({ error: 'Not authorized.' });
  }
  const { dataUrl, folder } = req.body || {};
  if (!dataUrl || typeof dataUrl !== 'string') {
    return res.status(400).json({ error: 'No image provided.' });
  }
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m || !ALLOWED_IMAGE.test(m[1])) {
    return res.status(400).json({ error: 'Only PNG, JPEG, WebP, GIF, SVG or AVIF images are allowed.' });
  }
  const kind = ['thumbnails', 'logos'].includes(folder) ? folder : 'thumbnails';
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 4 * 1024 * 1024) {
    return res.status(413).json({ error: 'Image is too large (max 4 MB).' });
  }
  const ext = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp',
    'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/avif': 'avif',
  }[m[1]];
  const name = `${crypto.randomBytes(8).toString('hex')}.${ext}`;
  const targetDir = path.join(uploadsDir, kind);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, name), buf);
  const url = `/uploads/${kind}/${name}`;
  audit('upload', { target: kind, result: 'success', detail: url, ip: req.ip });
  res.json({ url });
});

// ---- API ----
const { userRouter: pointsRouter, ownerRouter: coinsOwnerRouter } = require('./routes/points');
// Registered BEFORE the /api/owner mount so exact /api/owner/coins/* paths win.
app.use('/api/owner/coins', coinsOwnerRouter);
app.use('/api/points', pointsRouter);
app.use('/api/public', publicRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/tiktok', tiktokRoutes);

// ---- The Tech Guider AI (merged, served under /ai) ----
// The AI app is ESM while this server is CommonJS, so it is loaded lazily with
// a dynamic import and every /ai request is handed to it. The mounted app sees
// the request with the /ai prefix stripped (e.g. /ai/api/chat -> /api/chat).
let aiAppPromise = null;
function getAiApp() {
  if (!aiAppPromise) {
    aiAppPromise = import('../ai/Server/server.js')
      .then((mod) => mod.default || mod.app)
      .catch((err) => {
        aiAppPromise = null;
        console.error('[ai] Failed to load The Tech Guider AI app:', err && err.message);
        throw err;
      });
  }
  return aiAppPromise;
}
// Bare AI paths are rendered by the Hub SPA (the native /ai workspace,
// /ai/chat/:id and /ai/plans). Everything else under /ai — the JSON API and the
// legacy static AI pages — is handled by the AI app. On Vercel the CDN + the
// rewrites in vercel.json do this; this branch matters for local development.
const AI_SPA_PATHS = /^\/(chat\/[^/]+|plans)?$/;
app.use('/ai', (req, res, next) => {
  if (AI_SPA_PATHS.test(req.path)) {
    const spa = path.join(__dirname, '..', 'dist', 'index.html');
    if (fs.existsSync(spa)) {
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(spa);
    }
    return next();
  }
  getAiApp()
    .then((aiApp) => aiApp(req, res, next))
    .catch(next);
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, db: dbPath });
});

// ---- SEO: robots + sitemap ----
function baseUrl(req) {
  // Behind Vercel's proxy req.protocol is http, so trust x-forwarded-proto first.
  const proto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim() || req.protocol || 'https';
  return (process.env.BASE_URL || `${proto}://${req.get('host')}`).replace(/\/$/, '');
}

app.get('/robots.txt', (req, res) => {
  const base = baseUrl(req);
  res.type('text/plain').send(
    ['User-agent: *', 'Allow: /', 'Disallow: /owner', `Sitemap: ${base}/sitemap.xml`].join('\n')
  );
});

app.get('/sitemap.xml', (req, res) => {
  const base = baseUrl(req);
  const videoRows = db.prepare(
    "SELECT id, title, updated_at FROM videos WHERE status = 'published' OR status = 'coming_soon' ORDER BY id"
  ).all();
  const resourceRows = db.prepare('SELECT id, updated_at FROM resources ORDER BY id').all();

  const urls = [
    { loc: '/', priority: '1.0', freq: 'daily' },
    { loc: '/resources', priority: '0.9', freq: 'daily' },
    { loc: '/videos', priority: '0.9', freq: 'daily' },
    { loc: '/tools', priority: '0.7', freq: 'weekly' },
    { loc: '/free-fire-sensitivity', priority: '0.8', freq: 'weekly' },
    { loc: '/minecraft', priority: '0.7', freq: 'weekly' },
    { loc: '/tiktok', priority: '0.7', freq: 'daily' },
    { loc: '/ai', priority: '0.6', freq: 'weekly' },
    { loc: '/video-editing-packages', priority: '0.7', freq: 'weekly' },
    { loc: '/about', priority: '0.5', freq: 'monthly' },
  ];
  for (const v of videoRows) {
    urls.push({ loc: `/videos/${v.id}`, priority: '0.8', freq: 'monthly', lastmod: v.updated_at });
  }
  for (const r of resourceRows) {
    urls.push({ loc: `/resources?focus=${r.id}`, priority: '0.5', freq: 'monthly', lastmod: r.updated_at });
  }

  const xml = urls
    .map(
      (u) =>
        `  <url><loc>${base}${u.loc}</loc>${
          u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ''
        }<changefreq>${u.freq}</changefreq><priority>${u.priority}</priority></url>`
    )
    .join('\n');

  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xml}\n</urlset>`
  );
});

// ---- Static frontend (production build) ----
// On Vercel the CDN + vercel.json routes serve the SPA and static files, so the
// serverless function stays API-only (important: including dist in the function
// makes Vercel compile the frontend chunks from ESM to CommonJS and breaks them).
// Locally, Express serves the production build as before.
if (!process.env.VERCEL) {
  const distDir = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distDir)) {
    app.use(
      '/assets',
      express.static(path.join(distDir, 'assets'), { index: false, maxAge: '1y', immutable: true })
    );
    app.use(
      express.static(distDir, {
        index: 'index.html',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          } else if (!filePath.includes('/assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
          }
        },
      })
    );
    app.get(/^(?!\/api\/|\/uploads\/).*/, (req, res) => {
      res.set(SPA_HEADERS);
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    app.get(/^(?!\/api\/|\/uploads\/).*/, (req, res) => {
      res.set(SPA_HEADERS);
      res.status(200).send(
        '<h1>The Tech Guider Hub</h1><p>Frontend is not built yet. Run <code>npm run build</code> first.</p>'
      );
    });
  }
}

// ---- Error handler ----
app.use((err, req, res, next) => {
  console.error('[server]', err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: 'Something went wrong on the server.' });
});

// ---- Session cleanup ----
setInterval(() => {
  try {
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString());
    db.prepare(
      `DELETE FROM owner_failures WHERE failed_at < datetime('now', '-1 day')`
    ).run();
  } catch {
    /* ignore */
  }
}, 60 * 60 * 1000).unref();

const PORT = Number(process.env.PORT) || 4500;

// When run on Vercel, export the Express app for the serverless runtime;
// the platform starts the listener. Locally, keep the classic listen().
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => {
    console.log(`The Tech Guider Hub server running on http://localhost:${PORT}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log('  Build the frontend with: npm run build');
    }
  });
}