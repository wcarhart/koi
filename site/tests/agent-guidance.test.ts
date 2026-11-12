import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getAgentGuidance } from '../src/lib/agent-guidance';
import { docsRoot, getDocs, validateLinks } from '../src/lib/content';
import { GET } from '../src/pages/llms.txt';

test('raw agent endpoint preserves its single Markdown source and text headers', async () => {
  const source = readFileSync(path.join(docsRoot, 'llms.md'), 'utf8');
  const response = GET();
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get('content-type'),
    'text/plain; charset=utf-8',
  );
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(getAgentGuidance(), source);
  assert.equal(await response.text(), source);
  assert.ok(source.endsWith('\n'));
  assert.match(source, /^# Koi agent guidance\n/);
  assert.match(source, /> Draft:/);
});

test('agent routes are valid links without joining the docs tree or search index', async () => {
  const docs = await getDocs();
  validateLinks([
    {
      ...docs[0],
      markdown: '[Agent guidance](/agents) and [Raw text](/llms.txt)',
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
