import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { errorExit, runCli } from '../../src/cli/main.mjs';
import { NllError } from '../../src/core/errors.mjs';
import { writeJson } from '../../src/core/io.mjs';

function capture() {
  let value = '';
  return { stream: { write(chunk) { value += chunk; } }, read: () => value };
}

test('CLI turns one Markdown file into a persisted Markdown report', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nllagent-cli-'));
  const dataRoot = join(root, 'data');
  await cp(resolve('data/editorial-demo'), join(dataRoot, 'editorial-demo'), { recursive: true });
  const output = join(root, 'report.md');
  const stdout = capture();
  const stderr = capture();
  const code = await runCli([
    'run', '--agent', 'editorial-demo', '--data-root', dataRoot,
    '--input', resolve('data/editorial-demo/benchmark/public/weak-phrase/input.md'),
    '--output', output, '--json'
  ], { stdout: stdout.stream, stderr: stderr.stream, env: {}, cwd: root });
  assert.equal(code, 0, stderr.read());
  const report = await readFile(output, 'utf8');
  assert.match(report, /mechanically-certified/u);
  assert.match(report, /^# CNL\/Audit-1 audit report/mu);
  assert.match(report, /> De fapt/u);
  const result = JSON.parse(stdout.read());
  assert.equal(result.findings, 1);
  const runRoot = join(dataRoot, 'editorial-demo', 'runs', result.run.id);
  assert.ok((await stat(join(runRoot, 'semantic-trace.json'))).isFile());
  const run = JSON.parse(await readFile(join(runRoot, 'run.json'), 'utf8'));
  assert.equal(run.kind, 'NaturalLanguageLinterRun');
  const audit = JSON.parse(await readFile(join(runRoot, 'cnl-audit.json'), 'utf8'));
  assert.equal(audit.kind, 'CNLAuditReport');
  assert.equal(audit.profile, 'audit');
  assert.equal(audit.auditObservations.length, 1);
  assert.equal(audit.auditObservations[0].rule, 'ED-001');
});

test('CLI benchmark executes the active immutable release', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nllagent-benchmark-'));
  const dataRoot = join(root, 'data');
  await cp(resolve('data/editorial-demo'), join(dataRoot, 'editorial-demo'), { recursive: true });
  const stdout = capture();
  const stderr = capture();
  const code = await runCli(['benchmark', '--agent', 'editorial-demo', '--data-root', dataRoot, '--json'], {
    stdout: stdout.stream, stderr: stderr.stream, env: {}, cwd: root
  });
  assert.equal(code, 0, stderr.read());
  const result = JSON.parse(stdout.read());
  assert.equal(result.summary.passed, 10);
  assert.deepEqual(result.summary.rules, { 'ED-001': 5, 'ED-002': 5 });
});

test('CLI plan produces CNL without a model and optionally realizes it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nllagent-cli-planning-'));
  const dataRoot = join(root, 'data');
  await cp(resolve('data/editorial-demo'), join(dataRoot, 'editorial-demo'), { recursive: true });
  const output = join(root, 'plan.cnl.md');
  const stdout = capture();
  const stderr = capture();
  const code = await runCli([
    'plan', '--agent', 'editorial-demo', '--data-root', dataRoot,
    '--input', resolve('data/editorial-demo/examples/planning/idea.md'),
    '--output', output, '--translator', 'none', '--json'
  ], {
    stdout: stdout.stream, stderr: stderr.stream, env: {}, cwd: root, repoRoot: resolve('.')
  });
  assert.equal(code, 0, stderr.read());
  const result = JSON.parse(stdout.read());
  assert.equal(result.status, 'planned');
  const planning = JSON.parse(await readFile(join(
    dataRoot, 'editorial-demo', 'planning-runs', result.planningRun, 'planning.json'
  ), 'utf8'));
  assert.equal(planning.kind, 'NaturalLanguageLinterPlanningRun');
  assert.match(await readFile(output, 'utf8'), /CNL\/Plan-1 generation specification/u);
  assert.match(await readFile(output, 'utf8'), /Mara/u);
  assert.equal(result.realization, null);
});

test('CLI realizes a CNL plan only when --realize-output is requested', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nllagent-cli-realization-'));
  const dataRoot = join(root, 'data');
  await cp(resolve('data/editorial-demo'), join(dataRoot, 'editorial-demo'), { recursive: true });
  const plan = join(root, 'plan.cnl.md');
  const draft = join(root, 'draft.md');
  const stdout = capture();
  const stderr = capture();
  const code = await runCli([
    'plan', '--agent', 'editorial-demo', '--data-root', dataRoot,
    '--input', resolve('data/editorial-demo/examples/planning/idea.md'),
    '--output', plan, '--realize-output', draft, '--max-revisions', '1',
    '--translator', 'codex', '--json'
  ], {
    stdout: stdout.stream, stderr: stderr.stream, env: {}, cwd: root, repoRoot: resolve('.'),
    processRunner: async (command, args) => {
      await writeJson(args[args.indexOf('-o') + 1], {
        document: 'Mara ajunse pe peron sub lumina serii.\n\n— Ultimul tren a plecat, spuse impiegatul.'
      });
      return { code: 0, signal: null, stdout: '', stderr: '' };
    }
  });
  assert.equal(code, 0, stderr.read());
  const result = JSON.parse(stdout.read());
  assert.equal(result.status, 'realized');
  assert.match(await readFile(plan, 'utf8'), /CNL\/Plan-1 generation specification/u);
  assert.match(await readFile(draft, 'utf8'), /Mara/u);
});

test('CLI uses stable usage and runtime failure exit codes', async () => {
  assert.equal(errorExit(new NllError('invalid-arguments', 'bad command')), 64);
  assert.equal(errorExit(new NllError('runtime-fault', 'unexpected failure')), 70);
  const stdout = capture();
  const stderr = capture();
  assert.equal(await runCli(['agent', 'list', '--unexpected', 'value'], {
    stdout: stdout.stream, stderr: stderr.stream, env: {}, cwd: process.cwd()
  }), 64);
  assert.match(stderr.read(), /Unknown option/u);
  assert.equal(await runCli(['model', 'inspect', 'extra'], {
    stdout: stdout.stream, stderr: stderr.stream, env: {}, cwd: process.cwd()
  }), 64);
  assert.equal(await runCli(['run', '--translator', 'invented'], {
    stdout: stdout.stream, stderr: stderr.stream, env: {}, cwd: process.cwd()
  }), 64);
  assert.equal(await runCli(['plan', '--max-revisions', '1'], {
    stdout: stdout.stream, stderr: stderr.stream, env: {}, cwd: process.cwd()
  }), 64);
  assert.equal(await runCli(['plan', '--realize-output', 'draft.md', '--max-revisions', '11'], {
    stdout: stdout.stream, stderr: stderr.stream, env: {}, cwd: process.cwd()
  }), 64);
});
