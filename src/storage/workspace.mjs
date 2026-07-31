import { readdir, stat } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import { AgentProject } from '../agent/api.mjs';
import { quote } from '../core/canonical-source.mjs';
import { NllError } from '../core/errors.mjs';
import { atomicWrite, ensureDirectory, loadModule } from '../core/io.mjs';
import { containedPath, validateAgentName } from '../core/paths.mjs';

const WORKSPACE_ID_PATTERN = /^[a-z][a-z0-9-]{0,126}$/u;

function agentsRoot(dataRoot) { return containedPath(dataRoot, 'agents'); }
function tasksRoot(dataRoot) { return containedPath(dataRoot, 'tasks'); }

function validateWorkspaceId(value, label = 'Workspace') {
  if (!WORKSPACE_ID_PATTERN.test(value)) {
    throw new NllError('invalid-workspace-id', `${label} id must match ${WORKSPACE_ID_PATTERN}: ${value}`);
  }
  return value;
}

function agentWorkspace(dataRoot, name) {
  validateAgentName(name);
  return containedPath(agentsRoot(dataRoot), name);
}

function taskWorkspace(dataRoot, id) {
  validateWorkspaceId(id, 'Task');
  return containedPath(tasksRoot(dataRoot), id);
}

async function readCurrentBuildId(agentRoot) {
  const pointerPath = join(agentRoot, 'current', 'build.mjs');
  const loaded = await loadModule(pointerPath).catch((error) => {
    if (error.code === 'module-not-found') {
      throw new NllError('agent-not-trained', `Agent has no promoted build: ${basename(agentRoot)}`);
    }
    throw error;
  });
  if (typeof loaded.buildId !== 'string' || !WORKSPACE_ID_PATTERN.test(loaded.buildId)) {
    throw new NllError('invalid-agent-build-pointer', `${pointerPath} must export one valid buildId.`);
  }
  return loaded.buildId;
}

async function loadAgentBuild(dataRoot, name, requestedBuild = null) {
  const agentRoot = agentWorkspace(dataRoot, name);
  const buildId = requestedBuild || await readCurrentBuildId(agentRoot);
  validateWorkspaceId(buildId, 'Build');
  const root = containedPath(agentRoot, 'builds', buildId);
  const modulePath = join(root, 'agent.mjs');
  const loaded = await loadModule(modulePath).catch((error) => {
    if (error.code === 'module-not-found') {
      throw new NllError('agent-build-not-found', `Agent build not found: ${name}@${buildId}`);
    }
    throw error;
  });
  if (!(loaded.default instanceof AgentProject)) {
    throw new NllError('invalid-agent-module', `${modulePath} must export an AgentProject.`);
  }
  if (loaded.default.id !== name) {
    throw new NllError('agent-build-identity-mismatch', `Build ${buildId} exports ${loaded.default.id}, expected ${name}.`);
  }
  const metadata = await loadModule(join(root, 'build.mjs')).catch(() => null);
  const buildDigest = typeof metadata?.digest === 'string' ? metadata.digest : '';
  return Object.freeze({ name, agentRoot, buildId, buildDigest, root, modulePath, project: loaded.default });
}

async function loadAgent(dataRoot, name) { return loadAgentBuild(dataRoot, name); }

async function listAgents(dataRoot) {
  const root = agentsRoot(dataRoot);
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const agents = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^[a-z][a-z0-9-]{0,62}$/u.test(entry.name)) continue;
    const pointer = await stat(join(root, entry.name, 'current', 'build.mjs')).catch(() => null);
    if (pointer?.isFile()) agents.push(entry.name);
  }
  return Object.freeze(agents.sort());
}

