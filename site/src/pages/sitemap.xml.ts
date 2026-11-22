import { getDocs } from '../lib/content';
import { publishedPagePaths, siteOrigin } from '../lib/page-metadata';
export async function GET() {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publishedPagePaths(
      await getDocs(),
    )
      .map((path) => `<url><loc>${siteOrigin}${path}</loc></url>`)
      .join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
}
