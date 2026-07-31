import {
  authoritySpan,
  evidenceRequirement,
  exception,
  modality,
  outcome,
  premise,
  ruleAnalysis,
  ruleObligation,
  scope,
  unknownWhen
} from '../../../../../src/architecture/index.mjs';

export default ruleAnalysis('SCI-REPORT-CONTROL')
  .authority(authoritySpan('theory-input/scientific-report-control.md', 0, 12936))
  .obligations(
    ruleObligation('SCI-001', 'Establish metric, estimand, baseline, population, aggregation, horizon, and unit compatibility before numeric comparison.'),
    ruleObligation('SCI-002', 'Compare only authorized normalized value sets and retain rounding or unsupported-normalization uncertainty.'),
    ruleObligation('SCI-003', 'Require quantitative summary claims to have compatible result support before a closed-scope absence can be final.'),
    ruleObligation('SCI-004', 'Attach every assessment and finding to exact source evidence and the concrete decision trace.')
  )
  .scope(
    scope('efficacy-claims', 'Quantitative efficacy claims in the declared executive, methods, results, tables, appendix, and conclusion scope.'),
    scope('result-support', 'Primary and sensitivity efficacy-result support explicitly closed by the source materialization.')
  )
  .modality(modality('mandatory-control', 'Comparability gating and evidence are mandatory report-control steps.'))
  .premises(
    premise('typed-claim-dimensions', 'Each admitted claim publishes the complete typed dimension tuple or an explicit unknown/conflict marker.'),
    premise('authorized-normalization', 'Only type-preserving metric aliases and proportion/percent conversions are permitted.'),
    premise('concrete-authority', 'Concrete circuit replay is the operational authority for findings.')
  )
  .exceptions(
    exception('different-analysis-target', 'A known difference in any critical dimension makes direct numeric conflict review not applicable.'),
    exception('insufficient-dimension', 'Missing or unsupported critical dimensions remain unknown.'),
    exception('incompatible-evidence', 'Simultaneous incompatible dimension support remains conflict.')
  )
  .outcomes(
    outcome('SATISFIED', 'Comparable normalized value sets overlap.'),
    outcome('VIOLATED', 'Comparable normalized value sets are disjoint.'),
    outcome('NOT_APPLICABLE', 'At least one critical analysis dimension is established as different.'),
    outcome('UNKNOWN', 'A critical dimension, normalization, precision, or coverage fact is insufficient.'),
    outcome('CONFLICT', 'Admitted evidence supports incompatible dimensions or values.'),
    outcome('BLOCKED_ONTOLOGY', 'A source notion required by the rule cannot be represented.'),
    outcome('BLOCKED_CAPABILITY', 'A required provider is unavailable.')
  )
  .unknownWhen(
    unknownWhen('missing-dimension', 'Any critical dimension is unknown and could change comparability.'),
    unknownWhen('unsupported-unit', 'No authorized conversion exists for the metric and unit.'),
    unknownWhen('open-support-coverage', 'Absence of compatible result support is queried before exact scope closure.')
  )
  .evidence(
    evidenceRequirement('exact-unicode-spans', 'Every quantitative claim is anchored by an exact half-open Unicode span.'),
    evidenceRequirement('pair-evidence', 'Every assessment cites both compared claim spans.'),
    evidenceRequirement('primitive-trace', 'Query, normalization, constraint, and decision primitive execution remains traceable.')
  )
  .seal();
