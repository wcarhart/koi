import { getDocs } from '../lib/content';
import { docsIndexes, indexDocs } from '../lib/docs-indexes';
export async function GET() {
  const docs = await getDocs();
  return Response.json([
    ...docs.flatMap((doc) => doc.search),
    ...docsIndexes.map((index) => ({
      title: index.title,
      section: index.title,
      group: 'Documentation',
      url: index.url,
      text: [
        index.description,
        ...indexDocs(index.slug, docs).map((doc) => doc.title),
      ].join(' '),
    })),
  ]);
}
