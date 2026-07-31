import { digestSource } from '../core/canonical-source.mjs';
import { SemanticValue, Variable } from '../ontology/model.mjs';

class Binding extends SemanticValue {
  constructor(entries = new Map(), matched = []) {
    const copied = new Map(entries);
    const identity = `binding:${digestSource([...copied.entries()].sort(([left], [right]) => left.localeCompare(right)))}`;
    super('Binding', { entries: copied, matched: Object.freeze([...matched]), identity });
  }
  get identity() { return this.detail('identity'); }
  get(variableOrName) {
    const name = variableOrName instanceof Variable ? variableOrName.name : variableOrName;
    return this.detail('entries').get(name);
  }
  has(variableOrName) {
    const name = variableOrName instanceof Variable ? variableOrName.name : variableOrName;
    return this.detail('entries').has(name);
  }
  entries() { return new Map(this.detail('entries')); }
  get matched() { return this.detail('matched'); }
  extend(variable, value) {
    const entries = this.entries();
    entries.set(variable.name, value);
    return new Binding(entries, this.matched);
  }
  withMatch(value) { return new Binding(this.entries(), [...this.matched, value]); }
}

export { Binding };
