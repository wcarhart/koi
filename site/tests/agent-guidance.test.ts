import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  getAgentGuidance,
  getFullDocumentation,
  getSkill,
  agentPrompt,
} from '../src/lib/agent-guidance';
import {
  docsRoot,
  exportMarkdown,
  getDocs,
  validateLinks,
} from '../src/lib/content';
import { GET } from '../src/pages/llms.txt';
import { GET as fullResponse } from '../src/pages/llms-full.txt';
import { GET as skillResponse } from '../src/pages/skill.md';
import matter from 'gray-matter';
import { docActionLinks } from '../src/lib/doc-actions';

test('agent index contains every published Markdown document and no draft placeholders', async () => {
  const response = await GET();
  const source = await getAgentGuidance();
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get('content-type'),
    'text/plain; charset=utf-8',
  );
  assert.equal(await response.text(), source);
  assert.match(source, /^# Koi\n\n> /);
  assert.doesNotMatch(source, /To be written|> Draft:/);
  for (const doc of await getDocs())
    assert.ok(source.includes(`https://koishell.com${doc.url}.md`));
  assert.ok(source.includes('https://koishell.com/skill.md'));
  assert.notEqual(source, agentPrompt);
  const optional = source.slice(source.indexOf('\n## Optional\n'));
  assert.ok(
    optional.includes(
      '- [Complete documentation](https://koishell.com/llms-full.txt): All koi v2 documentation in one Markdown file.',
    ),
  );
  assert.equal(source.match(/^## Optional$/gm)?.length, 1);
  assert.ok(
    source.indexOf('## Getting started') < source.indexOf('## Optional'),
  );
});

test('full documentation exports each published article once in continuous reading order', async () => {
  const response = await fullResponse();
  const full = await getFullDocumentation();
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get('content-type'),
    'text/plain; charset=utf-8',
  );
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(await response.text(), full);
  let previous = -1;
  for (const doc of await getDocs()) {
    const header = `# ${doc.title}\n\n${doc.description}\n\nSource: https://koishell.com${doc.url}\n`;
    const position = full.indexOf(header);
    assert.ok(position > previous, `Missing or misordered article: ${doc.url}`);
    assert.equal(
      full.indexOf(header, position + header.length),
      -1,
      `Repeated article: ${doc.url}`,
    );
    assert.ok(full.includes(matter(exportMarkdown(doc)).content.trim()));
    previous = position;
  }
  assert.doesNotMatch(full, /<!-- koi:(include|install|example)\b/);
  assert.doesNotMatch(full, /^title:|^subtitle:|^layout:|^draft:/m);
  const navigation = JSON.parse(
    readFileSync(path.join(docsRoot, 'navigation.json'), 'utf8'),
  ) as { file: string; slug: string }[];
  for (const entry of navigation) {
    const source = matter(
      readFileSync(path.join(docsRoot, entry.file), 'utf8'),
    );
    if (source.data.draft)
      assert.ok(
        !full.includes(`\nSource: https://koishell.com/docs/${entry.slug}\n`),
      );
  }
  assert.ok(full.endsWith('\n'));
});

test('skill endpoint preserves source bytes and portable frontmatter', async () => {
  const source = getSkill();
  assert.equal(await skillResponse().text(), source);
  assert.equal(
    source,
    readFileSync(path.join(docsRoot, '../skills/koi/SKILL.md'), 'utf8'),
  );
  const { data } = matter(source);
  assert.equal(data.name, 'koi');
  assert.ok(data.description.length > 0 && data.description.length <= 1024);
  assert.deepEqual(Object.keys(data).sort(), ['description', 'name']);
});

test('document action URLs encode the supplied prompt and issue template', () => {
  const links = docActionLinks('/docs/install');
  assert.equal(links.markdown, 'https://koishell.com/docs/install.md');
  const prompt = new URL(links.chatgpt).searchParams.get('q');
  assert.equal(new URL(links.claude).searchParams.get('q'), prompt);
  assert.ok(prompt?.includes(links.markdown));
  assert.ok(
    prompt?.endsWith("Don't invent APIs or syntax that aren't documented."),
  );
  const issue = new URL(links.issue);
  assert.equal(issue.searchParams.get('title'), 'Problem with /docs/install');
  assert.equal(
    issue.searchParams.get('body'),
    'I found a problem with koi or its documentation at [/docs/install](https://koishell.com/docs/install).\n\n<!-- Describe the issue with this documentation. -->',
  );
});

test('agent routes are valid links without joining the docs tree or search index', async () => {
  const docs = await getDocs();
  validateLinks([
    {
      ...docs[0],
      markdown:
        '[Agent guidance](/agents), [Raw text](/llms.txt), and [Full docs](/llms-full.txt)',
    },
  ]);
  assert.ok(
    docs.every((doc) => doc.url !== '/agents' && doc.url !== '/llms.txt'),
  );
  assert.ok(
    docs
      .flatMap((doc) => doc.search)
      .every((entry) => entry.url !== '/agents' && entry.url !== '/llms.txt'),
  );
});
