import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { RuleAnalysis, checkArchitecturePlan, DEFAULT_METHOD_CATALOG } from '../../../src/architecture/index.mjs';
import { AgentAuthoringContext } from '../../../src/context/model.mjs';
import { Claim } from '../../../src/longtext/model.mjs';
import { Term } from '../../../src/ontology/model.mjs';
import agent from '../agent.mjs';
import {
  ContinuityAssessment, Finding, Retrieve, Use, assessedUse, assessmentStatus, evidence, eventAnchor,
  findingType
} from '../ontologies/index.mjs';
import plan from '../plans/continuity.plan.mjs';
import ruleAnalysis from '../rules/rule-analysis.mjs';
import analyzeContext from '../task/context/agent-context.mjs';
import reviewContext from '../review/context/agent-context.mjs';
import trainContext from '../training/context/agent-context.mjs';
import { runTask } from './support/task-runner.mjs';

const theoryPath = new URL('../training/theory-input/editorial-continuity-theory.md', import.meta.url);

function words(text) { return text.trim().split(/\s+/u).length; }
function assessments(store) {
  return store.outputs.filter((value) => value instanceof Term && value.concept === ContinuityAssessment.definition);
}

test('the forward roles receive exact typed contexts for one selected build', async () => {
  for (const [context, purpose] of [
    [trainContext, 'TRAIN'], [analyzeContext, 'ANALYZE'], [reviewContext, 'REVIEW']
  ]) {
    assert.ok(context instanceof AgentAuthoringContext);
    assert.equal(context.purpose, purpose);
    assert.equal(context.agent.id, 'narrative-continuity');
    assert.equal(context.agent.value('build'), 'eval-build-20260731');
    assert.equal(context.ontology.length, 1);
    assert.equal(context.circuits.length, 2);
    assert.equal(context.providers.length, 11);
  }
  assert.equal(agent.materializers.length, 0, 'the trained agent must not contain a generic prose parser');
  assert.equal(agent.circuits.length, 1);
  assert.equal(agent.rulePacks.length, 1);
});

test('training artifacts map the complete medium-size authority into plan and profile', async () => {
  const theory = await readFile(theoryPath, 'utf8');
  assert.ok(words(theory) >= 1800 && words(theory) <= 2500);
  assert.ok(ruleAnalysis instanceof RuleAnalysis);
  assert.equal(ruleAnalysis.authority.end, [...theory].length);
  assert.deepEqual(checkArchitecturePlan(plan, DEFAULT_METHOD_CATALOG), []);
  assert.equal(plan.steps.length, 5);
  assert.ok(plan.steps.every((step) => step.owner === 'nll-train-agent'));
});

test('task LongTextJS is ground, exactly anchored, and preserves factorized pronoun alternatives', async () => {
  const { text, source, program, store } = await runTask();
  assert.ok(words(text) >= 1800 && words(text) <= 2500);
  assert.equal(source.length, [...text].length);
  for (const value of program.values()) {
    if (!(value instanceof Claim) || !['explicit', 'verified'].includes(value.status.name)) continue;
    assert.ok(value.anchors.length > 0);
    assert.ok(value.anchors.every((anchor) => anchor.source.digest === source.digest));
  }
  assert.equal(store.instancesOf(Use).length, 6);
  assert.equal(store.instancesOf(Retrieve).length, 1);
  assert.equal(store.alternatives.length, 2);
  const actorMention = store.mentions.find((value) => value.lexicalForm === 'She');
  const objectMention = store.mentions.find((value) => value.lexicalForm === 'it');
  assert.equal(store.identityCandidates(actorMention).length, 2);
  assert.equal(store.identityCandidates(objectMention).length, 2);
  assert.ok(store.gaps.some((value) => value.gapKind === 'identity-unresolved'));
  assert.equal(program.values().filter((value) =>
    value instanceof Term && [Finding.definition, ContinuityAssessment.definition].includes(value.concept)).length, 0);
});

test('deterministic execution distinguishes violated, satisfied, unknown, and not applicable uses', async () => {
  const { store, graph, trace } = await runTask();
  const results = assessments(store);
  assert.deepEqual(results.map((value) => value.value(assessmentStatus)).sort(),
    ['VIOLATED', 'SATISFIED', 'UNKNOWN', 'UNKNOWN', 'NOT_APPLICABLE', 'NOT_APPLICABLE'].sort());
  const findings = store.outputs.filter((value) => value instanceof Term && value.concept === Finding.definition);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].value(findingType), 'object-used-without-retrieval');
  assert.deepEqual(findings[0].values(evidence).map((anchor) => anchor.excerpt), [
    'Mara left the brass key in the boathouse.',
    'Mara used the brass key in the hill tower.',
    'The account between leaving the brass key and using the brass key is complete.'
  ]);
  assert.equal(graph.instances.length, 7, 'one root and one canonical child for each use');
  assert.equal(new Set(graph.instances.map(([key]) => key)).size, 7);
  const primitiveSubjects = new Set(trace.events
    .filter((event) => event.node.startsWith('primitive:')).map((event) => event.node));
  assert.ok(primitiveSubjects.has('primitive:semantic.query@1'));
  assert.ok(primitiveSubjects.has('primitive:relations.close@1'));
  assert.ok(primitiveSubjects.has('primitive:semantic.absence@1'));
  assert.ok(primitiveSubjects.has('primitive:decision.evaluate@1'));
  const pronounUse = store.instancesOf(Use)
    .find((value) => value.value(eventAnchor).excerpt === 'She used it in the hill tower.');
  assert.equal(results.find((value) => value.value(assessedUse).identity === pronounUse.identity)
    .value(assessmentStatus), 'UNKNOWN');
});
