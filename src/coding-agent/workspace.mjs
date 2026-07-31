import { cp, lstat, readdir, stat } from 'node:fs/promises';
import { basename, join, relative, resolve, sep } from 'node:path';
import { NllError } from '../core/errors.mjs';
import { atomicWrite, ensureDirectory } from '../core/io.mjs';

const EXECUTABLE_EXTENSIONS = Object.freeze(['.mjs', '.md']);

function assertContained(root, path) {
  const base = resolve(root);
  const target = resolve(path);
  const value = relative(base, target);
  if (value === '..' || value.startsWith(`..${sep}`)) throw new NllError('path-escape', `Path escapes Coding Agent workspace: ${target}`);
  return target;
}

async function copyRegularTree(source, target) {
  const info = await stat(source).catch(() => null);
  if (!info?.isDirectory()) throw new NllError('folder-not-found', `Folder not found: ${source}`);
  await ensureDirectory(target);
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new NllError('coding-agent-symlink', `Coding Agent input contains a symbolic link: ${entry.name}`);
    const sourcePath = join(source, entry.name);
    const targetPath = join(target, entry.name);
    if (entry.isDirectory()) await copyRegularTree(sourcePath, targetPath);
    else if (entry.isFile()) await cp(sourcePath, targetPath);
  }
}

async function copyRegularInput(source, target) {
  const info = await lstat(source).catch(() => null);
  if (!info) throw new NllError('input-not-found', `Coding Agent input not found: ${source}`);
  if (info.isSymbolicLink()) throw new NllError('coding-agent-symlink', `Coding Agent input is a symbolic link: ${source}`);
  if (info.isDirectory()) return copyRegularTree(source, target);
  if (!info.isFile()) throw new NllError('invalid-coding-agent-input', `Coding Agent input is not a regular file: ${source}`);
  await ensureDirectory(join(target, '..'));
  await cp(source, target);
  return target;
}

async function listGeneratedFiles(root, current = root) {
  const files = [];
  const info = await stat(current).catch(() => null);
  if (!info?.isDirectory()) return Object.freeze(files);
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = assertContained(root, join(current, entry.name));
    if (entry.isSymbolicLink()) throw new NllError('coding-agent-symlink', `Generated output contains a symbolic link: ${entry.name}`);
    if (entry.isDirectory()) files.push(...await listGeneratedFiles(root, path));
    else if (entry.isFile()) {
      if (!EXECUTABLE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
        throw new NllError('coding-agent-output-type', `Generated artifact must be .mjs or .md: ${entry.name}`);
      }
      files.push(relative(root, path));
    }
  }
  return Object.freeze(files.sort());
}

async function installRoleSkill(skillsRoot, role, workspace) {
  const source = join(skillsRoot, role);
  const info = await stat(join(source, 'SKILL.md')).catch(() => null);
  if (!info?.isFile()) throw new NllError('missing-role-skill', `Coding Agent role has no skill: ${role}.`);
  const target = join(workspace, '.agents', 'skills', role);
  await copyRegularTree(source, target);
  return target;
}

async function copyProjectSlices(projectRoot, workspace, families) {
  const targetRoot = join(workspace, 'project');
  await ensureDirectory(targetRoot);
  for (const family of families) {
    if (basename(family) !== family) throw new NllError('invalid-project-slice', `Project slice must be a direct child: ${family}.`);
    const source = join(projectRoot, family);
    if ((await stat(source).catch(() => null))?.isDirectory()) await copyRegularTree(source, join(targetRoot, family));
  }
  return targetRoot;
}

async function prepareWorkspace({
  workspace, skillsRoot, role, projectRoot = null, families = [], inputs = [], requestText
}) {
  await ensureDirectory(workspace);
  await installRoleSkill(skillsRoot, role, workspace);
  if (projectRoot) await copyProjectSlices(projectRoot, workspace, families);
  for (const input of inputs) {
    if (!input?.source || !input?.target) throw new NllError('invalid-coding-agent-input', 'Workspace inputs require source and target paths.');
    await copyRegularInput(input.source, assertContained(workspace, join(workspace, input.target)));
  }
  await ensureDirectory(join(workspace, 'generated'));
  await atomicWrite(join(workspace, 'request.md'), requestText);
  return Object.freeze({ workspace, generatedRoot: join(workspace, 'generated') });
}

export {
  EXECUTABLE_EXTENSIONS, assertContained, copyProjectSlices, copyRegularInput, copyRegularTree, installRoleSkill,
  listGeneratedFiles, prepareWorkspace
};
