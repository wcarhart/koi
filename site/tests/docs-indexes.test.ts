import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import {
  getDocs,
  root,
  validateLinks,
  exportMarkdown,
} from '../src/lib/content';
import { docsIndexes, indexDocs } from '../src/lib/docs-indexes';
import { GET as searchIndex } from '../src/pages/search.json';
import { GET as sitemap } from '../src/pages/sitemap.xml';

test('standalone indexes resolve links and discovery without joining continuous articles', async () => {
  const docs = await getDocs();
  for (const index of docsIndexes) {
    assert.ok(docs.every((doc) => doc.url !== index.url));
    validateLinks([{ ...docs[0], markdown: `[${index.title}](${index.url})` }]);
  }
  assert.deepEqual(
    indexDocs('guides', docs).map((doc) => doc.slug),
    [
      'guides/arguments',
      'guides/commands',
      'guides/reuse-parsing-functions',
      'guides/help',
      'guides/troubleshooting',
    ],
  );
  assert.equal(indexDocs('reference', docs).length, 6);
  assert.equal(indexDocs('examples', docs).length, 3);
  const entries = await (await searchIndex()).json();
  const xml = await sitemap().text();
  for (const index of docsIndexes) {
    assert.ok(
      entries.some((entry: { url: string }) => entry.url === index.url),
    );
    assert.ok(xml.includes(`<loc>https://koishell.com${index.url}</loc>`));
  }
});

test('Meet koi exports the requested introduction and its bark script works unchanged', async () => {
  const doc = (await getDocs())[0];
  assert.equal(doc.description, 'Bashful argument parsing');
  assert.match(doc.markdown, /lightweight, 100% Bash-native argument parser/);
  assert.match(doc.markdown, /## Why the name _koi\?_/);
  const markdown = exportMarkdown(doc);
  for (const index of docsIndexes)
    assert.ok(markdown.includes(`https://koishell.com${index.url}`));
  const script = doc.markdown.match(/```bash\n([^]*?)\n```/)![1];
  const cases = [
    { args: [], output: 'Fido says woof!\n' },
    { args: ['-n', 'Ada'], output: 'Ada says woof!\n' },
    { args: ['--name', 'two words'], output: 'two words says woof!\n' },
    { args: ['--help'], output: undefined },
  ];
  for (const fixture of cases) {
    const result = spawnSync(
      'bash',
      ['-c', script, 'bark.sh', ...fixture.args],
      {
        cwd: root,
        env: { ...process.env, PATH: root + path.delimiter + process.env.PATH },
        encoding: 'utf8',
        timeout: 5000,
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    if (fixture.output) assert.equal(result.stdout, fixture.output);
    else {
      assert.match(result.stdout, /--name/);
      assert.doesNotMatch(result.stdout, /says woof!/);
    }
  }
});
