import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as coreVocabulary from '../../ontologies/core/index.mjs';
import { AgentProject } from '../agent/api.mjs';
import { RulePack } from '../architecture/index.mjs';
import { runBenchmark } from '../benchmark/runner.mjs';
import { analyzeProject } from '../runtime/agent-runner.mjs';
import { AgentAuthoringContext } from '../context/index.mjs';

async function filesBelow(root, suffix) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true }).catch(() => [])) {
    if (entry.isSymbolicLink()) throw new Error(`Candidate contains a symbolic link: ${join(root, entry.name)}`);
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(path, suffix));
    else if (entry.isFile() && entry.name.endsWith(suffix)) files.push(path);
  }
  return files.sort();
}

const [candidateRoot, expectedAgent, contextRequirement = 'bootstrap'] = process.argv.slice(2);
const agentPath = join(candidateRoot, 'agent.mjs');
const packPath = join(candidateRoot, 'pack.mjs');
const agentLoaded = await import(pathToFileURL(agentPath).href);
const packLoaded = await import(pathToFileURL(packPath).href);
const ontologyLoaded = await import(pathToFileURL(join(candidateRoot, 'ontologies', 'index.mjs')).href);
if (!(agentLoaded.default instanceof AgentProject)) throw new Error('agent.mjs must export an AgentProject.');
if (agentLoaded.default.id !== expectedAgent) throw new Error(`Agent identity ${agentLoaded.default.id} does not match ${expectedAgent}.`);
if (!(packLoaded.default instanceof RulePack)) throw new Error('pack.mjs must export a sealed RulePack.');
if (!agentLoaded.default.rulePacks.includes(packLoaded.default)) throw new Error('agent.mjs must assemble the validated pack.mjs.');
if (agentLoaded.default.materializationProfiles.length !== 1) throw new Error('agent.mjs must select exactly one MaterializationProfile.');
if (!agentLoaded.default.circuits.length) throw new Error('agent.mjs must assemble at least one executable CircuitJS circuit.');
for (const name of ['Document', 'Paragraph', 'Sentence', 'Finding', 'named', 'order', 'text', 'grounded']) {
  if (!ontologyLoaded[name]) throw new Error(`ontologies/index.mjs must expose the shared ${name} constructor.`);
}

for (const required of [
  join(candidateRoot, 'context', 'agent-context.mjs'),
  join(candidateRoot, 'context', 'agent-context.md')
]) {
  if (!(await stat(required).catch(() => null))?.isFile()) throw new Error(`Missing required candidate artifact: ${required}`);
}
const contextEntries = (await readdir(join(candidateRoot, 'context'))).sort();
if (contextEntries.join(',') !== 'agent-context.md,agent-context.mjs') {
  throw new Error('context/ may contain only agent-context.mjs and agent-context.md.');
}
if (contextRequirement === 'typed') {
  const contextLoaded = await import(pathToFileURL(join(candidateRoot, 'context', 'agent-context.mjs')).href);
  if (!(contextLoaded.default instanceof AgentAuthoringContext)) {
    throw new Error('Final agent-context.mjs must export an AgentAuthoringContext.');
  }
  const build = contextLoaded.default.agent.value('build');
  if (build.agentId !== expectedAgent) throw new Error('Final agent context belongs to a different agent.');
}

const cases = await filesBelow(join(candidateRoot, 'benchmarks'), 'case.mjs');
if (!cases.length) throw new Error('The candidate must contain at least one semantic benchmark case.');
const benchmark = await runBenchmark(
  Object.freeze({ root: candidateRoot, project: agentLoaded.default }),
  (text, id) => analyzeProject(agentLoaded.default, text, id, { foundation: 'off' }),
  coreVocabulary,
  { foundation: 'off' }
);
if (!benchmark.passed) {
  const failures = benchmark.results.filter((result) => !result.passed)
    .map((result) => `${result.id}: ${result.failures.join('; ')}`);
  throw new Error(`Semantic benchmark failed: ${failures.join(' | ')}`);
}

process.stdout.write(`agent=${expectedAgent}\npack=${packLoaded.default.id}\nbenchmarks=${benchmark.passedCount}/${benchmark.total}\n`);
