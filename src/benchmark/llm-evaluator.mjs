import { NllError } from '../core/errors.mjs';

const EVALUATOR_ID = 'model.rubric-judge@1';
const EVALUATION_SCHEMA = Object.freeze({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  additionalProperties: false,
  required: ['pass', 'score', 'observationAgreement', 'ruleAgreement', 'coverageAgreement', 'materialDifferences', 'explanation'],
  properties: {
    pass: { type: 'boolean' },
    score: { type: 'number', minimum: 0, maximum: 1 },
    observationAgreement: { type: 'boolean' },
    ruleAgreement: { type: 'boolean' },
    coverageAgreement: { type: 'boolean' },
    materialDifferences: { type: 'array', items: { type: 'string' } },
    explanation: { type: 'string', minLength: 1 }
  }
});

function evaluationPrompt(testCase, expected, actual, layers, perspective) {
  return [
    'Act as a strict NaturalLanguageLinterAgent benchmark evaluator.',
    'Judge semantic equivalence, not prose similarity. Do not forgive a different verdict, missing exception,',
    'wrong scope, missing evidence, inflated guarantee, or unsupported claim.',
    `Case: ${testCase.id}`,
    `Perspective: ${perspective}`,
    `Rubric: ${testCase.metadata?.evaluation?.rubric || 'Preserve observations, findings, limits, and terminal status.'}`,
    '',
    'EXPECTED STRUCTURED LAYERS:',
    JSON.stringify(layers || {}, null, 2),
    '',
    'EXPECTED MARKDOWN:',
    expected,
    '',
    'ACTUAL MARKDOWN:',
    actual,
    '',
    'Return JSON with:',
    '{"pass":boolean,"score":number,"observationAgreement":boolean,"ruleAgreement":boolean,',
    '"coverageAgreement":boolean,"materialDifferences":[string],"explanation":string}.',
    'Score must be between 0 and 1. `pass` is true only when no material semantic difference exists.'
  ].join('\n');
}

function validateEvaluation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new NllError('invalid-model-output', 'Benchmark evaluator returned no JSON object.');
  }
  const failures = [];
  if (typeof value.pass !== 'boolean') failures.push('pass must be boolean');
  if (!Number.isFinite(value.score) || value.score < 0 || value.score > 1) {
    failures.push('score must be between 0 and 1');
  }
  for (const field of ['observationAgreement', 'ruleAgreement', 'coverageAgreement']) {
    if (typeof value[field] !== 'boolean') failures.push(`${field} must be boolean`);
  }
  if (!Array.isArray(value.materialDifferences)) {
    failures.push('materialDifferences must be an array');
  }
  if (typeof value.explanation !== 'string' || !value.explanation.trim()) {
    failures.push('explanation must be a non-empty string');
  }
  if (failures.length) {
    throw new NllError('invalid-model-output', 'Benchmark evaluator output failed validation.', { failures });
  }
  return value;
}

async function evaluateSemantically(testCase, expected, actual, layers, registries) {
  if (!registries.operators.has(EVALUATOR_ID)) {
    throw new NllError(
      'benchmark-evaluator-unavailable',
      'This benchmark requires a configured semantic evaluation backend.'
    );
  }
  const configuration = testCase.metadata.evaluation || {};
  const perspectives = configuration.perspectives || ['equivalence', 'counterexample'];
  const threshold = configuration.minimumScore ?? 0.8;
  const evaluations = [];
  const captures = [];
  for (const perspective of perspectives) {
    const response = await registries.operators.get(EVALUATOR_ID).execute({
      prompt: evaluationPrompt(testCase, expected, actual, layers, perspective),
      tier: configuration.tier,
      model: configuration.model,
      tags: ['evaluation', 'testing', 'benchmark'],
      taskRole: 'evaluation',
      templateId: `benchmark.semantic-equivalence@1:${perspective}`,
      responseShape: 'json',
      outputSchema: EVALUATION_SCHEMA
    });
    evaluations.push(validateEvaluation(response.result));
    captures.push(response.capture);
  }
  return {
    passed: evaluations.every((value) => value.pass && value.score >= threshold),
    threshold,
    evaluations,
    captures
  };
}

export { EVALUATION_SCHEMA, EVALUATOR_ID, evaluateSemantically, evaluationPrompt, validateEvaluation };
