import { lstat, readlink, symlink } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { atomicWrite, ensureDirectory } from '../core/io.mjs';
import { NllError } from '../core/errors.mjs';
import { containedPath } from '../core/paths.mjs';

const LEARNING_SKILLS = [
  'nll-scope-project',
  'nll-compile-theory',
  'nll-build-benchmark',
  'nll-learn-from-issues',
  'nll-prepare-release'
];

async function ensureSkillLink(agentRoot, repoRoot, skillName) {
  const source = containedPath(repoRoot, '.agents', 'skills', skillName);
  const target = containedPath(agentRoot, '.agents', 'skills', skillName);
  const sourceMetadata = await lstat(source).catch(() => null);
  if (!sourceMetadata?.isDirectory()) {
    throw new NllError('learning-skill-missing', `Learning skill ${skillName} is absent.`, { source });
  }
  const targetMetadata = await lstat(target).catch(() => null);
  if (targetMetadata) {
    if (!targetMetadata.isSymbolicLink()) {
      throw new NllError('learning-workspace-invalid', `Learning skill target is not a symlink: ${target}.`);
    }
    const current = resolve(dirname(target), await readlink(target));
    if (current !== source) {
      throw new NllError('learning-workspace-invalid', `Learning skill link points to the wrong source: ${target}.`);
    }
    return target;
  }
  await symlink(relative(dirname(target), source), target, 'dir');
  return target;
}

async function ensureLearningWorkspace(agentRoot, repoRoot) {
  await ensureDirectory(containedPath(agentRoot, '.agents', 'skills'));
  const links = [];
  for (const skillName of LEARNING_SKILLS) {
    links.push(await ensureSkillLink(agentRoot, repoRoot, skillName));
  }
  const guidance = `# NaturalLanguageLinterAgent Learning Workspace

## Scope

This directory is the complete workspace for one NaturalLanguageLinterAgent learning project.
Use only the skills linked under \`.agents/skills/\`. Do not invoke repository bootstrap,
documentation-rebuild, Ploinky-management, or unrelated imported skills from parent directories.

## Rules

- Treat \`learning-runs/<id>/input-rules/\` as the authority snapshot for the current job.
- Write theory code only under \`circuits/\`, \`schemas/\`, \`extraction/\`, and \`candidates/\`.
- Write natural benchmark cases under \`benchmark/\` and issue analyses under \`proposals/\`.
- Never edit \`releases/\` or \`active-release.json\`.
- Circuit authoring should use restricted \`.circuit.mjs\` modules and the documented CircuitJS DSL.
- Prepare candidates and run public checks, but leave publication to the explicit manual CLI command.
`;
  await atomicWrite(containedPath(agentRoot, 'AGENTS.md'), guidance);
  return { links, skills: [...LEARNING_SKILLS] };
}

export { LEARNING_SKILLS, ensureLearningWorkspace, ensureSkillLink };
