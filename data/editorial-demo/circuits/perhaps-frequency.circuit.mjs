import { circuit, include, reads, stage, writes } from '../../../src/circuit/api.mjs';
import {
  Finding, PhraseOccurrence, assurance, code, dialogue, evidence, findingType, message,
  occurrenceAnchor, paragraphNumber, phrase, severity
} from '../ontologies/index.mjs';

const findPerhapsFrequency = stage(
  'editorial.find-perhaps-frequency',
  async (ctx) => {
    const groups = new Map();
    for (const occurrence of ctx.store.instancesOf(PhraseOccurrence)) {
      if (occurrence.value(phrase) !== 'perhaps' || occurrence.value(dialogue) || occurrence.value(code)) continue;
      const key = occurrence.value(paragraphNumber);
      const values = groups.get(key) || [];
      values.push(occurrence);
      groups.set(key, values);
    }
    for (const [paragraph, occurrences] of groups) {
      if (occurrences.length < 3) continue;
      const anchors = occurrences.map((occurrence) => occurrence.value(occurrenceAnchor));
      const verified = await ctx.verify('editorial.paragraph-frequency', () => anchors.length >= 3);
      if (!verified) continue;
      ctx.emit(Finding(
        findingType('phrase-frequency'),
        message(`“Perhaps” occurs ${anchors.length} times in paragraph ${paragraph + 1}.`),
        severity('warning'),
        ...anchors.map((anchor) => evidence(anchor)),
        assurance('mechanical')
      ));
    }
  },
  reads(PhraseOccurrence),
  writes(Finding)
);

export default circuit('editorial.perhaps-frequency@1', include(findPerhapsFrequency));
