import * as coreVocabulary from '../../../ontologies/core/index.mjs';
import { compileMarkdown } from '../../../src/longtext/compiler.mjs';
import { source } from '../../../src/longtext/api.mjs';
import { materializeContinuity } from './continuity.materializer.mjs';

const text = [
  'Mara left the brass key in the boathouse.',
  'Mara used the brass key in the hill tower.',
  'The account between leaving the brass key and using the brass key is complete.'
].join('\n\n');

const sourceValue = source('calibration.md', text, 'calibration-1');

export default await compileMarkdown(sourceValue, coreVocabulary, [materializeContinuity]);
