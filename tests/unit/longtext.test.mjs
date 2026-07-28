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
