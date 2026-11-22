import { getFullDocumentation } from '../lib/agent-guidance';

export async function GET() {
  return new Response(await getFullDocumentation(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
