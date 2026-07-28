import { access } from 'node:fs/promises';
import { digestJson } from '../core/canonical.mjs';
import { NllError } from '../core/errors.mjs';
import { ensureDirectory, readJson, writeJson } from '../core/io.mjs';
import { containedPath } from '../core/paths.mjs';

class FileArtifactCache {
  constructor(root) {
    this.root = root;
  }

  key(material) {
    return digestJson(material);
  }

  pathFor(key) {
    const digest = key.replace(/^sha256:/u, '');
    if (!/^[a-f0-9]{64}$/u.test(digest)) throw new NllError('invalid-cache-key', 'Cache key must be a SHA-256 digest.');
    return containedPath(this.root, digest.slice(0, 2), `${digest.slice(2)}.json`);
  }

  async get(material) {
    const key = this.key(material);
    const path = this.pathFor(key);
    if (!await access(path).then(() => true, () => false)) return null;
    const envelope = await readJson(path);
    if (envelope.key !== key || envelope.valueDigest !== digestJson(envelope.value)) {
      throw new NllError('cache-integrity-failed', 'Content-addressed cache envelope failed validation.', { path, key });
    }
    return envelope.value;
  }

  async set(material, value) {
    const key = this.key(material);
    const path = this.pathFor(key);
    await ensureDirectory(path.slice(0, path.lastIndexOf('/')));
    await writeJson(path, { kind: 'CacheEnvelope', schemaVersion: 1, key, valueDigest: digestJson(value), value });
    return key;
  }
}

export { FileArtifactCache };
