import {
  MODUS_PONENS, PREMISE, ProofKernel, proofAnd, proofAtom, proofCertificate, proofImplies, proofStep
} from '../../../src/engines/proof-kernel.mjs';

const closed = proofAtom('retrieval-scope-closed');
const noRetrieval = proofAtom('no-intervening-retrieval');
const violation = proofAtom('violation-row-selected');
const premisesHold = proofAnd(closed, noRetrieval);
const decisionRule = proofImplies(premisesHold, violation);
const certificate = proofCertificate(
  violation,
  'derive-violation',
  proofStep('closed-and-empty', PREMISE, premisesHold),
  proofStep('authorized-row', PREMISE, decisionRule),
  proofStep('derive-violation', MODUS_PONENS, violation, 'closed-and-empty', 'authorized-row')
);

function runDecisionProof() {
  return new ProofKernel().verify(certificate, [premisesHold, decisionRule]);
}

export { certificate, closed, decisionRule, noRetrieval, runDecisionProof, violation };
export default runDecisionProof;
