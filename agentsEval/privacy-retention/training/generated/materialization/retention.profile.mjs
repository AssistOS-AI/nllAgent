import {
  alternativeRequirement, architectureRef, conceptRef, groundingRequirement,
  materializationProfile, observe, requireComplete, resolveRequirement, roleRef
} from '../../../../../src/architecture/index.mjs';

const namespace = 'privacy.retention.eval@1';
const concept = (name) => conceptRef(`${namespace}:${name}`);
const role = (name) => roleRef(`${namespace}:${name}`);

export default materializationProfile('privacy.retention.evaluation.profile@1')
  .observations(
    observe(
      concept('RetentionDeclaration'), role('recordId'), role('retentionActor'),
      role('dataCategory'), role('durationYears'), role('assessmentScope'), role('sourceAnchor')
    ),
    observe(
      concept('ExceptionEvidence'), role('exceptionRecordId'), role('exceptionStatus'),
      role('legalAuthority'), role('exceptionUntil'), role('sourceAnchor')
    ),
    observe(
      concept('ExceptionCoverageEvidence'), role('coverageScope'),
      role('coverageState'), role('sourceAnchor')
    )
  )
  .resolve(resolveRequirement('explicit-record-and-scope-identity'))
  .coverage(requireComplete(
    concept('ExceptionEvidence'), architectureRef('scope', 'named-policy-scope')
  ))
  .groundEveryClaimWith(groundingRequirement('exact-source-span'))
  .preserveAlternatives(alternativeRequirement('incompatible-explicit-declarations'))
  .seal();

