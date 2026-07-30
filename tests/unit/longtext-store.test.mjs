import assert from 'node:assert/strict';
import test from 'node:test';
import {
  claim, confidence, coverage, explicit, groundedAt, identityCandidate, longTextProgram,
  mention, semanticUnit, source, span
} from '../../src/longtext/index.mjs';
import { exactlyOne, from, identifiedAs, ontology, requires, to } from '../../src/ontology/index.mjs';
import { SemanticStore } from '../../src/store/index.mjs';

test('LongTextJS uses exact Unicode spans, explicit mentions, and revisable identities', () => {
  const O = ontology('test.people@1');
  const named = O.role('named', from(O.Entity), to(O.Value), exactlyOne());
  const Person = O.entity('Person', requires(named));
  const sourceValue = source('unicode.md', 'Ș🙂 Ana arrived.');
  const anaSpan = span(sourceValue, 3, 6);
  assert.equal(anaSpan.excerpt, 'Ana');
  const ana = Person(identifiedAs('person:ana'), named('Ana'));
  const anaMention = mention(anaSpan, 'Ana');
  const program = longTextProgram(
    'people', sourceValue,
    semanticUnit('identity', ana, anaMention, identityCandidate(anaMention, ana, confidence(0.9)))
  );
  const store = new SemanticStore();
  store.publish(program);
  assert.equal(store.mentions.length, 1);
  assert.equal(store.identityCandidates(anaMention)[0].entity.identity, 'person:ana');
});

test('claims, coverage, and source evidence remain separate in one store', () => {
  const O = ontology('test.events@1');
  const value = O.role('value', from(O.State), to(O.Value), exactlyOne());
  const Flag = O.state('Flag', requires(value));
  const sourceValue = source('flags.md', 'active');
  const anchor = span(sourceValue, 0, 6);
  const flag = Flag(value('active'));
  const program = longTextProgram(
    'flags', sourceValue,
    semanticUnit('flag', claim(flag, explicit(), groundedAt(anchor))),
    coverage(Flag, sourceValue, 'closed')
  );
  const store = new SemanticStore();
  store.publish(program);
  assert.equal(store.instancesOf(Flag).length, 1);
  assert.equal(store.evidenceFor(flag)[0], anchor);
  assert.equal(store.coverageFor(Flag, sourceValue), 'closed');
});
