import assert from 'node:assert/strict';

const dimensions = 18;
const eagerWorldCount = 2 ** dimensions;
const relevantDimensions = new Set([0, 3, 7, 11]);

function* relevantWorlds(index = 0, world = new Map()) {
  if (index === dimensions) {
    yield new Map(world);
    return;
  }
  if (!relevantDimensions.has(index)) {
    yield* relevantWorlds(index + 1, world);
    return;
  }
  for (const value of [false, true]) {
    world.set(index, value);
    const incompatible = world.get(0) === true && world.get(3) === true;
    if (!incompatible) yield* relevantWorlds(index + 1, world);
  }
  world.delete(index);
}

const evaluatedWorlds = [...relevantWorlds()];
assert.equal(eagerWorldCount, 262144);
assert.equal(evaluatedWorlds.length, 12);

export default Object.freeze({
  experiment: 'alternative-world-expansion',
  eagerWorldCount,
  demandRelevantWorldCount: evaluatedWorlds.length,
  avoidedMaterializations: eagerWorldCount - evaluatedWorlds.length,
  decision: 'Store alternatives as shared, factorized contexts; enumerate lazily by demand and prune only proven incompatibilities.'
});
