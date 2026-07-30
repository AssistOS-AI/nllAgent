import { CnlDialect, cnlFrame, slot } from '../../../src/generation/cnl.mjs';

function render(frame) {
  return [
    '# Controlled document plan',
    '',
    `Purpose: ${frame.get('purpose')}`,
    `Sections: ${frame.get('sections')}`,
    `Verification: ${frame.get('verification')}`
  ].join('\n');
}

function parse(text) {
  const lines = text.split('\n');
  const value = (prefix) => lines.find((line) => line.startsWith(prefix))?.slice(prefix.length) ?? '';
  return cnlFrame(
    'document-plan',
    slot('purpose', value('Purpose: ')),
    slot('sections', value('Sections: ')),
    slot('verification', value('Verification: '))
  );
}

export default new CnlDialect('editorial-plan-en@1', render, parse);
