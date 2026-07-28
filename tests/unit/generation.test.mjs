import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { compileCircuit } from '../../src/circuit/compiler.mjs';
import { loadCircuitSource } from '../../src/circuit/module-loader.mjs';
import {
  finalizeCnlPlan, interpolatePlanTemplate, renderCnlPlan, validateCnlPlanCandidate
} from '../../src/generation/cnl.mjs';
import { compileCnlGenerationPlan } from '../../src/generation/runner.mjs';
import { createStandardRegistries } from '../../src/runtime/standard-operators.mjs';
import { validateCnlPlanningAuthority } from '../../src/release/manager.mjs';
import { loadAgent, loadRelease } from '../../src/storage/agent-store.mjs';

const candidate = {
  kind: 'CNLGenerationPlanCandidate', schemaVersion: 1,
  sourceDigest: 'sha256:idea', sourceObservationIds: ['line:1'],
  appliedRules: ['RULE-1'], sourceRuleReferences: ['authority/rules.md#rule-1'],
  ruleApplications: [{ rule: 'RULE-1', planLocations: ['realizationGuidance:1'] }],
  plan: {
    title: 'A concrete scene plan', sourceIdea: 'Mara returns to the station.',
    document: {
      type: 'literary scene', language: 'Romanian', audience: 'adult readers',
      purpose: 'Render the supplied idea as a complete scene.'
    },
    contentPlan: [
      { id: 'opening', instruction: 'Establish Mara and the empty station.' },
      { id: 'ending', instruction: 'End with the employee speaking.', dependsOn: ['opening'] }
    ],
    realizationGuidance: ['Preserve every explicit fact from the idea.']
  }
};

