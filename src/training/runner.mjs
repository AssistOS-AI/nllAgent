import { createHash } from 'node:crypto';
import { cp, lstat, readdir, rename, stat } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { quote } from '../core/canonical-source.mjs';
import { NllError } from '../core/errors.mjs';
import { sortableId } from '../core/ids.mjs';
import { atomicWrite, ensureDirectory } from '../core/io.mjs';
import { invokeCodexRole, prepareAgentContext, runProcess } from '../coding-agent/index.mjs';
import { isolatedEnvironment } from '../coding-agent/sandbox.mjs';
import { copyRegularTree, listGeneratedFiles } from '../coding-agent/workspace.mjs';
import {
  agentWorkspace, initializeAgent, listModules, loadAgentBuild, writeCurrentBuild
} from '../storage/workspace.mjs';

const TRAINING_ROLE = 'nll-train-agent';
const REVIEW_ROLE = 'nll-review-and-repair';

async function copyTheoryFiles(paths, targetRoot) {
  if (!paths.length) throw new NllError('missing-theory-source', 'Training requires at least one --theory Markdown source.');
  await ensureDirectory(targetRoot);
  const copied = [];
  for (const [index, source] of paths.entries()) {
    const info = await lstat(source).catch(() => null);
    if (!info?.isFile() || info.isSymbolicLink()) throw new NllError('invalid-theory-source', `Theory source is not a regular file: ${source}`);
    if (extname(source) !== '.md') throw new NllError('invalid-theory-source', `Theory source must be Markdown: ${source}`);
    const name = `${String(index + 1).padStart(3, '0')}-${basename(source)}`;
    const target = join(targetRoot, name);
    await cp(source, target);
    copied.push(target);
  }
  return Object.freeze(copied);
}

async function digestTree(root, ignoredTopLevel = new Set()) {
  const hash = createHash('sha256');
  async function visit(directory) {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink()) throw new NllError('coding-agent-symlink', `Candidate contains a symbolic link: ${entry.name}`);
      const path = join(directory, entry.name);
      const relative = path.slice(root.length + 1).replaceAll('\\', '/');
      if (!relative.includes('/') && ignoredTopLevel.has(relative)) continue;
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) {
        hash.update(relative);
        hash.update('\0');
        hash.update(await import('node:fs/promises').then(({ readFile }) => readFile(path)));
        hash.update('\0');
      }
    }
  }
  await visit(root);
  return `sha256:${hash.digest('hex')}`;
}

async function runCandidateTests(candidateRoot, repositoryRoot, nodeBin, env, processRunner) {
  const tests = (await listModules(join(candidateRoot, 'tests'))).filter((path) => path.endsWith('.test.mjs'));
  if (!tests.length) throw new NllError('training-tests-missing', 'The candidate must contain at least one .test.mjs module.');
  const result = await processRunner(nodeBin, [
    '--permission', `--allow-fs-read=${resolve(repositoryRoot)}`, `--allow-fs-read=${resolve(candidateRoot)}`,
    join(repositoryRoot, 'src', 'training', 'run-candidate-tests.mjs'), ...tests
  ], { cwd: candidateRoot, env: isolatedEnvironment(env) });
  if (result.code !== 0) throw new NllError('training-tests-failed', result.stderr || result.stdout || 'Candidate tests failed.');
  return result;
}

async function validateCandidate(candidateRoot, agentId, repositoryRoot, options) {
  const validation = await options.processRunner(options.nodeBin, [
    '--permission', `--allow-fs-read=${resolve(repositoryRoot)}`, `--allow-fs-read=${resolve(candidateRoot)}`,
    join(repositoryRoot, 'src', 'training', 'validate-candidate.mjs'), candidateRoot, agentId,
    options.typedContext ? 'typed' : 'bootstrap'
  ], { cwd: candidateRoot, env: isolatedEnvironment(options.env) });
  if (validation.code !== 0) {
    throw new NllError('training-candidate-rejected', validation.stderr || validation.stdout || 'Candidate validation failed.');
  }
  const tests = await runCandidateTests(candidateRoot, repositoryRoot, options.nodeBin, options.env, options.processRunner);
  return Object.freeze({ validation, tests });
}

async function writeTrainingReport(root, phase, result) {
  await atomicWrite(join(root, `${phase}.md`), [
    `# ${phase}`, '', `Exit: ${result.code}`, '', '## Output', '', result.stdout || '', '',
    '## Diagnostics', '', result.stderr || '', ''
  ].join('\n'));
}

async function mergeReview(reviewRoot, candidateRoot) {
  const files = await listGeneratedFiles(reviewRoot);
  if (!files.length) throw new NllError('review-empty-output', 'Independent review produced no artifacts.');
  for (const file of files) {
    const source = join(reviewRoot, file);
    const target = join(candidateRoot, file);
    await ensureDirectory(join(target, '..'));
    await cp(source, target);
  }
  return files;
}

async function promoteCandidate(agentRoot, candidateRoot, buildId, digest) {
  const buildsRoot = join(agentRoot, 'builds');
  const buildRoot = join(buildsRoot, buildId);
  const pendingRoot = join(buildsRoot, `.pending-${buildId}`);
  if (await stat(buildRoot).catch(() => null)) throw new NllError('agent-build-exists', `Build already exists: ${buildId}`);
  await copyRegularTree(candidateRoot, pendingRoot);
  await rename(pendingRoot, buildRoot);
  await atomicWrite(join(buildRoot, 'build.mjs'), [
    `export const buildId = ${quote(buildId)};`,
    `export const digest = ${quote(digest)};`,
    ''
  ].join('\n'));
  await writeCurrentBuild(agentRoot, buildId, digest);
  return buildRoot;
}

