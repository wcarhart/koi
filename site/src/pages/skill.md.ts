import { getSkill } from '../lib/agent-guidance';

export function GET() {
  return new Response(getSkill(), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
