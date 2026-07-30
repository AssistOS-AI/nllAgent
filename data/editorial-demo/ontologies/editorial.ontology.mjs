import {
  exactlyOne, extendsOntology, from, ontology, requires, to
} from '../../../src/ontology/api.mjs';
import core from '../../../ontologies/core/index.mjs';

const O = ontology('editorial.demo@1', extendsOntology(core));

export const phrase = O.role('phrase', from(O.Event), to(O.Value), exactlyOne());
export const occurrenceAnchor = O.role('occurrenceAnchor', from(O.Event), to(O.Value), exactlyOne());
export const dialogue = O.role('dialogue', from(O.Event), to(O.Value), exactlyOne());
export const code = O.role('code', from(O.Event), to(O.Value), exactlyOne());
export const paragraphNumber = O.role('paragraphNumber', from(O.Event), to(O.Value), exactlyOne());
export const PhraseOccurrence = O.event(
  'PhraseOccurrence', requires(phrase), requires(occurrenceAnchor), requires(dialogue),
  requires(code), requires(paragraphNumber)
);

export default O.seal();
