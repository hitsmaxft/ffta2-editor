import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  server: {
    fs: {
      // Allow serving the sibling data/ directory for dev ROM auto-load (?rom=).
      allow: [resolve(__dirname, '..')],
    },
  },
  test: {
    // Real-ROM tests parse a 128 MiB ROM and thousands of LZSS sprites.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
