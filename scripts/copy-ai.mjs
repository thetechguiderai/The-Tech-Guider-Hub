// Copies The Tech Guider AI static frontend into the Hub build output so it is
// served under /ai (see vercel.json rewrites + server/index.js mount).
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'ai', 'Public');
const output = path.join(root, 'dist', 'ai');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });
console.log('[copy-ai] Copied AI frontend -> dist/ai');
