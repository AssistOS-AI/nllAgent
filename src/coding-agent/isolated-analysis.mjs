import { dirname, join, resolve } from 'node:path';
import { NllError } from '../core/errors.mjs';
import { ensureDirectory } from '../core/io.mjs';
import { runProcess } from './process.mjs';
import { isolatedEnvironment } from './sandbox.mjs';
import { assertContained } from './workspace.mjs';

async function runIsolatedAnalysis({
  repositoryRoot, agentRoot, generatedModule, inputPath, outputRoot, mode = 'run', foundation = 'core',
  nodeBin = process.execPath, env = process.env, processRunner = runProcess
}) {
  const checkedModule = assertContained(dirname(generatedModule), generatedModule);
  await ensureDirectory(outputRoot);
  const runner = resolve(repositoryRoot, 'src', 'coding-agent', 'run-generated-analysis.mjs');
  const readable = [
    resolve(repositoryRoot, 'src'), resolve(repositoryRoot, 'ontologies'), resolve(agentRoot),
    resolve(dirname(checkedModule)), resolve(inputPath)
  ];
  const arguments_ = [
    '--permission',
    ...readable.map((path) => `--allow-fs-read=${path}`),
    `--allow-fs-write=${resolve(outputRoot)}`,
    runner,
    resolve(agentRoot, 'agent.mjs'), checkedModule, resolve(inputPath), resolve(outputRoot), mode, foundation
  ];
  const result = await processRunner(nodeBin, arguments_, { cwd: outputRoot, env: isolatedEnvironment(env) });
  if (result.code !== 0) throw new NllError('isolated-analysis-failed', result.stderr || result.stdout || 'Isolated analysis failed.');
  return Object.freeze({ status: 'completed', outputRoot, stdout: result.stdout });
}

export { runIsolatedAnalysis };
