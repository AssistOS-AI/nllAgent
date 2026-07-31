import { variable } from '../ontology/api.mjs';
import {
  ANY, Action, AliasReference, Capability, CircuitAnnotation, CircuitTemplate, ContractPart, CoverageRequirement,
  DecisionRow, DecisionTable, DynamicInstantiation, EffectDescriptor, IncludePart, MatchClause, NotExistsClause,
  PortBinding, Rule, SchedulePart, Stage, WhereClause
} from './model.mjs';

class ClauseGroup {
  constructor(values) { this.values = Object.freeze(values); Object.freeze(this); }
}

const circuit = (id, ...parts) => new CircuitTemplate(id, parts);
const rule = (id, conditions, actions) => new Rule(id, conditions.values, actions.values);
const when = (...clauses) => new ClauseGroup(clauses);
const then = (...actions) => new ClauseGroup(actions);
const match = (pattern) => new MatchClause(pattern);
const where = (predicate, label) => new WhereClause(predicate, label);
const notExists = (pattern, scope, coverage) => new NotExistsClause(
  pattern instanceof MatchClause ? pattern : match(pattern), scope, coverage
);
const requireCoverage = (concept) => new CoverageRequirement(concept);
const derive = (producer) => new Action('derive', producer);
const emit = (producer) => new Action('emit', producer);
const ref = (alias) => new AliasReference(alias);
const stage = (id, operation, ...contracts) => new Stage(id, operation, contracts);
const using = (...values) => new ContractPart('using', values);
const requires = (...values) => new ContractPart('requires', values);
const provides = (...values) => new ContractPart('provides', values);
const guarantee = (...values) => new ContractPart('guarantee', values);
const reads = (...values) => new ContractPart('reads', values);
const writes = (...values) => new ContractPart('writes', values);
const effects = (...values) => new ContractPart('effects', values);
const usesPrimitives = (...values) => new ContractPart('primitives', values);
const pure = () => new ContractPart('property', ['pure']);
const callsTool = (id) => new EffectDescriptor('tool', id);
const emits = (...values) => new ContractPart('writes', values);
const capability = (value, ...qualifiers) => new Capability(value, qualifiers);
const include = (...values) => new IncludePart(values);
const schedule = (...values) => new SchedulePart(values);
const parallel = (...values) => new SchedulePart(values);
const primaryRole = (value) => new CircuitAnnotation('primary-role', [value]);
const usesMethod = (...values) => new CircuitAnnotation('method', values);
const supports = (...values) => new CircuitAnnotation('supports', values);
const summary = (value) => new CircuitAnnotation('summary', [value]);
const bind = (outputPort, inputPort) => new PortBinding(outputPort, inputPort);
const instantiateEach = (selector, template) => new DynamicInstantiation(selector, template);
const beforeStage = (first, second) => Object.freeze([first, second]);
const afterStage = (first, ...dependencies) => Object.freeze([...dependencies, first]);
const columns = (...values) => Object.freeze(values);
const values = (...items) => Object.freeze(items);
const result = (value) => value;
const row = (rowValues, rowResult, priority = 0) => new DecisionRow(rowValues, rowResult, priority);
const decisionTable = (id, tableColumns, ...rowsAndPolicy) => {
  const policy = rowsAndPolicy.find((item) => typeof item === 'string') || 'unique';
  return new DecisionTable(id, tableColumns, rowsAndPolicy.filter((item) => item instanceof DecisionRow), policy);
};
const uniqueOrConflict = () => 'unique';
const priority = () => 'priority';
const anyValue = () => ANY;

export {
  afterStage, anyValue, beforeStage, bind, callsTool, capability, circuit, columns, decisionTable, derive,
  effects, emit, emits,
  guarantee, include, instantiateEach, match, notExists, parallel, primaryRole, priority, provides, pure, reads, ref, requireCoverage,
  requires, result, row, rule, schedule, stage, then, uniqueOrConflict, using, values, variable, when,
  where, writes, summary, supports, usesMethod, usesPrimitives
};
