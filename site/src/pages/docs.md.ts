import { markdownHeaders } from '../lib/page-metadata';
import { exportMarkdown, getDocs } from '../lib/content';
export async function GET() {
  return new Response(exportMarkdown((await getDocs())[0]), {
    headers: markdownHeaders('/docs'),
  });
}
