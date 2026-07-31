import {
  AND_INTRO, MODUS_PONENS, PREMISE, ProofKernel, proofAnd, proofAtom,
  proofCertificate, proofImplies, proofStep
} from '../../../../../src/engines/proof-kernel.mjs';

const aboveLimit = proofAtom('duration-above-five');
const noDocumentedException = proofAtom('no-documented-exception-in-closed-scope');
const violated = proofAtom('status-violated');
const joinedPremise = proofAnd(aboveLimit, noDocumentedException);
const decisionImplication = proofImplies(joinedPremise, violated);

const violationCertificate = proofCertificate(
  violated,
  'derive-violation',
  proofStep('above-limit', PREMISE, aboveLimit),
  proofStep('no-exception', PREMISE, noDocumentedException),
  proofStep('join-premises', AND_INTRO, joinedPremise, 'above-limit', 'no-exception'),
  proofStep('decision-row', PREMISE, decisionImplication),
  proofStep('derive-violation', MODUS_PONENS, violated, 'decision-row', 'join-premises')
);

const violationPremises = Object.freeze([
  aboveLimit, noDocumentedException, decisionImplication
]);

function replayViolationProof() {
  return new ProofKernel().verify(violationCertificate, violationPremises);
}

export { replayViolationProof, violationCertificate, violationPremises };
export default replayViolationProof;

