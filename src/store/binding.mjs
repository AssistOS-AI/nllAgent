import { SemanticValue, Variable } from '../ontology/model.mjs';

class Binding extends SemanticValue {
  constructor(entries = new Map(), matched = []) {
    super('Binding', { entries: new Map(entries), matched: Object.freeze([...matched]) });
  }
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
