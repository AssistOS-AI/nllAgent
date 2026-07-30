import { access, readdir, readFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const documentationRoot = resolve(repositoryRoot, 'docs');

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (['.html', '.md'].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

function targets(source, extension) {
  if (extension === '.html') {
    return [...source.matchAll(/\s(?:href|src)="([^"]+)"/gu)].map((match) => match[1]);
  }
  return [...source.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)].map((match) => match[1]);
}

function localTarget(target) {
  return target &&
    !target.startsWith('#') &&
    !target.startsWith('mailto:') &&
    !target.startsWith('tel:') &&
    !/^[a-z]+:\/\//iu.test(target);
}

async function exists(path) {
  return access(path).then(() => true, () => false);
}

const failures = [];
for (const file of await walk(documentationRoot)) {
  const source = await readFile(file, 'utf8');
  for (const target of targets(source, extname(file)).filter(localTarget)) {
    const pathPart = target.split('#')[0].split('?')[0];
    if (!pathPart) continue;
    const resolved = resolve(dirname(file), decodeURIComponent(pathPart));
    if (!resolved.startsWith(repositoryRoot) || !await exists(resolved)) {
      failures.push(`${file}: unresolved local target ${target}`);
    }
  }
}

if (failures.length) {
  process.stderr.write(`${failures.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Documentation links are valid.\n');
}
