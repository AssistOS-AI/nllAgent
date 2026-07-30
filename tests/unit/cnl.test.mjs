import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CnlDialect, action, actor, authority, cnlFrame, compareFrames, exception, modality,
  object, renderVerified
} from '../../src/generation/index.mjs';

function dialect() {
  return new CnlDialect(
    'normative-en@1',
    (frame) => `${frame.get('actor')} ${frame.get('modality')} ${frame.get('action')} ${frame.get('object')} except ${frame.get('exception')} under ${frame.get('authority')}.`,
    (text) => {
      const match = /^(\S+) (MUST|MAY) (\S+) (\S+) except (\S+) under (\S+)[.]$/u.exec(text);
      return cnlFrame('obligation', actor(match[1]), modality(match[2]), action(match[3]), object(match[4]), exception(match[5]), authority(match[6]));
    }
  );
}

test('CNL accepts lexical rendering only after exact critical-slot round-trip', () => {
  const frame = cnlFrame('obligation', actor('controller'), modality('MUST'), action('erase'), object('data'), exception('legal-duty'), authority('rule-1'));
  const document = renderVerified(frame, dialect());
  assert.match(document.content, /controller MUST erase/u);
  assert.equal(compareFrames(frame, dialect().parse(document.content)), true);
  assert.equal(compareFrames(frame, cnlFrame('obligation', actor('controller'), modality('MAY'), action('erase'), object('data'), exception('legal-duty'), authority('rule-1'))), false);
});
