import {
  AlternativeSet, Claim, Coverage, EpistemicStatus, Gap, IdentityCandidate, Interpretation, LongTextProgram,
  Mention, Qualifier, SemanticUnit, SourceDocument, Span
} from './model.mjs';

const source = (id, text, revision) => new SourceDocument(id, text, revision);
const sourceRef = (value) => value;
const span = (sourceValue, start, end) => new Span(sourceValue, start, end);
const semanticUnit = (id, ...values) => new SemanticUnit(id, values);
const longTextProgram = (id, sourceValue, ...units) => new LongTextProgram(id, sourceValue, units);
const claim = (content, ...qualifiers) => new Claim(content, qualifiers);
const explicit = () => new EpistemicStatus('explicit', 'source-grounded');
const inferred = () => new EpistemicStatus('inferred', 'derived');
const proposed = () => new EpistemicStatus('proposed', 'model-assisted');
const verified = () => new EpistemicStatus('verified', 'cross-checked');
const rejected = () => new EpistemicStatus('rejected', 'rejected');
const ambiguous = () => new EpistemicStatus('ambiguous', 'conditional');
const groundedAt = (value) => new Qualifier('groundedAt', value);
const assertedBy = (value) => new Qualifier('assertedBy', value);
const within = (value) => new Qualifier('within', value);
const producedBy = (value) => new Qualifier('producedBy', value);
const confidence = (value) => new Qualifier('confidence', value);
const mention = (anchor, lexicalForm) => new Mention(anchor, lexicalForm);
const identityCandidate = (mentionValue, entity, ...qualifiers) => new IdentityCandidate(mentionValue, entity, qualifiers);
const resolvesTo = identityCandidate;
const interpretation = (id, ...values) => new Interpretation(id, values);
const alternatives = (id, ...values) => new AlternativeSet(id, values);
const coverage = (concept, scope, state) => new Coverage(concept.definition ?? concept, scope, state);
const gap = (kind, ...evidence) => new Gap(kind, evidence);

export {
  alternatives, ambiguous, assertedBy, claim, confidence, coverage, explicit, gap, groundedAt,
  identityCandidate, inferred, interpretation, longTextProgram, mention, producedBy, proposed, rejected,
  resolvesTo, semanticUnit, source, sourceRef, span, verified, within
};
