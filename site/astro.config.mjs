import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import {
  stableRedirectsPlugin,
  stablePreviewIntegration,
} from './stable-redirects.mjs';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  site: 'https://koishell.com',
  output: 'static',
  integrations: [stablePreviewIntegration()],
  ...(process.env.KOI_SITE_OUT_DIR
    ? { outDir: process.env.KOI_SITE_OUT_DIR }
    : {}),
  trailingSlash: 'never',
  build: { format: 'directory' },
  vite: {
    define: { __KOI_REPO_ROOT__: JSON.stringify(repositoryRoot) },
    server: { fs: { allow: ['..'] } },
    plugins: [
      stableRedirectsPlugin(),
      {
        name: 'koi-markdown-reload',
        configureServer(server) {
          const contentDirectory = path.join(repositoryRoot, 'docs');
          const versionDirectory =
            process.env.KOI_VERSIONS_CACHE ||
            path.join(repositoryRoot, 'tmp/docs-versions');
          server.watcher.add(versionDirectory);
          server.watcher.add(contentDirectory);
          server.watcher.on('all', (event, file) => {
            if (
              !['add', 'change', 'unlink'].includes(event) ||
              (!file.startsWith(contentDirectory + path.sep) &&
                !file.startsWith(versionDirectory + path.sep))
            )
              return;
            server.moduleGraph.invalidateAll();
            server.ws.send({ type: 'full-reload' });
          });
        },
      },
    ],
  },
});
