import { exportMarkdown, getDocs } from '../lib/content';
export async function GET() {
  return new Response(exportMarkdown((await getDocs())[0]), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
