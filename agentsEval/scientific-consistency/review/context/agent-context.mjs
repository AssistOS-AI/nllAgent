import {
  agentAuthoringContext,
  contextField,
  contextRecord
} from '../../../../src/context/index.mjs';

import compiled from '../compiled-context/agent-context.mjs';

const agent = contextRecord(
  'agent',
  compiled.agent.id,
  contextField('build', compiled.agent.value('build').id),
  contextField('description', compiled.agent.value('description') ?? ''),
  contextField('rulePacks', ...compiled.agent.values('rulePacks'))
);

export default agentAuthoringContext(compiled.id)
  .digest(compiled.digest)
  .purpose(compiled.purpose)
  .agent(agent)
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
