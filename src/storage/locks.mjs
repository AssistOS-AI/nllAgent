import { open, readFile, unlink } from 'node:fs/promises';
import { hostname } from 'node:os';
import { canonicalStringify } from '../core/canonical.mjs';
import { NllError } from '../core/errors.mjs';
import { ensureDirectory } from '../core/io.mjs';

async function acquireLock(path, options = {}) {
  await ensureDirectory(path.slice(0, path.lastIndexOf('/')));
  const ttlMs = options.ttlMs ?? 30 * 60 * 1000;
  const owner = {
    pid: process.pid, hostname: hostname(), operation: options.operation || 'unspecified',
    acquiredAt: new Date().toISOString(), expiresAt: new Date(Date.now() + ttlMs).toISOString()
  };
  let handle;
  try {
    handle = await open(path, 'wx', 0o600);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = await readFile(path, 'utf8').then(JSON.parse, () => null);
    throw new NllError('workspace-locked', 'Another process owns the requested agent operation.', { path, owner: existing });
  }
  await handle.writeFile(canonicalStringify(owner));
  await handle.close();
  let released = false;
  return {
    owner,
    async release() {
      if (released) return;
      released = true;
      await unlink(path).catch((error) => { if (error.code !== 'ENOENT') throw error; });
    }
  };
}

async function withLock(path, options, operation) {
  const lock = await acquireLock(path, options);
  try {
    return await operation(lock.owner);
  } finally {
    await lock.release();
  }
}

export { acquireLock, withLock };
