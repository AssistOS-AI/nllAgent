import { cp, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { quote } from '../core/canonical-source.mjs';
import { NllError } from '../core/errors.mjs';
import { atomicWrite, ensureDirectory } from '../core/io.mjs';
import { sortableId } from '../core/ids.mjs';

const AUTHORING_ROOTS = Object.freeze(['ontologies', 'longtext', 'circuits', 'cnl', 'benchmark', 'notes']);

async function copyRegularTree(source, target) {
  const info = await stat(source).catch(() => null);
  if (!info?.isDirectory()) throw new NllError('folder-not-found', `Folder not found: ${source}`);
  await ensureDirectory(target);
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new NllError('learning-symlink', `Learning input contains a symbolic link: ${entry.name}`);
    const from = join(source, entry.name);
    const to = join(target, entry.name);
    if (entry.isDirectory()) await copyRegularTree(from, to);
    else if (entry.isFile()) await cp(from, to);
  }
}

function runProcess(command, arguments_, options) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, arguments_, { cwd: options.cwd, env: options.env, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolvePromise(Object.freeze({ code, stdout, stderr })));
  });
}

async function runLearning({ agent, rulesRoot, codexBin = 'codex', env = process.env, processRunner = runProcess }) {
  const id = sortableId('learning');
  const root = join(agent.root, 'learning-runs', id);
  const workspace = join(root, 'workspace');
  await ensureDirectory(workspace);
  await copyRegularTree(rulesRoot, join(workspace, 'authority'));
  for (const family of AUTHORING_ROOTS) {
    const source = join(agent.root, family);
    if ((await stat(source).catch(() => null))?.isDirectory()) await copyRegularTree(source, join(workspace, family));
  }
  const task = [
    'Rebuild this nllAgent experiment using only executable ESM modules and Markdown.',
    'Use the linked ontology, LongText, circuit, CNL, benchmark, integration, and review skills.',
    'Do not create data manifests or hidden configuration ASTs. Return changes in the workspace.'
  ].join(' ');
  const result = await processRunner(codexBin, ['exec', '--sandbox', 'workspace-write', '--ephemeral', task], { cwd: workspace, env });
  await atomicWrite(join(root, 'events.md'), `# Learning execution\n\nExit: ${result.code}\n\n## Output\n\n${result.stdout}\n\n## Diagnostics\n\n${result.stderr}\n`);
  if (result.code !== 0) throw new NllError('learning-failed', `Coding Agent exited with ${result.code}.`);
  await atomicWrite(join(root, 'result.mjs'), [
    `import { field, workspaceEvent } from ${quote('../../../../src/artifacts/workspace-event.mjs')};`,
    `export default workspaceEvent('learning',${quote(id)},field('status','completed'));`,
    ''
  ].join('\n'));
  return Object.freeze({ id, root, status: 'completed' });
}

export { AUTHORING_ROOTS, copyRegularTree, runLearning, runProcess };
