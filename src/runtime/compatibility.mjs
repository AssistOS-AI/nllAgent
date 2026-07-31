import { SOURCE_FORM, quote } from '../core/canonical-source.mjs';
import { NllError } from '../core/errors.mjs';
import {
  CircuitTemplate, ContractPart, MatchClause, NotExistsClause
} from '../circuit/model.mjs';
import { Pattern, RoleValue, SemanticValue, Term } from '../ontology/model.mjs';

class DemandScope extends SemanticValue {
  constructor(id) { super('DemandScope', { id }); }
  get id() { return this.detail('id'); }
  [SOURCE_FORM]() { return `demandScope(${quote(this.id)})`; }
}

class CoverageDemand extends SemanticValue {
  constructor(conceptId, scope) { super('CoverageDemand', { conceptId, scope }); }
  get conceptId() { return this.detail('conceptId'); }
  get scope() { return this.detail('scope'); }
  get scopeId() { return this.scope.id; }
  [SOURCE_FORM]() { return `coverageDemand(${quote(this.conceptId)},${this.scope[SOURCE_FORM]()})`; }
}

class SemanticDemand extends SemanticValue {
  constructor({ concepts = [], roles = [], capabilities = [], coverage = [], evidencePolicies = [], operations = [] }) {
    super('SemanticDemand', {
      concepts: new Set(concepts), roles: new Set(roles), capabilities: new Set(capabilities),
      coverage: Object.freeze([...coverage]), evidencePolicies: new Set(evidencePolicies),
      operations: new Set(operations)
    });
  }
  get concepts() { return new Set(this.detail('concepts')); }
  get roles() { return new Set(this.detail('roles')); }
  get capabilities() { return new Set(this.detail('capabilities')); }
  get coverageRequirements() { return this.detail('coverage'); }
  get coverageSensitive() { return new Set(this.coverageRequirements.map((value) => value.conceptId)); }
  get evidencePolicies() { return new Set(this.detail('evidencePolicies')); }
  get operations() { return new Set(this.detail('operations')); }
  [SOURCE_FORM]() {
    const args = (values) => [...values].sort().map(quote).join(',');
    return `semanticDemand().concepts(${args(this.concepts)}).roles(${args(this.roles)})`
      + `.capabilities(${args(this.capabilities)}).coverage(${this.coverageRequirements
        .map((value) => value[SOURCE_FORM]()).join(',')})`
      + `.evidencePolicies(${args(this.evidencePolicies)}).operations(${args(this.operations)}).seal()`;
  }
}

