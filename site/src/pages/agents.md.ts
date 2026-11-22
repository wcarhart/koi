import { markdownHeaders } from '../lib/page-metadata';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { docsRoot } from '../lib/content';
import { agentPrompt } from '../lib/agent-guidance';
export function GET() {
  const source = readFileSync(path.join(docsRoot, 'pages/agents.md'), 'utf8');
  const page = matter(source);
  const body = page.content.replace(
    /\]\((\/[^)]*)\)/g,
    '](https://koishell.com$1)',
  );
  return new Response(
    matter.stringify(body + '\n```text\n' + agentPrompt + '\n```\n', page.data),
    {
      headers: markdownHeaders('/agents', 'text/markdown; charset=utf-8'),
    },
  );
}
