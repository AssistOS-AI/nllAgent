import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const auditModulePath = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(auditModulePath), '..');
const ignoredDirectories = new Set(['.git', 'node_modules']);
const importedSkillRoots = new Set(['achilles-specs', 'article-build', 'gamp-specs', 'review-specs']);
const forbiddenExtensions = new Set(['.json', '.js', '.ts', '.tsx']);
const sourceExtensions = new Set(['.mjs']);
const forbiddenSourcePatterns = [
  [/\bJSON\.(?:parse|stringify)\b/u, 'host structured-data codec'],
  [/queryFirstCircuit|query-first|active-release|release publish/u, 'removed architecture surface']
];

async function walk(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    const relative = path.slice(repositoryRoot.length + 1).split('/');
    if (entry.isDirectory() && relative[0] === '.agents' && relative[1] === 'skills'
      && importedSkillRoots.has(relative[2])) continue;
    if (entry.isDirectory()) paths.push(...await walk(path));
    else paths.push(path);
  }
  return paths;
}

const failures = [];
for (const path of await walk(repositoryRoot)) {
  const extension = extname(path);
  if (forbiddenExtensions.has(extension)) failures.push(`forbidden file extension: ${path}`);
  if (path === auditModulePath) continue;
  if (!sourceExtensions.has(extension)) continue;
  const source = await readFile(path, 'utf8');
  for (const [pattern, label] of forbiddenSourcePatterns) {
    if (pattern.test(source)) failures.push(`${label}: ${path}`);
  }
}

if (failures.length) {
  process.stderr.write(`${failures.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Repository contains only the supported executable and documentation formats.\n');
}
