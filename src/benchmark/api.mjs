import { SemanticValue } from '../ontology/model.mjs';

class BenchmarkExpectation extends SemanticValue {
  constructor(expectationKind, value) { super('BenchmarkExpectation', { expectationKind, value }); }
  get expectationKind() { return this.detail('expectationKind'); }
  get value() { return this.detail('value'); }
}

class BenchmarkCase extends SemanticValue {
  constructor(id, inputPath, expectations) {
    super('BenchmarkCase', { id, inputPath, expectations: Object.freeze([...expectations]) });
  }
  get id() { return this.detail('id'); }
  get inputPath() { return this.detail('inputPath'); }
  get expectations() { return this.detail('expectations'); }
}

const benchmarkCase = (id, inputPath, ...expectations) => new BenchmarkCase(id, inputPath, expectations);
const findingCount = (value) => new BenchmarkExpectation('findingCount', value);
const containsFinding = (value) => new BenchmarkExpectation('containsFinding', value);
const excludesFinding = (value) => new BenchmarkExpectation('excludesFinding', value);

export { BenchmarkCase, BenchmarkExpectation, benchmarkCase, containsFinding, excludesFinding, findingCount };
