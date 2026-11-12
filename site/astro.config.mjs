import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  site: 'https://koishell.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'directory' },
  vite: {
    define: { __KOI_REPO_ROOT__: JSON.stringify(repositoryRoot) },
    server: { fs: { allow: ['..'] } },
    plugins: [
      {
        name: 'koi-markdown-reload',
        configureServer(server) {
          const contentDirectory = path.join(repositoryRoot, 'docs');
          server.watcher.add(contentDirectory);
          server.watcher.on('all', (event, file) => {
            if (
              !['add', 'change', 'unlink'].includes(event) ||
              !file.startsWith(contentDirectory + path.sep) ||
              file.includes(path.sep + 'tmp' + path.sep)
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
