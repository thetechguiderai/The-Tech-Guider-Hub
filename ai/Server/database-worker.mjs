// Worker that owns the async libSQL/Turso connection for database-bridge.mjs.
// It receives one request at a time and posts back the result (or an error).
import { workerData } from "node:worker_threads";
import { createClient } from "@libsql/client";

const port = workerData.port;

const client = createClient({
  url: workerData.url,
  authToken: workerData.authToken || undefined,
});

port.on("message", async (msg) => {
  const { id, kind, sql, args } = msg;
  try {
    if (kind === "exec") {
      await client.executeMultiple(sql);
      port.postMessage({ id, result: { changes: 0 } });
      return;
    }

    const res = await client.execute({ sql, args: args || [] });
    if (kind === "get") {
      port.postMessage({ id, result: res.rows[0] ?? undefined });
    } else if (kind === "all") {
      port.postMessage({ id, result: res.rows });
    } else {
      port.postMessage({ id, result: { changes: Number(res.rowsAffected || 0) } });
    }
  } catch (err) {
    port.postMessage({ id, error: (err && err.message) ? err.message : String(err) });
  }
});
