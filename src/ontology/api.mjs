import { NllError } from '../core/errors.mjs';
import {
  Cardinality, ConceptDefinition, ExplicitIdentity, RoleConstraint, RoleDefinition, Sort, TypeConstraint, Variable,
  createConceptConstructor, createRoleConstructor, definitionOf, isSubtype, registerSubtype
} from './model.mjs';

class Ontology {
  #id;
  #sorts;
  #concepts;
  #roles;
  #behaviors;
  #subtypes;
  #disjoint;
  #lexicalizations;

  constructor(id, sorts, concepts, roles, behaviors, subtypes, disjoint, lexicalizations) {
    this.#id = id;
    this.#sorts = new Map(sorts);
    this.#concepts = new Map(concepts);
    this.#roles = new Map(roles);
    this.#behaviors = new Map(behaviors);
    this.#subtypes = Object.freeze([...subtypes]);
    this.#disjoint = Object.freeze([...disjoint]);
    this.#lexicalizations = new Map([...lexicalizations].map(([key, values]) => [key, Object.freeze([...values])]));
    Object.freeze(this);
  }

  get id() { return this.#id; }
  get sorts() { return new Map(this.#sorts); }
  get concepts() { return new Map(this.#concepts); }
  get roles() { return new Map(this.#roles); }
  concept(idOrName) { return this.#concepts.get(idOrName) || [...this.#concepts.values()].find((item) => item.name === idOrName); }
  role(idOrName) { return this.#roles.get(idOrName) || [...this.#roles.values()].find((item) => item.name === idOrName); }
  isSubtype(child, parent) { return isSubtype(definitionOf(child), definitionOf(parent)); }
  isDisjoint(left, right) {
    const leftDefinition = definitionOf(left);
    const rightDefinition = definitionOf(right);
    return this.#disjoint.some(([first, second]) => (first === leftDefinition && second === rightDefinition)
      || (first === rightDefinition && second === leftDefinition));
  }
  lexicalizations(concept) { return this.#lexicalizations.get(definitionOf(concept).id) || Object.freeze([]); }
  behavior(concept, kind) { return this.#behaviors.get(`${definitionOf(concept).id}:${kind}`)?.operation ?? null; }
  inspect() {
    return Object.freeze({
      id: this.#id,
      sorts: Object.freeze([...this.#sorts.values()]),
      concepts: Object.freeze([...this.#concepts.values()]),
      roles: Object.freeze([...this.#roles.values()]),
      behaviors: new Map(this.#behaviors),
      subtypes: this.#subtypes,
      disjoint: this.#disjoint,
      lexicalizations: new Map(this.#lexicalizations)
    });
  }
}

class OntologyBuilder {
  #id;
  #sorts = new Map();
  #concepts = new Map();
  #roles = new Map();
  #behaviors = new Map();
  #subtypes = [];
  #disjoint = [];
  #lexicalizations = new Map();
  #sealed = false;

  constructor(id, extensions) {
    if (!/^[a-z][a-z0-9.-]+@[1-9][0-9]*$/u.test(id)) {
      throw new NllError('invalid-ontology-id', `Ontology id must be a versioned namespace: ${id}`);
    }
    this.#id = id;
    for (const extension of extensions) this.#import(extension);
    this.Value = this.#sort('Value');
    this.Entity = this.#sort('Entity');
    this.Situation = this.#sort('Situation');
    this.Event = this.#sort('Event', [this.Situation]);
    this.State = this.#sort('State', [this.Situation]);
    this.Proposition = this.#sort('Proposition');
    this.Claim = this.#sort('Claim');
    this.Evidence = this.#sort('Evidence');
    this.Context = this.#sort('Context');
    this.Time = this.#sort('Time');
    this.Place = this.#sort('Place', [this.Entity]);
  }

  #assertOpen() {
    if (this.#sealed) throw new NllError('ontology-sealed', `Ontology ${this.#id} is sealed.`);
  }

  #import(ontologyValue) {
    if (!(ontologyValue instanceof Ontology)) throw new NllError('invalid-ontology-extension', 'Expected a sealed ontology.');
    for (const [id, value] of ontologyValue.sorts) this.#sorts.set(id, value);
    for (const [id, value] of ontologyValue.concepts) this.#concepts.set(id, value);
    for (const [id, value] of ontologyValue.roles) this.#roles.set(id, value);
    const inspected = ontologyValue.inspect();
    this.#subtypes.push(...inspected.subtypes);
    this.#disjoint.push(...inspected.disjoint);
    for (const [id, values] of inspected.lexicalizations) this.#lexicalizations.set(id, [...values]);
    for (const [id, behavior] of inspected.behaviors) this.#behaviors.set(id, behavior);
  }

  #sort(name, parents = []) {
    const existing = [...this.#sorts.values()].find((sort) => sort.name === name);
    if (existing) return existing;
    const value = new Sort(this.#id, name, parents);
    this.#sorts.set(value.id, value);
    return value;
  }

  sort(name, ...parents) {
    this.#assertOpen();
    return this.#sort(name, parents.map(definitionOf));
  }

  #concept(name, resultSort, constraints, options = new Map()) {
    this.#assertOpen();
    const definition = new ConceptDefinition(this.#id, name, resultSort, constraints, options);
    if (this.#concepts.has(definition.id)) throw new NllError('duplicate-concept', definition.id);
    this.#concepts.set(definition.id, definition);
    return createConceptConstructor(definition);
  }

  entity(name, ...constraints) { return this.#concept(name, this.Entity, constraints); }
  event(name, ...constraints) { return this.#concept(name, this.Event, constraints); }
  state(name, ...constraints) { return this.#concept(name, this.State, constraints); }
  relation(name, ...constraints) { return this.#concept(name, this.Proposition, constraints); }
  valueType(name, normalizer) {
    const constructor = this.#concept(name, this.Value, []);
    if (normalizer) this.behavior(constructor, 'normalize', normalizer);
    return constructor;
  }
  derivedConcept(name, ...constraints) {
    return this.#concept(name, this.Proposition, constraints, new Map([['derived', true], ['identity', 'structural']]));
  }

  role(name, source, target, cardinality = zeroOrMany()) {
    this.#assertOpen();
    const definition = new RoleDefinition(
      this.#id,
      name,
      new TypeConstraint([definitionOf(source.value ?? source)]),
      target instanceof TypeConstraint ? target : new TypeConstraint([definitionOf(target.value ?? target)]),
      cardinality
    );
    if (this.#roles.has(definition.id)) throw new NllError('duplicate-role', definition.id);
    this.#roles.set(definition.id, definition);
    return createRoleConstructor(definition);
  }

  oneOf(...values) { return new TypeConstraint(values.map(definitionOf)); }

  subtype(child, parent) {
    this.#assertOpen();
    const childDefinition = definitionOf(child);
    const parentDefinition = definitionOf(parent);
    if (childDefinition === parentDefinition || isSubtype(parentDefinition, childDefinition)) {
      throw new NllError('cyclic-subtype', 'Subtype declaration would create a cycle.');
    }
    registerSubtype(childDefinition, parentDefinition);
    this.#subtypes.push(Object.freeze([childDefinition, parentDefinition]));
    return this;
  }

  disjoint(left, right) {
    this.#assertOpen();
    const leftDefinition = definitionOf(left);
    const rightDefinition = definitionOf(right);
    if (leftDefinition === rightDefinition || isSubtype(leftDefinition, rightDefinition)
      || isSubtype(rightDefinition, leftDefinition)) {
      throw new NllError('invalid-disjointness', 'A type cannot be disjoint with itself or its supertype.');
    }
    this.#disjoint.push(Object.freeze([leftDefinition, rightDefinition]));
    return this;
  }

  lexicalize(concept, ...forms) {
    this.#assertOpen();
    const definition = definitionOf(concept);
    if (!forms.length || forms.some((form) => typeof form !== 'string' || !form.trim())) {
      throw new NllError('invalid-lexicalization', 'Lexicalization forms must be non-empty strings.');
    }
    const existing = this.#lexicalizations.get(definition.id) || [];
    this.#lexicalizations.set(definition.id, [...new Set([...existing, ...forms])]);
    return this;
  }

  behavior(concept, kind, operation) {
    this.#assertOpen();
    if (!['validate', 'normalize', 'index', 'view'].includes(kind)) {
      throw new NllError('hidden-rule-behavior', `Ontology behavior ${kind} belongs in CircuitJS.`);
    }
    if (typeof operation !== 'function') throw new NllError('invalid-behavior', 'Behavior must be a function.');
    const definition = definitionOf(concept);
    this.#behaviors.set(`${definition.id}:${kind}`, Object.freeze({ definition, kind, operation }));
    return this;
  }

  seal() {
    this.#sealed = true;
    return new Ontology(
      this.#id, this.#sorts, this.#concepts, this.#roles, this.#behaviors,
      this.#subtypes, this.#disjoint, this.#lexicalizations
    );
  }
}

const from = (value) => Object.freeze({ value: definitionOf(value) });
const to = (value) => Object.freeze({ value: definitionOf(value) });
const exactlyOne = () => new Cardinality(1, 1);
const zeroOrOne = () => new Cardinality(0, 1);
const oneOrMore = () => new Cardinality(1, Infinity);
const zeroOrMany = () => new Cardinality(0, Infinity);
const requires = (role) => new RoleConstraint(role.definition, role.definition.cardinality.minimum, role.definition.cardinality.maximum);
const allows = (role) => new RoleConstraint(role.definition, 0, role.definition.cardinality.maximum);
const extendsOntology = (value) => value;
const identifiedAs = (value) => new ExplicitIdentity(value);
const variable = (sortOrConcept, name) => new Variable(sortOrConcept, name);
const ontology = (id, ...extensions) => new OntologyBuilder(id, extensions);

export {
  Ontology, OntologyBuilder, allows, exactlyOne, extendsOntology, from, identifiedAs, oneOrMore,
  ontology, requires, to, variable, zeroOrMany, zeroOrOne
};
