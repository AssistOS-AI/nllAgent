import { NllError, invariant } from '../core/errors.mjs';

class Registry {
  constructor(kind) {
    this.kind = kind;
    this.entries = new Map();
  }

  register(entry) {
    invariant(entry && typeof entry.id === 'string', 'invalid-registry-entry', `${this.kind} entry requires an id.`);
    invariant(typeof entry.execute === 'function', 'invalid-registry-entry', `${entry.id} requires execute().`);
    if (this.entries.has(entry.id)) throw new NllError('duplicate-registry-entry', `${entry.id} is already registered.`);
    this.entries.set(entry.id, Object.freeze({ effects: [], deterministic: true, ...entry }));
    return this;
  }

  has(id) { return this.entries.has(id); }

  get(id) {
    const entry = this.entries.get(id);
    if (!entry) throw new NllError(`unknown-${this.kind}`, `${this.kind} ${id} is not registered.`, { id });
    return entry;
  }

  describe() {
    return [...this.entries.values()].map(({ execute, ...entry }) => entry).sort((a, b) => a.id.localeCompare(b.id));
  }
}

class OperatorRegistry extends Registry { constructor() { super('operator'); } }
class VerifierRegistry extends Registry { constructor() { super('verifier'); } }

export { OperatorRegistry, Registry, VerifierRegistry };
