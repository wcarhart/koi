import { markdownHeaders } from '../lib/page-metadata';
import { exportMarkdown } from '../lib/content';
import { getStandaloneInstallation } from '../lib/documentation';
export async function GET() {
  return new Response(exportMarkdown(await getStandaloneInstallation()), {
    headers: markdownHeaders('/install', 'text/markdown; charset=utf-8'),
  });
}
