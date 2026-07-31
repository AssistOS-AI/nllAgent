import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RelationEngine, relation, relationAtom, relationFact, relationRule, relationValue, relationVariable
} from '../../src/engines/index.mjs';

function reachabilityFixture(size = 4) {
  const Edge = relation('Edge', 'Node', 'Node');
  const Reach = relation('Reach', 'Node', 'Node');
  const nodes = Array.from({ length: size }, (_, index) => relationValue('Node', `n${index}`));
  const x = relationVariable('x', 'Node');
  const y = relationVariable('y', 'Node');
  const z = relationVariable('z', 'Node');
  const facts = nodes.slice(1).map((node, index) => relationFact(Edge, nodes[index], node));
  const rules = [
    relationRule('edge-is-reachable', relationAtom(Reach, x, y), relationAtom(Edge, x, y)),
    relationRule('transitive-reach', relationAtom(Reach, x, z),
      relationAtom(Reach, x, y), relationAtom(Edge, y, z))
  ];
  return { Edge, Reach, nodes, facts, rules };
}

test('RelationEngine computes a deterministic semi-naive least fixed point', () => {
  const fixture = reachabilityFixture();
  const engine = new RelationEngine();
  const result = engine.evaluate(fixture.facts, fixture.rules);

  assert.equal(result.tuples(fixture.Reach).length, 6);
  assert.equal(result.has(fixture.Reach, fixture.nodes[0], fixture.nodes[3]), true);
  assert.equal(result.has(fixture.Reach, fixture.nodes[3], fixture.nodes[0]), false);
  assert.equal(result.trace.at(-1).tuple.value(0), 'n0');
  assert.equal(result.trace.at(-1).tuple.value(1), 'n3');
  assert.ok(result.statistics.rounds >= 3);
  assert.ok(result.statistics.ruleEvaluations > 0);

  const replay = engine.evaluate([...fixture.facts].reverse(), fixture.rules);
  assert.deepEqual(
    replay.trace.map((step) => `${step.round}:${step.rule}:${step.tuple.key}`),
    result.trace.map((step) => `${step.round}:${step.rule}:${step.tuple.key}`)
  );
});

test('RelationEngine deduplicates cycles while retaining least-fixed-point semantics', () => {
  const Node = 'Node';
  const Link = relation('Link', Node, Node);
  const Reach = relation('CyclicReach', Node, Node);
  const a = relationValue(Node, 'a');
  const b = relationValue(Node, 'b');
  const x = relationVariable('x', Node);
  const y = relationVariable('y', Node);
  const z = relationVariable('z', Node);
  const rules = [
    relationRule('seed', relationAtom(Reach, x, y), relationAtom(Link, x, y)),
    relationRule('close', relationAtom(Reach, x, z), relationAtom(Reach, x, y), relationAtom(Link, y, z))
  ];
  const result = new RelationEngine().evaluate([
    relationFact(Link, a, b), relationFact(Link, b, a), relationFact(Link, a, b)
  ], rules);
  assert.equal(result.tuples(Reach).length, 4);
  assert.equal(new Set(result.tuples(Reach).map((tuple) => tuple.key)).size, 4);
});

test('typed relations reject sort drift and unsafe heads', () => {
  const Edge = relation('TypedEdge', 'Node', 'Node');
  const Reach = relation('TypedReach', 'Node', 'Node');
  const node = relationValue('Node', 'a');
  const place = relationValue('Place', 'room');
  assert.throws(() => relationFact(Edge, node, place), { code: 'relation-sort-mismatch' });

  const x = relationVariable('x', 'Node');
  const unbound = relationVariable('unbound', 'Node');
  assert.throws(() => relationRule('unsafe', relationAtom(Reach, x, unbound), relationAtom(Edge, x, node)), {
    code: 'unsafe-relation-rule'
  });
});
