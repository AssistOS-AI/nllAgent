import assert from 'node:assert/strict';

function runLocalBehavior(behavior, value) {
  const local = Object.freeze({ value });
  return behavior(local);
}

const normalizeUnit = ({ value }) => value.trim().toLowerCase();
assert.equal(runLocalBehavior(normalizeUnit, ' Years '), 'years');

const hiddenContextualRule = (local) => local.store.query('Exception') ? 'allowed' : 'forbidden';
assert.throws(() => runLocalBehavior(hiddenContextualRule, 'retain'), TypeError);

export default Object.freeze({
  experiment: 'ontology-behavior-boundary',
  acceptedLocalBehaviors: 1,
  rejectedContextDependentBehaviors: 1,
  decision: 'Ontology behaviors are unary, local, deterministic operations. Store, context, evidence, priority, and exception access belongs to CircuitJS.'
});
