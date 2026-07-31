import { digestSource } from '../core/canonical-source.mjs';
import { NllError, invariant } from '../core/errors.mjs';
import { SemanticValue } from '../ontology/model.mjs';

const CREATED = 'CREATED';
const READY = 'READY';
const RUNNING = 'RUNNING';
const PRODUCED = 'PRODUCED';
const VALIDATED = 'VALIDATED';
const COMMITTED = 'COMMITTED';
const CACHED = 'CACHED';
const BLOCKED = 'BLOCKED';
const FAILED = 'FAILED';

class ValueRef extends SemanticValue {
  constructor(producer, port, digest) {
    super('ValueRef', { id: `value:${digestSource([producer, port, digest])}`, producer, port, digest });
  }
  get id() { return this.detail('id'); }
  get producer() { return this.detail('producer'); }
  get port() { return this.detail('port'); }
}

class ExecutionNode {
  #state = CREATED;
  #output = null;
  #error = null;
  constructor(id, templateId, componentId, bindingId, contextId) {
    this.id = id;
    this.templateId = templateId;
    this.componentId = componentId;
    this.bindingId = bindingId;
    this.contextId = contextId;
    Object.freeze(this);
  }
  get state() { return this.#state; }
  get output() { return this.#output; }
  get error() { return this.#error; }
  transition(state) {
    const allowed = new Map([
      [CREATED, [READY, CACHED, BLOCKED]], [READY, [RUNNING, CACHED, BLOCKED]],
      [RUNNING, [PRODUCED, FAILED, BLOCKED]], [PRODUCED, [VALIDATED, FAILED]],
      [VALIDATED, [COMMITTED, FAILED]]
    ]);
    if (!(allowed.get(this.#state) || []).includes(state)) {
      throw new NllError('invalid-node-transition', `${this.id} cannot transition ${this.#state} -> ${state}.`);
    }
    this.#state = state;
    return this;
  }
  bind(port, value) {
    if (this.#output) throw new NllError('ssa-rebind', `Node ${this.id} already published its output.`);
    this.#output = new ValueRef(this.id, port, digestSource(value));
    return this.#output;
  }
  fail(error) { this.#error = error; if (this.#state === RUNNING || this.#state === PRODUCED || this.#state === VALIDATED) this.transition(FAILED); }
}

class ExecutionGraph {
  #nodes = new Map();
  #instances = new Map();
  instantiate(template, bindingId = 'ground', contextId = 'main') {
    const key = `${template.identity}:${bindingId}:${contextId}`;
    const existing = this.#instances.get(key);
    if (existing) return Object.freeze({ key, created: false, id: existing });
    const id = `instance:${digestSource(key)}`;
    this.#instances.set(key, id);
    return Object.freeze({ key, created: true, id });
  }
  node(template, component, bindingId = 'ground', contextId = 'main') {
    const instance = this.instantiate(template, bindingId, contextId);
    const id = `node:${digestSource([instance.id, component.id])}`;
    if (!this.#nodes.has(id)) this.#nodes.set(id, new ExecutionNode(id, template.id, component.id, bindingId, contextId));
    return this.#nodes.get(id);
  }
  get nodes() { return Object.freeze([...this.#nodes.values()]); }
  get instances() { return Object.freeze([...this.#instances.entries()]); }
}

class ContentCache {
  #values = new Map();
  key(stage, snapshot, bindingId = 'ground') {
    invariant(stage?.id && snapshot?.identity, 'invalid-cache-key', 'Cache keys require a stage and snapshot.');
    return `cache:${digestSource([stage.id, String(stage.operation), snapshot.identity, bindingId])}`;
  }
  has(key) { return this.#values.has(key); }
  get(key) { return this.#values.get(key); }
  put(key, value) { this.#values.set(key, value); return value; }
  get size() { return this.#values.size; }
}

export {
  BLOCKED, CACHED, COMMITTED, CREATED, ContentCache, ExecutionGraph, ExecutionNode, FAILED, PRODUCED,
  READY, RUNNING, VALIDATED, ValueRef
};
