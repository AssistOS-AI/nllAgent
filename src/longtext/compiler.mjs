import { parseMarkdown } from './markdown-adapter.mjs';
import { configureFoundation } from '../foundation/core-ontology.mjs';

function compileMarkdown(text, options = {}) {
  const program = parseMarkdown(text, options);
  for (const observation of program.observations) {
    if (observation.embeddedAnchor) {
      program.anchors[observation.embeddedAnchor.id] = observation.embeddedAnchor;
      delete observation.embeddedAnchor;
    }
  }
  configureFoundation(program, options.foundation || 'core');
  return program;
}

export { compileMarkdown };
