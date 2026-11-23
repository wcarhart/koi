import { readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {
  getDocs,
  expandIncludes,
  cleanMarkdown,
  rewriteDocLinks,
  renderMarkdown,
  exampleMarker,
} from './content';
import { docsIndexes } from './docs-indexes';
import {
  getDefaultVersion,
  getVersion,
  getVersions,
  versionedDocUrl,
  type KoiVersion,
} from './versions';
import {
  versionDestination,
  type VersionDestination,
} from './version-navigation';
export function versionIndexes(version: KoiVersion) {
  return docsIndexes.map((index) => ({
    ...index,
    url: versionedDocUrl(index.url, version),
  }));
}
export async function versionDestinations(): Promise<VersionDestination[]> {
  return Promise.all(
    getVersions().map(async (version) => ({
      id: version.id,
      base: version.base,
      docs: (await getDocs(version)).map(({ slug, url, id, headings }) => ({
        slug,
        url,
        id,
        headings,
      })),
      indexes: versionIndexes(version).map((index) => index.slug),
    })),
  );
}
export async function searchEntries(version: KoiVersion) {
  const docs = await getDocs(version);
  return [
    ...docs.flatMap((doc) => doc.search),
    ...versionIndexes(version).map((index) => ({
      title: index.title,
      section: index.title,
      group: 'Documentation',
      url: index.url,
      text: [
        index.description,
        ...docs
          .filter((doc) => doc.group === index.group)
          .map((doc) => doc.title),
      ].join(' '),
    })),
  ];
}

// Site entry links choose stable; an explicit version keeps navigation pinned.
export async function docsUrl(
  slug = '',
  version?: KoiVersion,
): Promise<string> {
  const target = version || getDefaultVersion();
  const docs = await getDocs(target);
  const index = versionIndexes(target).find((entry) => entry.slug === slug);
  if (index) return index.url;
  const doc = docs.find((entry) => entry.slug === slug);
  if (doc) return doc.url;
  const source = getVersion();
  const current = await getDocs(source);
  if (version || !current.some((entry) => entry.slug === slug)) {
    throw new Error(`Unknown documentation entry: ${slug} (${target.id})`);
  }
  return versionDestination(
    { id: source.id, base: source.base, docs: current, indexes: [] },
    { id: target.id, base: target.base, docs, indexes: [] },
    `${source.base}/${slug}`,
  );
}

// The standalone guide uses stable prose with the site's current installation methods.
export async function getStandaloneInstallation() {
  const version = getDefaultVersion();
  const docs = await getDocs(version);
  const doc = docs.find((entry) => entry.slug === 'install');
  if (!doc)
    throw new Error(`Missing installation documentation in ${version.id}.`);
  const { content } = matter(
    readFileSync(path.join(version.docsRoot, doc.file), 'utf8'),
  );
  const body = expandIncludes(content, version.docsRoot);
  const links = new Map(
    docs.flatMap((entry) => {
      const original = entry.slug ? `/docs/${entry.slug}` : '/docs';
      return [
        [original, entry.url],
        [original + '.md', entry.url + '.md'],
      ];
    }),
  );
  for (const index of versionIndexes(version))
    links.set(`/docs/${index.slug}`, index.url);
  const prose = await renderMarkdown(
    body.split(exampleMarker)[0],
    doc.id,
    links,
    { route: doc.url },
  );
  return {
    ...doc,
    prose: prose.html,
    markdown: rewriteDocLinks(cleanMarkdown(body), version),
  };
}