async function listTasks(dataRoot) {
  const root = tasksRoot(dataRoot);
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  return Object.freeze(entries
    .filter((entry) => entry.isDirectory() && WORKSPACE_ID_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort());
}

async function initializeEnvironment(dataRoot) {
  await ensureDirectory(agentsRoot(dataRoot));
  await ensureDirectory(tasksRoot(dataRoot));
  return Object.freeze({ agents: agentsRoot(dataRoot), tasks: tasksRoot(dataRoot) });
}

async function initializeAgent(dataRoot, name) {
  const root = agentWorkspace(dataRoot, name);
  await initializeEnvironment(dataRoot);
  await ensureDirectory(join(root, 'builds'));
  await ensureDirectory(join(root, 'current'));
  await ensureDirectory(join(root, 'training-runs'));
  await ensureDirectory(join(root, 'issues'));
  await ensureDirectory(join(root, 'feedback'));
  return Object.freeze({ name, root });
}

async function writeCurrentBuild(agentRoot, buildId, digest) {
  validateWorkspaceId(buildId, 'Build');
  const buildRoot = containedPath(agentRoot, 'builds', buildId);
  const info = await stat(join(buildRoot, 'agent.mjs')).catch(() => null);
  if (!info?.isFile()) throw new NllError('agent-build-not-found', `Cannot promote missing build ${buildId}.`);
  const currentRoot = join(agentRoot, 'current');
  await ensureDirectory(currentRoot);
  await atomicWrite(join(currentRoot, 'agent.mjs'), [
    `export { default } from ${quote(`../builds/${buildId}/agent.mjs`)};`, ''
  ].join('\n'));
  await atomicWrite(join(currentRoot, 'build.mjs'), [
    `export const buildId = ${quote(buildId)};`,
    `export const digest = ${quote(digest)};`,
    ''
  ].join('\n'));
  return Object.freeze({ buildId, digest, root: buildRoot });
}

async function createTask(dataRoot, id, pin) {
  const root = taskWorkspace(dataRoot, id);
  await initializeEnvironment(dataRoot);
  const existing = await stat(root).catch(() => null);
  if (existing) throw new NllError('task-already-exists', `Task already exists: ${id}`);
  await ensureDirectory(root);
  await writeTaskState(root, {
    id, status: 'CREATED', agent: pin.agent, build: pin.build, buildDigest: pin.buildDigest,
    sourceDigest: pin.sourceDigest, target: pin.target
  });
  return Object.freeze({ id, root });
}

async function writeTaskState(root, state) {
  const fields = [
    ['taskId', state.id], ['status', state.status], ['agentId', state.agent], ['agentBuild', state.build],
    ['agentBuildDigest', state.buildDigest], ['sourceDigest', state.sourceDigest], ['target', state.target]
  ];
  await atomicWrite(join(root, 'task.mjs'), `${fields.map(([name, value]) => `export const ${name} = ${quote(value || '')};`).join('\n')}\n`);
}

async function loadTask(dataRoot, id) {
  const root = taskWorkspace(dataRoot, id);
  const loaded = await loadModule(join(root, 'task.mjs'));
  if (loaded.taskId !== id || typeof loaded.agentId !== 'string' || typeof loaded.agentBuild !== 'string') {
    throw new NllError('invalid-task-module', `${join(root, 'task.mjs')} does not contain a valid task pin.`);
  }
  return Object.freeze({ id, root, ...loaded });
}

async function listModules(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const results = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new NllError('workspace-symlink', `Workspace contains a symbolic link: ${path}`);
    if (entry.isDirectory()) results.push(...await listModules(path));
    else if (entry.isFile() && entry.name.endsWith('.mjs')) results.push(path);
  }
  return results.sort();
}

async function createWorkspaceEvent(agent, family, source) {
  const directory = join(agent.agentRoot, family);
  await ensureDirectory(directory);
  const id = `${family.slice(0, -1)}-${Date.now()}-${process.pid}`;
  const path = join(directory, `${id}.mjs`);
  await atomicWrite(path, source(id));
  return Object.freeze({ id, path: basename(path) });
}

function relativeSpecifier(fromDirectory, target) {
  let value = relative(resolve(fromDirectory), resolve(target)).replaceAll('\\', '/');
  if (!value.startsWith('.')) value = `./${value}`;
  return value;
}

export {
  WORKSPACE_ID_PATTERN, agentWorkspace, agentsRoot, createTask, createWorkspaceEvent, initializeAgent,
  initializeEnvironment, listAgents, listModules, listTasks, loadAgent, loadAgentBuild, loadTask,
  readCurrentBuildId, relativeSpecifier, taskWorkspace, tasksRoot, validateWorkspaceId, writeCurrentBuild,
  writeTaskState
};
