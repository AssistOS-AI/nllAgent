import { SOURCE_FORM, canonicalSource, digestSource, quote } from '../core/canonical-source.mjs';
import { NllError, invariant } from '../core/errors.mjs';

const DETAILS = new WeakMap();
const SUBTYPE_PARENTS = new WeakMap();

class SemanticValue {
  constructor(kind, details) {
    DETAILS.set(this, Object.freeze({ ...details, kind }));
    Object.freeze(this);
  }

  get kind() { return DETAILS.get(this).kind; }

  detail(name) {
    return DETAILS.get(this)[name];
  }
}

class Sort extends SemanticValue {
  constructor(namespace, name, parents = []) {
    super('Sort', { namespace, name, parents: Object.freeze([...parents]) });
  }

  get id() { return `${this.detail('namespace')}:${this.detail('name')}`; }
  get name() { return this.detail('name'); }
  get parents() { return this.detail('parents'); }
  [SOURCE_FORM]() { return `sortRef(${quote(this.id)})`; }
}

class Cardinality extends SemanticValue {
  constructor(minimum, maximum) { super('Cardinality', { minimum, maximum }); }
  get minimum() { return this.detail('minimum'); }
  get maximum() { return this.detail('maximum'); }
  [SOURCE_FORM]() { return `cardinality(${this.minimum},${this.maximum === Infinity ? 'Infinity' : this.maximum})`; }
}

class TypeConstraint extends SemanticValue {
  constructor(choices) { super('TypeConstraint', { choices: Object.freeze([...choices]) }); }
  get choices() { return this.detail('choices'); }
  accepts(value) {
    if (value instanceof Variable) return this.choices.some((choice) => isSubtype(value.sort, choice));
    if (value instanceof Term || value instanceof Pattern) {
      return this.choices.some((choice) => isSubtype(value.concept, choice));
    }
    return this.choices.some((choice) => choice.name === 'Value');
  }
}

class RoleDefinition extends SemanticValue {
  constructor(namespace, name, source, target, cardinality) {
    super('RoleDefinition', { namespace, name, source, target, cardinality });
  }
  get id() { return `${this.detail('namespace')}:${this.detail('name')}`; }
  get name() { return this.detail('name'); }
  get source() { return this.detail('source'); }
  get target() { return this.detail('target'); }
  get cardinality() { return this.detail('cardinality'); }
  [SOURCE_FORM]() { return `roleRef(${quote(this.id)})`; }
}

class RoleConstraint extends SemanticValue {
  constructor(role, minimum, maximum) { super('RoleConstraint', { role, minimum, maximum }); }
  get role() { return this.detail('role'); }
  get minimum() { return this.detail('minimum'); }
  get maximum() { return this.detail('maximum'); }
}

class ConceptDefinition extends SemanticValue {
  constructor(namespace, name, resultSort, constraints = [], options = new Map()) {
    super('ConceptDefinition', {
      namespace, name, resultSort,
      constraints: Object.freeze([...constraints]),
      derived: Boolean(options.get('derived')),
      identity: options.get('identity') || 'hybrid'
    });
  }
  get id() { return `${this.detail('namespace')}:${this.detail('name')}`; }
  get name() { return this.detail('name'); }
  get resultSort() { return this.detail('resultSort'); }
  get constraints() { return this.detail('constraints'); }
  get derived() { return this.detail('derived'); }
  get identityPolicy() { return this.detail('identity'); }
  [SOURCE_FORM]() { return `conceptRef(${quote(this.id)})`; }
}

class RoleValue extends SemanticValue {
  constructor(role, values) {
    super('RoleValue', { role, values: Object.freeze([...values]) });
  }
  get role() { return this.detail('role'); }
  get values() { return this.detail('values'); }
  [SOURCE_FORM]() { return `${this.role.name}(${this.values.map((value) => sourceOf(value)).join(',')})`; }
}

class ExplicitIdentity extends SemanticValue {
  constructor(value) { super('ExplicitIdentity', { value }); }
  get value() { return this.detail('value'); }
  [SOURCE_FORM]() { return `identifiedAs(${quote(this.value)})`; }
}

class Variable extends SemanticValue {
  constructor(sortOrConcept, name) {
    const sort = definitionOf(sortOrConcept);
    super('Variable', { sort, name, scope: Symbol(name) });
  }
  get sort() { return this.detail('sort'); }
  get name() { return this.detail('name'); }
  [SOURCE_FORM]() { return `variable(${quote(this.sort.id)},${quote(this.name)})`; }
}

class Term extends SemanticValue {
  constructor(concept, roleValues, explicitIdentity) {
    validateApplication(concept, roleValues);
    const identity = explicitIdentity?.value || `derived:${digestSource([
      concept.id,
      ...roleValues.map(identityForm)
    ])}`;
    super('Term', { concept, roleValues: Object.freeze([...roleValues]), identity });
  }
  get concept() { return this.detail('concept'); }
  get identity() { return this.detail('identity'); }
  get roleValues() { return this.detail('roleValues'); }
  values(roleOrName) {
    const id = typeof roleOrName === 'string' ? roleOrName : roleOrName.id;
    return this.roleValues.filter((item) => item.role.id === id || item.role.name === id).flatMap((item) => item.values);
  }
  value(roleOrName) { return this.values(roleOrName)[0]; }
  [SOURCE_FORM]() {
    const args = this.roleValues.map((item) => item[SOURCE_FORM]());
    if (!this.identity.startsWith('derived:')) args.unshift(`identifiedAs(${quote(this.identity)})`);
    return `${this.concept.name}(${args.join(',')})`;
  }
}

