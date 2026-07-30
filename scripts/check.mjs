import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function run(command, argumentsList) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, argumentsList, { cwd: repositoryRoot, stdio: 'inherit' });
    child.once('error', reject);
    child.once('close', (code) => code === 0
      ? resolvePromise()
      : reject(new Error(`${command} ${argumentsList.join(' ')} exited with ${code}.`)));
  });
}

async function modules(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await modules(path));
    else if (extname(entry.name) === '.mjs') result.push(path);
  }
  return result;
}

await run(process.execPath, ['--test']);
await run(process.execPath, ['experiments/architecture/run.mjs']);
await run(process.execPath, ['bin/nllagent.mjs', 'benchmark', '--agent', 'editorial-demo']);
await run(process.execPath, ['scripts/generate_specs_matrix.mjs']);
await run(process.execPath, ['scripts/verify_docs_links.mjs']);
await run(process.execPath, ['scripts/audit-repository.mjs']);
for (const modulePath of await modules(repositoryRoot)) await run(process.execPath, ['--check', modulePath]);
process.stdout.write('All repository checks passed.\n');
