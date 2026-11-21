import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { build, sha256 } from '../scripts/release.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const exec = promisify(execFile);

// All release discovery and downloads stay on a temporary local HTTP server
export async function releaseFixture(directory) {
  const assets = path.join(directory, 'assets');
  build({ source: root, output: assets, tag: 'v2.0.5', epoch: 1234567890 });
  const fixture = { assets, latest: 'v2.0.5', missing: new Set(), url: '' };
  fixture.metadata = () => ({
    id: 5,
    tag_name: 'v2.0.5',
    name: 'koi 2.0.5',
    draft: false,
    prerelease: false,
    created_at: '2026-01-01T00:00:00Z',
    published_at: '2026-01-01T00:00:00Z',
    assets: readdirSync(assets)
      .sort()
      .map((name, index) => {
        const bytes = readFileSync(path.join(assets, name));
        const url = `${fixture.url}/wcarhart/koi/releases/download/v2.0.5/${name}`;
        return {
          id: index + 1,
          name,
          size: bytes.length,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          content_type: 'application/octet-stream',
          digest: `sha256:${sha256(bytes)}`,
          browser_download_url: url,
          url,
        };
      }),
  });
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    let body;
    if (fixture.missing.has(pathname)) {
      response.writeHead(404).end();
      return;
    }
    if (pathname === '/wcarhart/koi/releases/latest') {
      response
        .writeHead(302, {
          Location: `/wcarhart/koi/releases/tag/${fixture.latest}`,
        })
        .end();
      return;
    }
    if (pathname.startsWith('/wcarhart/koi/releases/tag/')) {
      body = 'release page';
    } else if (pathname.startsWith('/wcarhart/koi/releases/download/v2.0.5/')) {
      try {
        body = readFileSync(path.join(assets, path.basename(pathname)));
      } catch {
        response.writeHead(404).end();
        return;
      }
    } else if (pathname.startsWith('/repos/wcarhart/koi/releases')) {
      const metadata = fixture.metadata();
      body = JSON.stringify(
        /^\/repos\/wcarhart\/koi\/releases\/?$/.test(pathname)
          ? [metadata]
          : metadata,
      );
    } else {
      response.writeHead(404).end();
      return;
    }
    response
      .writeHead(200, {
        'Content-Type': pathname.startsWith('/repos/')
          ? 'application/json'
          : 'application/octet-stream',
      })
      .end(body);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  fixture.url = `http://127.0.0.1:${server.address().port}`;
  fixture.close = () =>
    new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
  return fixture;
}

export function mkdir(directory) {
  mkdirSync(directory, { recursive: true });
  return directory;
}
