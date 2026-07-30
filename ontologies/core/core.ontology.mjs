import {
  allows, exactlyOne, from, ontology, requires, to, zeroOrMany, zeroOrOne
} from '../../src/ontology/api.mjs';

const O = ontology('nll.core@1');

export const named = O.role('named', from(O.Entity), to(O.Value), exactlyOne());
export const order = O.role('order', from(O.Entity), to(O.Value), exactlyOne());
export const text = O.role('text', from(O.Entity), to(O.Value), exactlyOne());
export const grounded = O.role('grounded', from(O.Entity), to(O.Value), exactlyOne());
export const subject = O.role('subject', from(O.Situation), to(O.Value), exactlyOne());
export const predicate = O.role('predicate', from(O.Situation), to(O.Value), exactlyOne());
export const polarity = O.role('polarity', from(O.Situation), to(O.Value), exactlyOne());
export const during = O.role('during', from(O.Situation), to(O.Value), zeroOrOne());
export const findingType = O.role('findingType', from(O.Proposition), to(O.Value), exactlyOne());
export const message = O.role('message', from(O.Proposition), to(O.Value), exactlyOne());
export const severity = O.role('severity', from(O.Proposition), to(O.Value), exactlyOne());
export const evidence = O.role('evidence', from(O.Proposition), to(O.Value), zeroOrMany());
export const assurance = O.role('assurance', from(O.Proposition), to(O.Value), exactlyOne());

export const Document = O.entity('Document', requires(named));
export const Paragraph = O.entity(
  'Paragraph', requires(order), requires(text), requires(grounded)
);
export const Sentence = O.entity(
  'Sentence', requires(order), requires(text), requires(grounded)
);
export const StateAssertion = O.state(
  'StateAssertion', requires(subject), requires(predicate), requires(polarity), allows(during)
);
export const Finding = O.derivedConcept(
  'Finding', requires(findingType), requires(message), requires(severity), allows(evidence), requires(assurance)
);

export default O.seal();
