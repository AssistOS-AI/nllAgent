import { access, cp, lstat, readFile, readdir } from 'node:fs/promises';
import { basename, relative } from 'node:path';
import { digestJson, sha256Bytes } from '../core/canonical.mjs';
import { NllError, invariant } from '../core/errors.mjs';
import { atomicWrite, ensureDirectory, readJson, readUtf8, readUtf8Strict, writeJson } from '../core/io.mjs';
import { assertRealPathContained, containedPath, validateAgentName } from '../core/paths.mjs';
import { sortableId } from '../core/ids.mjs';
import { acquireLock } from './locks.mjs';

const AGENT_DIRECTORIES = [
  'authority', 'operational-context', 'circuits', 'schemas', 'extraction',
  'releases', 'runs', 'learning-runs', 'issues', 'benchmark/public',
  'planning-runs',
  'benchmark/development', 'benchmark/holdout', 'benchmark/scenarios',
  'benchmark/adversarial', 'benchmark/metamorphic', 'benchmark/mutations',
  'candidates', 'locks', 'proposals', 'feedback', 'cache', 'temporary'
];

function agentRoot(dataRoot, agentName) {
  return containedPath(dataRoot, validateAgentName(agentName));
}

async function pathExists(path) {
  return access(path).then(() => true, () => false);
}

async function initializeAgent(dataRoot, name, options = {}) {
  await ensureDirectory(dataRoot);
  const root = agentRoot(dataRoot, name);
  const rootMetadata = await lstat(root).catch(() => null);
  if (rootMetadata?.isSymbolicLink()) {
    throw new NllError('agent-path-unsafe', `Agent path for ${name} must not be a symbolic link.`, { root });
  }
  if (await pathExists(containedPath(root, 'agent.json'))) {
    throw new NllError('agent-exists', `Agent ${name} already exists.`, { root });
  }
  for (const directory of AGENT_DIRECTORIES) await ensureDirectory(containedPath(root, directory));
  const manifest = {
    kind: 'NaturalLanguageLinterProject',
    schemaVersion: 1,
    name,
    description: options.description || `Natural-language linter agent ${name}`,
    intendedUse: options.intendedUse || 'Review Markdown documents with explicitly published circuits.',
    defaultLanguage: options.language || 'en',
    requiredCircuits: [],
    retention: { runs: 'retain', issues: 'retain', modelCaptures: 'project-policy' },
    learning: { selectedIssueStatuses: ['open', 'triaged'] }
  };
  await writeJson(containedPath(root, 'agent.json'), manifest);
  return { root, manifest };
}

async function loadAgent(dataRoot, name) {
  const root = agentRoot(dataRoot, name);
  const rootMetadata = await lstat(root).catch(() => null);
  if (!rootMetadata?.isDirectory() || rootMetadata.isSymbolicLink()) {
    throw new NllError('agent-not-found', `Agent ${name} does not exist as a regular workspace directory.`, { root });
  }
  await assertRealPathContained(dataRoot, root);
  const manifestMetadata = await lstat(containedPath(root, 'agent.json')).catch(() => null);
  if (!manifestMetadata?.isFile() || manifestMetadata.isSymbolicLink()) {
    throw new NllError('invalid-agent', 'Agent manifest must be a regular file inside its workspace.', { root });
  }
  const manifest = await readJson(containedPath(root, 'agent.json')).catch((error) => {
    if (error.code === 'file-read-failed') {
      throw new NllError('agent-not-found', `Agent ${name} does not exist.`, { root });
    }
    throw error;
  });
  invariant(manifest.kind === 'NaturalLanguageLinterProject', 'invalid-agent', 'Invalid agent manifest kind.', { root });
  invariant(manifest.name === name, 'invalid-agent', 'Agent manifest name does not match its directory.', { root });
  return { root, manifest };
}

async function listAgents(dataRoot) {
  const entries = await readdir(dataRoot, { withFileTypes: true }).catch(() => []);
  const agents = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory()) continue;
    try {
      validateAgentName(entry.name);
      const agent = await loadAgent(dataRoot, entry.name);
      const active = await readJson(containedPath(agent.root, 'active-release.json')).catch((error) =>
        error.code === 'file-read-failed' ? null : Promise.reject(error));
      agents.push({
        name: agent.manifest.name,
        description: agent.manifest.description,
        intendedUse: agent.manifest.intendedUse,
        activeRelease: active?.release || null
      });
    } catch (error) {
      if (!['invalid-agent-name', 'agent-not-found', 'invalid-agent'].includes(error.code)) throw error;
    }
  }
  return agents;
}

