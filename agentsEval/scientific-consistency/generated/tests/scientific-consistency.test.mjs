import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_METHOD_CATALOG, checkArchitecturePlan } from '../../../../src/architecture/index.mjs';
import { ExecutionTrace, executeCircuit } from '../../../../src/runtime/index.mjs';
import { SemanticStore } from '../../../../src/store/index.mjs';
import { ScientificConsistencyAssessment, comparisonStatus } from '../ontologies/index.mjs';
import ontology from '../ontologies/index.mjs';
import plan from '../plans/scientific-report.plan.mjs';
import circuit from '../circuits/scientific-consistency.circuit.mjs';
import agent from '../agent.mjs';
import pack from '../pack.mjs';
import { cases } from '../benchmarks/scientific-consistency.benchmark.mjs';
import { makeProgram, reference } from './fixtures.mjs';

async function execute(program) {
  const store = new SemanticStore();
  store.publish(program);
  const trace = new ExecutionTrace(`test:${program.identity}`);
  await executeCircuit(circuit, store, { trace });
  const assessments = store.outputs.filter((value) => value instanceof Object
    && value.concept === ScientificConsistencyAssessment.definition);
  return Object.freeze({ store, trace, assessments, findings: store.outputs.filter((value) => value.concept?.name === 'Finding') });
}

function compared(value = {}) {
  return {
    id: 'COMPARED',
    text: 'The comparison claim reports 14.3 percentage points for the same primary analysis.',
    ...value
  };
}

function caseSpecifications(id) {
  const variations = new Map([
    ['equivalent-percent-proportion', compared()],
    ['compatible-conflict', compared({ value: 12.0, text: 'The same primary analysis reports 12.0 percentage points.' })],
    ['different-metric', compared({ metric: 'relative improvement', unit: 'percent', value: 18 })],
    ['different-population', compared({ population: 'per-protocol' })],
    ['different-aggregation', compared({ aggregation: 'unadjusted-observed-case' })],
    ['different-horizon', compared({ horizon: 'week-12' })],
    ['unknown-dimension', compared({ population: 'unknown' })],
    ['dimension-conflict', compared({ population: 'conflict:modified-intention-to-treat|per-protocol' })],
    ['rounding-boundary', compared({ value: 14.34 })]
  ]);
  return variations.has(id) ? [reference(), variations.get(id)] : [compared({ kind: 'summary' })];
}

test('training artifacts seal and the architecture plan maps all authority obligations', () => {
  assert.equal(ontology.id, 'eval.scientific-report@1');
  assert.deepEqual(checkArchitecturePlan(plan, DEFAULT_METHOD_CATALOG), []);
  assert.equal(pack.id, 'eval.scientific-report.pack@1');
  assert.equal(agent.id, 'scientific-consistency');
  assert.equal(circuit.methods.length, 4);
  assert.equal(circuit.decisionTables.length, 1);
});

test('SDK-first concrete path preserves compatibility before arithmetic and all semantic statuses', async () => {
  const program = makeProgram('status-matrix', [
    reference(),
    compared({ id: 'CONSISTENT' }),
    compared({ id: 'VIOLATED', value: 12, text: 'The same primary target is also reported as 12.0 percentage points.' }),
    compared({ id: 'METRIC', metric: 'relative improvement', unit: 'percent', value: 18 }),
    compared({ id: 'POPULATION', population: 'per-protocol' }),
    compared({ id: 'UNKNOWN', population: 'unknown' }),
    compared({ id: 'CONFLICT', population: 'conflict:m-it-t|per-protocol' })
  ]);
  const result = await execute(program);
  const statuses = new Map(result.assessments.map((value) => [value.value('rightClaim'), value.value(comparisonStatus)]));
  assert.deepEqual(statuses, new Map([
    ['CONSISTENT', 'SATISFIED'], ['VIOLATED', 'VIOLATED'], ['METRIC', 'NOT_APPLICABLE'],
    ['POPULATION', 'NOT_APPLICABLE'], ['UNKNOWN', 'UNKNOWN'], ['CONFLICT', 'CONFLICT']
  ]));
  assert.equal(result.findings.length, 2);
  for (const primitive of ['semantic.query@1', 'egraph.normalize@1', 'constraints.solve@1', 'decision.evaluate@1']) {
    assert.ok(result.trace.events.some((event) => event.node === `primitive:${primitive}`), `missing ${primitive} trace`);
  }
});

test('support absence is unknown in open coverage and violated only in closed exact scope', async () => {
  const open = await execute(makeProgram('support-open', caseSpecifications('open-support-coverage'), 'partial'));
  assert.equal(open.assessments[0].value(comparisonStatus), 'UNKNOWN');
  assert.equal(open.findings.length, 0);
  const closed = await execute(makeProgram('support-closed', caseSpecifications('closed-support-coverage'), 'closed'));
  assert.equal(closed.assessments[0].value(comparisonStatus), 'VIOLATED');
  assert.equal(closed.findings.length, 1);
});

test('semantic benchmark suite covers normalization, conflicts, incompatibility, uncertainty, and coverage', async () => {
  const observed = [];
  for (const benchmarkCase of cases) {
    const coverageState = benchmarkCase.id === 'open-support-coverage' ? 'partial' : 'closed';
    const result = await execute(makeProgram(benchmarkCase.id, caseSpecifications(benchmarkCase.id), coverageState));
    const actual = result.assessments[0].value(comparisonStatus);
    const expected = benchmarkCase.expectations.find((value) => value.expectationKind === 'assessmentStatus').value;
    observed.push(Object.freeze({ id: benchmarkCase.id, actual, expected }));
  }
  assert.equal(observed.length, 11);
  assert.deepEqual(observed.filter((value) => value.actual !== value.expected), []);
});

test('targeted mutations are killed by independent semantic assertions', async () => {
  const population = await execute(makeProgram('mutant-ignore-population', [reference(), compared({ population: 'per-protocol' })]));
  const metric = await execute(makeProgram('mutant-collapse-metric', [
    reference(), compared({ metric: 'relative improvement', unit: 'percent', value: 18 })
  ]));
  const comparator = await execute(makeProgram('mutant-invert-comparator', [reference(), compared({ value: 12 })]));
  const coverage = await execute(makeProgram('mutant-close-open-scope', [compared({ kind: 'summary' })], 'partial'));
  const killed = [
    population.assessments[0].value(comparisonStatus) === 'NOT_APPLICABLE',
    metric.assessments[0].value(comparisonStatus) === 'NOT_APPLICABLE',
    comparator.assessments[0].value(comparisonStatus) === 'VIOLATED',
    coverage.assessments[0].value(comparisonStatus) === 'UNKNOWN'
  ];
  assert.deepEqual(killed, [true, true, true, true]);
});
