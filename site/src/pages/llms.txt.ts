import { getAgentGuidance } from '../lib/agent-guidance';

export async function GET() {
  return new Response(await getAgentGuidance(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
