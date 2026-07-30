import { circuit, include, stage } from '../../../src/circuit/api.mjs';
import { cnlFrame, slot } from '../../../src/generation/cnl.mjs';

const createEditorialPlan = stage('editorial.create-plan', async (ctx) => {
  const sourceText = ctx.store.claims
    .filter((claimValue) => claimValue.content.concept.name === 'Paragraph')
    .map((claimValue) => claimValue.content.value('text'))
    .join('\n\n');
  ctx.emit(cnlFrame(
    'document-plan',
    slot('purpose', sourceText.replace(/\s+/gu, ' ').trim()),
    slot('sections', 'opening; development; continuity review; conclusion'),
    slot('verification', 'audit the realized document with the same agent')
  ));
});

export default circuit('editorial.plan@1', include(createEditorialPlan));
