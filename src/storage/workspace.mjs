import { readdir, stat } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { AgentProject } from '../agent/api.mjs';
import { quote } from '../core/canonical-source.mjs';
import { NllError } from '../core/errors.mjs';
import { atomicWrite, ensureDirectory, loadModule } from '../core/io.mjs';
import { containedPath, validateAgentName } from '../core/paths.mjs';

async function loadAgent(dataRoot, name) {
  validateAgentName(name);
  const root = containedPath(dataRoot, name);
  const modulePath = join(root, 'agent.mjs');
  const loaded = await loadModule(modulePath).catch((error) => {
    if (error.code === 'module-not-found') throw new NllError('agent-not-found', `Agent not found: ${name}`);
    throw error;
  });
  if (!(loaded.default instanceof AgentProject)) {
    throw new NllError('invalid-agent-module', `${modulePath} must export an AgentProject.`);
  }
  return Object.freeze({ root, modulePath, project: loaded.default });
}

async function listAgents(dataRoot) {
  const entries = await readdir(dataRoot, { withFileTypes: true }).catch(() => []);
  const agents = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^[a-z][a-z0-9-]{0,62}$/u.test(entry.name)) continue;
    const info = await stat(join(dataRoot, entry.name, 'agent.mjs')).catch(() => null);
    if (info?.isFile()) agents.push(entry.name);
  }
  return Object.freeze(agents.sort());
}

async function initializeAgent(dataRoot, name, options) {
  validateAgentName(name);
  const root = containedPath(dataRoot, name);
  await ensureDirectory(join(root, 'ontologies'));
  await ensureDirectory(join(root, 'longtext'));
  await ensureDirectory(join(root, 'circuits'));
  await ensureDirectory(join(root, 'cnl'));
  await ensureDirectory(join(root, 'benchmarks'));
  const agentApi = relativeSpecifier(root, options.agentApi);
  const ontologyApi = relativeSpecifier(join(root, 'ontologies'), options.ontologyApi);
  const ontologySource = [
    `import { ontology } from ${quote(ontologyApi)};`,
    '',
    `const O = ontology(${quote(`${name}.ontology@1`)});`,
    'export default O.seal();',
    ''
  ].join('\n');
  const agentSource = [
    `import { agent, description, using } from ${quote(agentApi)};`,
    "import ontology from './ontologies/index.mjs';",
    '',
    `export default agent(${quote(name)},description(${quote(options.description || '')}),using(ontology));`,
    ''
  ].join('\n');
  await atomicWrite(join(root, 'ontologies', 'index.mjs'), ontologySource);
  await atomicWrite(join(root, 'agent.mjs'), agentSource);
  return Object.freeze({ name, root });
}

function relativeSpecifier(fromDirectory, target) {
  let path = resolve(target);
  path = path.slice(resolve(fromDirectory).length + (path.startsWith(resolve(fromDirectory)) ? 1 : 0));
  if (resolve(target).startsWith(resolve(fromDirectory))) return `./${path.replaceAll('\\', '/')}`;
  const fromParts = resolve(fromDirectory).split('/').filter(Boolean);
  const targetParts = resolve(target).split('/').filter(Boolean);
  while (fromParts.length && targetParts.length && fromParts[0] === targetParts[0]) {
    fromParts.shift();
    targetParts.shift();
  }
  return `${'../'.repeat(fromParts.length)}${targetParts.join('/')}`;
}

async function listModules(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const results = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await listModules(path));
    else if (entry.isFile() && entry.name.endsWith('.mjs')) results.push(path);
  }
  return results.sort();
}

async function createWorkspaceEvent(agent, family, source) {
  const directory = join(agent.root, family);
  await ensureDirectory(directory);
  const id = `${family.slice(0, -1)}-${Date.now()}-${process.pid}`;
  const path = join(directory, `${id}.mjs`);
  await atomicWrite(path, source(id));
  return Object.freeze({ id, path: basename(path) });
}

export { createWorkspaceEvent, initializeAgent, listAgents, listModules, loadAgent, relativeSpecifier };
