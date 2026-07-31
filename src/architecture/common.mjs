import { SOURCE_FORM, canonicalSource, quote } from '../core/canonical-source.mjs';
import { NllError, invariant } from '../core/errors.mjs';
import { SemanticValue } from '../ontology/model.mjs';

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/@-]*$/u;
const MODULE_PATH_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\).+\.mjs$/u;

class ArchitectureValue extends SemanticValue {
  constructor(kind, details) { super(kind, details); }
}

class ArchitectureReference extends ArchitectureValue {
  constructor(referenceKind, id) {
    validateId(referenceKind, 'invalid-reference-kind', 'Reference kind');
    validateId(id, 'invalid-reference-id', 'Reference id');
    super('ArchitectureReference', { referenceKind, id });
  }

  get referenceKind() { return this.detail('referenceKind'); }
  get id() { return this.detail('id'); }
  [SOURCE_FORM]() { return `architectureRef(${quote(this.referenceKind)},${quote(this.id)})`; }
}

class OwnedModule extends ArchitectureValue {
  constructor(path, owner) {
    validateModulePath(path);
    validateId(owner, 'invalid-owner', 'Owner');
    super('OwnedModule', { path, owner });
  }

  get path() { return this.detail('path'); }
  get owner() { return this.detail('owner'); }
  [SOURCE_FORM]() { return `ownedModule(${quote(this.path)},${quote(this.owner)})`; }
}

function validateId(value, code = 'invalid-architecture-id', label = 'Architecture id') {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    throw new NllError(code, `${label} must be a stable non-empty identifier: ${String(value)}`);
  }
  return value;
}

function validateText(value, code, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new NllError(code, `${label} must be non-empty text.`);
  }
  return value;
}

function validateModulePath(path) {
  if (typeof path !== 'string' || !MODULE_PATH_PATTERN.test(path)) {
    throw new NllError('invalid-module-path', `Expected a contained relative .mjs path: ${String(path)}`);
  }
  return path;
}

function assertInstances(values, Type, code, message) {
  for (const value of values) invariant(value instanceof Type, code, message);
}

function assertUnique(values, keyOf, code, label) {
  const seen = new Set();
  for (const value of values) {
    const key = keyOf(value);
    if (seen.has(key)) throw new NllError(code, `Duplicate ${label}: ${key}`);
    seen.add(key);
  }
}

function freeze(values) { return Object.freeze([...values]); }

function sourceOf(value) { return canonicalSource(value); }

function sourceArguments(values) { return values.map(sourceOf).join(','); }

function sourceChain(base, name, values) {
  return values.length ? `${base}.${name}(${sourceArguments(values)})` : base;
}

const architectureRef = (kind, id) => new ArchitectureReference(kind, id);
const capabilityRef = (id) => architectureRef('capability', id);
const circuitRef = (id) => architectureRef('circuit', id);
const conceptRef = (id) => architectureRef('concept', id);
const roleRef = (id) => architectureRef('role', id);
const authorityFile = (path) => {
  validateText(path, 'invalid-authority-file', 'Authority file');
  return architectureRef('authority-file', path);
};
const ownedModule = (path, owner) => new OwnedModule(path, owner);

export {
  ArchitectureReference, ArchitectureValue, OwnedModule, SOURCE_FORM, architectureRef, assertInstances,
  assertUnique, authorityFile, capabilityRef, circuitRef, conceptRef, freeze, ownedModule, quote, roleRef,
  sourceArguments, sourceChain, sourceOf, validateId, validateModulePath, validateText
};
