import assert from 'node:assert/strict';
import test from 'node:test';
import { compileMarkdown } from '../../src/longtext/compiler.mjs';

test('Markdown compilation preserves Unicode code-point anchors and coverage', () => {
  const source = '# Title\n\nStephen says something. In fact, he leaves.\n';
  const program = compileMarkdown(source, { language: 'en' });
  assert.equal(program.source.content, source);
  assert.equal(program.views[0].complete, true);
  assert.equal(program.coverage[0].mode, 'closed-world');
  const paragraph = program.observations.find((item) => item.type === 'document.paragraph@1');
  const anchor = program.anchors[paragraph.anchors[0]];
  assert.equal(Array.from(source).slice(anchor.range.start, anchor.range.end).join(''), paragraph.payload.text);
  assert.ok(program.observations.some((item) => item.type === 'document.sentence@1'));
});

test('Markdown sentence segmentation preserves decimal tokens and exact sentence anchors', () => {
  const source = 'Temperature was -273.16 C. The reading was recorded.';
  const program = compileMarkdown(source);
  const sentences = program.observations.filter((item) => item.type === 'document.sentence@1');
  assert.deepEqual(sentences.map((item) => item.payload.text), [
    'Temperature was -273.16 C.', 'The reading was recorded.'
  ]);
  for (const sentence of sentences) {
    const at = program.anchors[sentence.anchors[0]];
    assert.equal(Array.from(source).slice(at.range.start, at.range.end).join(''), sentence.payload.text);
  }
});

test('Markdown compilation distinguishes list, quote, code, and physical-line channels', () => {
  const source = '- item\n> quote\n```js\nconst x = 1;\n```\n';
  const program = compileMarkdown(source);
  const types = new Set(program.observations.map((item) => item.type));
  assert.ok(types.has('document.list-item@1'));
  assert.ok(types.has('document.quote@1'));
  assert.ok(types.has('document.code-block@1'));
  assert.equal(program.observations.filter((item) => item.type === 'document.line@1').length, 5);
  for (const block of program.blocks) {
    const at = program.anchors[block.anchor.id];
    assert.equal(Array.from(source).slice(at.range.start, at.range.end).join(''), at.quote);
  }
});

test('the quick-tutorial source produces exact structure without implicit semantic assertions', () => {
  const source = '# Excerpt\n\nAlice entered the room. In fact, the window was open.\n';
  const program = compileMarkdown(source, {
    language: 'en',
    programId: 'longtext:editorial-demo:input'
  });
  const paragraph = program.observations.find((item) => item.type === 'document.paragraph@1');
  const sentences = program.observations.filter((item) => item.type === 'document.sentence@1');

  assert.equal(program.dialect, 'longtextjs-json@1');
  assert.equal(paragraph.id, 'observation:block:paragraph:1ca94407e318:1');
  assert.equal(paragraph.payload.text, 'Alice entered the room. In fact, the window was open.');
  assert.deepEqual(paragraph.anchors, ['anchor:block:paragraph:1ca94407e318:1']);
  assert.deepEqual(sentences.map((item) => item.payload.text), [
    'Alice entered the room.',
    'In fact, the window was open.'
  ]);
  for (const observation of [paragraph, ...sentences]) {
    const at = program.anchors[observation.anchors[0]];
    assert.equal(Array.from(source).slice(at.range.start, at.range.end).join(''), observation.payload.text);
  }
  assert.deepEqual(program.mentions, []);
  assert.deepEqual(program.entities, []);
  assert.deepEqual(program.identityCandidates, []);
  assert.equal(program.observations.some((item) => item.type.startsWith('narrative.')), false);
});
