import type { Doc } from './content';

export const docsIndexes = [
  {
    slug: 'guides',
    id: 'index-guides',
    url: '/docs/guides',
    title: 'Guides',
    group: 'Guides',
    description: 'Build your understanding, one script at a time.',
  },
  {
    slug: 'reference',
    id: 'index-reference',
    url: '/docs/reference',
    title: 'API reference',
    group: 'API reference',
    description: 'Every public koi command, in one place.',
  },
  {
    slug: 'examples',
    id: 'index-examples',
    url: '/docs/examples',
    title: 'Examples',
    group: 'Examples',
    description: 'Pick a script. See what koi can do.',
  },
] as const;

export type DocsIndexKind = (typeof docsIndexes)[number]['slug'];

export function indexDocs(kind: DocsIndexKind, docs: Doc[]): Doc[] {
  const group = docsIndexes.find((index) => index.slug === kind)!.group;
  return docs.filter((doc) => doc.group === group);
}
