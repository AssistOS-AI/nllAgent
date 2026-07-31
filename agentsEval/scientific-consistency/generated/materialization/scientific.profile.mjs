import {
  alternativeRequirement,
  architectureRef,
  conceptRef,
  groundingRequirement,
  materializationProfile,
  observe,
  requireComplete,
  resolveRequirement,
  roleRef
} from '../../../../src/architecture/index.mjs';

const claim = conceptRef('eval.scientific-report@1:QuantitativeClaim');
const resultScope = architectureRef('scope', 'scientific-primary-response-support');

export { resultScope };

export default materializationProfile('eval.scientific-report.profile@1')
  .observations(observe(
    claim,
    ...[
      'claimId', 'claimSection', 'claimKind', 'metric', 'estimand', 'baseline', 'population', 'aggregation',
      'horizon', 'estimate', 'estimateUnit', 'precision', 'isReference', 'sourceAnchor'
    ].map((name) => roleRef(`eval.scientific-report@1:${name}`))
  ))
  .resolve(
    resolveRequirement('cross-section-claim-identity'),
    resolveRequirement('metric-and-unit-normalization')
  )
  .coverage(requireComplete(claim, resultScope))
  .groundEveryClaimWith(groundingRequirement('exact-unicode-source-span'))
  .preserveAlternatives(
    alternativeRequirement('metric-reading'),
    alternativeRequirement('population-reading'),
    alternativeRequirement('estimand-reading')
  )
  .seal();
