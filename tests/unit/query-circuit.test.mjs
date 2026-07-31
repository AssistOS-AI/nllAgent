import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONFLICT, FALSE, TRUE, UNKNOWN, anyValue, circuit, columns, decisionTable, derive, emit, include,
  match, notExists, requireCoverage, result, row, rule, then, values, when, where
} from '../../src/circuit/index.mjs';
import { claim, coverage, explicit, groundedAt, longTextProgram, semanticUnit, source, span } from '../../src/longtext/index.mjs';
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
  const parts = [semanticUnit('left', claim(
    Leave(objectRole(phone)), explicit(), groundedAt(span(document, 0, document.length))
  ))];
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
  assert.equal(circuit('retention@1', include(table)).decisionTables[0], table);
});

test('rules preserve four-valued predicate state and never emit from an undecidable path', async () => {
  const O = ontology('test.four-valued-rule@1');
  const label = O.role('label', from(O.Entity), to(O.Value), exactlyOne());
  const Item = O.entity('Item', requires(label));
  const resultRole = O.role('resultRole', from(O.Proposition), to(Item), exactlyOne());
  const Finding = O.derivedConcept('Finding', requires(resultRole));
  const item = Item(label('candidate'));
  const store = new SemanticStore();
  store.publish(longTextProgram('four-values', source('four-values.md', 'candidate'), semanticUnit('item', item)));
  const candidate = variable(Item, 'candidate');
  const undecidable = rule('undecidable', when(
    match(Item(label('candidate'))),
    where(() => UNKNOWN, 'unknown-condition')
  ), then(derive(Finding(resultRole(candidate)))));
  const conflicted = rule('conflicted', when(
    match(Item(label('candidate'))),
    where(() => CONFLICT, 'conflicting-condition')
  ), then(derive(Finding(resultRole(candidate)))));
  const execution = await executeCircuit(circuit('four-values@1', include(undecidable, conflicted)), store);
  assert.equal(execution.ruleResults[0].state, UNKNOWN);
  assert.equal(execution.ruleResults[1].state, CONFLICT);
  assert.equal(store.instancesOf(Finding).length, 0);
});
