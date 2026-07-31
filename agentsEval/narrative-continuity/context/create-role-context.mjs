import { compileAgentAuthoringContext } from '../../../src/context/compiler.mjs';
import { agentAuthoringContext, contextField, contextRecord } from '../../../src/context/model.mjs';
import agent from '../agent.mjs';

const COMMANDS = Object.freeze([
  'node .agents/skills/nll-train-agent/scripts/check-context.mjs training/context/agent-context.mjs',
  'node .agents/skills/nll-analyze-task/scripts/check-context.mjs task/context/agent-context.mjs',
  'node .agents/skills/nll-review-and-repair/scripts/check-context.mjs review/context/agent-context.mjs',
  'node --test agentsEval/narrative-continuity/tests/*.test.mjs',
  'node agentsEval/narrative-continuity/validation.mjs'
]);

function createRoleContext(purpose) {
  const compiled = compileAgentAuthoringContext(agent, {
    purpose,
    id: `narrative-continuity.${purpose.toLowerCase()}.forward-context@1`,
    commands: COMMANDS
  });
  const build = compiled.agent.value('build');
  const selected = contextRecord(
    'agent', compiled.agent.id,
    contextField('build', build.id),
    contextField('buildDigest', build.digest),
    contextField('description', compiled.agent.value('description') || ''),
    contextField('rulePacks', ...compiled.agent.values('rulePacks'))
  );
  return agentAuthoringContext(compiled.id)
    .digest(compiled.digest)
    .purpose(compiled.purpose)
    .agent(selected)
    .ontology(...compiled.ontology)
    .circuits(...compiled.circuits)
    .materializationProfile(compiled.materializationProfile)
    .semanticDemand(compiled.semanticDemand)
    .sdkImports(...compiled.sdkImports)
    .commands(...compiled.commands)
    .theorySources(...compiled.theorySources)
    .methodCatalog(compiled.methodCatalog)
    .providers(...compiled.providers)
    .tests(...compiled.tests)
    .benchmarks(...compiled.benchmarks)
    .seal();
}

export { createRoleContext };
