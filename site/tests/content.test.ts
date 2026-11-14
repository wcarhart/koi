import test from 'node:test';
import assert from 'node:assert/strict';
import matter from 'gray-matter';
import GithubSlugger from 'github-slugger';
import {
  getDocs,
  validateManifest,
  renderMarkdown,
  exportMarkdown,
  cleanMarkdown,
  validateLinks,
  expandIncludes,
} from '../src/lib/content';
import { search } from '../src/lib/search';

test('published content includes concept and guide outlines, excludes planned drafts, and expands executable examples', async () => {
  const docs = await getDocs();
  const reference = docs.filter((d) => d.group === 'Reference');
  assert.equal(reference.length, 7);
  assert.equal(reference.at(-1)!.slug, 'reference/glossary');
  assert.equal(docs.length, 23);
  const concepts = docs.filter((d) => d.group === 'Core concepts');
  assert.deepEqual(
    concepts.map((d) => d.title),
    [
      'Arguments and values',
      'Registration contexts and blocks',
      'Calls and command routing',
      'Destination variables and scope',
      'Parsing and control flow',
    ],
  );
  const guides = docs.filter((d) => d.group === 'Guides');
  assert.equal(guides.length, 5);
  for (const doc of [...concepts, ...guides].filter(
    (d) => !['concepts/arguments', 'concepts/lifecycle'].includes(d.slug),
  )) {
    assert.match(
      doc.markdown,
      /Authoring outline: documentation to be written/,
    );
    assert.match(doc.markdown, /- TODO:/);
  }
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
    '> [!WARNING] Always use a guard\n>\n> **Always** guard parsing.\n>\n> ```bash\n> __parseargs "$@" || return "$koi_status"\n> ```\n>\n> [Learn more](/docs/concepts/lifecycle)\n\n> Ordinary quote',
    'callout-test',
  );
  assert.match(
    html,
    /<aside class="callout callout-warning" aria-label="Always use a guard">/,
  );
  assert.match(html, /<strong>Always<\/strong>/);
  assert.match(html, /data-copy-code/);
  assert.match(html, /href="\/docs\/concepts\/lifecycle"/);
  assert.match(html, /<blockquote><p>Ordinary quote<\/p>\n<\/blockquote>/);
});

