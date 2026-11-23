import { readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {
  documentationResourceUrl,
  getVersion,
  type KoiVersion,
} from './versions';
import { exportMarkdown, getDocs, root } from './content';

export const agentPrompt = `Use Koi for Bash argument parsing in this project.

Read https://koishell.com/llms.txt and follow the relevant documentation links before writing code.

Use the documented API for the installed Koi version. Preserve existing behavior when migrating code.`;

export async function getAgentGuidance(
  version: KoiVersion = getVersion(),
): Promise<string> {
  const source = readFileSync(path.join(version.docsRoot, 'llms.md'), 'utf8');
  const optionalStart = source.indexOf('\n## Optional\n');
  if (optionalStart < 0)
    throw new Error('Missing Optional section in docs/llms.md');
  const intro = source
    .slice(0, optionalStart)
    .trimEnd()
    .replaceAll(
      'https://koishell.com/docs',
      `https://koishell.com${version.base}`,
    );
  const optional = source
    .slice(optionalStart)
    .trim()
    .replaceAll(
      'https://koishell.com/llms-full.txt',
      `https://koishell.com${documentationResourceUrl('llms-full.txt', version)}`,
    );
  const docs = await getDocs(version);
  const groups = [...new Set(docs.map((doc) => doc.group))];
  return (
    intro +
    '\n\n' +
    groups
      .map(
        (group) =>
          `## ${group}\n\n` +
          docs
            .filter((doc) => doc.group === group)
            .map(
              (doc) =>
                `- [${doc.title}](https://koishell.com${doc.url}.md): ${doc.description}`,
            )
            .join('\n'),
      )
      .join('\n\n') +
    `\n\n${optional}\n`
  );
}

export async function getFullDocumentation(
  version: KoiVersion = getVersion(),
): Promise<string> {
  const docs = await getDocs(version);
  return (
    docs
      .map((doc) => {
        const body = matter(exportMarkdown(doc)).content.trim();
        return `# ${doc.title}\n\n${doc.description}\n\nSource: https://koishell.com${doc.url}\n\n${body}`;
      })
      .join('\n\n---\n\n') + '\n'
  );
}

export function getSkill(): string {
  return readFileSync(path.join(root, 'skills/koi/SKILL.md'), 'utf8');
}
