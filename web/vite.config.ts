import { defineConfig, type Plugin } from 'vite';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

// Dev-only: Vite's project root is web/, while local ROMs live in ../data.
// Serve /data/* from the sibling directory so ?rom=/data/... works.
function serveSiblingData(): Plugin {
  const root = resolve(__dirname, '..', 'data');
  return {
    name: 'serve-sibling-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/data/')) { next(); return; }
        const rel = decodeURIComponent(url.slice('/data/'.length).split('?')[0]);
        const path = normalize(join(root, rel));
        if (!path.startsWith(root + sep) || !existsSync(path) || !statSync(path).isFile()) {
          next();
          return;
        }
        const type = extname(path) === '.json' ? 'application/json' : 'application/octet-stream';
        res.statusCode = 200;
        res.setHeader('Content-Type', type);
        res.setHeader('Content-Length', statSync(path).size);
        createReadStream(path).pipe(res);
      });
    },
  };
}

export default defineConfig({
  // Relative asset URLs work both at a domain root and under a GitHub Pages
  // project path (e.g. https://user.github.io/ffta2-editor/).
  base: './',
  plugins: [serveSiblingData()],
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
