import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { GET } from '../src/pages/install.sh';

test('static installer endpoint emits the canonical source and download headers', async () => {
  const response = GET();
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get('content-type'),
    'text/plain; charset=utf-8',
  );
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(
    response.headers.get('cache-control'),
    'public, max-age=0, must-revalidate',
  );
  assert.equal(
    await response.text(),
    readFileSync(new URL('../../scripts/install.sh', import.meta.url), 'utf8'),
  );
});