test('CNL is an idea-specific generation plan, not a natural-language constraint list', () => {
  const plan = finalizeCnlPlan(candidate, {
    release: '3.1.0', planningCircuit: 'editorial.scene-cnl-plan@3.1.0'
  });
  const rendered = renderCnlPlan(plan);
  assert.equal(plan.kind, 'CNLGenerationPlan');
  assert.equal(plan.contentPlan[1].dependsOn[0], 'opening');
  assert.equal(Object.hasOwn(plan, 'constraints'), false);
  assert.doesNotMatch(rendered, /MUST-NOT|modality|CNLConstraint/u);
  assert.match(rendered, /## Content sequence/u);
  assert.match(rendered, /Mara returns to the station/u);
  assert.match(rendered, /Applied rules: RULE-1/u);
  assert.match(rendered, /RULE-1: realizationGuidance:1/u);
  assert.equal(plan.verification.status, 'mechanically-certified');
});

test('CNL template interpolation grounds circuit-authored plan steps in the source idea', () => {
  assert.deepEqual(interpolatePlanTemplate({ requiredContent: ['Use: {{idea}}'] }, {
    idea: 'A legal memorandum about a deadline.'
  }), { requiredContent: ['Use: A legal memorandum about a deadline.'] });
});

test('the same CNL contract represents a normative document plan without copying law as constraints', () => {
  const legalPlan = finalizeCnlPlan({
    ...candidate,
    appliedRules: ['NOTICE-17'],
    sourceRuleReferences: ['authority/notice-law.md#article-17'],
    ruleApplications: [{ rule: 'NOTICE-17', planLocations: ['contentPlan:timing', 'contentPlan:evidence'] }],
    plan: {
      title: 'Incident notification plan', sourceIdea: 'Prepare the authority notice for incident 17.',
      document: {
        type: 'formal incident notification', language: 'English',
        audience: 'competent authority', purpose: 'Report incident 17 with supported facts and evidence.'
      },
      contentPlan: [
        { id: 'identity', instruction: 'Identify the controller, incident, jurisdiction, and confirmation time.' },
        { id: 'timing', instruction: 'State the applicable timing and qualified outage evidence.', dependsOn: ['identity'] },
        { id: 'evidence', instruction: 'List attached records and mark unavailable evidence.', dependsOn: ['timing'] }
      ],
      realizationGuidance: ['Do not state a fact that is absent from the supplied evidence.']
    }
  }, { release: 'legal@1', planningCircuit: 'legal.notice-plan@1.0.0' });
  assert.equal(legalPlan.document.type, 'formal incident notification');
  assert.deepEqual(legalPlan.provenance.appliedRules, ['NOTICE-17']);
  assert.equal(Object.hasOwn(legalPlan, 'constraints'), false);
});

test('CNL validation rejects incomplete plans and unknown step dependencies', () => {
  assert.throws(() => validateCnlPlanCandidate({
    ...candidate,
    plan: { ...candidate.plan, contentPlan: [{ id: 'end', instruction: 'Close.', dependsOn: ['missing'] }] }
  }), { code: 'invalid-cnl-plan' });
  assert.throws(() => validateCnlPlanCandidate({
    ...candidate, plan: { ...candidate.plan, realizationGuidance: [] }
  }), { code: 'invalid-cnl-plan' });
  assert.throws(() => validateCnlPlanCandidate({
    ...candidate,
    ruleApplications: [{ rule: 'RULE-1', planLocations: ['contentPlan:missing'] }]
  }), { code: 'invalid-cnl-plan' });
});

test('planning circuits compile and produce one verified plan from LongTextJS idea observations', async () => {
  const registries = createStandardRegistries();
  const source = await loadCircuitSource(resolve(
    'data/editorial-demo/candidates/3.1.0/planning/editorial-scene-plan.circuit.mjs'
  ));
  const compiled = compileCircuit(source, registries);
  assert.equal(compiled.circuit.purpose, 'planning');
  assert.equal(compiled.circuit.outputs.plan.$node, 'published-plan');

  const agent = await loadAgent(resolve('data'), 'editorial-demo');
  const release = await loadRelease(agent, '3.1.0');
  const result = await compileCnlGenerationPlan({
    agentName: 'editorial-demo', idea: 'Mara revine seara în gara goală.',
    language: 'ro', release, registries
  });
  assert.equal(result.plan.kind, 'CNLGenerationPlan');
  assert.match(result.plan.sourceIdea, /Mara revine/u);
  assert.deepEqual(result.plan.provenance.appliedRules, ['ED-001', 'ED-002']);
  assert.deepEqual(result.plan.verification.ruleApplications, [
    { rule: 'ED-001', planLocations: ['realizationGuidance:3', 'realizationGuidance:5'] },
    { rule: 'ED-002', planLocations: ['realizationGuidance:4', 'realizationGuidance:5'] }
  ]);
});

test('release linking rejects planning circuits that claim unknown authority rules', () => {
  const planning = [{ circuit: {
    id: 'planning.example',
    nodes: [{
      id: 'plan', operator: 'planning.cnl-plan@1',
      inputs: {
        appliedRules: ['MISSING'], sourceRuleReferences: ['authority/rules.md#missing'],
        ruleApplications: [{ rule: 'MISSING', planLocations: ['realizationGuidance:1'] }]
      }
    }]
  } }];
  assert.throws(() => validateCnlPlanningAuthority(planning, {
    rules: [{ id: 'RULE-1' }]
  }), { code: 'invalid-release' });
});

test('release linking rejects a rule witness that points outside its CNL plan', () => {
  const source = 'authority/rules.md#rule-1';
  const planning = [{ circuit: {
    id: 'planning.example',
    nodes: [{
      id: 'plan', operator: 'planning.cnl-plan@1',
      inputs: {
        appliedRules: ['RULE-1'], sourceRuleReferences: [source],
        ruleApplications: [{ rule: 'RULE-1', planLocations: ['contentPlan:missing'] }],
        plan: candidate.plan
      }
    }]
  } }];
  assert.throws(() => validateCnlPlanningAuthority(planning, {
    rules: [{ id: 'RULE-1', source }]
  }), { code: 'invalid-cnl-plan' });
});
