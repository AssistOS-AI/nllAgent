import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CoverageDomain, EvidenceTruth, FiniteChoice, NumericInterval, ReducedProduct, AbstractState,
  abstractCircuit, abstractOperation, abstractPreflight, numericGreaterThanOperation, opaqueOperation
} from '../../src/interpreters/index.mjs';

const STATUS_UNIVERSE = Object.freeze(['VIOLATED', 'SATISFIED', 'UNKNOWN', 'CONFLICT']);

function statusTransfer(truth) {
  const statuses = [];
  if (truth.mayBe('TRUE')) statuses.push('VIOLATED');
  if (truth.mayBe('FALSE')) statuses.push('SATISFIED');
  if (truth.mayBe('UNKNOWN')) statuses.push('UNKNOWN');
  if (truth.mayBe('CONFLICT')) statuses.push('CONFLICT');
  return FiniteChoice.of(STATUS_UNIVERSE, statuses);
}

test('numeric intervals and finite choices soundly overapproximate concrete executions', () => {
  const amount = NumericInterval.closed(4, 6);
  const threshold = NumericInterval.exact(5);
  const comparison = amount.greaterThan(threshold);
  assert.deepEqual(new Set(comparison.possibilities), new Set(['TRUE', 'FALSE']));

  for (const concrete of [4, 5, 6]) {
    const actual = concrete > 5 ? 'TRUE' : 'FALSE';
    assert.equal(comparison.mayBe(actual), true, `abstract result omitted ${actual} for ${concrete}`);
  }

  const left = FiniteChoice.of(STATUS_UNIVERSE, ['VIOLATED']);
  const right = FiniteChoice.of(STATUS_UNIVERSE, ['SATISFIED']);
  assert.deepEqual(new Set(left.join(right).possibilities), new Set(['VIOLATED', 'SATISFIED']));
});

test('coverage and a reducer preserve unknown until a scope is closed', () => {
  assert.equal(CoverageDomain.constant('OPEN').absenceWhenNoMatch().mustBe('UNKNOWN'), true);
  assert.equal(CoverageDomain.constant('CLOSED').absenceWhenNoMatch().mustBe('TRUE'), true);
  assert.deepEqual(
    new Set(CoverageDomain.top().absenceWhenNoMatch().possibilities),
    new Set(['UNKNOWN', 'TRUE'])
  );

  const reduced = ReducedProduct.of(new Map([
    ['coverage', CoverageDomain.constant('CLOSED')],
    ['absence', EvidenceTruth.top()]
  ]), (view) => view.get('coverage').mustBe('CLOSED')
    ? new Map([['absence', EvidenceTruth.constant('TRUE')]])
    : new Map());
  assert.equal(reduced.dimension('absence').mustBe('TRUE'), true);
});

test('abstract preflight propagates a conservative may-set through its worklist', () => {
  const compare = numericGreaterThanOperation('exceeds', 'amount', 'limit');
  const decide = abstractOperation(
    'status', ['exceeds'], statusTransfer, FiniteChoice.top(STATUS_UNIVERSE)
  );
  const program = abstractCircuit('retention-preflight', [decide, compare], ['status']);
  const result = abstractPreflight(program, new AbstractState([
    ['amount', NumericInterval.closed(4, 6)],
    ['limit', NumericInterval.exact(5)]
  ]));

  assert.equal(result.status, 'STABLE');
  assert.deepEqual(
    new Set(result.output('status').possibilities),
    new Set(['VIOLATED', 'SATISFIED'])
  );
  assert.deepEqual(result.diagnostics, []);
});

test('an unsupported operation reports precision loss and returns declared top', () => {
  const unknownProcedure = opaqueOperation(
    'model-assisted-stage', ['input'], FiniteChoice.top(STATUS_UNIVERSE)
  );
  const result = abstractPreflight(
    abstractCircuit('opaque-preflight', [unknownProcedure], ['model-assisted-stage']),
    new AbstractState([['input', EvidenceTruth.constant('TRUE')]])
  );

  assert.equal(result.output('model-assisted-stage').isTop, true);
  assert.equal(result.diagnostics.some((diagnostic) =>
    diagnostic.code === 'OPAQUE_NODE_PRECISION_LOSS'
      && diagnostic.nodeId === 'model-assisted-stage'), true);
});
