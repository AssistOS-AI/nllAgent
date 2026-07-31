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
  get qualifiers() { return this.detail('qualifiers'); }
  get id() { return this.value.id ?? this.value.definition?.id ?? String(this.value); }
}

class ContractPart extends SemanticValue {
  constructor(contractKind, values) { super('ContractPart', { contractKind, values: Object.freeze([...values]) }); }
  get contractKind() { return this.detail('contractKind'); }
  get values() { return this.detail('values'); }
}

class EffectDescriptor extends SemanticValue {
  constructor(effectKind, target) { super('EffectDescriptor', { effectKind, target }); }
  get effectKind() { return this.detail('effectKind'); }
  get target() { return this.detail('target'); }
}

class IncludePart extends SemanticValue {
  constructor(values) { super('IncludePart', { values: Object.freeze([...values]) }); }
  get values() { return this.detail('values'); }
}

class SchedulePart extends SemanticValue {
  constructor(values) { super('SchedulePart', { values: Object.freeze([...values]) }); }
  get values() { return this.detail('values'); }
}

class CircuitAnnotation extends SemanticValue {
  constructor(annotationKind, values) {
    super('CircuitAnnotation', { annotationKind, values: Object.freeze([...values]) });
  }
  get annotationKind() { return this.detail('annotationKind'); }
  get values() { return this.detail('values'); }
}

class PortBinding extends SemanticValue {
  constructor(outputPort, inputPort) { super('PortBinding', { outputPort, inputPort }); }
  get outputPort() { return this.detail('outputPort'); }
  get inputPort() { return this.detail('inputPort'); }
}

class DynamicInstantiation extends SemanticValue {
  constructor(selector, template) { super('DynamicInstantiation', { selector, template }); }
  get selector() { return this.detail('selector'); }
  get template() { return this.detail('template'); }
}

class CircuitTemplate extends SemanticValue {
  constructor(id, parts) {
    const includes = parts.filter((part) => part instanceof IncludePart).flatMap((part) => part.values)
      .concat(parts.filter((part) => part instanceof Rule || part instanceof Stage
        || part instanceof CircuitTemplate || part instanceof DecisionTable));
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
      annotations: Object.freeze(parts.filter((part) => part instanceof CircuitAnnotation)),
      bindings: Object.freeze(parts.filter((part) => part instanceof PortBinding)),
      instantiations: Object.freeze(parts.filter((part) => part instanceof DynamicInstantiation)),
      schedules: Object.freeze(parts.filter((part) => part instanceof SchedulePart)),
      identity: `circuit:${digestSource([id, ...includes.map((item) => item.id)])}`
    });
  }
  get id() { return this.detail('id'); }
  get identity() { return this.detail('identity'); }
  get parts() { return this.detail('parts'); }
  get includes() { return this.detail('includes'); }
  get required() { return this.detail('required'); }
  get provided() { return this.detail('provided'); }
  get annotations() { return this.detail('annotations'); }
  get bindings() { return this.detail('bindings'); }
  get instantiations() { return this.detail('instantiations'); }
  get schedules() { return this.detail('schedules'); }
  annotation(kind) { return this.annotations.find((item) => item.annotationKind === kind)?.values ?? Object.freeze([]); }
  get primaryRole() { return this.annotation('primary-role')[0] ?? null; }
  get methods() { return this.annotation('method'); }
  get supportedInterpreters() { return this.annotation('supports'); }
  get summary() { return this.annotation('summary')[0] ?? null; }
  get rules() { return this.includes.filter((item) => item instanceof Rule); }
  get stages() { return this.includes.filter((item) => item instanceof Stage); }
  get subcircuits() { return this.includes.filter((item) => item instanceof CircuitTemplate); }
  get decisionTables() { return this.includes.filter((item) => item instanceof DecisionTable); }
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
  get id() { return this.detail('id'); }
  get columns() { return this.detail('columns'); }
  get rows() { return this.detail('rows'); }
  get hitPolicy() { return this.detail('hitPolicy'); }
  decide(inputs) {
    if (!Array.isArray(inputs) || inputs.length !== this.columns.length) {
      throw new NllError('invalid-decision-input', `Decision table ${this.id} expects ${this.columns.length} values.`);
    }
    const matches = this.rows.filter((row) => row.values.every(
      (expected, index) => expected === ANY || expected === inputs[index]
    ));
    if (!matches.length) return new DecisionEvaluation(this, inputs, [], null, 'UNHANDLED');
    if (this.hitPolicy === 'priority') {
      const selected = [...matches].sort((left, right) => right.priority - left.priority)[0];
      return new DecisionEvaluation(this, inputs, matches, selected.result, 'SELECTED');
    }
    const results = new Set(matches.map((row) => row.result));
    const result = results.size === 1 ? matches[0].result : 'RULE_CONFLICT';
    return new DecisionEvaluation(this, inputs, matches, result, results.size === 1 ? 'SELECTED' : 'CONFLICT');
  }
  evaluate(inputs) {
    return this.decide(inputs).result;
  }
}

class DecisionEvaluation extends SemanticValue {
  constructor(table, inputs, matchedRows, result, status) {
    super('DecisionEvaluation', {
      table,
      inputs: Object.freeze([...inputs]),
      matchedRows: Object.freeze([...matchedRows]),
      result,
      status
    });
  }
  get table() { return this.detail('table'); }
  get inputs() { return this.detail('inputs'); }
  get matchedRows() { return this.detail('matchedRows'); }
  get result() { return this.detail('result'); }
  get status() { return this.detail('status'); }
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
  ANY, Action, AliasReference, Capability, CircuitAnnotation, CircuitTemplate, ContractPart, CoverageRequirement,
  DecisionEvaluation, DecisionRow, DecisionTable, DynamicInstantiation, EffectDescriptor, IncludePart, MatchClause, NotExistsClause,
  PortBinding, Rule, SchedulePart, Stage,
  WhereClause, instantiate
};
