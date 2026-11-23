import { getStableAliases } from '../lib/stable-aliases';
import { getVersions } from '../lib/versions';
import { versionIndexes } from '../lib/documentation';
import { getDocs } from '../lib/content';
import {
  markdownLink,
  pageMetadata,
  publishedPagePaths,
} from '../lib/page-metadata';

// Generate the route explicitly because Astro skips filenames beginning with an underscore.
export function getStaticPaths() {
  return ['_headers', '_redirects', '_stable-aliases.json'].map((metadata) => ({
    params: { metadata },
  }));
}

// Netlify reads this build artifact to attach headers to statically served Markdown.
export async function GET({
  params = {},
}: { params?: { metadata?: string } } = {}) {
  if (params.metadata === '_stable-aliases.json')
    return Response.json(await getStableAliases());
  if (params.metadata === '_redirects') {
    const aliases = await getStableAliases();
    return new Response(
      Object.entries(aliases)
        .map(([source, destination]) => `${source} ${destination} 302`)
        .join('\n') + '\n',
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    );
  }
  const docs = await getDocs();
  const pages = publishedPagePaths(docs);
  for (const version of getVersions().slice(1)) {
    pages.push(
      ...(await getDocs(version)).map((doc) => doc.url),
      ...versionIndexes(version).map((index) => index.url),
    );
  }
  const rules = pages.flatMap((path) => {
    const { markdownUrl } = pageMetadata(path, [
      ...docs,
      ...pages.map((url) => ({ url })),
    ]);
    return markdownUrl
      ? [`${new URL(markdownUrl).pathname}\n  Link: ${markdownLink(path)}\n`]
      : [];
  });
  rules.push('/docs/stable*\n  Cache-Control: no-store\n');
  return new Response(rules.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
