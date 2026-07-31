import {
  authoritySpan, evidenceRequirement, exception, modality, outcome, premise, ruleAnalysis,
  ruleObligation, scope, unknownWhen
} from '../../../../../../src/architecture/index.mjs';

export default ruleAnalysis('PRIVACY-RETENTION-001')
  .authority(authoritySpan('theory/sources/retention-policy.md', 1397, 6062))
  .obligations(
    ruleObligation('RET-LIMIT', 'An in-scope personal-data retention duration must not exceed five years.'),
    ruleObligation('RET-EXCEPTION', 'Only a documented, record-specific legal obligation permits a longer duration.'),
    ruleObligation('RET-COVERAGE', 'Absent exception evidence is final only in the matching closed scope.'),
    ruleObligation('RET-EVIDENCE', 'Every assessment must cite every exact source span material to its status.')
  )
  .scope(scope('policy-register', 'The named policy-register assessment scope controls exception closure.'))
  .modality(modality('prohibition-with-exception', 'Retention above five years is prohibited unless RET-002 applies.'))
  .premises(
    premise('whole-years', 'The duration is an explicit whole-year number for the same record identity.'),
    premise('personal-data', 'The declaration identifies an admitted personal-data category.')
  )
  .exceptions(exception(
    'documented-legal-obligation',
    'A documented legal obligation names its authority and end or review date for the same record.'
  ))
  .outcomes(
    outcome('SATISFIED'), outcome('VIOLATED'), outcome('ACCEPTED_EXCEPTION'),
    outcome('UNKNOWN'), outcome('CONFLICT'), outcome('NOT_APPLICABLE'),
    outcome('BLOCKED_ONTOLOGY'), outcome('BLOCKED_CAPABILITY'),
    outcome('BLOCKED_RESOURCE'), outcome('ERROR_EXECUTION')
  )
  .unknownWhen(
    unknownWhen('open-exception-scope', 'No exception is present and matching exception coverage is not closed.'),
    unknownWhen('missing-duration', 'The duration is absent or cannot be represented.'),
    unknownWhen('conflicting-coverage', 'Coverage support is incompatible and cannot prove absence.')
  )
  .evidence(
    evidenceRequirement('duration-span', 'Every status cites its activating duration declaration.'),
    evidenceRequirement('exception-span', 'Accepted and conflicting exceptions cite their exact statements.'),
    evidenceRequirement('coverage-span', 'Absence-based violation or unknown cites its coverage statement.')
  )
  .seal();
