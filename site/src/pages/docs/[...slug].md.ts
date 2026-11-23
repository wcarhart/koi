import { getVersions } from '../../lib/versions';
import { versionIndexes } from '../../lib/documentation';
import { markdownHeaders } from '../../lib/page-metadata';
import { indexDocs } from '../../lib/docs-indexes';
import { exportMarkdown, getDocs, type Doc } from '../../lib/content';
export async function getStaticPaths() {
  return (
    await Promise.all(
      getVersions().map(async (version) => {
        const docs = await getDocs(version);
        const prefix = version.id === 'unreleased' ? '' : version.id + '/';
        const docsIndexes = versionIndexes(version);
        const indexes = docsIndexes.map((index) => ({
          params: { slug: prefix + index.slug },
          props: {
            htmlPath: index.url,
            markdown:
              `# ${index.title}\n\n${index.description}\n\n` +
              indexDocs(index.slug, docs)
                .map(
                  (doc) =>
                    `- [${doc.title}](https://koishell.com${doc.url}.md): ${doc.description}`,
                )
                .join('\n') +
              '\n',
          },
        }));
        return [
          ...indexes,
          ...docs
            .filter((d) => prefix || d.slug)
            .map((doc) => ({
              params: { slug: (prefix + doc.slug).replace(/\/$/, '') },
              props: { doc, htmlPath: doc.url },
            })),
        ];
      }),
    )
  ).flat();
}
export function GET({
  props,
}: {
  props: { doc?: Doc; markdown?: string; htmlPath: string };
}) {
  return new Response(props.markdown ?? exportMarkdown(props.doc!), {
    headers: markdownHeaders(props.htmlPath),
  });
}
