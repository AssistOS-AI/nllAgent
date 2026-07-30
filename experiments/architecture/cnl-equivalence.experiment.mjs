import assert from 'node:assert/strict';

const criticalSlots = Object.freeze([
  'kind', 'actor', 'modality', 'action', 'object', 'negated', 'deadline', 'condition', 'exception', 'authority'
]);

function equivalent(left, right) {
  return criticalSlots.every((slot) => (left[slot] ?? null) === (right[slot] ?? null));
}

const frame = Object.freeze({
  kind: 'obligation', actor: 'controller', modality: 'MUST', action: 'erase',
  object: 'personal-data', negated: false, deadline: 'five-years-after-collection',
  condition: null, exception: 'documented-legal-duty', authority: 'retention-rule'
});

const lexicalVariant = { ...frame, surface: 'The controller is required to erase the personal data.' };
const lostException = { ...frame, exception: null };
const weakenedModality = { ...frame, modality: 'MAY' };

assert.equal(equivalent(frame, lexicalVariant), true);
assert.equal(equivalent(frame, lostException), false);
assert.equal(equivalent(frame, weakenedModality), false);

export default Object.freeze({
  experiment: 'cnl-frame-equivalence',
  acceptedEquivalentCases: 1,
  rejectedCriticalChanges: 2,
  decision: 'Verified CNL uses exact normalized critical-slot equivalence; lexical variation is permitted only when parsing reconstructs the same frame.'
});
