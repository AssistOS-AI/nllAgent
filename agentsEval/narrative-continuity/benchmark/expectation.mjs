import { SemanticValue } from '../../../src/ontology/model.mjs';

class NarrativeExpectation extends SemanticValue {
  constructor(id, status, findingCount, evidence) {
    super('NarrativeExpectation', { id, status, findingCount, evidence: Object.freeze([...evidence]) });
  }
  get id() { return this.detail('id'); }
  get status() { return this.detail('status'); }
  get findingCount() { return this.detail('findingCount'); }
  get evidence() { return this.detail('evidence'); }
}

class NarrativeBenchmarkSuite extends SemanticValue {
  constructor(id, entries) { super('NarrativeBenchmarkSuite', { id, entries: Object.freeze([...entries]) }); }
  get id() { return this.detail('id'); }
  get entries() { return this.detail('entries'); }
}

class SemanticMutation extends SemanticValue {
  constructor(id, baselineCase, mutantCase, contract) {
    super('SemanticMutation', { id, baselineCase, mutantCase, contract });
  }
  get id() { return this.detail('id'); }
  get baselineCase() { return this.detail('baselineCase'); }
  get mutantCase() { return this.detail('mutantCase'); }
  get contract() { return this.detail('contract'); }
}

const narrativeExpectation = (id, status, findingCount, ...evidence) =>
  new NarrativeExpectation(id, status, findingCount, evidence);
const benchmarkEntry = (testCase, expected) => Object.freeze([testCase, expected]);
const narrativeBenchmarkSuite = (id, ...entries) => new NarrativeBenchmarkSuite(id, entries);
const semanticMutation = (id, baselineCase, mutantCase, contract) =>
  new SemanticMutation(id, baselineCase, mutantCase, contract);

export {
  NarrativeBenchmarkSuite, NarrativeExpectation, SemanticMutation, benchmarkEntry, narrativeBenchmarkSuite,
  narrativeExpectation, semanticMutation
};
