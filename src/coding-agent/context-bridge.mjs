import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import coreOntology, { Document } from '../../ontologies/core/index.mjs';
import {
  agent, benchmarks, build, materializationProfiles, tests, theorySources, using
} from '../agent/api.mjs';
import { conceptRef, groundingRequirement, materializationProfile, observe } from '../architecture/index.mjs';
import { digestSource } from '../core/canonical-source.mjs';
import { NllError } from '../core/errors.mjs';
import { atomicWrite, ensureDirectory, loadModule, readUtf8 } from '../core/io.mjs';
import {
  agentBuild, compileAgentAuthoringContext, contextResource,
  renderAgentContextMarkdown, renderAgentContextModule
} from '../context/index.mjs';
import { copyRegularTree } from './workspace.mjs';

async function hasContext(root) {
  const moduleInfo = await stat(join(root, 'agent-context.mjs')).catch(() => null);
  const reportInfo = await stat(join(root, 'agent-context.md')).catch(() => null);
  return Boolean(moduleInfo?.isFile() && reportInfo?.isFile());
}

async function bootstrapTrainingContext({ targetRoot, agentId, repositoryRoot, theoryFiles = [] }) {
  const theory = [];
  for (const path of theoryFiles) {
    const content = await readFile(path, 'utf8');
    theory.push(contextResource('theory', `theory-input/${path.split('/').at(-1)}`, `sha256:${digestSource(content)}`));
  }
  if (!theory.length) {
    theory.push(contextResource('theory', 'theory-input/required.md', 'required-by-training-contract'));
  }
  const profile = materializationProfile('nll.bootstrap.profile@1')
    .observations(observe(conceptRef(Document.definition.id)))
    .groundEveryClaimWith(groundingRequirement('source-span'))
    .seal();
  const bootstrap = agent(
    agentId,
    using(coreOntology),
    materializationProfiles(profile),
    build(agentBuild(agentId, 'new-candidate', `sha256:${digestSource(theory)}`)),
    theorySources(...theory),
    tests(contextResource('test', 'generated/tests-required', 'required-by-training-contract')),
    benchmarks(contextResource('benchmark', 'generated/benchmarks-required', 'required-by-training-contract'))
  );
  const context = compileAgentAuthoringContext(bootstrap, {
    purpose: 'TRAIN',
    commands: [
      'node tools/nll.mjs ontology check generated/ontologies/index.mjs',
      'node --test generated/tests/*.test.mjs',
      'node tools/nll.mjs benchmark run generated/agent.mjs'
    ]
  });
  await writeContext(targetRoot, context);
  return Object.freeze({ root: targetRoot, fallback: false, context, bootstrap: true, repositoryRoot });
}

async function prepareAgentContext({
  targetRoot, purpose, agentId, buildId = '', buildDigest = '', repositoryRoot, sourceRoot = null,
  contextProvider = null, candidateRoot = null, theoryFiles = []
}) {
  if (sourceRoot && await hasContext(sourceRoot)) {
    await ensureDirectory(targetRoot);
    await copyRegularTree(sourceRoot, targetRoot);
    return Object.freeze({ root: targetRoot, fallback: false });
  }
  if (contextProvider) {
    const result = await contextProvider({
      targetRoot, purpose, agentId, buildId, buildDigest, repositoryRoot, sourceRoot, candidateRoot
    });
    if (!await hasContext(targetRoot)) {
      throw new NllError('agent-context-missing', 'Context provider did not create agent-context.mjs and agent-context.md.');
    }
    return Object.freeze({ root: targetRoot, fallback: false, result });
  }
  if (candidateRoot && buildId && buildDigest) {
    const loaded = await loadModule(join(candidateRoot, 'agent.mjs'));
    const context = compileAgentAuthoringContext(loaded.default, {
      purpose,
      build: agentBuild(agentId, buildId, buildDigest),
      commands: [
        'node --test tests/*.test.mjs',
        'node tools/nll.mjs benchmark run <agent-build>'
      ]
    });
    await writeContext(targetRoot, context);
    return Object.freeze({ root: targetRoot, fallback: false, context });
  }
  if (String(purpose).toUpperCase() === 'TRAINING' || String(purpose).toUpperCase() === 'TRAIN') {
    return bootstrapTrainingContext({ targetRoot, agentId, repositoryRoot, theoryFiles });
  }
  throw new NllError('agent-context-unavailable', `Cannot build ${purpose} context for ${agentId} without a pinned build.`);
}

async function writeContext(targetRoot, context) {
  await ensureDirectory(targetRoot);
  await atomicWrite(join(targetRoot, 'agent-context.mjs'), renderAgentContextModule(context, {
    apiModule: new URL('../context/index.mjs', import.meta.url).href
  }));
  await atomicWrite(join(targetRoot, 'agent-context.md'), renderAgentContextMarkdown(context));
}

async function contextMarkdown(contextRoot) { return readUtf8(join(contextRoot, 'agent-context.md')); }

export { bootstrapTrainingContext, contextMarkdown, hasContext, prepareAgentContext, writeContext };
