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
  const versionBase = /^\/docs\/v\d+\.\d+\.\d+(?=\/|$)/.exec(path)?.[0];
  const index = versionBase
    ? `${siteOrigin}${versionBase}/llms.txt`
    : documentationIndex;
  const covered =
    publishedPagePaths(docs).includes(path) ||
    (!!versionBase &&
      (path === versionBase ||
        docsIndexes.some((entry) => path === versionBase + '/' + entry.slug)));
  return {
    canonical: `${siteOrigin}${path}`,
    describedBy: covered ? index : undefined,
    markdownUrl:
      covered && path !== '/' ? `${siteOrigin}${path}.md` : undefined,
    noindex: path === '/playground' || path === '/404' || path === '/404.html',
  };
}

export function markdownLink(htmlPath: string): string {
  const base = /^\/docs\/v\d+\.\d+\.\d+(?=\/|$)/.exec(htmlPath)?.[0];
  const index = base ? `${siteOrigin}${base}/llms.txt` : documentationIndex;
  return `<${new URL(htmlPath, siteOrigin).href}>; rel="canonical", <${index}>; rel="describedby"`;
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
