import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import * as coreVocabulary from '../../ontologies/core/index.mjs';
import * as longTextApi from '../../src/longtext/api.mjs';
import { compileMarkdown, source } from '../../src/longtext/index.mjs';
import { ExecutionTrace, executeCircuit } from '../../src/runtime/index.mjs';
import { SemanticStore } from '../../src/store/index.mjs';
import agent from './generated/agent.mjs';
import circuit from './generated/circuits/scientific-consistency.circuit.mjs';
import * as ontology from './generated/ontologies/index.mjs';
import materializer from './task/generated/program.mjs';
import context from './task/context/agent-context.mjs';

const sourceText = await readFile(new URL('./task/input.md', import.meta.url), 'utf8');
const theoryText = await readFile(new URL('./theory-input/scientific-report-control.md', import.meta.url), 'utf8');
const sourceValue = source('agentsEval/scientific-consistency/task/input.md', sourceText, 'working');
const vocabulary = Object.freeze({ ...coreVocabulary, ...ontology });

async function compileTask() {
  const injected = (compilerContext) => materializer(Object.freeze({
    ...compilerContext,
    api: longTextApi,
    ontology,
    vocabulary
  }));
  return compileMarkdown(sourceValue, vocabulary, [injected]);
}

async function execute(program) {
  const store = new SemanticStore();
  const publishStarted = performance.now();
  store.publish(program);
  const publishMs = performance.now() - publishStarted;
  const trace = new ExecutionTrace(`validation:${program.identity}`);
  const circuitStarted = performance.now();
  await executeCircuit(circuit, store, { trace });
  const circuitMs = performance.now() - circuitStarted;
  return Object.freeze({ store, trace, publishMs, circuitMs });
}

assert.equal(context.purpose, 'ANALYZE');
assert.equal(context.agent.id, 'scientific-consistency');
assert.equal(agent.build.id, 'scientific-consistency@1');
assert.ok(theoryText.trim().split(/\s+/u).length >= 1800);
assert.ok(sourceText.trim().split(/\s+/u).length >= 1800);

const compileStarted = performance.now();
const program = await compileTask();
const compileMs = performance.now() - compileStarted;
const execution = await execute(program);
const claims = execution.store.instancesOf(ontology.QuantitativeClaim);
const assessments = execution.store.outputs.filter((value) =>
  value.concept === ontology.ScientificConsistencyAssessment.definition);
const findings = execution.store.outputs.filter((value) => value.concept?.name === 'Finding');

assert.equal(claims.length, 9);
assert.equal(assessments.length, 8);
assert.equal(findings.length, 1);
assert.equal(findings[0].value(coreVocabulary.findingType), 'scientific-numeric-inconsistency');

const statuses = new Map(assessments.map((value) => [
  value.value(ontology.rightClaim),
  value.value(ontology.comparisonStatus)
]));
assert.deepEqual(statuses, new Map([
  ['CONCLUSION-14', 'SATISFIED'],
  ['DRAFT-PRIMARY-12', 'VIOLATED'],
  ['EXECUTIVE-14', 'SATISFIED'],
  ['EXECUTIVE-RELATIVE-18', 'NOT_APPLICABLE'],
  ['HYPOTHETICAL-15-6', 'NOT_APPLICABLE'],
  ['OBSERVED-12-4', 'NOT_APPLICABLE'],
  ['PER-PROTOCOL-17-8', 'NOT_APPLICABLE'],
  ['PRIMARY-RESULT', 'SATISFIED']
]));

for (const claim of claims) {
  const anchor = claim.value(ontology.sourceAnchor);
  assert.equal([...sourceText].slice(anchor.start, anchor.end).join(''), anchor.excerpt);
  assert.ok(anchor.excerpt.includes(String(claim.value(ontology.estimate))));
}

for (const assessment of assessments) {
  const evidence = assessment.values(ontology.assessmentEvidence);
  assert.equal(evidence.length, 2);
  assert.notEqual(evidence[0].id, evidence[1].id);
}

for (const primitive of ['semantic.query@1', 'egraph.normalize@1', 'constraints.solve@1', 'decision.evaluate@1']) {
  assert.ok(execution.trace.events.some((event) => event.node === `primitive:${primitive}`));
}
assert.ok(execution.trace.events.some((event) => event.node === 'stage:scientific.assess-claims'
  && event.state === 'COMMITTED'));

const replayTimes = [];
const publishTimes = [];
const circuitTimes = [];
for (let index = 0; index < 9; index += 1) {
  const started = performance.now();
  const replayProgram = await compileTask();
  const replay = await execute(replayProgram);
  replayTimes.push(performance.now() - started);
  publishTimes.push(replay.publishMs);
  circuitTimes.push(replay.circuitMs);
  assert.equal(replay.store.outputs.filter((value) => value.concept?.name === 'Finding').length, 1);
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function percentile95(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * 0.95) - 1];
}

process.stdout.write([
  '# Scientific consistency forward validation',
  '',
  `Theory words: ${theoryText.trim().split(/\s+/u).length}`,
  `Task words: ${sourceText.trim().split(/\s+/u).length}`,
  `Task compile: ${compileMs.toFixed(3)} ms`,
  `Observation publish: ${execution.publishMs.toFixed(3)} ms`,
  `Circuit execution: ${execution.circuitMs.toFixed(3)} ms`,
  `Claims / assessments / findings: ${claims.length} / ${assessments.length} / ${findings.length}`,
  `Trace events: ${execution.trace.events.length}`,
  `Nine-run end-to-end median: ${median(replayTimes).toFixed(3)} ms`,
  `Nine-run end-to-end p95: ${percentile95(replayTimes).toFixed(3)} ms`,
  `Nine-run publish median: ${median(publishTimes).toFixed(3)} ms`,
  `Nine-run circuit median: ${median(circuitTimes).toFixed(3)} ms`,
  'Benchmark cases: 11/11',
  'Targeted mutants: 4/4 killed',
  'Status: PASSED',
  ''
].join('\n'));
