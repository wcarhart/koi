import { fileURLToPath } from 'node:url';

// Keep the redirect response identical in development and static preview.
export function stableRedirectMiddleware(loadAliases) {
  return async (request, response, next) => {
    if (!['GET', 'HEAD'].includes(request.method || '')) return next();
    const url = new URL(request.url || '/', 'http://localhost');
    const pathname = url.pathname.replace(/\/$/, '');
    if (
      pathname !== '/docs/stable' &&
      pathname !== '/docs/stable.md' &&
      !pathname.startsWith('/docs/stable/')
    )
      return next();
    try {
      const aliases = await loadAliases();
      const destination = Object.hasOwn(aliases, pathname)
        ? aliases[pathname]
        : undefined;
      if (!destination) return next();
      response.writeHead(302, {
        Location: destination + url.search,
        'Cache-Control': 'no-store',
      });
      response.end();
    } catch (error) {
      next(error);
    }
  };
}
export function stableRedirectsPlugin() {
  return {
    name: 'koi-stable-documentation-redirects',
    configureServer(server) {
      server.middlewares.use(
        stableRedirectMiddleware(async () => {
          const { getStableAliases } = await server.ssrLoadModule(
            '/src/lib/stable-aliases.ts',
          );
          return getStableAliases();
        }),
      );
    },
  };
}
export function stablePreviewIntegration() {
  let isPreview = false;
  return {
    name: 'koi-stable-preview',
    hooks: {
      'astro:config:setup': ({ command }) => {
        isPreview = command === 'preview';
      },
      'astro:config:done': ({ setAdapter }) => {
        // Astro's built-in static preview excludes user Vite plugins.
        if (isPreview)
          setAdapter({
            name: 'koi-stable-preview',
            entrypointResolution: 'auto',
            adapterFeatures: { buildOutput: 'static' },
            supportedAstroFeatures: {
              staticOutput: 'stable',
              sharpImageService: 'stable',
            },
            previewEntrypoint: fileURLToPath(
              new URL('./stable-preview.mjs', import.meta.url),
            ),
          });
      },
    },
  };
}
