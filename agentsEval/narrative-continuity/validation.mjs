import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

import {
  DEFAULT_METHOD_CATALOG, RuleAnalysis, checkArchitecturePlan
} from '../../src/architecture/index.mjs';
import { AgentAuthoringContext } from '../../src/context/model.mjs';
import { Term } from '../../src/ontology/model.mjs';
import coveragePreflight from './assurance/coverage-preflight.assurance.mjs';
import decisionProof from './assurance/decision-proof.assurance.mjs';
import temporalAssurance, {
  PRECEDES as ASSURANCE_PRECEDES, event as assuranceEvent
} from './assurance/temporal-closure.assurance.mjs';
import { generateCoverageBoundaryGoals } from './assurance/symbolic-boundaries.assurance.mjs';
import agent from './agent.mjs';
import suite from './benchmark/index.mjs';
import mutations from './benchmark/mutations.mjs';
import {
  ContinuityAssessment, Finding, Use, assessmentStatus, evidence, findingType
} from './ontologies/index.mjs';
import architecturePlan from './plans/continuity.plan.mjs';
import reviewContext from './review/context/agent-context.mjs';
import ruleAnalysis from './rules/rule-analysis.mjs';
import analyzeContext from './task/context/agent-context.mjs';
import trainContext from './training/context/agent-context.mjs';
import { runCase } from './tests/support/case-programs.mjs';
import { executeTask, materializeTask } from './tests/support/task-runner.mjs';

const ROOT = new URL('./', import.meta.url);
const theoryUrl = new URL('training/theory-input/editorial-continuity-theory.md', ROOT);

function words(text) { return text.trim().split(/\s+/u).length; }
function assessments(store) {
  return store.outputs.filter((value) => value instanceof Term && value.concept === ContinuityAssessment.definition);
}
function findings(store) {
  return store.outputs.filter((value) => value instanceof Term && value.concept === Finding.definition);
}

async function validateContextsAndArchitecture() {
  for (const [context, purpose] of [
    [trainContext, 'TRAIN'], [analyzeContext, 'ANALYZE'], [reviewContext, 'REVIEW']
  ]) {
    assert.ok(context instanceof AgentAuthoringContext);
    assert.equal(context.purpose, purpose);
    assert.equal(context.agent.value('build'), 'eval-build-20260731');
    assert.equal(context.circuits.length, 2);
    assert.equal(context.providers.length, 11);
  }
  const theory = await readFile(theoryUrl, 'utf8');
  assert.ok(words(theory) >= 1800 && words(theory) <= 2500);
  assert.ok(ruleAnalysis instanceof RuleAnalysis);
  assert.equal(ruleAnalysis.authority.end, [...theory].length);
  assert.deepEqual(checkArchitecturePlan(architecturePlan, DEFAULT_METHOD_CATALOG), []);
  assert.equal(agent.materializers.length, 0);
  return Object.freeze({ theoryWords: words(theory) });
}

async function validateTask() {
  const generationStart = performance.now();
  const materialized = await materializeTask();
  const generationMs = performance.now() - generationStart;
  const runtimeStart = performance.now();
  const result = await executeTask(materialized);
  const runtimeMs = performance.now() - runtimeStart;
  assert.ok(words(result.text) >= 1800 && words(result.text) <= 2500);
  assert.equal(result.store.instancesOf(Use).length, 6);
  assert.deepEqual(assessments(result.store).map((value) => value.value(assessmentStatus)).sort(),
    ['VIOLATED', 'SATISFIED', 'UNKNOWN', 'UNKNOWN', 'NOT_APPLICABLE', 'NOT_APPLICABLE'].sort());
  const emitted = findings(result.store);
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].value(findingType), 'object-used-without-retrieval');
  assert.deepEqual(emitted[0].values(evidence).map((anchor) => anchor.excerpt), [
    'Mara left the brass key in the boathouse.',
    'Mara used the brass key in the hill tower.',
    'The account between leaving the brass key and using the brass key is complete.'
  ]);
  assert.equal(result.graph.instances.length, 7);
  assert.equal(result.graph.nodes.length, 6);
  return Object.freeze({
    generationMs, runtimeMs, manuscriptWords: words(result.text),
    terms: result.store.terms.length, claims: result.store.claims.length, gaps: result.store.gaps.length,
    outputs: result.store.outputs.length, traceEvents: result.trace.events.length,
    instances: result.graph.instances.length, nodes: result.graph.nodes.length
  });
}

async function validateBenchmarks() {
  const observed = new Map();
  const timings = [];
  for (const [testCase, expected] of suite.entries) {
    const id = testCase.id.replace('continuity-', '');
    const input = await readFile(new URL(`benchmark/${id}/input.md`, ROOT), 'utf8');
    const start = performance.now();
    const result = await runCase(id, input);
    timings.push(performance.now() - start);
    const assessment = assessments(result.store)[0];
    const status = assessment.value(assessmentStatus);
    const count = findings(result.store).length;
    assert.equal(status, expected.status);
    assert.equal(count, expected.findingCount);
    observed.set(id, `${status}:${count}`);
  }
  for (const mutation of mutations) {
    assert.notEqual(observed.get(mutation.baselineCase), observed.get(mutation.mutantCase), mutation.id);
  }
  return Object.freeze({
    cases: timings.length, mutants: mutations.length,
    meanMs: timings.reduce((sum, value) => sum + value, 0) / timings.length,
    maxMs: Math.max(...timings)
  });
}

function validateAssurance() {
  const closure = temporalAssurance();
  assert.ok(closure.has(
    ASSURANCE_PRECEDES, assuranceEvent('section-1:leave'), assuranceEvent('section-3:use')
  ));
  assert.ok(closure.statistics.derivedTuples >= 1);
  const preflight = coveragePreflight();
  assert.equal(preflight.status, 'STABLE');
  assert.ok(preflight.output('absence-result').mayBe('TRUE'));
  assert.ok(preflight.output('absence-result').mayBe('UNKNOWN'));
  assert.equal(decisionProof().status, 'ESTABLISHED');
  const goals = generateCoverageBoundaryGoals();
  assert.equal(goals.length, 1);
  assert.equal(goals[0].branchId, 'coverage-is-closed');
}

const started = performance.now();
const architecture = await validateContextsAndArchitecture();
const task = await validateTask();
const benchmark = await validateBenchmarks();
validateAssurance();
const totalMs = performance.now() - started;
const peakRssMiB = process.memoryUsage().rss / (1024 * 1024);

console.log('Narrative continuity forward evaluation PASSED');
console.log(`Theory words: ${architecture.theoryWords}; manuscript words: ${task.manuscriptWords}`);
console.log(`Generated LongText load/materialization: ${task.generationMs.toFixed(3)} ms`);
console.log(`Deterministic circuit runtime: ${task.runtimeMs.toFixed(3)} ms`);
console.log(`Semantic snapshot: ${task.terms} terms; ${task.claims} claims; ${task.gaps} gaps`);
console.log(`Execution graph: ${task.instances} instances; ${task.nodes} nodes; ${task.traceEvents} trace events`);
console.log(`Benchmarks: ${benchmark.cases}; mutants killed: ${benchmark.mutants}/${benchmark.mutants}; mean ${benchmark.meanMs.toFixed(3)} ms; max ${benchmark.maxMs.toFixed(3)} ms`);
console.log(`Total validation: ${totalMs.toFixed(3)} ms; process RSS: ${peakRssMiB.toFixed(1)} MiB`);
