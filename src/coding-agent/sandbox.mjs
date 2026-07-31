import { resolve } from 'node:path';
import { NllError } from '../core/errors.mjs';
import { runProcess } from './process.mjs';
import { assertContained } from './workspace.mjs';

async function validateGeneratedModule({
  modulePath, workspaceRoot, repositoryRoot, nodeBin = process.execPath,
  env = process.env, processRunner = runProcess, kind = 'semantic'
}) {
  const checkedModule = assertContained(workspaceRoot, modulePath);
  const validator = resolve(repositoryRoot, 'src', 'coding-agent', 'validate-generated.mjs');
  const arguments_ = [
    '--permission',
    `--allow-fs-read=${resolve(workspaceRoot)}`,
    `--allow-fs-read=${resolve(repositoryRoot)}`,
    validator, checkedModule, kind
  ];
  const result = await processRunner(nodeBin, arguments_, { cwd: workspaceRoot, env: isolatedEnvironment(env) });
  if (result.code !== 0) throw new NllError('generated-module-rejected', result.stderr || result.stdout || 'Generated module validation failed.');
  return Object.freeze({ status: 'accepted', modulePath: checkedModule });
}

function isolatedEnvironment(env) {
  return Object.freeze(Object.fromEntries(
    ['LANG', 'LC_ALL', 'TZ'].filter((name) => typeof env?.[name] === 'string').map((name) => [name, env[name]])
  ));
}

export { isolatedEnvironment, validateGeneratedModule };
