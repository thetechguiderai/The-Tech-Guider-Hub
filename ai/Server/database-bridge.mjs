// Synchronous bridge over the async libSQL/Turso client.
//
// The libSQL client is promise-based, but the AI server expects synchronous
// queries. A worker thread owns the client; the main thread posts a request and
// then blocks on Atomics.wait while draining replies with
// receiveMessageOnPort, which is the one synchronous way to read a
// MessagePort. Requests are handled one at a time, so replies never interleave.
import { Worker, MessageChannel, receiveMessageOnPort } from "node:worker_threads";

export async function createSyncBridge(url, authToken) {
  const { port1, port2 } = new MessageChannel();

  const worker = new Worker(new URL("./database-worker.mjs", import.meta.url), {
    workerData: { url, authToken: authToken || null, port: port2 },
    transferList: [port2],
  });
  worker.on("error", (err) => {
    console.error("[db] worker error:", (err && err.message) || err);
  });
  // Do not let the worker alone keep the process alive; requests still work
  // because the running server (or invocation) holds the event loop open.
  worker.unref();

  const sleepBuf = new Int32Array(new SharedArrayBuffer(4));
  let seq = 0;

  function call(payload) {
    const id = ++seq;
    port1.postMessage({ id, ...payload });
    for (;;) {
      const received = receiveMessageOnPort(port1);
      if (received && received.message && received.message.id === id) {
        if (received.message.error) throw new Error(received.message.error);
        return received.message.result;
      }
      // Block the current thread briefly so the worker can answer.
      Atomics.wait(sleepBuf, 0, 0, 15);
    }
  }

  // node:sqlite accepts ...params; libSQL wants an array (positional) or a
  // single object (named). Mirror node:sqlite's shape and null out undefined.
  function normalize(params) {
    if (params.length === 1 && params[0] && typeof params[0] === "object" && !Array.isArray(params[0])) {
      return params[0];
    }
    return params.map((p) => (p === undefined ? null : p));
  }

  return {
    prepare(sql) {
      return {
        get: (...params) => call({ kind: "get", sql, args: normalize(params) }),
        all: (...params) => call({ kind: "all", sql, args: normalize(params) }),
        run: (...params) => call({ kind: "run", sql, args: normalize(params) }),
      };
    },
    exec(sql) {
      return call({ kind: "exec", sql });
    },
  };
}
