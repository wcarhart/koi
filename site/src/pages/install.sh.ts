import { readFileSync } from 'node:fs';
import path from 'node:path';
import { root } from '../lib/content';

// Emit the canonical installer as a static route, including in Astro's route manifest.
export function GET() {
  return new Response(
    readFileSync(path.join(root, 'scripts/install.sh'), 'utf8'),
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    },
  );
}
