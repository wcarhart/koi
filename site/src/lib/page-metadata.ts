import type { Doc } from './content';
import { docsIndexes } from './docs-indexes';

export const siteOrigin = 'https://koishell.com';
export const documentationIndex = `${siteOrigin}/llms.txt`;
type PublishedDoc = Pick<Doc, 'url'>;

export function publishedPagePaths(docs: readonly PublishedDoc[]): string[] {
  return [
    ...new Set([
      '/',
      '/install',
      '/agents',
      '/docs',
      ...docs.map((doc) => doc.url),
      ...docsIndexes.map((index) => index.url),
    ]),
  ];
}

export function pageMetadata(pathname: string, docs: readonly PublishedDoc[]) {
  const path = new URL(pathname, siteOrigin).pathname.replace(/\/$/, '') || '/';
  const covered = publishedPagePaths(docs).includes(path);
  return {
    canonical: `${siteOrigin}${path}`,
    describedBy: covered ? documentationIndex : undefined,
    markdownUrl:
      covered && path !== '/' ? `${siteOrigin}${path}.md` : undefined,
    noindex: path === '/playground' || path === '/404' || path === '/404.html',
  };
}

export function markdownLink(htmlPath: string): string {
  return `<${new URL(htmlPath, siteOrigin).href}>; rel="canonical", <${documentationIndex}>; rel="describedby"`;
}

export function markdownHeaders(
  htmlPath: string,
  contentType = 'text/plain; charset=utf-8',
) {
  return {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    Link: markdownLink(htmlPath),
  };
}