function identityForm(value) {
  if (value instanceof Term) return `term(${quote(value.concept.id)},${quote(value.identity)})`;
  if (value instanceof RoleValue) {
    return `role(${quote(value.role.id)},${value.values.map(identityForm).join(',')})`;
  }
  if (value instanceof ExplicitIdentity) return `identity(${quote(value.value)})`;
  return canonicalSource(value);
}

class Pattern extends SemanticValue {
  constructor(concept, roleValues) {
    validateApplication(concept, roleValues);
    super('Pattern', { concept, roleValues: Object.freeze([...roleValues]) });
  }
  get concept() { return this.detail('concept'); }
  get roleValues() { return this.detail('roleValues'); }
  [SOURCE_FORM]() { return `${this.concept.name}(${this.roleValues.map((item) => item[SOURCE_FORM]()).join(',')})`; }
}

function sourceOf(value) {
  if (value && typeof value[SOURCE_FORM] === 'function') return value[SOURCE_FORM]();
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  throw new NllError('unsupported-semantic-value', `Unsupported semantic argument: ${String(value)}`);
}

function definitionOf(value) {
  if (value instanceof ConceptDefinition || value instanceof Sort) return value;
  if (typeof value === 'function' && value.definition instanceof ConceptDefinition) return value.definition;
  throw new NllError('invalid-ontology-reference', 'Expected a sort or concept constructor.');
}

function isSubtype(candidate, expected) {
  if (candidate === expected) return true;
  if (candidate instanceof ConceptDefinition) {
    const declared = SUBTYPE_PARENTS.get(candidate) || [];
    return candidate === expected || [...declared].some((parent) => isSubtype(parent, expected))
      || isSubtype(candidate.resultSort, expected);
  }
  if (!(candidate instanceof Sort)) return false;
  const declared = SUBTYPE_PARENTS.get(candidate) || [];
  return [...candidate.parents, ...declared].some((parent) => isSubtype(parent, expected));
}

function registerSubtype(child, parent) {
  const existing = SUBTYPE_PARENTS.get(child) || new Set();
  existing.add(parent);
  SUBTYPE_PARENTS.set(child, existing);
}

function hasPatternValue(value) {
  return value instanceof Variable || value instanceof Pattern
    || (value instanceof RoleValue && value.values.some(hasPatternValue));
}

function validateApplication(concept, roleValues) {
  invariant(concept instanceof ConceptDefinition, 'invalid-concept', 'Term application requires a concept.');
  for (const roleValue of roleValues) {
    invariant(roleValue instanceof RoleValue, 'invalid-role-value', `${concept.name} accepts only role applications.`);
    if (!roleValue.role.source.choices.some((choice) => isSubtype(concept.resultSort, choice))) {
      throw new NllError('role-source-mismatch', `${roleValue.role.name} cannot apply to ${concept.name}.`);
    }
    if (roleValue.values.length < roleValue.role.cardinality.minimum
      || roleValue.values.length > roleValue.role.cardinality.maximum) {
      throw new NllError('role-cardinality', `${concept.name}.${roleValue.role.name} has invalid cardinality ${roleValue.values.length}.`);
    }
    if (!roleValue.values.every((value) => roleValue.role.target.accepts(value))) {
      throw new NllError('role-type-mismatch', `${roleValue.role.name} received an incompatible value.`);
    }
    if (concept.constraints.length && !concept.constraints.some((constraint) => constraint.role === roleValue.role)) {
      throw new NllError('role-not-allowed', `${roleValue.role.name} is not declared for ${concept.name}.`);
    }
  }
  for (const constraint of concept.constraints) {
    const count = roleValues.filter((item) => item.role === constraint.role)
      .reduce((total, item) => total + item.values.length, 0);
    if (count < constraint.minimum || count > constraint.maximum) {
      throw new NllError('role-cardinality', `${concept.name}.${constraint.role.name} has invalid cardinality ${count}.`);
    }
  }
}

function createConceptConstructor(definition) {
  const constructor = (...arguments_) => {
    const explicit = arguments_.find((value) => value instanceof ExplicitIdentity);
    const roleValues = arguments_.filter((value) => value instanceof RoleValue);
    return roleValues.some(hasPatternValue)
      ? new Pattern(definition, roleValues)
      : new Term(definition, roleValues, explicit);
  };
  Object.defineProperty(constructor, 'name', { value: definition.name });
  Object.defineProperty(constructor, 'definition', { value: definition });
  return Object.freeze(constructor);
}

function createRoleConstructor(definition) {
  const constructor = (...values) => new RoleValue(definition, values);
  Object.defineProperty(constructor, 'name', { value: definition.name });
  Object.defineProperty(constructor, 'definition', { value: definition });
  Object.defineProperty(constructor, 'id', { value: definition.id });
  return Object.freeze(constructor);
}

export {
  Cardinality, ConceptDefinition, ExplicitIdentity, Pattern, RoleConstraint, RoleDefinition, RoleValue, SOURCE_FORM,
  SemanticValue, Sort, Term, TypeConstraint, Variable, createConceptConstructor, createRoleConstructor,
  definitionOf, identityForm, isSubtype, registerSubtype
};
