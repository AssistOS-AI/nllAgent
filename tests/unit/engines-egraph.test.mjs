import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EGRAPH_LIMIT_REACHED, SATURATED, EGraphLite, eLeaf, eOperator, ePattern,
  ePatternLiteral, eRewrite, eTerm, eVariable
} from '../../src/engines/index.mjs';

test('EGraphLite saturates typed rewrites, rebuilds congruence, and extracts the cheapest form', () => {
  const add = eOperator('add', 'Number', 'Number', 'Number');
  const boxed = eOperator('boxed', 'Box', 'Number');
  const zero = eLeaf('Number', 0);
  const one = eLeaf('Number', 1);
  const input = eTerm(add, eTerm(add, one, zero), zero);
  const value = eVariable('value', 'Number');
  const removeRightZero = eRewrite('add-right-zero',
    ePattern(add, value, ePatternLiteral('Number', 0)), value);
  const graph = new EGraphLite();
  const inputClass = graph.add(input);
  const oneClass = graph.add(one);
  const boxedInput = graph.add(eTerm(boxed, input));
  const boxedOne = graph.add(eTerm(boxed, one));
  const saturation = graph.saturate([removeRightZero]);

  assert.equal(saturation.status, SATURATED);
  assert.equal(graph.equivalent(inputClass, oneClass), true);
  assert.equal(graph.equivalent(boxedInput, boxedOne), true);
  assert.equal(saturation.applications, 2);
  const extraction = graph.extract(inputClass, (node) => node.operator?.name === 'add' ? 3 : 1);
  assert.equal(extraction.cost, 1);
  assert.equal(extraction.term.leaf, true);
  assert.equal(extraction.term.value, 1);
});

test('EGraphLite reports a saturation budget boundary without claiming closure', () => {
  const neg = eOperator('neg', 'Number', 'Number');
  const x = eVariable('x', 'Number');
  const eliminateDoubleNegation = eRewrite('double-negation',
    ePattern(neg, ePattern(neg, x)), x);
  const graph = new EGraphLite();
  graph.add(eTerm(neg, eTerm(neg, eLeaf('Number', 2))));
  const result = graph.saturate([eliminateDoubleNegation], new Map([['maxIterations', 1]]));
  assert.equal(result.status, EGRAPH_LIMIT_REACHED);
  assert.equal(result.applications, 1);
});

test('typed terms and rewrite theories reject type-changing constructions', () => {
  const not = eOperator('not', 'Boolean', 'Boolean');
  const wrapNumber = eOperator('wrap-number', 'Number', 'Number');
  assert.throws(() => eTerm(not, eLeaf('Number', 1)), { code: 'egraph-type-mismatch' });

  const bool = eVariable('bool', 'Boolean');
  const number = eVariable('number', 'Number');
  assert.throws(() => eRewrite('bad-rewrite', ePattern(not, bool), ePattern(wrapNumber, number)), {
    code: 'egraph-rewrite-type-change'
  });
});
