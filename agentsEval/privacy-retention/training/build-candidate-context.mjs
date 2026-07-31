import { resolve } from 'node:path';
import { compileAgentAuthoringContext, renderAgentContextMarkdown, renderAgentContextModule } from '../../../src/context/index.mjs';
import { atomicWrite, ensureDirectory } from '../../../src/core/io.mjs';
import project from './generated/agent.mjs';

const context = compileAgentAuthoringContext(project, {
  purpose: process.argv[2] ?? 'REVIEW',
  commands: [
    'node tools/nll.mjs ontology check agentsEval/privacy-retention/training/generated/ontologies/index.mjs',
    'node --test agentsEval/privacy-retention/training/generated/tests/*.test.mjs',
    'node src/training/validate-candidate.mjs agentsEval/privacy-retention/training/generated privacy-retention typed'
  ]
});

const root = resolve('agentsEval/privacy-retention/training/generated/context');
await ensureDirectory(root);
await atomicWrite(resolve(root, 'agent-context.mjs'), renderAgentContextModule(context, {
  apiModule: new URL('../../../src/context/index.mjs', import.meta.url).href
}));
await atomicWrite(resolve(root, 'agent-context.md'), renderAgentContextMarkdown(context));
