import { docsIndexes } from '../lib/docs-indexes';
export function GET() {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/install', '/docs', '/agents', ...docsIndexes.map((index) => index.url)].map((p) => `<url><loc>https://koishell.com${p}</loc></url>`).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
}
