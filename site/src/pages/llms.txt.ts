import { getAgentGuidance } from '../lib/agent-guidance';

export function GET() {
  return new Response(getAgentGuidance(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
