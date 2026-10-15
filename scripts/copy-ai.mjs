// Copies The Tech Guider AI static frontend into the Hub build output so it is
// served under /ai (see vercel.json rewrites + server/index.js mount).
//
// The AI pages use relative URLs (./chat.html, ./api.js, ...). Those only
// resolve correctly when the browser's URL ends in a slash, but requests to
// /ai (no slash) keep the bare path, which would resolve ./api.js to /api.js
// and load the Hub SPA instead. Injecting <base href="/ai/"> pins every
// relative URL to the mount path regardless of the trailing slash.
import { cp, mkdir, rm, readdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'ai', 'Public');
const output = path.join(root, 'dist', 'ai');

const basePath = `${(process.env.TG_AI_BASE_PATH || '/ai').replace(/\/+$/, '')}/`;

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });

// The Hub SPA now owns /ai (the native workspace). If the AI app's landing page
// stayed at dist/ai/index.html it would shadow the SPA, so keep it reachable at
// /ai/app.html as a fallback instead. The rest of the AI app is unchanged.
try {
  await rename(path.join(output, 'index.html'), path.join(output, 'app.html'));
} catch {
  /* source index.html not present — nothing to move */
}

const baseTag = `<base href="${basePath}">`;
const entries = await readdir(output, { withFileTypes: true });
let injected = 0;

for (const entry of entries) {
  if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
  const file = path.join(output, entry.name);
  let html = await readFile(file, 'utf8');
  if (/<base\s/i.test(html)) continue;
  html = /<head[^>]*>/i.test(html)
    ? html.replace(/<head([^>]*)>/i, (match) => `${match}\n    ${baseTag}`)
    : `${baseTag}\n${html}`;
  await writeFile(file, html, 'utf8');
  injected += 1;
}

console.log(`[copy-ai] Copied AI frontend -> dist/ai (base=${basePath}, ${injected} pages)`);
