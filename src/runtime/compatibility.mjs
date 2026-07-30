import { SOURCE_FORM, quote } from '../core/canonical-source.mjs';
import { MatchClause } from '../circuit/model.mjs';
import { SemanticValue } from '../ontology/model.mjs';

class SemanticDemand extends SemanticValue {
  constructor(concepts, capabilities, coverageSensitive) {
    super('SemanticDemand', {
      concepts: new Set(concepts),
      capabilities: new Set(capabilities),
      coverageSensitive: new Set(coverageSensitive)
    });
  }
  get concepts() { return new Set(this.detail('concepts')); }
  get capabilities() { return new Set(this.detail('capabilities')); }
  get coverageSensitive() { return new Set(this.detail('coverageSensitive')); }
  [SOURCE_FORM]() { return `semanticDemand(${[...this.concepts].sort().map(quote).join(',')})`; }
}

class CompatibilityReport extends SemanticValue {
  constructor(status, missingConcepts, missingCapabilities, unknownCoverage) {
    super('CompatibilityReport', {
      status,
      missingConcepts: Object.freeze([...missingConcepts]),
      missingCapabilities: Object.freeze([...missingCapabilities]),
      unknownCoverage: Object.freeze([...unknownCoverage])
    });
  }
  get status() { return this.detail('status'); }
  get missingConcepts() { return this.detail('missingConcepts'); }
  get missingCapabilities() { return this.detail('missingCapabilities'); }
  get unknownCoverage() { return this.detail('unknownCoverage'); }
}

function deriveSemanticDemand(circuits) {
  const concepts = new Set();
  const capabilities = new Set();
  const coverageSensitive = new Set();
  for (const circuit of circuits) {
    for (const requirement of circuit.required) capabilities.add(requirement.id ?? String(requirement));
    for (const rule of circuit.rules) {
      for (const clause of rule.clauses) {
        if (clause instanceof MatchClause) concepts.add(clause.pattern.concept.id);
        if (clause.kind === 'NotExistsClause') coverageSensitive.add(clause.coverage.concept.id);
      }
    }
    for (const stage of circuit.stages) {
      for (const contract of stage.contracts.filter((item) => item.contractKind === 'reads')) {
        for (const value of contract.values) concepts.add(value.definition?.id ?? value.id);
      }
    }
  }
  return new SemanticDemand(concepts, capabilities, coverageSensitive);
}

function evaluateCompatibility(demand, ontology, store, availableCapabilities = new Set()) {
  const ontologyConcepts = new Set([...ontology.concepts.keys()]);
  const missingConcepts = [...demand.concepts].filter((id) => !ontologyConcepts.has(id));
  const missingCapabilities = [...demand.capabilities].filter((id) => !availableCapabilities.has(id));
  const unknownCoverage = [...demand.coverageSensitive].filter((id) => {
    const concept = ontology.concept(id);
    return !concept || store.coverageFor(concept, store.snapshot()) !== 'closed';
  });
  const status = missingConcepts.length ? 'BLOCKED_ONTOLOGY'
    : missingCapabilities.length ? 'BLOCKED_CAPABILITY'
      : unknownCoverage.length ? 'UNKNOWN' : 'COMPATIBLE';
  return new CompatibilityReport(status, missingConcepts, missingCapabilities, unknownCoverage);
}

export { CompatibilityReport, SemanticDemand, deriveSemanticDemand, evaluateCompatibility };
