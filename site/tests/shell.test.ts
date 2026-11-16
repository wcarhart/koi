import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  renderMarkdown,
  getDocs,
  exportMarkdown,
  root,
} from '../src/lib/content';

const transcript =
  '$ printf "%s\\n" "$name"\noutput "$name" # --flag <tag>&\n$ false\nrejected';

test('shell fences highlight prompted commands and keep output plain in one copyable block', async () => {
  for (const language of ['bash', 'text']) {
    const { html } = await renderMarkdown(
      `\`\`\`${language} shell line-numbers\n${transcript}\n\`\`\``,
      'shell',
    );
    assert.equal((html.match(/<pre /g) || []).length, 1);
    assert.equal((html.match(/data-copy-code/g) || []).length, 1);
    assert.match(html, /<span>Shell<\/span>/);
    const lines = [
      ...html.matchAll(/<span class="line"[^>]*>(.*?)<\/span>(?=\n|<\/code>)/g),
    ];
    assert.equal(lines.length, 4);
    assert.ok((lines[0][1].match(/<span /g) || []).length > 1);
    assert.equal((lines[1][1].match(/<span /g) || []).length, 1);
    assert.match(lines[1][1], /output "\$name" # --flag &#x3C;tag>&#x26;/);
    assert.equal((lines[3][1].match(/<span /g) || []).length, 1);
    const plain = html
      .match(/<code>([^]*?)<\/code>/)![1]
      .replace(/<[^>]*>/g, '')
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCodePoint(parseInt(hex, 16)),
      )
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&amp;', '&');
    assert.equal(plain, transcript);
    assert.equal((html.match(/data-line-number=/g) || []).length, 4);
  }
});

test('validator documentation examples accept capitalized letter-only names and reject other input', async () => {
  const doc = (await getDocs()).find(
    (doc) => doc.slug === 'reference/add_validator',
  )!;
  const blocks = [...doc.markdown.matchAll(/```bash\n([^]*?)\n```/g)].map(
    (match) => match[1],
  );
  const predicate = blocks.find((block) => block.includes('is_valid_name()'))!;
  const main = blocks.find((block) =>
    block.includes('koi::add_validator name'),
  )!;
  assert.ok(predicate && main);
  for (const name of ['Ada', 'A', 'ALICE', 'ada', 'Ada1', '', 'Ada Lovelace']) {
    const accepted = ['Ada', 'A', 'ALICE'].includes(name);
    const result = spawnSync(
      'bash',
      [
        '-c',
        `source ./koi\n${predicate}\n${main}\nmain "$@"`,
        'greet.sh',
        name,
      ],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 5000,
      },
    );
    assert.equal(result.status, accepted ? 0 : 2, result.stderr);
    assert.equal(result.stdout, accepted ? `Hello, ${name}!\n` : '');
    assert.equal(
      result.stderr,
      accepted
        ? ''
        : "koi: invalid argument 'name': Name must contain letters only and start with a capital\n",
    );
  }
  assert.ok(exportMarkdown(doc).includes('```bash shell\n$ ./greet.sh "ada"'));
  assert.doesNotMatch(doc.markdown, /TODO:/);
  assert.match(doc.prose, /class="validation-lifecycle"/);
});
