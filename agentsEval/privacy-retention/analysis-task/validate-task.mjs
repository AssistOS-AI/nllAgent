import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

import * as api from '../../../src/longtext/api.mjs';
import { Term } from '../../../src/ontology/model.mjs';
import { executeCircuit } from '../../../src/runtime/scheduler.mjs';
import { ExecutionTrace } from '../../../src/runtime/trace.mjs';
import { SemanticStore } from '../../../src/store/semantic-store.mjs';
import { evidence, findingType } from '../../../ontologies/core/index.mjs';

import project from '../training/generated/agent.mjs';
import * as ontology from '../training/generated/ontologies/index.mjs';
import materialize from './generated/program.mjs';

const text = await readFile(new URL('./task/input.md', import.meta.url), 'utf8');
const source = api.source('northstar-retention-register.md', text, 'evaluation-v1');

async function run() {
  const materializationStarted = performance.now();
  const units = materialize({ source, api, ontology, vocabulary: ontology });
  const program = api.longTextProgram('northstar-retention-task', source, ...units);
  const store = new SemanticStore();
  store.publish(program);
  const materializationMs = performance.now() - materializationStarted;
  const executionStarted = performance.now();
  const trace = new ExecutionTrace('privacy-retention-evaluation');
  await executeCircuit(project.circuits[0], store, { trace, tools: project.tools });
  const executionMs = performance.now() - executionStarted;
  const findings = store.outputs.filter((output) => output instanceof Term && output.concept.name === 'Finding');
  return { program, store, trace, findings, materializationMs, executionMs };
}

const first = await run();
assert.equal(first.program.units.length, 18);
assert.equal(first.store.claims.length, 17);
assert.equal(first.store.gaps.length, 1);
assert.equal(first.findings.length, 6);
for (const claim of first.store.claims) {
  assert.equal(claim.anchors.length, 1);
  assert.match(claim.anchors[0].excerpt, /^(RETENTION|EXCEPTION|COVERAGE) \|/u);
}
assert.deepEqual(first.findings.map((finding) => finding.value(findingType)), [
  'retention-violated', 'retention-accepted-exception', 'retention-satisfied',
  'retention-unknown', 'retention-conflict', 'retention-conflict'
]);
assert.ok(first.findings.every((finding) => finding.values(evidence).length > 0));
assert.deepEqual(first.findings.map((finding) => finding.values(evidence).map((anchor) => anchor.excerpt)), [
  [
    'RETENTION | id=R1 | category=support-transcript | years=7 | scope=scope-r1',
    'COVERAGE | scope=scope-r1 | exceptions=closed'
  ],
  [
    'RETENTION | id=R2 | category=tax-invoice | years=8 | scope=scope-r2',
    'EXCEPTION | retention=R2 | status=documented | authority=Fictional Tax Records Act section 41 | until=2032-12-31'
  ],
  ['RETENTION | id=R3 | category=customer-profile | years=5 | scope=scope-r3'],
  [
    'RETENTION | id=R4 | category=research-interview | years=9 | scope=scope-r4',
    'COVERAGE | scope=scope-r4 | exceptions=open'
  ],
  [
    'RETENTION | id=R5 | category=fraud-case | years=9 | scope=scope-r5',
    'EXCEPTION | retention=R5 | status=documented | authority=Fictional Financial Integrity Code article 12 | until=2031-06-30',
    'EXCEPTION | retention=R5 | status=undocumented | authority=none | until=unresolved'
  ],
  [
    'RETENTION | id=R6 | category=marketing-suppression | years=3 | scope=scope-r6',
    'RETENTION | id=R6 | category=marketing-suppression | years=7 | scope=scope-r6'
  ]
]);
assert.equal(first.trace.events.filter((event) => event.node === 'primitive:decision.evaluate@1').length, 12);

const samples = [];
for (let index = 0; index < 30; index += 1) samples.push(await run());
const average = (name) => samples.reduce((sum, item) => sum + item[name], 0) / samples.length;
const maximum = (name) => Math.max(...samples.map((item) => item[name]));
const metrics = {
  sourceWords: text.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/gu)?.length ?? 0,
  sourceCodePoints: [...text].length,
  units: first.program.units.length,
  terms: first.store.terms.length,
  claims: first.store.claims.length,
  gaps: first.store.gaps.length,
  findings: first.findings.length,
  traceEvents: first.trace.events.length,
  materializationAverageMs: average('materializationMs'),
  materializationMaximumMs: maximum('materializationMs'),
  deterministicAverageMs: average('executionMs'),
  deterministicMaximumMs: maximum('executionMs'),
  residentSetBytes: process.memoryUsage().rss
};

const moduleSource = [
  `export const sourceWords = ${metrics.sourceWords};`,
  `export const sourceCodePoints = ${metrics.sourceCodePoints};`,
  `export const units = ${metrics.units};`,
  `export const terms = ${metrics.terms};`,
  `export const claims = ${metrics.claims};`,
  `export const gaps = ${metrics.gaps};`,
  `export const findings = ${metrics.findings};`,
  `export const traceEvents = ${metrics.traceEvents};`,
  `export const materializationAverageMs = ${metrics.materializationAverageMs};`,
  `export const materializationMaximumMs = ${metrics.materializationMaximumMs};`,
  `export const deterministicAverageMs = ${metrics.deterministicAverageMs};`,
  `export const deterministicMaximumMs = ${metrics.deterministicMaximumMs};`,
  `export const residentSetBytes = ${metrics.residentSetBytes};`,
  ''
].join('\n');
await writeFile(new URL('./performance.mjs', import.meta.url), moduleSource, 'utf8');
await writeFile(new URL('./performance.md', import.meta.url), [
  '# Privacy-retention performance', '',
  'Thirty warm-process repetitions on the current evaluation machine. These measurements are observations, not SLAs.', '',
  `- Source: ${metrics.sourceWords} words; ${metrics.sourceCodePoints} Unicode code points`,
  `- Observation layer: ${metrics.units} units; ${metrics.terms} terms; ${metrics.claims} claims; ${metrics.gaps} gap`,
  `- Deterministic output: ${metrics.findings} findings; ${metrics.traceEvents} trace events`,
  `- Task LongTextJS construction and store publication: ${metrics.materializationAverageMs.toFixed(3)} ms average; ${metrics.materializationMaximumMs.toFixed(3)} ms maximum`,
  `- Deterministic CircuitJS execution: ${metrics.deterministicAverageMs.toFixed(3)} ms average; ${metrics.deterministicMaximumMs.toFixed(3)} ms maximum`,
  `- Process resident set after the sample: ${(metrics.residentSetBytes / 1048576).toFixed(1)} MiB`, '',
  'Coding-agent authoring is a separate phase and is not included in deterministic execution. The CLI process-isolation run is recorded independently in the evaluation report.', ''
].join('\n'), 'utf8');

console.log('privacy-retention task validation: PASSED');
console.log(metrics);
