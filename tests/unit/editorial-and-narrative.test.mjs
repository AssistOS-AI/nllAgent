import assert from 'node:assert/strict';
import test from 'node:test';
import { compileMarkdown } from '../../src/longtext/compiler.mjs';
import { continuityCandidates, continuityVerifier } from '../../src/runtime/narrative-operators.mjs';
import { createStandardRegistries, frequencyThreshold, frequencyVerifier } from '../../src/runtime/standard-operators.mjs';

test('frequency threshold is scoped to a paragraph and verifies every exact occurrence', () => {
  const program = compileMarkdown('Perhaps one, perhaps two, perhaps three.\n\nPerhaps separately.\n', { language: 'en' });
  const observations = program.observations.filter((item) => item.type === 'document.paragraph@1');
  const candidates = frequencyThreshold({
    observations,
    rules: [{ id: 'ED-002', term: 'perhaps', maximum: 2, wholeWord: true, caseSensitive: false }]
  }, { program });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].witness.occurrences.length, 3);
  const verified = frequencyVerifier({ candidates }, { program });
  assert.equal(verified[0].verifierResult.status, 'accept');
  assert.equal(verified[0].guarantee, 'mechanically-certified');
});

test('object continuity preserves a gap but a recovery transition closes it', () => {
  const program = compileMarkdown('Alice left the phone.\n\nLater she used it.\n', { language: 'en' });
  const anchors = program.blocks.filter((block) => block.kind === 'paragraph').map((block) => block.anchor.id);
  const events = [
    { id: 'event:leave', type: 'narrative.object-event@1', status: 'proposed', scope: 'view:whole', anchors: [anchors[0]], payload: { objectId: 'phone:alice', action: 'leave', order: 1 } },
    { id: 'event:use', type: 'narrative.object-event@1', status: 'proposed', scope: 'view:whole', anchors: [anchors[1]], payload: { objectId: 'phone:alice', action: 'use', order: 3 } }
  ];
  program.observations.push(...events);
  const rules = [{ id: 'CONT-001', verdict: 'continuity-gap' }];
  const candidates = continuityCandidates({ events, rules }, { program });
  assert.equal(candidates.length, 1);
  const verified = continuityVerifier({ candidates }, { program });
  assert.equal(verified[0].verifierResult.status, 'accept');
  assert.equal(verified[0].guarantee, 'evidence-certified');

  const recovery = { id: 'event:retrieve', type: 'narrative.object-event@1', status: 'proposed', scope: 'view:whole', anchors: [anchors[1]], payload: { objectId: 'phone:alice', action: 'retrieve', order: 2 } };
  program.observations.push(recovery);
  const forgedAfterRecovery = continuityVerifier({ candidates }, { program });
  assert.equal(forgedAfterRecovery[0].verifierResult.status, 'reject');
  const closed = continuityCandidates({ events: [events[0], recovery, events[1]], rules }, { program });
  assert.equal(closed.length, 0);
});

test('exact match verifier independently enforces whole-word scope', () => {
  const program = compileMarkdown('Facts remain.', { language: 'en' });
  const observation = program.observations.find((item) => item.type === 'document.paragraph@1');
  const parentAnchor = program.anchors[observation.anchors[0]];
  const registries = createStandardRegistries();
  const verifier = registries.verifiers.get('text.exact-match@1');
  const [result] = verifier.execute({
    candidates: [{
      kind: 'FindingCandidate', rule: 'ED-WORD', verdict: 'violation', severity: 'warning',
      subject: observation.id, scope: observation.scope,
      mainAnchor: {
        ...parentAnchor,
        range: { unit: 'unicode-code-point', start: parentAnchor.range.start, end: parentAnchor.range.start + 4 },
        quote: 'Fact'
      },
      supportAnchors: observation.anchors,
      witness: {
        kind: 'ExactTextMatch', observationId: observation.id, term: 'fapt',
        caseSensitive: false, wholeWord: true, locale: 'en',
        scopeKinds: ['document.paragraph@1'], excludedPrefixes: []
      }
    }]
  }, { program });
  assert.equal(result.verifierResult.status, 'reject');
});
