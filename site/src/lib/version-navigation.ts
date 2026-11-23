export interface VersionDocument {
  slug: string;
  url: string;
  id: string;
  headings: { id: string; fragment: string }[];
}
export interface VersionDestination {
  id: string;
  base: string;
  docs: VersionDocument[];
  indexes: string[];
}
export function versionDestination(
  source: VersionDestination,
  target: VersionDestination,
  pathname: string,
  hash = '',
): string {
  const slug =
    pathname === source.base ? '' : pathname.slice(source.base.length + 1);
  if (target.indexes.includes(slug)) return `${target.base}/${slug}`;
  let doc = target.docs.find((entry) => entry.slug === slug);
  if (!doc) {
    const index = source.docs.findIndex((entry) => entry.slug === slug);
    for (
      let distance = 1;
      index >= 0 && distance < source.docs.length;
      distance++
    ) {
      const previous = source.docs[index - distance];
      const next = source.docs[index + distance];
      doc =
        target.docs.find((entry) => entry.slug === previous?.slug) ||
        target.docs.find((entry) => entry.slug === next?.slug);
      if (doc) break;
    }
    return doc?.url || target.base;
  }
  let fragment = '';
  try {
    fragment = decodeURIComponent(hash.replace(/^#/, ''));
  } catch {
    /* Discard malformed fragments. */
  }
  const keep =
    fragment === doc.id ||
    doc.headings.some(
      (heading) => heading.id === fragment || heading.fragment === fragment,
    );
  return doc.url + (fragment && keep ? `#${encodeURIComponent(fragment)}` : '');
}
