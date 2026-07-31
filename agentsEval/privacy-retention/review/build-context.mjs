import { resolve } from 'node:path';
import {
  agentAuthoringContext, compileAgentAuthoringContext, contextField, contextRecord
} from '../../../src/context/index.mjs';
import { writeContext } from '../../../src/coding-agent/context-bridge.mjs';
import project from '../training/generated/agent.mjs';

const source = compileAgentAuthoringContext(project, {
  purpose: 'REVIEW',
  commands: [
    'node --test training/generated/tests/*.test.mjs',
    'node src/training/validate-candidate.mjs training/generated privacy-retention typed',
    'node analysis-task/validate-task.mjs'
  ]
});
const context = agentAuthoringContext(source.id)
  .digest(source.digest).purpose(source.purpose)
  .agent(contextRecord(
    'agent', source.agent.id,
    contextField('build', source.agent.value('build').id),
    contextField('description', source.agent.value('description')),
    contextField('rulePacks', ...source.agent.values('rulePacks'))
  ))
  .ontology(...source.ontology).circuits(...source.circuits)
  .materializationProfile(source.materializationProfile).semanticDemand(source.semanticDemand)
  .sdkImports(...source.sdkImports).commands(...source.commands)
  .theorySources(...source.theorySources).methodCatalog(source.methodCatalog)
  .providers(...source.providers).tests(...source.tests).benchmarks(...source.benchmarks)
  .seal();

await writeContext(resolve('agentsEval/privacy-retention/review/context'), context);
