import { getVersions } from '../lib/versions';
import { versionIndexes } from '../lib/documentation';
import { getDocs } from '../lib/content';
import { publishedPagePaths, siteOrigin } from '../lib/page-metadata';
export async function GET() {
  const versions = getVersions();
  const paths = new Set(
    publishedPagePaths(await getDocs()).filter(
      (url) => versions.length === 1 || !/^\/docs(?:\/|$)/.test(url),
    ),
  );
  for (const version of versions.filter((entry) => entry.id !== 'unreleased')) {
    for (const doc of await getDocs(version)) paths.add(doc.url);
    for (const index of versionIndexes(version)) paths.add(index.url);
  }
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[
      ...paths,
    ]
      .map((path) => `<url><loc>${siteOrigin}${path}</loc></url>`)
      .join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
}
