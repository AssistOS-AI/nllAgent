import {
  allowPartial, alternativeRequirement, architectureRef, conceptRef, groundingRequirement,
  materializationProfile, observe, requireComplete, resolveRequirement, roleRef
} from '../../../src/architecture/index.mjs';

const useInterval = architectureRef('scope', 'per-use-leave-to-use-interval');

export default materializationProfile('narrative.continuity.materialization@1')
  .observations(
    observe(
      conceptRef('narrative.continuity@1:Leave'),
      roleRef('narrative.continuity@1:actor'), roleRef('narrative.continuity@1:object'),
      roleRef('narrative.continuity@1:atPlace'), roleRef('narrative.continuity@1:eventAnchor')
    ),
    observe(
      conceptRef('narrative.continuity@1:Retrieve'),
      roleRef('narrative.continuity@1:actor'), roleRef('narrative.continuity@1:object'),
      roleRef('narrative.continuity@1:atPlace'), roleRef('narrative.continuity@1:eventAnchor')
    ),
    observe(
      conceptRef('narrative.continuity@1:Use'),
      roleRef('narrative.continuity@1:actor'), roleRef('narrative.continuity@1:object'),
      roleRef('narrative.continuity@1:actorReferenceKey'), roleRef('narrative.continuity@1:referenceKey'),
      roleRef('narrative.continuity@1:atPlace'),
      roleRef('narrative.continuity@1:eventAnchor')
    ),
    observe(
      conceptRef('narrative.continuity@1:DirectBefore'),
      roleRef('narrative.continuity@1:earlier'), roleRef('narrative.continuity@1:later')
    ),
    observe(
      conceptRef('narrative.continuity@1:CoverageNotice'),
      roleRef('narrative.continuity@1:intervalScope'), roleRef('narrative.continuity@1:coverageState'),
      roleRef('narrative.continuity@1:eventAnchor')
    )
  )
  .resolve(
    resolveRequirement('explicit-entity-identity'),
    resolveRequirement('mention-identity-candidates'),
    resolveRequirement('cross-section-temporal-order')
  )
  .coverage(
    requireComplete(conceptRef('narrative.continuity@1:Retrieve'), useInterval),
    allowPartial(conceptRef('narrative.continuity@1:Retrieve'), useInterval)
  )
  .groundEveryClaimWith(groundingRequirement('exact-code-point-source-span'))
  .preserveAlternatives(
    alternativeRequirement('actor-coreference'), alternativeRequirement('object-coreference')
  )
  .seal();
