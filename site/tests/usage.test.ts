import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { usageLanguage } from '../src/lib/usage-language';
import {
  docsRoot,
  getDocs,
  renderMarkdown,
  exportMarkdown,
} from '../src/lib/content';

const references = [
  'addarg',
  'addcommand',
  'adddescription',
  'parseargs',
  'koiconfig',
  'koirun',
];

test('all API reference signatures use highlighted usage notation without changing source text', async () => {
  const docs = await getDocs();
  for (const name of references) {
    const source = readFileSync(
      path.join(docsRoot, `reference/${name}.md`),
      'utf8',
    );
    const signature = source.match(/```text usage\n([^]*?)\n```/)![1];
    assert.ok(signature.startsWith(`__${name} `));
    const { html } = await renderMarkdown(
      `\`\`\`text usage\n${signature}\n\`\`\``,
      'usage',
    );
    assert.match(html, /<span>Usage<\/span>/);
    assert.match(html, /--shiki-dark:/);
    assert.match(html, /data-copy-code/);
    assert.equal(
      html.match(/<code>([^]*?)<\/code>/)![1].replace(/<[^>]*>/g, ''),
      signature,
    );
    const doc = docs.find((doc) => doc.slug === `reference/${name}`)!;
    assert.ok(
      exportMarkdown(doc).includes(`\`\`\`text usage\n${signature}\n\`\`\``),
    );
  }
});

test('usage grammar distinguishes alternatives, options, placeholders, and the Bash guard', async () => {
  const high = await createHighlighterCore({
    themes: [
      import('shiki/themes/github-light.mjs'),
      import('shiki/themes/github-dark.mjs'),
    ],
    langs: [usageLanguage],
    engine: createJavaScriptRegexEngine(),
  });
  try {
    for (const theme of ['github-light', 'github-dark']) {
      const { tokens } = high.codeToTokens(
        '__addarg DEST (-f|-o|-p) [-s SHORT] [--long LONG] "$@" || return "$koi_status"',
        {
          lang: 'koi-usage',
          theme,
          includeExplanation: true,
        },
      );
      const explained = tokens
        .flat()
        .flatMap((token) => token.explanation ?? []);
      for (const [text, scope] of [
        ['__addarg', 'entity.name.function'],
        ['DEST', 'constant.other'],
        ['SHORT', 'constant.other'],
        ['-f', 'variable.parameter'],
        ['-o', 'variable.parameter'],
        ['-p', 'variable.parameter'],
        ['--long', 'variable.parameter'],
        ['(', 'punctuation.definition.usage'],
        [')', 'punctuation.definition.usage'],
        ['[', 'punctuation.definition.usage'],
        [']', 'punctuation.definition.usage'],
        ['|', 'punctuation.definition.usage'],
        ['||', 'keyword.operator.logical'],
        ['return', 'keyword.control'],
        ['$@', 'variable'],
        ['$koi_status', 'variable'],
        ['"', 'string.quoted.double'],
      ]) {
        assert.ok(
          explained.some(
            (token) =>
              token.content === text &&
              token.scopes.some((s) => s.scopeName === scope),
          ),
          `${theme}: ${text} uses ${scope}`,
        );
      }
    }
  } finally {
    high.dispose();
  }
});

test('usage rendering escapes content and composes with line numbers and disabled copying', async () => {
  const { html } = await renderMarkdown(
    '```text usage line-numbers\n__adddescription TEXT\n\n<tag>&\n```',
    'usage',
    new Map(),
    { copy: false },
  );
  assert.match(html, /&#x3C;tag>&#x26;/);
  assert.doesNotMatch(html, /<tag>|data-copy-code/);
  assert.deepEqual(
    [...html.matchAll(/data-line-number="(\d+)"/g)].map((m) => m[1]),
    ['1', '2', '3'],
  );
  for (const fence of ['text', 'bash', 'bash usage', 'json']) {
    const { html } = await renderMarkdown(
      `\`\`\`${fence}\nTEXT\n\`\`\``,
      'ordinary',
    );
    assert.doesNotMatch(html, /<span>Usage<\/span>/);
    assert.match(html, new RegExp(`<span>${fence.split(' ')[0]}<\\/span>`));
  }
});