async function loadActiveRelease(agent) {
  const pointerPath = containedPath(agent.root, 'active-release.json');
  const pointer = await readJson(pointerPath).catch((error) => {
    if (error.code === 'file-read-failed') {
      throw new NllError('no-active-release', `Agent ${agent.manifest.name} has no active release.`, { pointerPath });
    }
    throw error;
  });
  return loadRelease(agent, pointer.release, pointer.manifestDigest);
}

async function loadRelease(agent, version, expectedDigest = undefined) {
  invariant(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version || ''), 'invalid-release', 'Release version must use semantic versioning.');
  const root = containedPath(agent.root, 'releases', version);
  const rootMetadata = await lstat(root).catch(() => null);
  if (!rootMetadata?.isDirectory() || rootMetadata.isSymbolicLink()) {
    throw new NllError('release-integrity-failed', `Release ${version} must be a regular directory.`);
  }
  await assertRealPathContained(agent.root, root);
  const manifestPath = containedPath(root, 'release.json');
  const manifestMetadata = await lstat(manifestPath).catch(() => null);
  if (!manifestMetadata?.isFile() || manifestMetadata.isSymbolicLink()) {
    throw new NllError('release-integrity-failed', `Release ${version} manifest must be a regular file.`);
  }
  const manifest = await readJson(manifestPath);
  const manifestDigest = digestJson(manifest);
  const publicationPath = containedPath(root, 'publication.json');
  const publicationMetadata = await lstat(publicationPath).catch(() => null);
  if (!publicationMetadata?.isFile() || publicationMetadata.isSymbolicLink()) {
    throw new NllError('release-integrity-failed', `Release ${version} publication record must be a regular file.`);
  }
  const publication = await readJson(publicationPath);
  if (publication.status !== 'published' || publication.release !== version
    || publication.manifestDigest !== manifestDigest) {
    throw new NllError('release-integrity-failed', `Release ${version} publication record does not match its manifest.`);
  }
  if (expectedDigest && manifestDigest !== expectedDigest) {
    throw new NllError('release-integrity-failed', 'Active release manifest digest does not match.', {
      version, expectedDigest, actualDigest: manifestDigest
    });
  }
  invariant(manifest.status === 'published', 'release-not-published', `Release ${version} is not published.`);
  await verifyReleaseFiles(root, manifest);
  return { root, manifest, manifestDigest };
}

async function verifyReleaseFiles(root, manifest) {
  if (!Array.isArray(manifest.files)) {
    throw new NllError('release-integrity-failed', 'Published release manifest requires a files array.');
  }
  const declared = new Map();
  for (const entry of manifest.files) {
    if (!entry || typeof entry.path !== 'string' || !/^sha256:[a-f0-9]{64}$/u.test(entry.digest || '')) {
      throw new NllError('release-integrity-failed', 'Release file entries require a path and SHA-256 digest.');
    }
    if (declared.has(entry.path)) {
      throw new NllError('release-integrity-failed', `Release file ${entry.path} is declared more than once.`);
    }
    declared.set(entry.path, entry.digest);
  }
  const actual = new Set();
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = containedPath(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) actual.add(relative(root, path).replaceAll('\\', '/'));
      else {
        throw new NllError('release-integrity-failed', `Release contains a non-regular entry: ${path}.`);
      }
    }
  }
  await visit(root);
  const permittedMetadata = new Set(['release.json', 'publication.json']);
  const unexpected = [...actual].filter((path) => !permittedMetadata.has(path) && !declared.has(path));
  if (unexpected.length) {
    throw new NllError('release-integrity-failed', 'Release contains files absent from its published manifest.', {
      unexpected: unexpected.sort()
    });
  }
  for (const entry of manifest.files || []) {
    const path = containedPath(root, entry.path);
    const metadata = await lstat(path).catch(() => null);
    if (!metadata?.isFile() || metadata.isSymbolicLink()) {
      throw new NllError('release-integrity-failed', `Release file ${entry.path} is absent or is not a regular file.`);
    }
    await assertRealPathContained(root, path);
    const digest = sha256Bytes(await readFile(path));
    if (digest !== entry.digest) {
      throw new NllError('release-integrity-failed', `Release file ${entry.path} has changed.`, {
        path: entry.path, expectedDigest: entry.digest, actualDigest: digest
      });
    }
  }
}

