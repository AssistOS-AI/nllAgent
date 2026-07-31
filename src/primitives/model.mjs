import { SOURCE_FORM, quote } from '../core/canonical-source.mjs';
import { NllError, invariant } from '../core/errors.mjs';
import { SemanticValue } from '../ontology/model.mjs';

class PrimitivePort extends SemanticValue {
  constructor(direction, name, type) {
    invariant(direction === 'input' || direction === 'output', 'invalid-primitive-port', 'Primitive port direction is invalid.');
    invariant(typeof name === 'string' && name.length > 0, 'invalid-primitive-port', 'Primitive port requires a name.');
    invariant(type, 'invalid-primitive-port', `Primitive port ${name} requires a semantic type.`);
    super('PrimitivePort', { direction, name, type });
  }
  get direction() { return this.detail('direction'); }
  get name() { return this.detail('name'); }
  get type() { return this.detail('type'); }
}

class PrimitiveEffect extends SemanticValue {
  constructor(effectKind, target) {
    invariant(['read', 'write', 'tool'].includes(effectKind),
      'invalid-primitive-effect', `Unsupported primitive effect: ${effectKind}.`);
    super('PrimitiveEffect', { effectKind, target });
  }
  get effectKind() { return this.detail('effectKind'); }
  get target() { return this.detail('target'); }
}

class PrimitiveLaw extends SemanticValue {
  constructor(id, checker = null) {
    invariant(typeof id === 'string' && id.length > 0, 'invalid-primitive-law', 'Primitive law requires an id.');
    if (checker !== null && typeof checker !== 'function') {
      throw new NllError('invalid-primitive-law', `Primitive law ${id} checker must be a function.`);
    }
    super('PrimitiveLaw', { id, checker });
  }
  get id() { return this.detail('id'); }
  get checker() { return this.detail('checker'); }
}

class UnsupportedSemantic extends SemanticValue {
  constructor(mode, primitiveId) { super('UnsupportedSemantic', { mode, primitiveId }); }
  get mode() { return this.detail('mode'); }
  get primitiveId() { return this.detail('primitiveId'); }
  [SOURCE_FORM]() { return `unsupportedSemantic(${quote(this.mode)},${quote(this.primitiveId)})`; }
}

class AbstractTop extends SemanticValue {
  constructor(primitiveId) { super('AbstractTop', { primitiveId }); }
  get primitiveId() { return this.detail('primitiveId'); }
  [SOURCE_FORM]() { return `abstractTop(${quote(this.primitiveId)})`; }
}

class PrimitiveDescriptor extends SemanticValue {
  constructor(id, ports, effects, handlers, laws) {
    super('PrimitiveDescriptor', {
      id,
      ports: Object.freeze([...ports]),
      effects: Object.freeze([...effects]),
      handlers: new Map(handlers),
      laws: Object.freeze([...laws])
    });
  }
  get id() { return this.detail('id'); }
  get inputs() { return this.detail('ports').filter((port) => port.direction === 'input'); }
  get outputs() { return this.detail('ports').filter((port) => port.direction === 'output'); }
  get effects() { return this.detail('effects'); }
  get laws() { return this.detail('laws'); }
  supports(mode) { return this.detail('handlers').has(mode); }
  handler(mode) { return this.detail('handlers').get(mode); }
  async evaluate(mode, context, values) {
    const handler = this.handler(mode);
    if (handler) return handler(context, values);
    if (mode === 'abstract') return new AbstractTop(this.id);
    return new UnsupportedSemantic(mode, this.id);
  }
}

