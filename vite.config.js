import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(__dirname, 'web'),
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 4096,
    modulePreload: { polyfill: true },
    // Single-bundle build (no manual chunks): every deploy gets fresh
    // content-addressed asset URLs, so stale edge/CDN cache can never collide
    // with older ESM/CJS-compiled files the way it did with chunked builds.
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4500',
      '/uploads': 'http://localhost:4500',
    },
  },
  resolve: {
    alias: {
      'react-dom': 'react-dom', // Ensure react-dom resolves correctly
    },
  },
});