import { invariant } from '../core/errors.mjs';

const DETAILS = new WeakMap();

class RelationValueBase {
  constructor(kind, details) {
    DETAILS.set(this, Object.freeze({ kind, ...details }));
    Object.freeze(this);
  }
  get kind() { return DETAILS.get(this).kind; }
  detail(name) { return DETAILS.get(this)[name]; }
}

class RelationDefinition extends RelationValueBase {
  constructor(name, sorts) {
    invariant(typeof name === 'string' && name.length > 0,
      'invalid-relation-name', 'Relation names must be non-empty strings.');
    invariant(sorts.length > 0 && sorts.every((sort) => typeof sort === 'string' && sort.length > 0),
      'invalid-relation-signature', 'Relations require at least one named argument sort.');
    super('RelationDefinition', { name, sorts: Object.freeze([...sorts]) });
  }
  get name() { return this.detail('name'); }
  get sorts() { return this.detail('sorts'); }
  get arity() { return this.sorts.length; }
  get id() { return `${this.name}(${this.sorts.join(',')})`; }
}

class RelationValue extends RelationValueBase {
  constructor(sort, value) {
    invariant(typeof sort === 'string' && sort.length > 0,
      'invalid-relation-value', 'Relation values require a named sort.');
    invariant(['string', 'number', 'boolean', 'bigint'].includes(typeof value) || value === null,
      'invalid-relation-value', 'Relation values must contain deterministic scalar data.');
    super('RelationValue', { sort, value });
  }
  get sort() { return this.detail('sort'); }
  get value() { return this.detail('value'); }
  get id() { return `${this.sort}:${typeof this.value}:${String(this.value)}`; }
}

class RelationVariable extends RelationValueBase {
  constructor(name, sort) {
    invariant(typeof name === 'string' && name.length > 0 && typeof sort === 'string' && sort.length > 0,
      'invalid-relation-variable', 'Relation variables require a name and sort.');
    super('RelationVariable', { name, sort });
  }
  get name() { return this.detail('name'); }
  get sort() { return this.detail('sort'); }
  get id() { return `${this.sort}:${this.name}`; }
}

function validateArguments(relation, values, allowVariables) {
  invariant(relation instanceof RelationDefinition,
    'invalid-relation', 'Relation atoms require a relation definition.');
  invariant(values.length === relation.arity,
    'relation-arity-mismatch', `${relation.name} expects ${relation.arity} arguments.`);
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const validKind = value instanceof RelationValue || (allowVariables && value instanceof RelationVariable);
    invariant(validKind && value.sort === relation.sorts[index],
      'relation-sort-mismatch', `${relation.name} argument ${index + 1} requires ${relation.sorts[index]}.`);
  }
}

class RelationAtom extends RelationValueBase {
  constructor(relation, values) {
    validateArguments(relation, values, true);
    super('RelationAtom', { relation, values: Object.freeze([...values]) });
  }
  get relation() { return this.detail('relation'); }
  get values() { return this.detail('values'); }
}

class RelationTuple extends RelationValueBase {
  constructor(relation, values) {
    validateArguments(relation, values, false);
    super('RelationTuple', { relation, values: Object.freeze([...values]) });
  }
  get relation() { return this.detail('relation'); }
  get values() { return this.detail('values'); }
  value(index) { return this.values[index]?.value; }
  get key() { return `${this.relation.id}:${this.values.map((value) => value.id).join('|')}`; }
}

class RelationRule extends RelationValueBase {
  constructor(name, head, body) {
    invariant(typeof name === 'string' && name.length > 0,
      'invalid-relation-rule', 'Relation rules require a non-empty name.');
    invariant(head instanceof RelationAtom && body.length > 0
      && body.every((atom) => atom instanceof RelationAtom),
    'invalid-relation-rule', 'Relation rules require a head and a non-empty positive body.');
    const bound = new Set(body.flatMap((atom) => atom.values)
      .filter((value) => value instanceof RelationVariable).map((value) => value.id));
    const unsafe = head.values.find((value) => value instanceof RelationVariable && !bound.has(value.id));
    invariant(!unsafe, 'unsafe-relation-rule', `Head variable ${unsafe?.name || ''} is not bound by the rule body.`);
    super('RelationRule', { name, head, body: Object.freeze([...body]) });
  }
  get name() { return this.detail('name'); }
  get head() { return this.detail('head'); }
  get body() { return this.detail('body'); }
}

class RelationTraceStep extends RelationValueBase {
  constructor(round, rule, tuple, supports) {
    super('RelationTraceStep', { round, rule, tuple, supports: Object.freeze([...supports]) });
  }
  get round() { return this.detail('round'); }
  get rule() { return this.detail('rule'); }
  get tuple() { return this.detail('tuple'); }
  get supports() { return this.detail('supports'); }
}

class RelationStatistics extends RelationValueBase {
  constructor(rounds, ruleEvaluations, tupleScans, derivedTuples) {
    super('RelationStatistics', { rounds, ruleEvaluations, tupleScans, derivedTuples });
  }
  get rounds() { return this.detail('rounds'); }
  get ruleEvaluations() { return this.detail('ruleEvaluations'); }
  get tupleScans() { return this.detail('tupleScans'); }
  get derivedTuples() { return this.detail('derivedTuples'); }
}