class PrimitiveProvider extends SemanticValue {
  constructor(id, methodId, descriptor, modulePath, exportName) {
    invariant(typeof id === 'string' && id.includes('@'),
      'invalid-primitive-provider-id', 'Primitive provider id must be versioned.');
    invariant(typeof methodId === 'string' && methodId.length > 0,
      'invalid-primitive-provider-method', 'Primitive provider requires a method id.');
    invariant(descriptor instanceof PrimitiveDescriptor,
      'invalid-primitive-provider-descriptor', 'Primitive provider requires a sealed descriptor.');
    invariant(typeof modulePath === 'string' && modulePath.endsWith('.mjs') && !modulePath.startsWith('/')
      && !modulePath.split('/').includes('..'),
    'invalid-primitive-provider-module', 'Primitive provider module must be a contained .mjs path.');
    invariant(typeof exportName === 'string' && /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(exportName),
      'invalid-primitive-provider-export', 'Primitive provider requires a JavaScript export name.');
    super('PrimitiveProvider', { id, methodId, descriptor, modulePath, exportName });
  }
  get id() { return this.detail('id'); }
  get methodId() { return this.detail('methodId'); }
  get descriptor() { return this.detail('descriptor'); }
  get modulePath() { return this.detail('modulePath'); }
  get exportName() { return this.detail('exportName'); }
  evaluate(mode, context, values) { return this.descriptor.evaluate(mode, context, values); }
}

class PrimitiveBuilder {
  #id;
  #ports = [];
  #effects = [];
  #handlers = new Map();
  #laws = [];
  #sealed = false;
  constructor(id) {
    invariant(typeof id === 'string' && id.includes('@'), 'invalid-primitive-id', 'Primitive id must be versioned.');
    this.#id = id;
  }
  #open() { if (this.#sealed) throw new NllError('primitive-sealed', `Primitive ${this.#id} is sealed.`); }
  input(value) { this.#open(); this.#ports.push(assertPort(value, 'input')); return this; }
  output(value) { this.#open(); this.#ports.push(assertPort(value, 'output')); return this; }
  effects(...values) { this.#open(); values.forEach(assertEffect); this.#effects.push(...values); return this; }
  concrete(handler) { return this.#handler('concrete', handler); }
  abstract(handler) { return this.#handler('abstract', handler); }
  symbolic(handler) { return this.#handler('symbolic', handler); }
  proof(handler) { return this.#handler('proof', handler); }
  #handler(mode, handler) {
    this.#open();
    if (typeof handler !== 'function') throw new NllError('invalid-primitive-handler', `${mode} handler must be a function.`);
    if (this.#handlers.has(mode)) throw new NllError('duplicate-primitive-handler', `${this.#id} already has ${mode} semantics.`);
    this.#handlers.set(mode, handler);
    return this;
  }
  law(value) {
    this.#open();
    if (!(value instanceof PrimitiveLaw)) throw new NllError('invalid-primitive-law', 'Expected a PrimitiveLaw.');
    this.#laws.push(value);
    return this;
  }
  seal() {
    this.#open();
    invariant(this.#handlers.has('concrete'), 'missing-concrete-primitive', `Primitive ${this.#id} has no concrete semantics.`);
    const keys = this.#ports.map((port) => `${port.direction}:${port.name}`);
    invariant(new Set(keys).size === keys.length, 'duplicate-primitive-port', `Primitive ${this.#id} has duplicate ports.`);
    invariant(new Set(this.#laws.map((law) => law.id)).size === this.#laws.length,
      'duplicate-primitive-law', `Primitive ${this.#id} has duplicate laws.`);
    this.#sealed = true;
    return new PrimitiveDescriptor(this.#id, this.#ports, this.#effects, this.#handlers, this.#laws);
  }
}

function assertPort(value, direction) {
  if (!(value instanceof PrimitivePort) || value.direction !== direction) {
    throw new NllError('invalid-primitive-port', `Expected a primitive ${direction} port.`);
  }
  return value;
}

function assertEffect(value) {
  if (!(value instanceof PrimitiveEffect)) throw new NllError('invalid-primitive-effect', 'Expected a PrimitiveEffect.');
}

export {
  AbstractTop, PrimitiveBuilder, PrimitiveDescriptor, PrimitiveEffect, PrimitiveLaw, PrimitivePort,
  PrimitiveProvider, UnsupportedSemantic
};
