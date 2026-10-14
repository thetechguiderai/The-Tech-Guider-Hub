// Data layer for The Tech Guider AI.
//
// The server is written against a synchronous SQLite-style API:
//   db.prepare(sql).get(...) / .all(...) / .run(...)   and   db.exec(sql)
//
// node:sqlite provides exactly that, but its file lives in /tmp on serverless
// hosts (Vercel), so account, chat and billing data would reset on every cold
// start. When TURSO_DATABASE_URL is configured we back the very same
// synchronous API with a managed libSQL/Turso database: the async libSQL client
// runs in a worker thread and is bridged back synchronously, so no query
// call-site in server.js has to change.
import path from "node:path";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || "";
const tursoToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN || "";

let db;

if (tursoUrl) {
  const { createSyncBridge } = await import("./database-bridge.mjs");
  db = await createSyncBridge(tursoUrl, tursoToken);
  console.log("[db] Using managed libSQL database (Turso).");
} else {
  const { DatabaseSync } = await import("node:sqlite");
  const databasePath = process.env.DATABASE_PATH
    || (isServerless ? path.join(tmpdir(), "tech-guider.db") : path.join(__dirname, "tech-guider.db"));
  try {
    mkdirSync(path.dirname(databasePath), { recursive: true });
  } catch {
    /* directory already exists */
  }
  db = new DatabaseSync(databasePath);
  console.log(`[db] Using local SQLite at ${databasePath}`);
}

export { db };
