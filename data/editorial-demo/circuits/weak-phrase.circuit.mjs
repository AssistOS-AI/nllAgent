import { circuit, include, reads, stage, writes } from '../../../src/circuit/api.mjs';
import {
  Finding, PhraseOccurrence, assurance, code, dialogue, evidence, findingType, message,
  occurrenceAnchor, phrase, severity
} from '../ontologies/index.mjs';

const findWeakPhrases = stage(
  'editorial.find-weak-phrases',
  async (ctx) => {
    for (const occurrence of ctx.store.instancesOf(PhraseOccurrence)) {
      if (occurrence.value(dialogue) || occurrence.value(code) || occurrence.value(phrase) !== 'in fact') continue;
      const anchor = occurrence.value(occurrenceAnchor);
      const verified = await ctx.verify('editorial.whole-word', () => /\bin fact\b/iu.test(anchor.excerpt));
      if (!verified) continue;
      ctx.emit(Finding(
        findingType('weak-phrase'),
        message(`Consider removing “${occurrence.value(phrase)}” from narrative prose.`),
        severity('warning'),
        evidence(anchor),
        assurance('mechanical')
      ));
    }
  },
  reads(PhraseOccurrence),
  writes(Finding)
);

export default circuit('editorial.weak-phrase@1', include(findWeakPhrases));
