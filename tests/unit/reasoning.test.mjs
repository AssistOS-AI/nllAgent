import assert from 'node:assert/strict';
import test from 'node:test';
import { fixedPoint, groundedArguments, verifyFixedPoint, verifyGroundedArguments } from '../../src/runtime/logic-operators.mjs';
import {
  convertQuantity, deadlineEvaluation, intervalConflicts, shortestPath, timeline,
  verifyDeadlines, verifyIntervalConflicts, verifyQuantity, verifyTimeline
} from '../../src/runtime/reasoning-operators.mjs';

test('fixed point derives transitive facts with provenance', () => {
  const result = fixedPoint({
    facts: [{ predicate: 'parent', args: ['Alice', 'Bob'] }, { predicate: 'parent', args: ['Bob', 'Carol'] }],
    rules: [
      { id: 'ancestor-base', when: [{ predicate: 'parent', args: ['?x', '?y'] }], then: { predicate: 'ancestor', args: ['?x', '?y'] } },
      { id: 'ancestor-step', when: [{ predicate: 'parent', args: ['?x', '?y'] }, { predicate: 'ancestor', args: ['?y', '?z'] }], then: { predicate: 'ancestor', args: ['?x', '?z'] } }
    ]
  });
  assert.ok(result.facts.some((fact) => fact.predicate === 'ancestor' && fact.args.join('/') === 'Alice/Carol'));
  assert.equal(result.reachedFixedPoint, true);
});

test('specialized deterministic operators return checkable witnesses', () => {
  assert.deepEqual(shortestPath({
    source: 'a', target: 'c', edges: [
      { from: 'a', to: 'c', weight: 9 }, { from: 'a', to: 'b', weight: 2 }, { from: 'b', to: 'c', weight: 3 }
    ]
  }).path, ['a', 'b', 'c']);
  assert.equal(convertQuantity({ value: 1.2, from: 'bar', to: 'kPa' }).value, 120);
  assert.equal(intervalConflicts({ records: [
    { subject: 'tank', property: 'temperature', min: 0, max: 10 },
    { subject: 'tank', property: 'temperature', min: 20, max: 30 }
  ] }).length, 1);
  assert.equal(deadlineEvaluation({
    policy: { durationMs: 3600000 },
    cases: [{ triggerAt: '2026-01-01T00:00:00Z', actionAt: '2026-01-01T00:30:00Z' }]
  })[0].verdict, 'compliant');
  assert.deepEqual(timeline({
    initial: [{ subject: 'phone', property: 'location', value: 'car' }],
    events: [{ id: 'retrieve', order: 1, subject: 'phone', effects: [{ property: 'location', value: 'room' }] }]
  }).state, [{ subject: 'phone', property: 'location', value: 'room' }]);
  assert.deepEqual(groundedArguments({
    arguments: [{ id: 'a' }, { id: 'b' }], attacks: [{ from: 'a', to: 'b' }]
  }).accepted, ['a']);
});

test('standard reasoning results have independent replay verifiers', () => {
  const quantity = convertQuantity({ value: 1.2, from: 'bar', to: 'kPa' });
  assert.equal(verifyQuantity({ candidates: [quantity] })[0].verifierResult.status, 'accept');

  const conflicts = intervalConflicts({ records: [
    { subject: 'tank', property: 'temperature', scope: 'operation', min: 0, max: 10 },
    { subject: 'tank', property: 'temperature', scope: 'operation', min: 20, max: 30 }
  ] });
  assert.equal(verifyIntervalConflicts({ candidates: conflicts })[0].verifierResult.status, 'accept');

  const deadlines = deadlineEvaluation({
    policy: { durationMs: 3600000, outageMode: 'pause' },
    cases: [{ triggerAt: '2026-01-01T00:00:00Z', actionAt: '2026-01-01T01:15:00Z', coverage: 'closed-world', outages: [{ from: '2026-01-01T00:15:00Z', to: '2026-01-01T00:45:00Z' }] }]
  });
  assert.equal(verifyDeadlines({ candidates: deadlines })[0].verifierResult.status, 'accept');

  const initial = [{ subject: 'door', property: 'state', value: 'locked' }];
  const events = [{ id: 'unlock', order: 1, subject: 'door', effects: [{ property: 'state', value: 'open' }] }];
  const state = timeline({ initial, events });
  assert.equal(verifyTimeline({ candidates: [state], initial, events })[0].verifierResult.status, 'accept');

  const closure = fixedPoint({
    facts: [{ predicate: 'edge', args: ['a', 'b'] }],
    rules: [{ id: 'reachable', when: [{ predicate: 'edge', args: ['?x', '?y'] }], then: { predicate: 'reachable', args: ['?x', '?y'] } }]
  });
  assert.equal(verifyFixedPoint({ candidates: [closure] })[0].verifierResult.status, 'accept');

  const argument = groundedArguments({ arguments: [{ id: 'a' }, { id: 'b' }], attacks: [{ from: 'a', to: 'b' }] });
  assert.equal(verifyGroundedArguments({ candidates: [argument] })[0].verifierResult.status, 'accept');
});
