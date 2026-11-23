import { createServer, request as forwardRequest } from 'node:http';
import { readFileSync } from 'node:fs';
import { preview } from 'astro';
import { fileURLToPath } from 'node:url';
import { stableRedirectMiddleware } from './stable-redirects.mjs';

// Retain Astro's static serving, MIME types, and 404 handling behind the alias middleware.
export default async function stablePreview({
  root,
  outDir,
  host,
  port,
  headers,
  allowedHosts,
  logger,
}) {
  const aliases = JSON.parse(
    readFileSync(new URL('_stable-aliases.json', outDir), 'utf8'),
  );
  const backend = await preview({
    root: fileURLToPath(root),
    configFile: false,
    outDir: fileURLToPath(outDir),
    output: 'static',
    trailingSlash: 'never',
    build: { format: 'directory' },
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0, open: false, headers, allowedHosts },
  });
  const redirect = stableRedirectMiddleware(async () => aliases);
  const server = createServer((request, response) => {
    void redirect(request, response, (error) => {
      if (error) {
        response.writeHead(500);
        response.end('Preview unavailable');
        return;
      }
      const upstream = forwardRequest(
        {
          hostname: '127.0.0.1',
          port: backend.port,
          path: request.url,
          method: request.method,
          headers: request.headers,
        },
        (incoming) => {
          response.writeHead(incoming.statusCode || 500, incoming.headers);
          incoming.pipe(response);
        },
      );
      upstream.on('error', () => {
        if (!response.headersSent) response.writeHead(502);
        response.end('Preview unavailable');
      });
      request.on('aborted', () => upstream.destroy());
      request.pipe(upstream);
    });
  });
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, host, resolve);
    });
  } catch (error) {
    await backend.stop();
    throw error;
  }
  const address = server.address();
  const url = `http://${host || 'localhost'}:${address.port}`;
  logger.info(`Local preview: ${url}`);
  return {
    host,
    port: address.port,
    urls: { local: [url], network: [] },
    closed: () => new Promise((resolve) => server.once('close', resolve)),
    async stop() {
      const closed = new Promise((resolve) => server.close(resolve));
      server.closeAllConnections();
      await closed;
      await backend.stop();
    },
  };
}
