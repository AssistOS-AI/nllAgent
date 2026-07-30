import { SOURCE_FORM, digestSource, quote } from '../core/canonical-source.mjs';
import { NllError } from '../core/errors.mjs';
import { Pattern, RoleValue, SemanticValue, Term, Variable } from '../ontology/model.mjs';

class MatchClause extends SemanticValue {
  constructor(pattern, alias = null) { super('MatchClause', { pattern, alias }); }
  get pattern() { return this.detail('pattern'); }
  get alias() { return this.detail('alias'); }
  as(alias) { return new MatchClause(this.pattern, alias); }
  [SOURCE_FORM]() { return `match(${this.pattern[SOURCE_FORM]()}${this.alias ? `).as(${quote(this.alias)})` : ')'}`; }
}

class WhereClause extends SemanticValue {
  constructor(predicate, label = predicate.name || 'predicate') { super('WhereClause', { predicate, label }); }
  get predicate() { return this.detail('predicate'); }
  get label() { return this.detail('label'); }
}

class CoverageRequirement extends SemanticValue {
  constructor(concept) { super('CoverageRequirement', { concept: concept.definition ?? concept }); }
  get concept() { return this.detail('concept'); }
}

class NotExistsClause extends SemanticValue {
  constructor(match, scope, coverage) { super('NotExistsClause', { match, scope, coverage }); }
  get match() { return this.detail('match'); }
  get scope() { return this.detail('scope'); }
  get coverage() { return this.detail('coverage'); }
}

class AliasReference extends SemanticValue {
  constructor(alias) { super('AliasReference', { alias }); }
  get alias() { return this.detail('alias'); }
}

class Action extends SemanticValue {
  constructor(actionKind, producer) { super('Action', { actionKind, producer }); }
  get actionKind() { return this.detail('actionKind'); }
  get producer() { return this.detail('producer'); }
}

class Rule extends SemanticValue {
  constructor(id, clauses, actions) {
    super('Rule', { id, clauses: Object.freeze([...clauses]), actions: Object.freeze([...actions]) });
  }
  get id() { return this.detail('id'); }
  get clauses() { return this.detail('clauses'); }
  get actions() { return this.detail('actions'); }
}

class Stage extends SemanticValue {
  constructor(id, operation, contracts = []) {
    if (typeof operation !== 'function') throw new NllError('invalid-stage', `Stage ${id} requires a function.`);
    super('Stage', { id, operation, contracts: Object.freeze([...contracts]) });
  }
  get id() { return this.detail('id'); }
  get operation() { return this.detail('operation'); }
  get contracts() { return this.detail('contracts'); }
}

class Capability extends SemanticValue {
  constructor(value, qualifiers = []) { super('Capability', { value, qualifiers: Object.freeze([...qualifiers]) }); }
  get value() { return this.detail('value'); }
  get id() { return this.value.id ?? this.value.definition?.id ?? String(this.value); }
}

class ContractPart extends SemanticValue {
  constructor(contractKind, values) { super('ContractPart', { contractKind, values: Object.freeze([...values]) }); }
  get contractKind() { return this.detail('contractKind'); }
  get values() { return this.detail('values'); }
}

class IncludePart extends SemanticValue {
  constructor(values) { super('IncludePart', { values: Object.freeze([...values]) }); }
  get values() { return this.detail('values'); }
}

class SchedulePart extends SemanticValue {
  constructor(values) { super('SchedulePart', { values: Object.freeze([...values]) }); }
  get values() { return this.detail('values'); }
}

class CircuitTemplate extends SemanticValue {
  constructor(id, parts) {
    const includes = parts.filter((part) => part instanceof IncludePart).flatMap((part) => part.values)
      .concat(parts.filter((part) => part instanceof Rule || part instanceof Stage || part instanceof CircuitTemplate));
    const required = parts.filter((part) => part instanceof ContractPart && part.contractKind === 'requires')
      .flatMap((part) => part.values);
    const provided = parts.filter((part) => part instanceof ContractPart && part.contractKind === 'provides')
      .flatMap((part) => part.values);
    super('CircuitTemplate', {
      id,
      parts: Object.freeze([...parts]),
      includes: Object.freeze(includes),
      required: Object.freeze(required),
      provided: Object.freeze(provided),
      identity: `circuit:${digestSource([id, ...includes.map((item) => item.id)])}`
    });
  }
  get id() { return this.detail('id'); }
  get identity() { return this.detail('identity'); }
  get includes() { return this.detail('includes'); }
  get required() { return this.detail('required'); }
  get provided() { return this.detail('provided'); }
  get rules() { return this.includes.filter((item) => item instanceof Rule); }
  get stages() { return this.includes.filter((item) => item instanceof Stage); }
  get subcircuits() { return this.includes.filter((item) => item instanceof CircuitTemplate); }
}

class DecisionRow extends SemanticValue {
  constructor(values, result, priority = 0) {
    super('DecisionRow', { values: Object.freeze([...values]), result, priority });
  }
  get values() { return this.detail('values'); }
  get result() { return this.detail('result'); }
  get priority() { return this.detail('priority'); }
}

class DecisionTable extends SemanticValue {
  constructor(id, columns, rows, hitPolicy = 'unique') {
    super('DecisionTable', { id, columns: Object.freeze([...columns]), rows: Object.freeze([...rows]), hitPolicy });
  }
  evaluate(inputs) {
    const matches = this.detail('rows').filter((row) => row.values.every((expected, index) => expected === ANY || expected === inputs[index]));
    if (!matches.length) return null;
    if (this.detail('hitPolicy') === 'priority') return [...matches].sort((a, b) => b.priority - a.priority)[0].result;
    const results = new Set(matches.map((row) => row.result));
    return results.size === 1 ? matches[0].result : 'RULE_CONFLICT';
  }
}

const ANY = Symbol('any-decision-value');

function instantiate(value, binding) {
  if (value instanceof Variable) return binding.get(value);
  if (value instanceof AliasReference) return binding.get(value.alias);
  if (value instanceof Pattern) {
    const roles = value.roleValues.map((roleValue) => new RoleValue(
      roleValue.role,
      roleValue.values.map((item) => instantiate(item, binding))
    ));
    return new Term(value.concept, roles);
  }
  if (value instanceof Term) return value;
  return value;
}

export {
  ANY, Action, AliasReference, Capability, CircuitTemplate, ContractPart, CoverageRequirement,
  DecisionRow, DecisionTable, IncludePart, MatchClause, NotExistsClause, Rule, SchedulePart, Stage,
  WhereClause, instantiate
};