class SemanticDemandBuilder {
  #fields = {
    concepts: [], roles: [], capabilities: [], coverage: [], evidencePolicies: [], operations: []
  };
  #sealed = false;
  #add(field, values) {
    if (this.#sealed) throw new NllError('semantic-demand-sealed', 'SemanticDemand is sealed.');
    this.#fields[field].push(...values);
    return this;
  }
  concepts(...values) { return this.#add('concepts', values); }
  roles(...values) { return this.#add('roles', values); }
  capabilities(...values) { return this.#add('capabilities', values); }
  coverage(...values) { return this.#add('coverage', values); }
  evidencePolicies(...values) { return this.#add('evidencePolicies', values); }
  operations(...values) { return this.#add('operations', values); }
  seal() {
    if (this.#sealed) throw new NllError('semantic-demand-sealed', 'SemanticDemand is sealed.');
    this.#sealed = true;
    return new SemanticDemand({
      ...this.#fields,
      concepts: uniqueSorted(this.#fields.concepts),
      roles: uniqueSorted(this.#fields.roles),
      capabilities: uniqueSorted(this.#fields.capabilities),
      evidencePolicies: uniqueSorted(this.#fields.evidencePolicies),
      operations: uniqueSorted(this.#fields.operations),
      coverage: uniqueCoverage(this.#fields.coverage)
    });
  }
}

class CompatibilityReport extends SemanticValue {
  constructor(status, fields) {
    super('CompatibilityReport', {
      status,
      missingConcepts: Object.freeze([...fields.missingConcepts]),
      missingRoles: Object.freeze([...fields.missingRoles]),
      missingCapabilities: Object.freeze([...fields.missingCapabilities]),
      unsupportedEvidencePolicies: Object.freeze([...fields.unsupportedEvidencePolicies]),
      unsupportedOperations: Object.freeze([...fields.unsupportedOperations]),
      unknownCoverage: Object.freeze([...fields.unknownCoverage])
    });
  }
  get status() { return this.detail('status'); }
  get missingConcepts() { return this.detail('missingConcepts'); }
  get missingRoles() { return this.detail('missingRoles'); }
  get missingCapabilities() { return this.detail('missingCapabilities'); }
  get unsupportedEvidencePolicies() { return this.detail('unsupportedEvidencePolicies'); }
  get unsupportedOperations() { return this.detail('unsupportedOperations'); }
  get unknownCoverage() { return this.detail('unknownCoverage'); }
}

function deriveSemanticDemand(circuits) {
  const fields = {
    concepts: new Set(), roles: new Set(), capabilities: new Set(), coverage: new Map(),
    evidencePolicies: new Set(), operations: new Set()
  };
  const visited = new Set();
  for (const circuit of circuits) visitCircuit(circuit, fields, visited);
  return new SemanticDemand({
    concepts: [...fields.concepts].sort(), roles: [...fields.roles].sort(),
    capabilities: [...fields.capabilities].sort(), coverage: [...fields.coverage.values()]
      .sort((left, right) => `${left.conceptId}:${left.scopeId}`.localeCompare(`${right.conceptId}:${right.scopeId}`)),
    evidencePolicies: [...fields.evidencePolicies].sort(), operations: [...fields.operations].sort()
  });
}

function visitCircuit(circuit, fields, visited) {
  if (!(circuit instanceof CircuitTemplate)) {
    throw new NllError('invalid-circuit', 'SemanticDemand can only be derived from CircuitTemplate values.');
  }
  if (visited.has(circuit.identity)) return;
  visited.add(circuit.identity);
  fields.operations.add(`circuit:${circuit.id}`);
  for (const requirement of circuit.required) {
    fields.capabilities.add(requirement.id ?? semanticId(requirement));
    for (const qualifier of requirement.qualifiers ?? []) fields.evidencePolicies.add(semanticId(qualifier));
  }
  for (const method of circuit.methods) fields.operations.add(`method:${semanticId(method)}`);
  for (const part of circuit.parts) {
    if (!(part instanceof ContractPart)) continue;
    if (part.contractKind === 'guarantee') {
      for (const value of part.values) fields.evidencePolicies.add(semanticId(value));
    }
    if (part.contractKind === 'effects') {
      for (const value of part.values) fields.operations.add(`effect:${value.effectKind}:${semanticId(value.target)}`);
    }
  }
  for (const rule of circuit.rules) visitRule(rule, fields);
  for (const stage of circuit.stages) visitStage(stage, fields);
  if (circuit.decisionTables?.length) fields.operations.add('decision-table');
  if (circuit.instantiations.length) fields.operations.add('instantiate-each');
  for (const nested of circuit.subcircuits) visitCircuit(nested, fields, visited);
  for (const instantiation of circuit.instantiations) visitCircuit(instantiation.template, fields, visited);
}

function visitRule(rule, fields) {
  fields.operations.add('rule');
  for (const clause of rule.clauses) {
    if (clause instanceof MatchClause) {
      fields.operations.add('match');
      visitPattern(clause.pattern, fields);
    } else if (clause instanceof NotExistsClause) {
      fields.operations.add('not-exists');
      visitPattern(clause.match.pattern, fields);
      const conceptId = clause.coverage.concept.id;
      if (clause.scope === null || clause.scope === undefined) {
        throw new NllError('absence-without-scope', `Rule ${rule.id} has coverage-sensitive absence without a scope.`);
      }
      const scope = demandScope(scopeId(clause.scope));
      fields.coverage.set(`${conceptId}:${scope.id}`, coverageDemand(conceptId, scope));
    } else {
      fields.operations.add('where');
    }
  }
  for (const action of rule.actions) fields.operations.add(action.actionKind);
}

function visitStage(stage, fields) {
  fields.operations.add(`stage:${stage.id}`);
  for (const contract of stage.contracts) {
    for (const value of contract.values ?? []) {
      if (contract.contractKind === 'reads' || contract.contractKind === 'writes') {
        collectSemanticReference(value, fields);
      } else if (contract.contractKind === 'effects') {
        fields.operations.add(`effect:${value.effectKind}:${semanticId(value.target)}`);
      }
    }
  }
}

function visitPattern(value, fields) {
  if (value instanceof Pattern || value instanceof Term) {
    fields.concepts.add(value.concept.id);
    for (const roleValue of value.roleValues) visitRoleValue(roleValue, fields);
  }
}

function visitRoleValue(roleValue, fields) {
  if (!(roleValue instanceof RoleValue)) return;
  fields.roles.add(roleValue.role.id);
  for (const value of roleValue.values) visitPattern(value, fields);
}

function collectSemanticReference(value, fields) {
  const definition = value?.definition ?? value;
  if (definition?.kind === 'RoleDefinition') fields.roles.add(definition.id);
  else if (definition?.id) fields.concepts.add(definition.id);
}

function evaluateCompatibility(demand, ontologyOrOntologies, store, available = new Set()) {
  const ontologies = Array.isArray(ontologyOrOntologies) ? ontologyOrOntologies : [ontologyOrOntologies];
  const concepts = new Map(ontologies.flatMap((ontology) => [...ontology.concepts]));
  const roles = new Map(ontologies.flatMap((ontology) => [...ontology.roles]));
  const availability = normalizeAvailability(available);
  const missingConcepts = [...demand.concepts].filter((id) => !concepts.has(id)).sort();
  const missingRoles = [...demand.roles].filter((id) => !roles.has(id)).sort();
  const missingCapabilities = [...demand.capabilities]
    .filter((id) => !availability.capabilities.has(id)).sort();
  const unsupportedEvidencePolicies = availability.evidencePolicies === null ? []
    : [...demand.evidencePolicies].filter((id) => !availability.evidencePolicies.has(id)).sort();
  const unsupportedOperations = availability.operations === null ? []
    : [...demand.operations].filter((id) => !availability.operations.has(id)).sort();
  const unknownCoverage = demand.coverageRequirements.filter((requirement) => {
    const concept = concepts.get(requirement.conceptId);
    return !concept || store.coverageFor(concept, requirement.scope) !== 'closed';
  });
  const status = missingConcepts.length || missingRoles.length ? 'BLOCKED_ONTOLOGY'
    : missingCapabilities.length || unsupportedEvidencePolicies.length || unsupportedOperations.length
      ? 'BLOCKED_CAPABILITY'
      : unknownCoverage.length ? 'UNKNOWN' : 'COMPATIBLE';
  return new CompatibilityReport(status, {
    missingConcepts, missingRoles, missingCapabilities, unsupportedEvidencePolicies,
    unsupportedOperations, unknownCoverage
  });
}

function normalizeAvailability(value) {
  if (value instanceof Set) return { capabilities: value, evidencePolicies: null, operations: null };
  return {
    capabilities: new Set(value.capabilities ?? []),
    evidencePolicies: value.evidencePolicies === undefined ? null : new Set(value.evidencePolicies),
    operations: value.operations === undefined ? null : new Set(value.operations)
  };
}

function semanticId(value) { return value?.definition?.id ?? value?.id ?? value?.name ?? String(value); }
function scopeId(value) { return value?.identity ?? value?.id ?? String(value); }
function uniqueSorted(values) { return [...new Set(values)].sort(); }
function uniqueCoverage(values) {
  return [...new Map(values.map((value) => [`${value.conceptId}:${value.scopeId}`, value])).values()]
    .sort((left, right) => `${left.conceptId}:${left.scopeId}`.localeCompare(`${right.conceptId}:${right.scopeId}`));
}

const semanticDemand = () => new SemanticDemandBuilder();
const demandScope = (id) => new DemandScope(id);
const coverageDemand = (conceptId, scope) => new CoverageDemand(
  conceptId, scope instanceof DemandScope ? scope : demandScope(scope)
);

export {
  CompatibilityReport, CoverageDemand, DemandScope, SemanticDemand, SemanticDemandBuilder,
  coverageDemand, demandScope, deriveSemanticDemand, evaluateCompatibility, semanticDemand
};
