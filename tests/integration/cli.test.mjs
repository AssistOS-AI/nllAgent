import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runCli } from '../../src/cli/main.mjs';

class BufferStream {
  value = '';
  write(text) { this.value += text; }
}

async function invoke(arguments_) {
  const stdout = new BufferStream();
  const stderr = new BufferStream();
  const exitCode = await runCli(arguments_, { stdout, stderr, cwd: process.cwd(), env: process.env });
  return { exitCode, stdout: stdout.value, stderr: stderr.value };
}

test('CLI preserves audit, planning, benchmark, and agent discovery use cases', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'nll-cli-'));
  const planningRoot = 'data/editorial-demo/planning-runs';
  const before = new Set(await readdir(planningRoot).catch(() => []));
  try {
    const benchmark = await invoke(['benchmark', '--agent', 'editorial-demo', '--foundation', 'off']);
    assert.equal(benchmark.exitCode, 0, benchmark.stderr);
    assert.match(benchmark.stdout, /10\/10/u);
    const plan = await invoke([
      'plan', '--agent', 'editorial-demo', '--foundation', 'off',
      '--input', 'data/editorial-demo/examples/planning/idea.md', '--output', join(temporary, 'plan.md')
    ]);
    assert.equal(plan.exitCode, 0, plan.stderr);
    const agents = await invoke(['agent', 'list']);
    assert.match(agents.stdout, /editorial-demo/u);
  } finally {
    for (const entry of await readdir(planningRoot).catch(() => [])) {
      if (!before.has(entry)) await rm(join(planningRoot, entry), { recursive: true });
    }
    await rm(temporary, { recursive: true });
  }
});

test('legacy data-output and publication options are not compatibility aliases', async () => {
  const legacyOption = await invoke(['agent', 'list', '--json']);
  assert.equal(legacyOption.exitCode, 64);
  assert.match(legacyOption.stderr, /--json/u);
  const publication = await invoke(['release', 'publish', '--agent', 'editorial-demo']);
  assert.equal(publication.exitCode, 64);
});
