import { circuit, include, reads, stage, writes } from '../circuit/api.mjs';
import {
  Finding, StateAssertion, assurance, evidence, findingType, message, polarity, predicate,
  severity, subject
} from '../../ontologies/core/index.mjs';

function sameContext(left, right) {
  return left.value(subject) === right.value(subject)
    && left.value(predicate) === right.value(predicate)
    && (left.value('during') ?? null) === (right.value('during') ?? null);
}

const detectExplicitStateConflict = stage(
  'foundation.detect-explicit-state-conflict',
  async (ctx) => {
    const assertions = ctx.store.instancesOf(StateAssertion);
    for (let leftIndex = 0; leftIndex < assertions.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < assertions.length; rightIndex += 1) {
        const left = assertions[leftIndex];
        const right = assertions[rightIndex];
        if (!sameContext(left, right) || left.value(polarity) === right.value(polarity)) continue;
        const anchors = [...ctx.store.evidenceFor(left), ...ctx.store.evidenceFor(right)];
        const verified = await ctx.verify('foundation.state-conflict', () => sameContext(left, right));
        if (!verified) continue;
        ctx.emit(Finding(
          findingType('potential-state-conflict'),
          message(`The source both affirms and denies ${left.value(predicate)} for ${left.value(subject)}.`),
          severity('warning'),
          ...anchors.map((anchor) => evidence(anchor)),
          assurance('mechanical')
        ));
      }
    }
  },
  reads(StateAssertion),
  writes(Finding)
);

const foundationCircuit = circuit(
  'foundation-core@1',
  include(detectExplicitStateConflict)
);

export { detectExplicitStateConflict, foundationCircuit };
export default foundationCircuit;