test('callout titles render inline Markdown with a plain text accessible label', async () => {
  for (const marker of ['NOTE', 'WARNING', 'IMPORTANT']) {
    const { html } = await renderMarkdown(
      `> [!${marker}] What about \`$?\`? **Errors** and [help](/docs/reference/parseargs)\n>\n> Callout body.`,
      'title',
    );
    assert.match(html, /aria-label="What about \$\?\? Errors and help"/);
    assert.match(
      html,
      /<span>What about <code>\$\?<\/code>\? <strong>Errors<\/strong> and <a href="\/docs\/reference\/parseargs">help<\/a><\/span>/,
    );
    assert.match(html, /<p>Callout body\.<\/p>/);
  }

  const { html } = await renderMarkdown(
    '> [!NOTE] Use `"<&>`\n>\n> Body.',
    'escaped-title',
  );
  assert.match(html, /aria-label="Use &quot;&lt;&amp;&gt;"/);
  assert.match(html, /<code>&quot;&lt;&amp;&gt;<\/code>/);
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

test('code line numbers are opt-in and preserve source text including blank lines', async () => {
  for (const metadata of [
    '',
    'line-numbers',
    'line-numbers=true',
    'line-numbers=false',
  ]) {
    const { html } = await renderMarkdown(
      `\`\`\`bash ${metadata}\nprintf 'first\\n'\n\nprintf 'last\\n'\n\`\`\``,
      'numbers',
    );
    const numbered =
      metadata === 'line-numbers' || metadata === 'line-numbers=true';
    if (numbered) {
      assert.deepEqual(
        [...html.matchAll(/data-line-number="(\d+)"/g)].map((m) => m[1]),
        ['1', '2', '3'],
      );
    } else {
      assert.doesNotMatch(html, /data-line-number/);
    }
    assert.match(html, /<span>bash<\/span>/);
    const code = html
      .match(/<code>([^]*?)<\/code>/)![1]
      .replace(/<[^>]*>/g, '');
    assert.equal(code, "printf 'first\\n'\n\nprintf 'last\\n'");
  }
});

test('included snippets preserve the line number setting in rendering and Markdown exports', async () => {
  for (const file of ['greet.sh', 'greet-help.txt']) {
    for (const metadata of ['', 'line-numbers', 'line-numbers=false']) {
      const markdown = expandIncludes(
        `<!-- koi:include ${file}${metadata ? ` ${metadata}` : ''} -->`,
      );
      const language = file.endsWith('.sh') ? 'bash' : 'text';
      assert.ok(
        markdown.includes(
          `\`\`\`${language}${metadata ? ` ${metadata}` : ''}\n`,
        ),
      );
      assert.doesNotMatch(markdown, /koi:include/);
      const { html } = await renderMarkdown(markdown, 'snippet');
      assert.equal(
        html.includes('data-line-number'),
        metadata === 'line-numbers',
      );
    }
  }
});

test('only the two selected lifecycle examples have line numbers, including the nested callout', async () => {
  const docs = await getDocs();
  const numbered: string[] = [];
  for (const doc of docs) {
    for (const block of (doc.prose + doc.example).matchAll(
      /<div class="code-block">([^]*?)<\/pre><\/div>/g,
    )) {
      if (!block[1].includes('data-line-number')) continue;
      assert.equal(doc.slug, 'concepts/lifecycle');
      assert.match(block[1], /data-line-number="1"/);
      numbered.push(block[1].replace(/<[^>]*>/g, ''));
    }
  }
  assert.equal(numbered.length, 2);
  assert.match(numbered[0], /greet\(\)/);
  assert.match(numbered[1], /deploy\(\)/);
  assert.match(numbered[1], /admin/);
  const lifecycle = docs.find((doc) => doc.slug === 'concepts/lifecycle')!;
  assert.match(
    lifecycle.prose,
    /<aside[^]*?data-line-number="1"[^]*?<\/aside>/,
  );
  assert.equal(
    (exportMarkdown(lifecycle).match(/```bash line-numbers/g) || []).length,
    2,
  );
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

test('all docs expose short fragments in links and search while accepting legacy IDs', async () => {
  const docs = await getDocs();
  for (const doc of docs) {
    for (const heading of doc.headings) {
      const html = doc.prose + doc.example;
      assert.ok(html.includes(`data-fragment="${heading.fragment}"`));
      assert.ok(html.includes(`href="${doc.url}#${heading.fragment}"`));
      for (const fragment of [heading.fragment, heading.id]) {
        validateLinks([{ ...doc, markdown: `[Heading](#${fragment})` }]);
        validateLinks([
          { ...doc, markdown: `[Heading](${doc.url}#${fragment})` },
        ]);
      }
    }
    for (const entry of doc.search.filter((entry) => entry.url.includes('#'))) {
      assert.ok(
        doc.headings.some((h) => entry.url === `${doc.url}#${h.fragment}`),
      );
    }
  }
  const glossary = docs.find((doc) => doc.slug === 'reference/glossary')!;
  validateLinks([{ ...glossary, markdown: '[Flag](#flag)' }]);
  assert.ok(glossary.prose.includes('href="/docs/reference/glossary#flag"'));
});

test('short fragments disambiguate duplicate headings across both halves of a document', async () => {
  const slugger = new GithubSlugger();
  const options = { route: '/docs/example', slugger };
  const prose = await renderMarkdown(
    '## Values & defaults!\n\n[Jump](#values--defaults)',
    'doc-example',
    new Map(),
    options,
  );
  const example = await renderMarkdown(
    '## Values & defaults!\n\n## Values & defaults!',
    'doc-example-example',
    new Map(),
    options,
  );
  assert.deepEqual(
    [...prose.headings, ...example.headings].map((h) => h.fragment),
    ['values--defaults', 'values--defaults-1', 'values--defaults-2'],
  );
  assert.match(prose.html, /href="\/docs\/example#values--defaults"/);
  assert.match(example.html, /href="\/docs\/example#values--defaults-1"/);
});
