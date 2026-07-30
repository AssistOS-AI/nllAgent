import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FALSE, TRUE, UNKNOWN, anyValue, circuit, columns, decisionTable, derive, emit, include,
  match, notExists, requireCoverage, result, row, rule, then, values, when
} from '../../src/circuit/index.mjs';
import { claim, coverage, explicit, longTextProgram, semanticUnit, source } from '../../src/longtext/index.mjs';
import { exactlyOne, from, identifiedAs, ontology, requires, to, variable } from '../../src/ontology/index.mjs';
import { executeCircuit } from '../../src/runtime/index.mjs';
import { SemanticStore } from '../../src/store/index.mjs';

function continuityFixture(closed) {
  const O = ontology('test.continuity@1');
  const named = O.role('named', from(O.Entity), to(O.Value), exactlyOne());
  const ObjectEntity = O.entity('ObjectEntity', requires(named));
  const objectRole = O.role('objectRole', from(O.Event), to(ObjectEntity), exactlyOne());
  const gapObject = O.role('gapObject', from(O.Proposition), to(ObjectEntity), exactlyOne());
  const Leave = O.event('Leave', requires(objectRole));
  const Retrieve = O.event('Retrieve', requires(objectRole));
  const Gap = O.derivedConcept('Gap', requires(gapObject));
  const phone = ObjectEntity(identifiedAs('object:phone'), named('phone'));
  const document = source('scene.md', 'The phone was left.');
  const parts = [semanticUnit('left', claim(Leave(objectRole(phone)), explicit()))];
  if (closed) parts.push(coverage(Retrieve, document, 'closed'));
  const program = longTextProgram('scene', document, ...parts);
  const object = variable(ObjectEntity, 'object');
  const check = rule(
    'missing-retrieval',
    when(
      match(Leave(objectRole(object))),
      notExists(match(Retrieve(objectRole(object))), document, requireCoverage(Retrieve))
    ),
    then(emit(Gap(gapObject(object))))
  );
  return { program, circuit: circuit('continuity@1', include(check)), Gap };
}

test('coverage-aware absence is unknown in an open scope and true in a closed scope', async () => {
  for (const [closed, expected, outputCount] of [[false, UNKNOWN, 0], [true, TRUE, 1]]) {
    const fixture = continuityFixture(closed);
    const store = new SemanticStore();
    store.publish(fixture.program);
    const execution = await executeCircuit(fixture.circuit, store);
    assert.equal(execution.ruleResults[0].state, expected);
    assert.equal(store.outputs.length, outputCount);
  }
});

test('decision tables preserve unknown and report conflicting rows explicitly', () => {
  const table = decisionTable(
    'retention', columns('exceeds', 'exception'),
    row(values(TRUE, FALSE), result('VIOLATED')),
    row(values(TRUE, TRUE), result('ACCEPTED_EXCEPTION')),
    row(values(FALSE, anyValue()), result('SATISFIED')),
    row(values(UNKNOWN, anyValue()), result('UNKNOWN'))
  );
  assert.equal(table.evaluate([TRUE, FALSE]), 'VIOLATED');
  assert.equal(table.evaluate([UNKNOWN, FALSE]), 'UNKNOWN');
});
