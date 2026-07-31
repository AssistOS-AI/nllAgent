import {
  AbstractState, CoverageDomain, EvidenceTruth, FiniteChoice, NumericInterval,
  abstractCircuit, abstractOperation, abstractPreflight, coverageAbsenceOperation,
  numericGreaterThanOperation
} from '../../../../../src/interpreters/index.mjs';

const STATUS_UNIVERSE = Object.freeze([
  'SATISFIED', 'VIOLATED', 'ACCEPTED_EXCEPTION', 'UNKNOWN', 'CONFLICT'
]);

function statusTransfer(exceeds, absence) {
  const statuses = [];
  for (const comparison of exceeds.possibilities) {
    for (const noException of absence.possibilities) {
      if (comparison === 'CONFLICT' || noException === 'CONFLICT') statuses.push('CONFLICT');
      else if (comparison === 'FALSE') statuses.push('SATISFIED');
      else if (comparison === 'TRUE' && noException === 'TRUE') statuses.push('VIOLATED');
      else if (comparison === 'TRUE' && noException === 'FALSE') statuses.push('ACCEPTED_EXCEPTION');
      else statuses.push('UNKNOWN');
    }
  }
  return FiniteChoice.of(STATUS_UNIVERSE, statuses);
}

const comparison = numericGreaterThanOperation('duration-exceeds-limit', 'duration', 'limit');
const absence = coverageAbsenceOperation('documented-exception-absent', 'exception-coverage');
const status = abstractOperation(
  'retention-status', ['duration-exceeds-limit', 'documented-exception-absent'],
  statusTransfer, FiniteChoice.top(STATUS_UNIVERSE)
);

const retentionAbstractCircuit = abstractCircuit(
  'privacy.retention.abstract@1', [status, absence, comparison], ['retention-status']
);

function abstractState(duration, coverage) {
  return new AbstractState([
    ['duration', duration],
    ['limit', NumericInterval.exact(5)],
    ['exception-coverage', coverage]
  ]);
}

function openPreflight() {
  return abstractPreflight(
    retentionAbstractCircuit,
    abstractState(NumericInterval.exact(7), CoverageDomain.constant('OPEN'))
  );
}

function closedPreflight() {
  return abstractPreflight(
    retentionAbstractCircuit,
    abstractState(NumericInterval.exact(7), CoverageDomain.constant('CLOSED'))
  );
}

function boundaryPreflight() {
  return abstractPreflight(
    retentionAbstractCircuit,
    abstractState(NumericInterval.closed(5, 6), CoverageDomain.top())
  );
}

export {
  STATUS_UNIVERSE, abstractState, boundaryPreflight, closedPreflight, openPreflight,
  retentionAbstractCircuit, statusTransfer
};

export default openPreflight;

