import { resolve } from 'node:path';
import { bootstrapTrainingContext, writeContext } from '../../../src/coding-agent/context-bridge.mjs';
import {
  agentAuthoringContext, contextField, contextRecord
} from '../../../src/context/index.mjs';

const scenarioRoot = resolve('agentsEval/privacy-retention');

const prepared = await bootstrapTrainingContext({
  targetRoot: resolve(scenarioRoot, 'training/context'),
  agentId: 'privacy-retention',
  repositoryRoot: resolve('.'),
  theoryFiles: [resolve(scenarioRoot, 'authority/retention-rules.md')]
});

// The role checker deliberately consumes the public build identifier as a string. Keep the
// bootstrap context typed everywhere else while exposing that stable identifier at its boundary.
const source = prepared.context;
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

await writeContext(resolve(scenarioRoot, 'training/context'), compatible);
