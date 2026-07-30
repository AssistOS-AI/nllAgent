import { digestSource } from '../core/canonical-source.mjs';
import { NllError } from '../core/errors.mjs';
import { MatchClause } from '../circuit/model.mjs';
import { Pattern, Term } from '../ontology/model.mjs';
import { SemanticQuery } from '../store/query.mjs';

class ModelArtifact {
  constructor(request, output) {
    this.request = request;
    this.output = output;
    this.identity = `model-artifact:${digestSource(request)}`;
    Object.freeze(this);
  }
}

class ExecutionContext {
  #store;
  #trace;
  #transaction;
  #tools;
  #models;
  #runtime;
  constructor({ store, trace, transaction, tools = new Map(), models = new Map(), runtime }) {
    this.#store = store;
    this.#trace = trace;
    this.#transaction = transaction;
    this.#tools = tools;
    this.#models = models;
    this.#runtime = runtime;
  }
  get store() { return this.#store; }
  get trace() { return this.#trace; }
  query(patternOrMatch) {
    if (patternOrMatch instanceof SemanticQuery) {
      this.#trace.record('QUERY', 'ctx.query', patternOrMatch.pattern.concept.id);
      return this.#store.query(patternOrMatch);
    }
    const pattern = patternOrMatch instanceof MatchClause ? patternOrMatch.pattern : patternOrMatch;
    if (!(pattern instanceof Pattern) && !(pattern instanceof Term)) throw new NllError('invalid-query', 'query requires a typed pattern.');
    this.#trace.record('QUERY', 'ctx.query', pattern.concept.id);
    return this.#store.match(pattern);
  }
  derive(term) { return this.#transaction.derive(term); }
  emit(output) { return this.#transaction.emit(output); }
  async verify(id, verifier) {
    this.#trace.record('RUNNING', `verify:${id}`);
    const witness = await verifier();
    this.#trace.record('PRODUCED', `verify:${id}`);
    return witness;
  }
  async task(id, operation) {
    this.#trace.record('RUNNING', `task:${id}`);
    const result = await operation();
    this.#trace.record('PRODUCED', `task:${id}`);
    return result;
  }
  async runSubcircuit(template) { return this.#runtime(template, this.#store, this); }
  async callTool(id, ...inputs) {
    const tool = this.#tools.get(id);
    if (!tool) throw new NllError('missing-tool', `Tool is not available: ${id}`);
    this.#trace.record('RUNNING', `tool:${id}`);
    return tool(...inputs);
  }
  async callModel(id, request) {
    const model = this.#models.get(id);
    if (!model) throw new NllError('missing-model', `Model is not available: ${id}`);
    const complete = Object.freeze({ ...request, role: request.role || id, model: request.model || id, adapter: request.adapter || id });
    this.#trace.record('REQUESTED', `model:${id}`, digestSource(complete));
    const output = await model(complete);
    const artifact = new ModelArtifact(complete, output);
    this.#trace.record('ARTIFACT_CAPTURED', `model:${id}`, artifact.identity);
    return artifact;
  }
  checkpoint(value) {
    this.#trace.record('CHECKPOINT', 'ctx.checkpoint', digestSource(value));
    return value;
  }
}

export { ExecutionContext, ModelArtifact };
