import identity from './identity.experiment.mjs';
import behavior from './behavior-boundary.experiment.mjs';
import alternatives from './alternatives.experiment.mjs';
import modelCache from './model-cache.experiment.mjs';
import cnl from './cnl-equivalence.experiment.mjs';

const results = [identity, behavior, alternatives, modelCache, cnl];
for (const result of results) {
  process.stdout.write(`PASS ${result.experiment}: ${result.decision}\n`);
}
