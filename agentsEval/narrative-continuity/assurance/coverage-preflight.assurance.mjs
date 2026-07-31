import {
  AbstractState, CoverageDomain, abstractCircuit, abstractPreflight, coverageAbsenceOperation
} from '../../../src/interpreters/index.mjs';

const coverageCircuit = abstractCircuit(
  'narrative.continuity.coverage-preflight@1',
  [coverageAbsenceOperation('absence-result', 'retrieval-coverage')],
  ['absence-result']
);

function runCoveragePreflight() {
  return abstractPreflight(
    coverageCircuit,
    new AbstractState([['retrieval-coverage', CoverageDomain.of('OPEN', 'CLOSED')]])
  );
}

export { coverageCircuit, runCoveragePreflight };
export default runCoveragePreflight;
