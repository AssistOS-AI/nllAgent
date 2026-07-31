import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SAT, UNKNOWN, UNSAT, VALUE, ConstraintKernel, booleanClause, booleanLiteral, booleanVariable,
  constraintConstant, constraintVariable, differenceAtMost, equal, notEqual, numberVariable,
  unsupportedConstraint
} from '../../src/engines/index.mjs';

test('ConstraintKernel composes boolean clauses, equality, and difference bounds into a model', () => {
  const enabled = booleanVariable('enabled');
  const reviewed = booleanVariable('reviewed');
  const actor = constraintVariable('actor', VALUE);
  const owner = constraintVariable('owner', VALUE);
  const start = numberVariable('start');
  const end = numberVariable('end');
  const result = new ConstraintKernel().solve([
    booleanClause(booleanLiteral(enabled), booleanLiteral(reviewed)),
    booleanLiteral(enabled, false),
    equal(actor, owner),
    equal(owner, constraintConstant('controller')),
    notEqual(actor, constraintConstant('processor')),
    equal(start, 0),
    differenceAtMost(end, start, 5),
    differenceAtMost(start, end, -1)
  ]);

  assert.equal(result.status, SAT);
  assert.equal(result.valueOf(enabled), false);
  assert.equal(result.valueOf(reviewed), true);
  assert.equal(result.valueOf(actor), 'controller');
  assert.equal(result.valueOf(owner), 'controller');
  assert.equal(result.valueOf(start), 0);
  assert.ok(result.valueOf(end) - result.valueOf(start) <= 5);
  assert.ok(result.valueOf(end) - result.valueOf(start) >= 1);
  assert.ok(result.trace.some((step) => step.phase === 'difference'));
  assert.ok(Object.isFrozen(result));
});

test('ConstraintKernel returns replayable conflicts for each exact theory fragment', () => {
  const kernel = new ConstraintKernel();
  const flag = booleanVariable('flag');
  const boolConflict = kernel.solve([booleanLiteral(flag), booleanLiteral(flag, false)]);
  assert.equal(boolConflict.status, UNSAT);
  assert.match(boolConflict.conflict, /Boolean/u);

  const left = constraintVariable('left');
  const right = constraintVariable('right');
  const equalityConflict = kernel.solve([equal(left, right), notEqual(left, right)]);
  assert.equal(equalityConflict.status, UNSAT);
  assert.ok(equalityConflict.trace.some((step) => step.action === 'conflict'));

  const x = numberVariable('x');
  const y = numberVariable('y');
  const differenceConflict = kernel.solve([
    differenceAtMost(x, y, 2),
    differenceAtMost(y, x, -3)
  ]);
  assert.equal(differenceConflict.status, UNSAT);
  assert.match(differenceConflict.conflict, /cycle/u);
});

test('the finite boolean fragment backtracks deterministically after a failed branch', () => {
  const left = booleanVariable('left');
  const right = booleanVariable('right');
  const result = new ConstraintKernel().solve([
    booleanClause(booleanLiteral(left), booleanLiteral(right)),
    booleanClause(booleanLiteral(left, false), booleanLiteral(right)),
    booleanClause(booleanLiteral(left), booleanLiteral(right, false))
  ]);
  assert.equal(result.status, SAT);
  assert.equal(result.valueOf(left), true);
  assert.equal(result.valueOf(right), true);
  assert.deepEqual(result.trace.filter((step) => step.action === 'branch').map((step) => step.value),
    [false, true]);
});

test('unsupported atoms stay UNKNOWN unless the supported conjunction is already UNSAT', () => {
  const kernel = new ConstraintKernel();
  const flag = booleanVariable('flag');
  const unknown = kernel.solve([booleanLiteral(flag), unsupportedConstraint('nonlinear multiplication')]);
  assert.equal(unknown.status, UNKNOWN);
  assert.deepEqual(unknown.unsupportedAtoms.map((atom) => atom.description), ['nonlinear multiplication']);

  const dominated = kernel.solve([
    booleanLiteral(flag),
    booleanLiteral(flag, false),
    unsupportedConstraint('nonlinear multiplication')
  ]);
  assert.equal(dominated.status, UNSAT);
});

test('constraint constructors reject cross-sort and non-finite bounds', () => {
  assert.throws(() => equal(numberVariable('x'), constraintVariable('value')), {
    code: 'constraint-sort-mismatch'
  });
  assert.throws(() => differenceAtMost(numberVariable('x'), numberVariable('y'), Infinity), {
    code: 'invalid-difference-bound'
  });
});
