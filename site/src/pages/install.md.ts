import { markdownHeaders } from '../lib/page-metadata';
import { exportMarkdown, getDocs } from '../lib/content';
export async function GET() {
  return new Response(
    exportMarkdown((await getDocs()).find((doc) => doc.slug === 'install')!),
    {
      headers: markdownHeaders('/install', 'text/markdown; charset=utf-8'),
    },
  );
}
