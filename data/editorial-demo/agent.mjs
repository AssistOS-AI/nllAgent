import {
  agent, description, dialects, materializes, plans, runs, using
} from '../../src/agent/api.mjs';
import ontology from './ontologies/index.mjs';
import { materializeEditorial } from './longtext/editorial.materializer.mjs';
import weakPhrase from './circuits/weak-phrase.circuit.mjs';
import perhapsFrequency from './circuits/perhaps-frequency.circuit.mjs';
import planning from './circuits/plan.circuit.mjs';
import editorialDialect from './cnl/editorial.grammar.mjs';

export default agent(
  'editorial-demo',
  description('A deterministic editorial experiment with source-grounded phrase checks and controlled planning.'),
  using(ontology),
  materializes(materializeEditorial),
  runs(weakPhrase, perhapsFrequency),
  plans(planning),
  dialects(editorialDialect)
);
