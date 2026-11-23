import { getDocs } from './content';
import { documentationResourceUrl, getDefaultVersion } from './versions';
import { versionIndexes } from './documentation';

// Only published destinations receive aliases; missing documents remain 404s.
export async function getStableAliases(): Promise<Record<string, string>> {
  const version = getDefaultVersion();
  const aliases: Record<string, string> = {};
  for (const doc of await getDocs(version)) {
    const source = '/docs/stable' + (doc.slug ? '/' + doc.slug : '');
    aliases[source] = doc.url;
    aliases[source + '.md'] = doc.url + '.md';
  }
  for (const index of versionIndexes(version)) {
    aliases[`/docs/stable/${index.slug}`] = index.url;
    aliases[`/docs/stable/${index.slug}.md`] = index.url + '.md';
  }
  for (const resource of [
    'search.json',
    'llms.txt',
    'llms-full.txt',
  ] as const) {
    aliases[`/docs/stable/${resource}`] = documentationResourceUrl(
      resource,
      version,
    );
  }
  return aliases;
}
