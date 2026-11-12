import { readFileSync } from 'node:fs';
import path from 'node:path';
import { docsRoot } from './content';

// The HTML page and raw endpoint share this exact, untransformed Markdown.
export function getAgentGuidance(): string {
  return readFileSync(path.join(docsRoot, 'llms.md'), 'utf8');
}
