import test from 'node:test';
import assert from 'node:assert/strict';
import { getDocs } from '../src/lib/content';
import { apiReferences, apiMentions } from '../src/lib/api-references';

test('API cards use published reference titles, descriptions, and routes', async () => {
  const docs = await getDocs();
  const references = apiReferences(docs);
  assert.equal(references.length, 8);
  for (const reference of references) {
    const doc = docs.find((doc) => doc.title === reference.title)!;
    const { usageHtml, ...metadata } = reference;
    assert.deepEqual(metadata, {
      title: doc.title,
      description: doc.description,
      url: doc.url,
    });
    assert.ok(doc.prose.includes(usageHtml));
    assert.match(usageHtml, /^<pre\b/);
    assert.match(usageHtml, /--shiki-dark:/);
    assert.doesNotMatch(usageHtml, /code-label|data-copy-code/);
    assert.equal(reference.url, `/docs/reference/${reference.title.slice(5)}`);
  }
});

test('API mentions match complete known names in code, comments, strings, and output', () => {
  const references = [
    { title: 'koi::parse', description: 'Parse', url: '/docs/reference/parse' },
  ];
  const code =
    'koi::parse "$@" # koi::parse\nprintf "koi::parse"\nkoi::parse_extra koi::unknown prefixkoi::parse koi::parse::extra';
  const matches = apiMentions(code, references);
  assert.equal(matches.length, 3);
  for (const match of matches) {
    assert.equal(
      code.slice(match.index, match.index + match[0].length),
      'koi::parse',
    );
  }
  assert.deepEqual(apiMentions(code, []), []);
});
