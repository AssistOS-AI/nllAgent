import {
  authoritySpan, evidenceRequirement, modality, outcome, premise, ruleAnalysis, ruleObligation,
  scope, unknownWhen
} from '../../../src/architecture/rule-analysis.mjs';

export default ruleAnalysis('NC-001')
  .authority(authoritySpan('training/theory-input/editorial-continuity-theory.md', 0, 14253))
  .obligations(
    ruleObligation('NC-001-PER-USE', 'Create exactly one typed continuity assessment for each materialized use event.'),
    ruleObligation('NC-001-VIOLATION', 'Emit a finding only for same-actor, same-object, different-place leave-before-use with closed retrieval coverage and no intervening retrieval.'),
    ruleObligation('NC-001-RETRIEVAL', 'Classify a supported same-actor, same-object intervening retrieval as SATISFIED and emit no finding.'),
    ruleObligation('NC-001-NOT-APPLICABLE', 'Classify a use without a qualifying same-actor leave, or with the same leave and use location, as NOT_APPLICABLE.'),
    ruleObligation('NC-001-UNKNOWN', 'Preserve UNKNOWN for unresolved identity, temporal order, coverage, or materialization gaps.'),
    ruleObligation('NC-001-CONFLICT', 'Preserve CONFLICT for incompatible temporal or coverage support and emit no finding.'),
    ruleObligation('NC-001-IDENTITY', 'Use explicit entity identity and preserve actor and object pronoun candidates without confidence-based selection.'),
    ruleObligation('NC-001-TEMPORAL', 'Establish temporal order through typed transitive reachability rather than incidental source offsets.'),
    ruleObligation('NC-001-COVERAGE', 'Treat retrieval absence as final only for the exact closed leave-to-use interval.'),
    ruleObligation('NC-001-EVIDENCE', 'Ground violated output in the exact leave, use, and closure anchors; retain status-specific evidence for all assessments.'),
    ruleObligation('NC-001-BOUNDARY', 'Keep LongTextJS observational and create assessments and findings only in CircuitJS.')
  )
  .scope(scope('USE-INTERVAL', 'Each use is assessed in its own leave-to-use narrative interval.'))
  .modality(modality('MUST', 'All listed decision and evidence conditions are mandatory.'))
  .premises(
    premise('MATERIALIZED-USE', 'The source contains a materialized use with an exact anchor.'),
    premise('SAME-IDENTITY', 'Leave, retrieval, and use comparisons use explicit person and object identities.'),
    premise('TEMPORAL-PATH', 'Before is established by typed reachability over direct-before relations.')
  )
  .outcomes(
    outcome('VIOLATED', 'All violation premises hold and the absence scope is closed.'),
    outcome('SATISFIED', 'An intervening same-actor retrieval is supported.'),
    outcome('NOT_APPLICABLE', 'No qualifying leave premise applies to the use.'),
    outcome('UNKNOWN', 'A result-changing premise lacks support.'),
    outcome('CONFLICT', 'Incompatible admitted support prevents one status.')
  )
  .unknownWhen(
    unknownWhen('OPEN-COVERAGE', 'Retrieval coverage is partial or unknown.'),
    unknownWhen('IDENTITY-ALTERNATIVES', 'The use mention has zero or multiple admissible identity candidates.'),
    unknownWhen('TEMPORAL-ORDER', 'A matching leave exists but leave-before-use is not established.')
  )
  .evidence(
    evidenceRequirement('EXACT-SPANS', 'Every source-dependent output retains half-open Unicode source spans.'),
    evidenceRequirement('VIOLATION-TRIPLE', 'A finding cites the exact leave, use, and closed-coverage notice anchors.'),
    evidenceRequirement('NO-OPEN-ABSENCE', 'An empty retrieval query is negative evidence only in the exact closed interval.')
  )
  .seal();
