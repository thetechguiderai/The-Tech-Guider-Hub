'use strict';

// Vercel serverless entry point.
// Re-exports the Express app built in server/index.js. Vercel's @vercel/node
// runtime mounts the exported app and routes /api, /uploads and the SPA
// fallback to it (see vercel.json).
module.exports = require('../server/index');