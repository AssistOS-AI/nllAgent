import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ESTABLISHED, EXHAUSTED, FOUND, MODUS_PONENS, PREMISE, REFUTED, UNDETERMINED,
  ProofKernel, SynthesisEngine, grammarProduction, grammarSort, literalProduction, proofAtom,
  proofCertificate, proofImplies, proofNot, proofStep, typedGrammar
} from '../../src/engines/index.mjs';

test('ProofKernel replays a small local certificate without trusting its claimed conclusion', () => {
  const evidence = proofAtom('evidence-before-emit');
  const finding = proofAtom('finding-authorized');
  const implication = proofImplies(evidence, finding);
  const certificate = proofCertificate(finding, 'conclusion',
    proofStep('evidence', PREMISE, evidence),
    proofStep('policy', PREMISE, implication),
    proofStep('conclusion', MODUS_PONENS, finding, 'evidence', 'policy'));
  const result = new ProofKernel().verify(certificate, [evidence, implication]);
  assert.equal(result.status, ESTABLISHED);
  assert.equal(result.trace.every((step) => step.accepted), true);

  const forged = proofCertificate(finding, 'forged',
    proofStep('evidence', PREMISE, evidence),
    proofStep('forged', MODUS_PONENS, finding, 'evidence', 'evidence'));
  const rejected = new ProofKernel().verify(forged, [evidence]);
  assert.equal(rejected.status, UNDETERMINED);
  assert.equal(rejected.trace.at(-1).accepted, false);
});

test('ProofKernel distinguishes a replayed local refutation from an undischarged goal', () => {
  const exhaustive = proofAtom('decision-table-exhaustive');
  const notExhaustive = proofNot(exhaustive);
  const refutation = proofCertificate(exhaustive, 'counterexample',
    proofStep('counterexample', PREMISE, notExhaustive));
  assert.equal(new ProofKernel().verify(refutation, [notExhaustive]).status, REFUTED);
});

function numericGrammar() {
  const NumberExpression = grammarSort('NumberExpression');
  const zero = literalProduction('zero', NumberExpression, 0);
  const successor = grammarProduction('successor', NumberExpression, [NumberExpression],
    (value) => value + 1);
  return typedGrammar('small-natural-numbers', NumberExpression, zero, successor);
}

test('SynthesisEngine searches by declared cost and accepts only concrete validation', () => {
  const result = new SynthesisEngine().synthesize(numericGrammar(), (value) => value === 2,
    new Map([['maxCost', 5]]));
  assert.equal(result.status, FOUND);
  assert.equal(result.value, 2);
  assert.equal(result.cost, 3);
  assert.equal(result.attempts, 3);
  assert.equal(result.trace.at(-1).accepted, true);
});

test('SynthesisEngine reports bounded exhaustion and requires a concrete validator', () => {
  const engine = new SynthesisEngine();
  const exhausted = engine.search(numericGrammar(), (value) => value === 2,
    new Map([['maxCost', 2]]));
  assert.equal(exhausted.status, EXHAUSTED);
  assert.equal(exhausted.attempts, 2);
  assert.throws(() => engine.synthesize(numericGrammar(), undefined), {
    code: 'missing-concrete-validator'
  });
  assert.throws(() => engine.synthesize(numericGrammar(), () => 'yes'), {
    code: 'invalid-synthesis-verdict'
  });
});