async function createRun(agent, inputPath, inputText, release, command, runtime = {}) {
  const id = sortableId('run');
  const root = containedPath(agent.root, 'runs', id);
  await ensureDirectory(root);
  const lock = await acquireLock(containedPath(root, '.lock'), { operation: `run:${id}` });
  await atomicWrite(containedPath(root, 'input.md'), inputText);
  const record = {
    kind: 'NaturalLanguageLinterRun', schemaVersion: 1, id,
    agent: agent.manifest.name, release: release.manifest.version,
    agentManifestDigest: digestJson(agent.manifest),
    releaseManifestDigest: release.manifestDigest,
    source: { suppliedName: basename(inputPath), digest: sha256Bytes(inputText), mediaType: 'text/markdown' },
    command, runtime, state: 'ingested'
  };
  await writeJson(containedPath(root, 'run.json'), record);
  return { id, root, record, lock };
}

async function createPlanningRun(agent, inputPath, inputText, release, command, runtime = {}) {
  const id = sortableId('planning');
  const root = containedPath(agent.root, 'planning-runs', id);
  await ensureDirectory(root);
  const lock = await acquireLock(containedPath(root, '.lock'), { operation: `planning:${id}` });
  await atomicWrite(containedPath(root, 'idea.md'), inputText);
  const record = {
    kind: 'NaturalLanguageLinterPlanningRun', schemaVersion: 1, id,
    agent: agent.manifest.name, release: release.manifest.version,
    agentManifestDigest: digestJson(agent.manifest), releaseManifestDigest: release.manifestDigest,
    source: { suppliedName: basename(inputPath), digest: sha256Bytes(inputText), mediaType: 'text/markdown' },
    command, runtime, state: 'ingested'
  };
  await writeJson(containedPath(root, 'planning.json'), record);
  return { id, root, record, lock };
}

async function updateRun(run, patch) {
  run.record = { ...run.record, ...patch };
  await writeJson(containedPath(run.root, 'run.json'), run.record);
  return run.record;
}

async function updatePlanningRun(run, patch) {
  run.record = { ...run.record, ...patch };
  await writeJson(containedPath(run.root, 'planning.json'), run.record);
  return run.record;
}

async function createIssue(agent, issue) {
  const id = sortableId('issue');
  const value = {
    kind: issue.kind || 'RuntimeIssue', schemaVersion: 1, id,
    agent: agent.manifest.name, status: 'open', severity: issue.severity || 'error',
    ...issue
  };
  await writeJson(containedPath(agent.root, 'issues', `${id}.json`), value);
  return value;
}

async function listIssues(agent, statuses = undefined) {
  const directory = containedPath(agent.root, 'issues');
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const issues = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const issue = await readJson(containedPath(directory, entry.name));
    if (!statuses || statuses.includes(issue.status)) issues.push(issue);
  }
  return issues;
}

async function createFeedback(agent, feedback) {
  const id = sortableId('feedback');
  const value = {
    kind: 'ReviewFeedback', schemaVersion: 1, id, agent: agent.manifest.name,
    status: 'submitted', authority: 'scoped-review-evidence', ...feedback
  };
  if (!value.run || !value.type || !value.message) {
    throw new NllError('invalid-feedback', 'Feedback requires run, type, and message.');
  }
  await writeJson(containedPath(agent.root, 'feedback', `${id}.json`), value);
  return value;
}

async function listMarkdownFiles(root) {
  const result = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = containedPath(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) result.push(path);
      else if (!entry.isFile()) {
        throw new NllError('rules-folder-unsafe', `Rule folders may contain only regular files and directories: ${path}`);
      }
    }
  }
  const metadata = await lstat(root).catch(() => null);
  if (!metadata?.isDirectory() || metadata.isSymbolicLink()) {
    throw new NllError('folder-not-found', `Directory does not exist as a regular tree: ${root}`, { root });
  }
  await visit(root);
  return result;
}

async function snapshotMarkdownFolder(sourceRoot, destinationRoot) {
  const files = await listMarkdownFiles(sourceRoot);
  if (files.length === 0) throw new NllError('rules-empty', 'Rule folder contains no Markdown files.', { sourceRoot });
  await ensureDirectory(destinationRoot);
  for (const source of files) {
    const relativePath = source.slice(sourceRoot.length).replace(/^\/+/, '');
    const destination = containedPath(destinationRoot, relativePath);
    await ensureDirectory(destination.slice(0, destination.lastIndexOf('/')));
    await cp(source, destination, { errorOnExist: true, force: false });
  }
  return Promise.all(files.map(async (path) => ({
    name: path.slice(sourceRoot.length).replace(/^\/+/, ''),
    digest: sha256Bytes(await readUtf8Strict(path))
  })));
}

export {
  agentRoot, createFeedback, createIssue, createPlanningRun, createRun, initializeAgent,
  listAgents, listIssues, listMarkdownFiles, loadActiveRelease, loadAgent, loadRelease,
  pathExists, snapshotMarkdownFolder, updatePlanningRun, updateRun, verifyReleaseFiles
};
