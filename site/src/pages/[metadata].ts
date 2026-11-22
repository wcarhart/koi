import { getDocs } from '../lib/content';
import {
  markdownLink,
  pageMetadata,
  publishedPagePaths,
} from '../lib/page-metadata';

// Generate the route explicitly because Astro skips filenames beginning with an underscore.
export function getStaticPaths() {
  return [{ params: { metadata: '_headers' } }];
}

// Netlify reads this build artifact to attach headers to statically served Markdown.
export async function GET() {
  const docs = await getDocs();
  const rules = publishedPagePaths(docs).flatMap((path) => {
    const { markdownUrl } = pageMetadata(path, docs);
    return markdownUrl
      ? [`${new URL(markdownUrl).pathname}\n  Link: ${markdownLink(path)}\n`]
      : [];
  });
  return new Response(rules.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
