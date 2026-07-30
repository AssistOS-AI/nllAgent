import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { runCli } from '../../src/cli/main.mjs';

class BufferStream {
  value = '';
  write(text) { this.value += text; }
}

test('CLI run persists reimportable LongTextJS, result, and trace modules', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'nll-persistence-'));
  const stdout = new BufferStream();
  const stderr = new BufferStream();
  const runsRoot = resolve('data/editorial-demo/runs');
  const before = new Set(await readdir(runsRoot).catch(() => []));
  try {
    const exit = await runCli([
      'run', '--agent', 'editorial-demo', '--foundation', 'off',
      '--input', 'data/editorial-demo/benchmark/public/weak-phrase/input.md',
      '--output', join(temporary, 'report.md')
    ], { stdout, stderr, cwd: process.cwd(), env: process.env });
    assert.equal(exit, 0, stderr.value);
    const entries = await readdir(runsRoot);
    const created = entries.find((entry) => !before.has(entry));
    assert.ok(created);
    const root = join(runsRoot, created);
    const program = await import(pathToFileURL(join(root, 'longtext/program.mjs')));
    const result = await import(pathToFileURL(join(root, 'result.mjs')));
    const trace = await import(pathToFileURL(join(root, 'trace/run.trace.mjs')));
    assert.equal(program.default.kind, 'LongTextProgram');
    assert.equal(result.default.outputs.length, 1);
    assert.ok(trace.default.events.length > 0);
    await rm(root, { recursive: true });
  } finally {
    await rm(temporary, { recursive: true });
  }
});
