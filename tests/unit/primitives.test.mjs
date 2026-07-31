import assert from 'node:assert/strict';
import test from 'node:test';

import { ontology } from '../../src/ontology/api.mjs';
import {
  AbstractTop, PrimitiveRegistry, UnsupportedSemantic, deterministic, input, output, primitive
} from '../../src/primitives/index.mjs';

test('primitive descriptors require concrete semantics and expose conservative defaults', async () => {
  const O = ontology('test.primitives@1');
  const Quantity = O.valueType('Quantity');
  O.seal();
  const greaterThan = primitive('quantity.greater-than@1')
    .input(input('left', Quantity))
    .input(input('right', Quantity))
    .output(output('result', O.Value))
    .concrete((_context, [left, right]) => left > right)
    .law(deterministic())
    .seal();

  assert.equal(await greaterThan.evaluate('concrete', null, [7, 5]), true);
  assert.ok(await greaterThan.evaluate('abstract', null, []) instanceof AbstractTop);
  assert.ok(await greaterThan.evaluate('symbolic', null, []) instanceof UnsupportedSemantic);
  assert.throws(() => primitive('invalid@1').seal(), /concrete semantics/u);
});

test('primitive registry rejects duplicate semantic identities', () => {
  const O = ontology('test.primitive-registry@1');
  const Value = O.valueType('Scalar');
  O.seal();
  const descriptor = primitive('scalar.identity@1')
    .input(input('value', Value)).output(output('value', Value))
    .concrete((_context, [value]) => value).seal();
  const registry = new PrimitiveRegistry().register(descriptor);
  assert.equal(registry.get(descriptor.id), descriptor);
  assert.throws(() => registry.register(descriptor), /scalar.identity@1/u);
});
