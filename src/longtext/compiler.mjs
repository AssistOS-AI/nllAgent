import { claim, explicit, groundedAt, longTextProgram, semanticUnit, span } from './api.mjs';
import { identifiedAs } from '../ontology/api.mjs';

function paragraphRanges(text) {
  const points = [...text];
  const ranges = [];
  let start = 0;
  for (let index = 0; index <= points.length; index += 1) {
    const atEnd = index === points.length;
    const blankBoundary = points[index] === '\n' && points[index + 1] === '\n';
    if (!atEnd && !blankBoundary) continue;
    const end = index;
    if (points.slice(start, end).join('').trim()) ranges.push([start, end]);
    while (points[index] === '\n') index += 1;
    start = index;
  }
  return ranges;
}

function sentenceRanges(sourceValue, paragraphStart, paragraphEnd) {
  const points = [...sourceValue.text];
  const ranges = [];
  let start = paragraphStart;
  for (let index = paragraphStart; index < paragraphEnd; index += 1) {
    const isBoundary = /[.!?]/u.test(points[index] || '')
      && !(points[index] === '.' && /[0-9]/u.test(points[index - 1] || '') && /[0-9]/u.test(points[index + 1] || ''));
    if (!isBoundary && index + 1 !== paragraphEnd) continue;
    const end = index + 1;
    while (start < end && /\s/u.test(points[start])) start += 1;
    if (start < end) ranges.push([start, end]);
    start = end;
  }
  return ranges;
}

async function compileMarkdown(sourceValue, vocabulary, materializers = []) {
  const { Paragraph, Sentence, order, text, grounded } = vocabulary;
  const units = [];
  let paragraphIndex = 0;
  let sentenceIndex = 0;
  for (const [start, end] of paragraphRanges(sourceValue.text)) {
    const anchor = span(sourceValue, start, end);
    const paragraph = Paragraph(
      identifiedAs(`${sourceValue.id}:paragraph:${anchor.start}-${anchor.end}`),
      order(paragraphIndex), text(anchor.excerpt), grounded(anchor)
    );
    units.push(semanticUnit(`paragraph-${paragraphIndex}`, claim(paragraph, explicit(), groundedAt(anchor))));
    for (const [sentenceStart, sentenceEnd] of sentenceRanges(sourceValue, start, end)) {
      const sentenceAnchor = span(sourceValue, sentenceStart, sentenceEnd);
      const sentence = Sentence(
        identifiedAs(`${sourceValue.id}:sentence:${sentenceAnchor.start}-${sentenceAnchor.end}`),
        order(sentenceIndex), text(sentenceAnchor.excerpt), grounded(sentenceAnchor)
      );
      units.push(semanticUnit(`sentence-${sentenceIndex}`, claim(sentence, explicit(), groundedAt(sentenceAnchor))));
      sentenceIndex += 1;
    }
    paragraphIndex += 1;
  }
  let program = longTextProgram(`${sourceValue.id}.structure`, sourceValue, ...units);
  for (const materialize of materializers) {
    const additions = await materialize(Object.freeze({ source: sourceValue, program, vocabulary }));
    const values = Array.isArray(additions) ? additions : [additions];
    program = longTextProgram(program.id, sourceValue, ...program.units, ...values.filter(Boolean));
  }
  return program;
}

export { compileMarkdown, paragraphRanges, sentenceRanges };
