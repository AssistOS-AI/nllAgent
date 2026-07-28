import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { FileArtifactCache } from '../../src/storage/artifact-cache.mjs';

test('filesystem artifact cache is content-addressed and digest-verified', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nllagent-cache-'));
  const cache = new FileArtifactCache(root);
  const key = { source: 'sha256:source', producer: 'test@1', input: { b: 2, a: 1 } };
  assert.equal(await cache.get(key), null);
  const digest = await cache.set(key, { observations: [{ id: 'one' }] });
  assert.match(digest, /^sha256:[a-f0-9]{64}$/u);
  assert.deepEqual(await cache.get({ input: { a: 1, b: 2 }, producer: 'test@1', source: 'sha256:source' }), {
    observations: [{ id: 'one' }]
  });
});
