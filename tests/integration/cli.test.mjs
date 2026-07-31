import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { parseArguments, validateCommandArguments } from '../../src/cli/arguments.mjs';
import { runCli } from '../../src/cli/main.mjs';

class BufferStream {
  value = '';
  write(text) { this.value += text; }
}

async function invoke(arguments_, cwd = process.cwd()) {
  const stdout = new BufferStream();
  const stderr = new BufferStream();
  const exitCode = await runCli(arguments_, { stdout, stderr, cwd, env: process.env });
  return { exitCode, stdout: stdout.value, stderr: stderr.value };
}

test('training accepts multiple theory files as one ordered option family', () => {
  const parsed = parseArguments(['train', '--agent', 'privacy', '--theory', 'a.md', '--theory', 'b.md']);
  validateCommandArguments(parsed.positionals, parsed.options);
  assert.deepEqual(parsed.options.theory, ['a.md', 'b.md']);
});

test('the public CLI exposes separate train/analyze workflows and rejects translator and learn', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nll-cli-'));
  try {
    const help = await invoke([], root);
    assert.equal(help.exitCode, 0);
    assert.match(help.stdout, /nllagent train/u);
    assert.match(help.stdout, /nllagent analyze/u);
    assert.doesNotMatch(help.stdout, /--translator|nllagent learn/u);
    const translator = await invoke(['analyze', '--agent', 'a', '--task', 't', '--input', 'x.md', '--translator', 'none'], root);
    assert.equal(translator.exitCode, 64);
    assert.match(translator.stderr, /--translator/u);
    const learn = await invoke(['learn', '--agent', 'a'], root);
    assert.equal(learn.exitCode, 64);
    const agents = await invoke(['agent', 'list', '--data-root', join(root, 'environment')], root);
    assert.equal(agents.exitCode, 0);
    assert.match(agents.stdout, /No trained agents/u);
  } finally {
    await rm(root, { recursive: true });
  }
});
