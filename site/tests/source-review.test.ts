import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  installationReviewLink,
  sourceReviewPrompt,
} from '../src/lib/source-review';
import { getDocs, renderMarkdown } from '../src/lib/content';

test('the review prompt retains the full library and all literal source text', () => {
  for (const source of [
    readFileSync(new URL('../../koi', import.meta.url), 'utf8'),
    '\n\tprintf \'<script> & `text` "quotes"\'\r\n\n',
  ]) {
    const prompt = sourceReviewPrompt(source);
    assert.equal(prompt.slice(prompt.indexOf('[0]:\n') + 5), source);
    assert.ok(prompt.startsWith('I want to use the library Koi'));
  }
});

test('installation guidance is added to old docs, versioned, and idempotent', () => {
  const old = '## Install\n\n```bash\nsource koi\n```\n\n## Dependencies\n';
  const updated = installationReviewLink(old, 'v2.0.4');
  assert.match(updated, /```\n\n\*\*Nervous to source an unknown script\?/);
  assert.match(updated, /\]\(\/review-source\?version=v2.0.4\)/);
  assert.equal(installationReviewLink(updated, 'v2.0.4'), updated);
  const current = readFileSync(
    new URL('../../docs/getting-started/install.md', import.meta.url),
    'utf8',
  );
  assert.equal(
    installationReviewLink(current, 'unreleased').match(/Review the source/g)
      ?.length,
    1,
  );
});

test('installation HTML uses a text CTA and Markdown retains a readable link', async () => {
  const install = (await getDocs()).find((doc) => doc.slug === 'install')!;
  assert.match(
    install.markdown,
    /_\[Review the source >\]\(\/review-source\?version=unreleased\)_/,
  );
  assert.match(install.prose, /class="text-cta"/);
  assert.match(install.prose, /cta-arrow-chevron/);
  const { html } = await renderMarkdown(
    '[Review the source >](/review-source?version=v2.0.4)',
    '',
  );
  assert.match(html, /href="\/review-source\?version=v2.0.4"/);
  assert.doesNotMatch(html, /class="button/);
});
