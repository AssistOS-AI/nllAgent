import { claim, explicit, groundedAt, semanticUnit, span } from '../../../src/longtext/api.mjs';
import { identifiedAs } from '../../../src/ontology/api.mjs';
import {
  PhraseOccurrence, code, dialogue, occurrenceAnchor, paragraphNumber, phrase
} from '../ontologies/index.mjs';

const TARGET = /\b(?:in fact|perhaps)\b/giu;

function insideQuotedLine(text, offset) {
  const start = text.lastIndexOf('\n', offset - 1) + 1;
  const end = text.indexOf('\n', offset);
  const line = text.slice(start, end < 0 ? text.length : end).trim();
  return line.startsWith('>') || /^[-—'“”"]/.test(line);
}

function insideCodeFence(text, offset) {
  return (text.slice(0, offset).match(/```/gu)?.length || 0) % 2 === 1;
}

function paragraphAt(text, offset) {
  return text.slice(0, offset).split(/\n\s*\n/gu).length - 1;
}

function materializeEditorial({ source }) {
  const pointsBefore = (index) => [...source.text.slice(0, index)].length;
  const units = [];
  for (const match of source.text.matchAll(TARGET)) {
    const start = pointsBefore(match.index);
    const end = start + [...match[0]].length;
    const anchor = span(source, start, end);
    const occurrence = PhraseOccurrence(
      identifiedAs(`phrase-occurrence:${anchor.id}`),
      phrase(match[0].toLowerCase()),
      occurrenceAnchor(anchor),
      dialogue(insideQuotedLine(source.text, match.index)),
      code(insideCodeFence(source.text, match.index)),
      paragraphNumber(paragraphAt(source.text, match.index))
    );
    units.push(semanticUnit(
      `phrase-occurrence-${units.length}`,
      claim(occurrence, explicit(), groundedAt(anchor))
    ));
  }
  return units;
}

export { materializeEditorial };
