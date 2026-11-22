import { markdownHeaders } from '../../lib/page-metadata';
import { docsIndexes, indexDocs } from '../../lib/docs-indexes';
import { exportMarkdown, getDocs, type Doc } from '../../lib/content';
export async function getStaticPaths() {
  const docs = await getDocs();
  const indexes = docsIndexes.map((index) => ({
    params: { slug: index.slug },
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
      .filter((d) => d.slug)
      .map((doc) => ({
        params: { slug: doc.slug },
        props: { doc, htmlPath: doc.url },
      })),
  ];
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