class RelationResult extends RelationValueBase {
  constructor(tuples, trace, statistics) {
    const copied = new Map([...tuples].map(([id, relationTuples]) => [id, new Map(relationTuples)]));
    super('RelationResult', { tuples: copied, trace: Object.freeze([...trace]), statistics });
  }
  get trace() { return this.detail('trace'); }
  get statistics() { return this.detail('statistics'); }
  tuples(relation) {
    const tuples = this.detail('tuples').get(relation.id) || new Map();
    return Object.freeze([...tuples.values()].sort((left, right) => left.key.localeCompare(right.key)));
  }
  has(relation, ...values) {
    const tuple = new RelationTuple(relation, values);
    return this.detail('tuples').get(relation.id)?.has(tuple.key) || false;
  }
}

function unify(atom, tuple, binding) {
  const next = new Map(binding);
  for (let index = 0; index < atom.values.length; index += 1) {
    const pattern = atom.values[index];
    const concrete = tuple.values[index];
    if (pattern instanceof RelationValue) {
      if (pattern.id !== concrete.id) return undefined;
      continue;
    }
    const previous = next.get(pattern.id);
    if (previous && previous.id !== concrete.id) return undefined;
    next.set(pattern.id, concrete);
  }
  return next;
}

function joinBody(body, sources, statistics) {
  let rows = [{ binding: new Map(), supports: [] }];
  for (let index = 0; index < body.length; index += 1) {
    const atom = body[index];
    const tuples = [...(sources[index].get(atom.relation.id)?.values() || [])]
      .sort((left, right) => left.key.localeCompare(right.key));
    const next = [];
    for (const row of rows) {
      for (const tuple of tuples) {
        statistics.tupleScans += 1;
        const binding = unify(atom, tuple, row.binding);
        if (binding) next.push({ binding, supports: [...row.supports, tuple] });
      }
    }
    rows = next;
    if (rows.length === 0) break;
  }
  return rows;
}

function instantiate(atom, binding) {
  const values = atom.values.map((value) => value instanceof RelationVariable ? binding.get(value.id) : value);
  invariant(values.every((value) => value instanceof RelationValue),
    'unsafe-relation-rule', 'A relation rule produced an unbound head variable.');
  return new RelationTuple(atom.relation, values);
}

function addTuple(collection, tuple) {
  if (!collection.has(tuple.relation.id)) collection.set(tuple.relation.id, new Map());
  const relationTuples = collection.get(tuple.relation.id);
  if (relationTuples.has(tuple.key)) return false;
  relationTuples.set(tuple.key, tuple);
  return true;
}

class RelationEngine {
  evaluate(facts, rules) {
    invariant(Array.isArray(facts) && facts.every((fact) => fact instanceof RelationTuple),
      'invalid-relation-facts', 'RelationEngine facts must be relation tuples.');
    invariant(Array.isArray(rules) && rules.every((rule) => rule instanceof RelationRule),
      'invalid-relation-rules', 'RelationEngine rules must be relation rules.');
    const total = new Map();
    let delta = new Map();
    for (const fact of [...facts].sort((left, right) => left.key.localeCompare(right.key))) {
      if (addTuple(total, fact)) addTuple(delta, fact);
    }
    const trace = [];
    const statistics = { rounds: 0, ruleEvaluations: 0, tupleScans: 0, derivedTuples: 0 };
    while ([...delta.values()].some((tuples) => tuples.size > 0)) {
      statistics.rounds += 1;
      const nextDelta = new Map();
      for (const rule of rules) {
        for (let pivot = 0; pivot < rule.body.length; pivot += 1) {
          if (!(delta.get(rule.body[pivot].relation.id)?.size > 0)) continue;
          statistics.ruleEvaluations += 1;
          const sources = rule.body.map((_, index) => index === pivot ? delta : total);
          for (const row of joinBody(rule.body, sources, statistics)) {
            const tuple = instantiate(rule.head, row.binding);
            if (total.get(tuple.relation.id)?.has(tuple.key)
              || nextDelta.get(tuple.relation.id)?.has(tuple.key)) continue;
            addTuple(nextDelta, tuple);
            statistics.derivedTuples += 1;
            trace.push(new RelationTraceStep(statistics.rounds, rule.name, tuple, row.supports));
          }
        }
      }
      for (const relationTuples of nextDelta.values()) {
        for (const tuple of relationTuples.values()) addTuple(total, tuple);
      }
      delta = nextDelta;
    }
    return new RelationResult(total, trace, new RelationStatistics(
      statistics.rounds, statistics.ruleEvaluations, statistics.tupleScans, statistics.derivedTuples
    ));
  }
}

function relation(name, ...sorts) { return new RelationDefinition(name, sorts); }
function relationValue(sort, value) { return new RelationValue(sort, value); }
function relationVariable(name, sort) { return new RelationVariable(name, sort); }
function relationAtom(definition, ...values) { return new RelationAtom(definition, values); }
function relationFact(definition, ...values) { return new RelationTuple(definition, values); }
function relationRule(name, head, ...body) { return new RelationRule(name, head, body); }

export {
  RelationAtom, RelationDefinition, RelationEngine, RelationResult, RelationRule, RelationStatistics,
  RelationTraceStep, RelationTuple, RelationValue, RelationVariable, relation, relationAtom, relationFact,
  relationRule, relationValue, relationVariable
};
