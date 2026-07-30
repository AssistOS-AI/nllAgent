import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runLearning } from '../../src/learning/index.mjs';

test('learning gives a Coding Agent a multi-file ESM workspace and stores a Markdown execution record', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'nll-learning-'));
  const agentRoot = join(temporary, 'agent');
  const rulesRoot = join(temporary, 'rules');
  await mkdir(join(agentRoot, 'circuits'), { recursive: true });
  await mkdir(rulesRoot, { recursive: true });
  await writeFile(join(rulesRoot, 'authority.md'), '# Rule\nAvoid weak filler.\n', 'utf8');
  let observedArguments;
  try {
    const result = await runLearning({
      agent: { root: agentRoot },
      rulesRoot,
      codexBin: 'coding-agent',
      processRunner: async (command, arguments_, options) => {
        observedArguments = { command, arguments_, options };
        return { code: 0, stdout: 'completed', stderr: '' };
      }
    });
    assert.equal(result.status, 'completed');
    assert.equal(observedArguments.command, 'coding-agent');
    assert.ok(observedArguments.arguments_.includes('--ephemeral'));
  } finally {
    await rm(temporary, { recursive: true });
  }
});
