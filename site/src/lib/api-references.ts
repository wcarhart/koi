export interface ApiReference {
  title: string;
  description: string;
  url: string;
  usageHtml: string;
}

export function apiReferences(
  docs: (Omit<ApiReference, 'usageHtml'> & { slug: string; prose: string })[],
): ApiReference[] {
  return docs
    .filter(
      (doc) =>
        doc.slug.startsWith('reference/') && /^koi::\w+$/.test(doc.title),
    )
    .map(({ title, description, url, prose }) => {
      // Reuse the reference page's highlighted usage without its label or copy control.
      const usageHtml = prose.match(
        /<span>Usage<\/span>[^]*?<\/div>(<pre\b[^]*?<\/pre>)/,
      )?.[1];
      if (!usageHtml) throw new Error(`Missing usage signature for ${title}`);
      return { title, description, url, usageHtml };
    });
}

export function apiMentions(
  text: string,
  references: Pick<ApiReference, 'title'>[],
) {
  const names = new Set(references.map((reference) => reference.title));
  return [...text.matchAll(/(?<![\w:])koi::[a-zA-Z_][\w]*(?![\w:])/g)].filter(
    (match) => names.has(match[0]),
  );
}
