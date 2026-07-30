import assert from 'node:assert/strict';
import test from 'node:test';
import {
  Pattern, Term, exactlyOne, from, identifiedAs, ontology, requires, to, variable
} from '../../src/ontology/index.mjs';

function fixture() {
  const O = ontology('test.facility@1');
  const named = O.role('named', from(O.Entity), to(O.Value), exactlyOne());
  const Person = O.entity('Person', requires(named));
  const Door = O.entity('Door', requires(named));
  const agent = O.role('agent', from(O.Event), to(Person), exactlyOne());
  const Open = O.event('Open', requires(agent));
  return { O, named, Person, Door, agent, Open };
}

test('OntologyJS constructors return opaque typed terms and typed patterns', () => {
  const { O, named, Person, agent, Open } = fixture();
  const ana = Person(identifiedAs('person:ana'), named('Ana'));
  const opening = Open(agent(ana));
  const pattern = Open(agent(variable(Person, 'person')));
  assert.ok(ana instanceof Term);
  assert.ok(opening instanceof Term);
  assert.ok(pattern instanceof Pattern);
  assert.equal(Object.isFrozen(opening), true);
  assert.equal(O.seal().concept('Person').name, 'Person');
});

test('role types, cardinalities, and the behavior boundary fail at construction time', () => {
  const { O, named, Person, Door, agent, Open } = fixture();
  const door = Door(identifiedAs('door:north'), named('north'));
  assert.throws(() => Open(agent(door)), { code: 'role-type-mismatch' });
  assert.throws(() => Person(), { code: 'role-cardinality' });
  assert.throws(() => O.behavior(Person, 'exception-policy', () => true), { code: 'hidden-rule-behavior' });
  O.behavior(Person, 'normalize', ({ value }) => value.trim());
});

test('hybrid identity keeps source entities explicit and deduplicates derived terms structurally', () => {
  const { named, Person, agent, Open } = fixture();
  const first = Person(identifiedAs('person:ana-1'), named('Ana'));
  const second = Person(identifiedAs('person:ana-2'), named('Ana'));
  assert.notEqual(first.identity, second.identity);
  assert.equal(Open(agent(first)).identity, Open(agent(first)).identity);
});

test('structural identity includes qualified concept and role identities', () => {
  const left = ontology('test.left@1');
  const leftValue = left.role('value', from(left.State), to(left.Value), exactlyOne());
  const LeftState = left.state('State', requires(leftValue));
  left.seal();

  const right = ontology('test.right@1');
  const rightValue = right.role('value', from(right.State), to(right.Value), exactlyOne());
  const RightState = right.state('State', requires(rightValue));
  right.seal();

  assert.notEqual(LeftState(leftValue('same')).identity, RightState(rightValue('same')).identity);
});

test('role source and every repeated target are validated', () => {
  const { O, named, Person, agent } = fixture();
  const Related = O.relation('Related');
  assert.throws(() => Related(agent(Person(named('Ana')))), { code: 'role-source-mismatch' });
});
