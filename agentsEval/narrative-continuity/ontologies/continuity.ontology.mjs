import {
  allows, exactlyOne, extendsOntology, from, ontology, requires, to, zeroOrOne
} from '../../../src/ontology/api.mjs';
import core from '../../../ontologies/core/index.mjs';
import { evidence, message, named } from '../../../ontologies/core/index.mjs';

const O = ontology('narrative.continuity@1', extendsOntology(core));

export const actor = O.role('actor', from(O.Event), to(O.Entity), zeroOrOne());
export const object = O.role('object', from(O.Event), to(O.Entity), zeroOrOne());
export const atPlace = O.role('atPlace', from(O.Event), to(O.Place), exactlyOne());
export const narrativeOrder = O.role('narrativeOrder', from(O.Situation), to(O.Value), exactlyOne());
export const eventAnchor = O.role('eventAnchor', from(O.Situation), to(O.Value), exactlyOne());
export const referenceKey = O.role('referenceKey', from(O.Event), to(O.Value), zeroOrOne());
export const actorReferenceKey = O.role('actorReferenceKey', from(O.Event), to(O.Value), zeroOrOne());
export const earlier = O.role('earlier', from(O.Proposition), to(O.Event), exactlyOne());
export const later = O.role('later', from(O.Proposition), to(O.Event), exactlyOne());
export const intervalObject = O.role('intervalObject', from(O.Entity), to(O.Entity), exactlyOne());
export const intervalStart = O.role('intervalStart', from(O.Entity), to(O.Event), exactlyOne());
export const intervalEnd = O.role('intervalEnd', from(O.Entity), to(O.Event), exactlyOne());
export const intervalScope = O.role('intervalScope', from(O.State), to(O.Entity), exactlyOne());
export const coverageState = O.role('coverageState', from(O.State), to(O.Value), exactlyOne());
export const assessedUse = O.role('assessedUse', from(O.Proposition), to(O.Event), exactlyOne());
export const assessmentStatus = O.role('assessmentStatus', from(O.Proposition), to(O.Value), exactlyOne());
export const assessmentObject = O.role('assessmentObject', from(O.Proposition), to(O.Entity), zeroOrOne());

export const Person = O.entity('Person', requires(named));
export const PortableObject = O.entity('PortableObject', requires(named));
export const NarrativePlace = O.entity('NarrativePlace', requires(named));
O.subtype(NarrativePlace, O.Place);

export const Leave = O.event(
  'Leave', requires(actor), requires(object), requires(atPlace), requires(narrativeOrder), requires(eventAnchor)
);
export const Retrieve = O.event(
  'Retrieve', requires(actor), requires(object), requires(atPlace), requires(narrativeOrder), requires(eventAnchor)
);
export const Use = O.event(
  'Use', allows(actor), allows(actorReferenceKey), allows(object), allows(referenceKey),
  requires(atPlace), requires(narrativeOrder), requires(eventAnchor)
);
export const DirectBefore = O.relation('DirectBefore', requires(earlier), requires(later));
export const NarrativeInterval = O.entity(
  'NarrativeInterval', requires(named), requires(intervalObject), requires(intervalStart), requires(intervalEnd)
);
export const CoverageNotice = O.state(
  'CoverageNotice', requires(intervalScope), requires(coverageState), requires(eventAnchor)
);
export const ContinuityAssessment = O.derivedConcept(
  'ContinuityAssessment', requires(assessedUse), requires(assessmentStatus), allows(assessmentObject),
  requires(message), allows(evidence)
);

O.lexicalize(Leave, 'left');
O.lexicalize(Retrieve, 'retrieved');
O.lexicalize(Use, 'used');

export default O.seal();
