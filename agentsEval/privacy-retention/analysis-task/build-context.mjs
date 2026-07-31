import { resolve } from 'node:path';
import { compileAgentAuthoringContext, agentAuthoringContext, contextField, contextRecord } from '../../../src/context/index.mjs';
import { writeContext } from '../../../src/coding-agent/context-bridge.mjs';
import project from '../training/generated/agent.mjs';

const source = compileAgentAuthoringContext(project, {
  purpose: 'ANALYZE',
  commands: [
    'node tools/nll.mjs source outline task/input.md',
    'node .agents/skills/nll-analyze-task/scripts/check-context.mjs context/agent-context.mjs',
    'node src/coding-agent/validate-generated.mjs generated/program.mjs'
  ]
});

const compatible = agentAuthoringContext(source.id)
  .digest(source.digest)
  .purpose(source.purpose)
  .agent(contextRecord(
    'agent', source.agent.id,
    contextField('build', source.agent.value('build').id),
    contextField('description', source.agent.value('description')),
    contextField('rulePacks', ...source.agent.values('rulePacks'))
  ))
  .ontology(...source.ontology)
  .circuits(...source.circuits)
  .materializationProfile(source.materializationProfile)
  .semanticDemand(source.semanticDemand)
  .sdkImports(...source.sdkImports)
  .commands(...source.commands)
  .theorySources(...source.theorySources)
  .methodCatalog(source.methodCatalog)
  .providers(...source.providers)
  .tests(...source.tests)
  .benchmarks(...source.benchmarks)
  .seal();

await writeContext(resolve('agentsEval/privacy-retention/analysis-task/context'), compatible);