async function runTraining({
  dataRoot, agentId, theoryPaths, repositoryRoot, skillsRoot,
  codexBin = 'codex', nodeBin = process.execPath, env = process.env, processRunner = runProcess,
  contextProvider = null
}) {
  const initialized = await initializeAgent(dataRoot, agentId);
  const runId = sortableId('training');
  const root = join(initialized.root, 'training-runs', runId);
  const theoryRoot = join(root, 'theory-input');
  const contextRoot = join(root, 'context');
  await ensureDirectory(root);
  const theory = await copyTheoryFiles(theoryPaths, theoryRoot);
  const current = await loadAgentBuild(dataRoot, agentId).catch((error) => {
    if (error.code === 'agent-not-trained') return null;
    throw error;
  });
  const currentBuild = current?.buildId ?? null;
  await prepareAgentContext({
    targetRoot: contextRoot, purpose: 'TRAIN', agentId, buildId: currentBuild || '',
    buildDigest: current?.buildDigest || '', repositoryRoot,
    candidateRoot: current?.root || null, theoryFiles: theory, contextProvider
  });

  const training = await invokeCodexRole({
    role: TRAINING_ROLE,
    request: Object.freeze({
      agentId, theoryFiles: theory.map((path) => basename(path)), previousBuild: currentBuild || 'none',
      outputContract: 'Write one complete tested candidate under generated/ and do not mutate any promoted build.'
    }),
    workspaceRoot: join(root, 'codex-training'), skillsRoot, codexBin, env, processRunner,
    inputs: [
      { source: theoryRoot, target: 'theory-input' },
      { source: contextRoot, target: 'context' },
      ...(currentBuild ? [{ source: join(initialized.root, 'builds', currentBuild), target: 'current-agent' }] : [])
    ]
  });
  await writeTrainingReport(root, 'authoring', { code: 0, stdout: training.output, stderr: '' });
  const candidateRoot = training.generatedRoot;
  await copyTheoryFiles(theoryPaths, join(candidateRoot, 'theory', 'sources'));
  await prepareAgentContext({
    targetRoot: join(candidateRoot, 'context'), purpose: 'TRAIN', agentId, repositoryRoot,
    sourceRoot: contextRoot, theoryFiles: theory
  });
  const validationOptions = { nodeBin, env, processRunner };
  const initial = await validateCandidate(candidateRoot, agentId, repositoryRoot, validationOptions);
  await writeTrainingReport(root, 'initial-validation', {
    code: 0, stdout: `${initial.validation.stdout}\n${initial.tests.stdout}`, stderr: initial.tests.stderr
  });

  const reviewDigest = await digestTree(candidateRoot, new Set(['context', 'build.mjs']));
  await prepareAgentContext({
    targetRoot: join(candidateRoot, 'context'), purpose: 'REVIEW', agentId,
    buildId: `review-${runId.slice('training-'.length)}`, buildDigest: reviewDigest,
    repositoryRoot, contextProvider, candidateRoot
  });

  const review = await invokeCodexRole({
    role: REVIEW_ROLE,
    request: Object.freeze({
      agentId, reviewKind: 'training-candidate',
      contract: 'Review candidate/ independently. Put only repaired or review artifacts under generated/. Never change authority or weaken an oracle.'
    }),
    workspaceRoot: join(root, 'codex-review'), skillsRoot, codexBin, env, processRunner,
    inputs: [
      { source: candidateRoot, target: 'candidate' },
      { source: join(candidateRoot, 'context'), target: 'context' },
      { source: theoryRoot, target: 'theory-input' }
    ]
  });
  await writeTrainingReport(root, 'independent-review', { code: 0, stdout: review.output, stderr: '' });
  await mergeReview(review.generatedRoot, candidateRoot);
  const digest = await digestTree(candidateRoot, new Set(['context', 'build.mjs']));
  const buildId = `build-${runId.slice('training-'.length)}-${digest.slice(7, 19)}`;
  await prepareAgentContext({
    targetRoot: join(candidateRoot, 'context'), purpose: 'ANALYZE', agentId, buildId, buildDigest: digest,
    repositoryRoot, contextProvider, candidateRoot
  });
  const final = await validateCandidate(candidateRoot, agentId, repositoryRoot, {
    ...validationOptions, typedContext: true
  });
  await writeTrainingReport(root, 'final-validation', {
    code: 0, stdout: `${final.validation.stdout}\n${final.tests.stdout}`, stderr: final.tests.stderr
  });

  const buildRoot = await promoteCandidate(initialized.root, candidateRoot, buildId, digest);
  await atomicWrite(join(root, 'result.mjs'), [
    `export const trainingId = ${quote(runId)};`, `export const status = ${quote('PROMOTED')};`,
    `export const agentId = ${quote(agentId)};`, `export const buildId = ${quote(buildId)};`,
    `export const digest = ${quote(digest)};`, ''
  ].join('\n'));
  return Object.freeze({ id: runId, status: 'PROMOTED', agentId, agentRoot: agentWorkspace(dataRoot, agentId), buildId, buildRoot, digest, root });
}

export {
  REVIEW_ROLE, TRAINING_ROLE, copyTheoryFiles, digestTree, promoteCandidate, runCandidateTests,
  runTraining, validateCandidate
};
