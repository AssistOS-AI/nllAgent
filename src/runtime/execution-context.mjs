import { digestSource } from '../core/canonical-source.mjs';
import { NllError } from '../core/errors.mjs';
import { DecisionTable, MatchClause } from '../circuit/model.mjs';
import { Pattern, SemanticValue, Term } from '../ontology/model.mjs';
import { PrimitiveDescriptor } from '../primitives/model.mjs';
import { SemanticQuery } from '../store/query.mjs';

function semanticId(value) {
  return value?.definition?.id ?? value?.id ?? value?.concept?.id ?? value?.kind ?? String(value);
}

class InstrumentedStoreView {
  #store;
  #record;
  constructor(store, record) {
    this.#store = store;
    this.#record = record;
    Object.freeze(this);
  }
  instancesOf(concept) {
    this.#record('read', semanticId(concept));
    return this.#store.instancesOf(concept);
  }
  query(queryValue) {
    const pattern = queryValue instanceof SemanticQuery ? queryValue.pattern : queryValue;
    this.#record('read', semanticId(pattern?.concept));
    return this.#store.query(queryValue);
  }
  match(pattern, initial) {
    this.#record('read', semanticId(pattern?.concept));
    return this.#store.match(pattern, initial);
  }
  claimsAbout(term) {
    this.#record('read', semanticId(term));
    return this.#store.claimsAbout(term);
  }
  evidenceFor(term) {
    this.#record('read', semanticId(term));
    return this.#store.evidenceFor(term);
  }
  provenanceOf(term) {
    this.#record('read', semanticId(term));
    return this.#store.provenanceOf(term);
  }
  identityCandidates(mention) {
    this.#record('read', 'IdentityCandidate');
    return this.#store.identityCandidates(mention);
  }
  coverageFor(concept, scope) {
    this.#record('read', semanticId(concept));
    return this.#store.coverageFor(concept, scope);
  }
  snapshot() { return this.#store.snapshot(); }
  get claims() { this.#record('read', 'Claim'); return this.#store.claims; }
  get terms() { this.#record('read', 'Term'); return this.#store.terms; }
  get mentions() { this.#record('read', 'Mention'); return this.#store.mentions; }
  get gaps() { this.#record('read', 'Gap'); return this.#store.gaps; }
  get outputs() { this.#record('read', 'Output'); return this.#store.outputs; }
}

class ExecutionContext {
  #store;
  #storeView;
  #trace;
  #transaction;
  #tools;
  #runtime;
  #binding;
  #observed = new Set();
  constructor({ store, trace, transaction, tools = new Map(), runtime, binding = null }) {
    this.#store = store;
    this.#trace = trace;
    this.#transaction = transaction;
    this.#tools = tools;
    this.#runtime = runtime;
    this.#binding = binding;
    this.#storeView = new InstrumentedStoreView(store, (kind, target) => this.#observed.add(`${kind}:${target}`));
  }
  get store() { return this.#storeView; }
  get trace() { return this.#trace; }
  get observedEffects() { return new Set(this.#observed); }
  get binding() { return this.#binding; }
  query(patternOrMatch) {
    if (patternOrMatch instanceof SemanticQuery) {
      this.#observed.add(`read:${semanticId(patternOrMatch.pattern.concept)}`);
      this.#trace.record('QUERY', 'ctx.query', patternOrMatch.pattern.concept.id);
      return this.#store.query(patternOrMatch);
    }
    const pattern = patternOrMatch instanceof MatchClause ? patternOrMatch.pattern : patternOrMatch;
    if (!(pattern instanceof Pattern) && !(pattern instanceof Term)) {
      throw new NllError('invalid-query', 'query requires a typed pattern.');
    }
    this.#observed.add(`read:${semanticId(pattern.concept)}`);
    this.#trace.record('QUERY', 'ctx.query', pattern.concept.id);
    return this.#store.match(pattern);
  }
  derive(term) {
    this.#observed.add(`write:${semanticId(term)}`);
    return this.#transaction.derive(term);
  }
  emit(output) {
    this.#observed.add(`write:${semanticId(output)}`);
    return this.#transaction.emit(output);
  }
  async verify(id, verifier) {
    this.#trace.record('RUNNING', `verify:${id}`);
    const witness = await verifier();
    this.#trace.record('PRODUCED', `verify:${id}`);
    return witness;
  }
  async applyPrimitive(descriptor, ...values) {
    if (!(descriptor instanceof PrimitiveDescriptor)) {
      throw new NllError('invalid-primitive-descriptor', 'applyPrimitive requires a sealed PrimitiveDescriptor.');
    }
    this.#observed.add(`primitive:${descriptor.id}`);
    this.#trace.record('RUNNING', `primitive:${descriptor.id}`);
    const result = await descriptor.evaluate('concrete', this, values);
    this.#trace.record('PRODUCED', `primitive:${descriptor.id}`);
    return result;
  }
  decide(table, ...inputs) {
    if (!(table instanceof DecisionTable)) {
      throw new NllError('invalid-decision-table', 'decide requires a DecisionTable.');
    }
    const evaluation = table.decide(inputs);
    this.#trace.record('DECIDED', `decision:${table.id}`,
      `${evaluation.status}:${evaluation.matchedRows.length}:${String(evaluation.result)}`);
    return evaluation;
  }
  async task(id, operation) {
    this.#trace.record('RUNNING', `task:${id}`);
    const result = await operation();
    this.#trace.record('PRODUCED', `task:${id}`);
    return result;
  }
  async runSubcircuit(template) {
    this.#observed.add(`subcircuit:${template.id}`);
    return this.#runtime(template, this.#store, this);
  }
  async callTool(id, ...inputs) {
    const tool = this.#tools.get(id);
    if (!tool) throw new NllError('missing-tool', `Tool is not available: ${id}`);
    this.#observed.add(`tool:${id}`);
    this.#trace.record('RUNNING', `tool:${id}`);
    return tool(...inputs);
  }
  checkpoint(value) {
    this.#trace.record('CHECKPOINT', 'ctx.checkpoint', digestSource(value));
    return value;
  }
}

export { ExecutionContext, InstrumentedStoreView, semanticId };
