import test from 'node:test';
import assert from 'node:assert/strict';
import matter from 'gray-matter';
import {
  getDocs,
  validateManifest,
  renderMarkdown,
  exportMarkdown,
  cleanMarkdown,
  validateLinks,
} from '../src/lib/content';
import { search } from '../src/lib/search';

test('published content has six API pages, excludes outlines, and expands executable examples', async () => {
  const docs = await getDocs();
  assert.equal(docs.filter((d) => d.group === 'API reference').length, 6);
  assert.equal(docs.length, 18);
  assert.ok(docs.every((d) => !d.file.startsWith('outlines/')));
  const addarg = docs.find((d) => d.slug === 'reference/addarg')!;
  assert.match(addarg.markdown, /__parseargs "\$@" \|\| return "\$koi_status"/);
  assert.doesNotMatch(addarg.markdown, /koi:include|koi:example|^---/);
  assert.match(addarg.example, /Copy code/);
  assert.doesNotMatch(addarg.markdown, /# Usage: main/);
});
test('manifest rejects duplicate paths, DOM IDs, invalid sources, and unknown builders', () => {
  const entry = { file: 'a.md', slug: 'a', group: 'A' };
  assert.throws(() => validateManifest([entry, { ...entry, file: 'b.md' }]));
  assert.throws(() => validateManifest([entry, { ...entry, slug: 'b' }]));
  assert.throws(() => validateManifest([{ ...entry, slug: '../oops' }]));
  assert.throws(() => validateManifest([{ ...entry, file: '../a.md' }]));
  assert.throws(() =>
    validateManifest([{ ...entry, interactive: 'unknown' as 'addarg' }]),
  );
  assert.throws(() =>
    validateManifest([
      { ...entry, slug: 'a/b' },
      { ...entry, slug: 'a-b', file: 'b.md' },
    ]),
  );
});
test('heading IDs are globally prefixed and repeated titles get unique fragments', async () => {
  const { html, headings } = await renderMarkdown(
    '## Options\n\n## Options',
    'doc-example',
  );
  assert.deepEqual(
    headings.map((h) => h.id),
    ['doc-example-options', 'doc-example-options-1'],
  );
  assert.match(html, /href="#doc-example-options"/);
});
test('exports generate title and subtitle frontmatter, omit layout markers, and make internal links absolute', async () => {
  assert.equal(
    cleanMarkdown('hello\n<!-- koi:example -->\nworld'),
    'hello\n\nworld\n',
  );
  const docs = await getDocs();
  for (const doc of docs.filter((doc) =>
    ['', 'quickstart', 'reference/addarg'].includes(doc.slug),
  )) {
    const markdown = exportMarkdown(doc);
    const { data, content } = matter(markdown);
    assert.ok(markdown.startsWith('---\n'));
    assert.deepEqual(data, { title: doc.title, subtitle: doc.description });
    assert.ok(markdown.endsWith('\n'));
    assert.doesNotMatch(content, /koi:include|koi:example|^# /);
  }
  const doc = docs[0];
  assert.match(exportMarkdown(doc), /https:\/\/koishell.com\/docs\/install/);
  const special = {
    ...doc,
    title: 'A title: with "quotes" and # symbols',
    description: 'A summary: with "quotes", backslashes \\ and\na second line.',
  };
  assert.deepEqual(matter(exportMarkdown(special)).data, {
    title: special.title,
    subtitle: special.description,
  });
});
test('broken local routes and fragments are diagnosed', async () => {
  const doc = (await getDocs())[0];
  assert.throws(
    () => validateLinks([{ ...doc, markdown: '[broken](/docs/no-such-page)' }]),
    /Broken/,
  );
  assert.throws(
    () => validateLinks([{ ...doc, markdown: '[broken](#no-heading)' }]),
    /Broken/,
  );
});
test('search favors exact API names, handles empty and missing results, and links headings', async () => {
  const entries = (await getDocs()).flatMap((d) => d.search);
  assert.equal(search(entries, '__addarg')[0].title, '__addarg');
  assert.equal(search(entries, '  ').length, 0);
  assert.equal(search(entries, 'a-word-that-does-not-exist').length, 0);
  assert.ok(search(entries, 'Parser result').some((e) => e.url.includes('#')));
});

test('unprefixed homepage headings use clean title fragments', async () => {
  const { html, headings } = await renderMarkdown(
    '## Intuitive help menus, for free.',
    '',
  );
  assert.equal(headings[0].id, 'intuitive-help-menus-for-free');
  assert.match(html, /href="#intuitive-help-menus-for-free"/);
});

test('installation exports include every tab command and the five shared sections', async () => {
  const doc = (await getDocs()).find((doc) => doc.slug === 'install')!;
  assert.deepEqual(
    doc.headings.map((heading) => heading.title),
    [
      'Quick install',
      'Dependencies',
      'Manual install',
      'Clone',
      'Older Bash versions',
    ],
  );
  const markdown = exportMarkdown(doc);
  for (const command of [
    'sudo apt install koi',
    'sudo pacman -S koi',
    'sudo dnf install koi',
    'sudo apk add koi',
    'mise use -g koi@latest',
    'sudo apt-get install bash',
    'sudo dnf install bash',
    'wsl --install',
  ]) {
    assert.ok(markdown.includes(command));
  }
  assert.doesNotMatch(markdown, /koi:install|<button|role="tab"/);
  assert.match(doc.prose, /data-install-tabs/);
  assert.match(
    doc.prose,
    /https:\/\/github.com\/wcarhart\/koi\/releases\/tag\/v1.2.1/,
  );
  assert.match(doc.prose, /source \.\/koi/);
});

test('Markdown external origins open safely in a new tab while local destinations stay in place', async () => {
  const { html } = await renderMarkdown(
    '[External](https://docs.python.org/3/library/argparse.html) [Relative external](//github.com/wcarhart/koi) [Local](/docs/install) [Same origin](https://koishell.com/docs) [Heading](#heading) [Email](mailto:hello@example.com)',
    '',
  );
  const anchors = html.match(/<a [^>]+>/g)!;
  for (const anchor of anchors.slice(0, 2)) {
    assert.match(anchor, /target="_blank" rel="noopener noreferrer"/);
  }
  for (const anchor of anchors.slice(2))
    assert.doesNotMatch(anchor, /target=|rel=/);
});

test('warning callouts render rich content and leave ordinary quotes intact', async () => {
  const { html } = await renderMarkdown(
    '> [!WARNING] Always use a guard\n>\n> **Always** guard parsing.\n>\n> ```bash\n> __parseargs "$@" || return "$koi_status"\n> ```\n>\n> [Learn more](/docs/guides/lifecycle)\n\n> Ordinary quote',
    'callout-test',
  );
  assert.match(
    html,
    /<aside class="callout callout-warning" aria-label="Always use a guard">/,
  );
  assert.match(html, /<strong>Always<\/strong>/);
  assert.match(html, /data-copy-code/);
  assert.match(html, /href="\/docs\/guides\/lifecycle"/);
  assert.match(html, /<blockquote><p>Ordinary quote<\/p>\n<\/blockquote>/);
});

test('information callouts use a circle icon and purple theme class', async () => {
  for (const marker of ['NOTE', 'IMPORTANT']) {
    const { html } = await renderMarkdown(
      `> [!${marker}] Good to know\n>\n> Neutral information.`,
      'info',
    );
    assert.match(html, /class="callout callout-information"/);
    assert.match(html, /<circle cx="12" cy="12" r="9"/);
    assert.match(html, /Good to know/);
  }
});

test('reference headings expose route-local fragments and examples have no anchors', async () => {
  const docs = (await getDocs()).filter((doc) =>
    doc.slug.startsWith('reference/'),
  );
  for (const doc of docs) {
    assert.doesNotMatch(doc.example, /heading-anchor|<h[1-6] id=/);
    for (const heading of doc.headings) {
      const fragment = heading.id.slice(doc.id.length + 1);
      assert.ok(doc.prose.includes(`href="${doc.url}#${fragment}"`));
      assert.ok(
        doc.search.some((entry) => entry.url === `${doc.url}#${fragment}`),
      );
    }
  }
});
