import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateSemantically } from '../../src/benchmark/llm-evaluator.mjs';
import { gatewayForAgent } from '../../src/model/achilles-gateway.mjs';
import { createStandardRegistries } from '../../src/runtime/standard-operators.mjs';

test('semantic benchmark adjudication uses LLMAgent twice and Spark translation preference', async () => {
  const calls = [];
  const llmAgent = {
    async executePrompt(prompt, options) {
      calls.push({ prompt, options });
      return {
        pass: true,
        score: 0.97,
        observationAgreement: true,
        ruleAgreement: true,
        coverageAgreement: true,
        materialDifferences: [],
        explanation: 'The structured outcome and report claims are semantically equivalent.'
      };
    }
  };
  const gateway = gatewayForAgent(llmAgent, { translationModel: 'openai_responses/gpt-5.3-codex-spark' });
  const registries = createStandardRegistries({ modelGateway: gateway });
  const testCase = {
    id: 'semantic-example',
    metadata: {
      evaluation: {
        mode: 'llm',
        minimumScore: 0.9,
        perspectives: ['equivalence', 'counterexample'],
        rubric: 'The same finding, scope, and guarantee must be present.'
      }
    }
  };
  const result = await evaluateSemantically(
    testCase,
    '# Expected\n\nED-001 warning.',
    '# Actual\n\nThe report contains ED-001 as a warning.',
    { circuit: { status: 'reported', findingRules: ['ED-001'] } },
    registries
  );
  assert.equal(result.passed, true);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.options.model === 'openai_responses/gpt-5.3-codex-spark'));
  assert.match(calls[1].prompt, /Perspective: counterexample/u);
});

test('a counterexample perspective can reject a fluent but guarantee-inflated report', async () => {
  const llmAgent = {
    async executePrompt(prompt) {
      if (prompt.includes('Perspective: counterexample')) {
        return {
          pass: false,
          score: 0.31,
          observationAgreement: true,
          ruleAgreement: true,
          coverageAgreement: false,
          materialDifferences: [
            'Actual claims mechanical certification although the expected result is model-assisted.',
            'Actual omits the open-world coverage limitation.'
          ],
          explanation: 'The verdict label matches, but the report materially inflates its guarantee and coverage.'
        };
      }
      return {
        pass: true,
        score: 0.93,
        observationAgreement: true,
        ruleAgreement: true,
        coverageAgreement: true,
        materialDifferences: [],
        explanation: 'The main finding and rule align.'
      };
    }
  };
  const registries = createStandardRegistries({
    modelGateway: gatewayForAgent(llmAgent, { translationModel: 'spark-test' })
  });
  const testCase = {
    id: 'guarantee-inflation',
    metadata: {
      evaluation: {
        mode: 'llm', minimumScore: 0.8,
        perspectives: ['equivalence', 'counterexample'],
        rubric: 'Verdict, evidence, coverage, and guarantee must all agree.'
      }
    }
  };
  const result = await evaluateSemantically(
    testCase,
    '# Expected\n\nContinuity gap. Guarantee: evidence-certified. Coverage: open world.',
    '# Actual\n\nContinuity gap. Guarantee: mechanically-certified. Document fully checked.',
    {
      circuit: { status: 'reported', findingRules: ['CONT-001'] },
      findings: [{ rule: 'CONT-001', guarantee: 'evidence-certified' }],
      coverage: { narrativeEvents: 'open-world' }
    },
    registries
  );

  assert.equal(result.passed, false);
  assert.equal(result.evaluations.length, 2);
  assert.match(result.evaluations[1].materialDifferences.join(' '), /mechanical certification/u);
});
