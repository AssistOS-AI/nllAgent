import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

import { agent, runs } from '../../src/agent/index.mjs';
import { runBenchmark } from '../../src/benchmark/runner.mjs';
import { circuit, include, reads, stage, writes } from '../../src/circuit/index.mjs';
import * as core from '../../ontologies/core/index.mjs';

const moduleUrl = (path) => pathToFileURL(resolve(path)).href;

test('semantic benchmarks execute a fixed LongTextJS world without a Markdown materializer', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nll-fixed-benchmark-'));
  const caseRoot = join(root, 'benchmarks', 'fixed-world');
  await mkdir(caseRoot, { recursive: true });
  const inputPath = join(caseRoot, 'input.longtext.mjs');
  await writeFile(inputPath, [
    `import { claim, explicit, groundedAt, longTextProgram, semanticUnit, source, span } from '${moduleUrl('src/longtext/index.mjs')}';`,
    `import { Document, named } from '${moduleUrl('ontologies/core/index.mjs')}';`,
    "const documentSource = source('fixed-policy.md', 'A controlled policy statement.');",
    "const anchor = span(documentSource, 0, documentSource.length);",
    "const document = Document(named('fixed-policy'));",
    "export default longTextProgram('fixed-policy', documentSource, semanticUnit('document', claim(document, explicit(), groundedAt(anchor))));",
    ''
  ].join('\n'), 'utf8');
  await writeFile(join(caseRoot, 'case.mjs'), [
    `import { benchmarkCase, containsFinding, findingCount } from '${moduleUrl('src/benchmark/api.mjs')}';`,
    "export default benchmarkCase('fixed-world', 'input.longtext.mjs', findingCount(1), containsFinding('fixed-longtext'));",
    ''
  ].join('\n'), 'utf8');

  const inspect = stage('inspect-fixed-world', (ctx) => {
    for (const document of ctx.store.instancesOf(core.Document)) {
      const sourceEvidence = ctx.store.evidenceFor(document);
      ctx.emit(core.Finding(
        core.findingType('fixed-longtext'),
        core.message('The fixed semantic world was executed.'),
        core.severity('info'),
        core.evidence(...sourceEvidence),
        core.assurance('mechanical')
      ));
    }
  }, reads(core.Document), writes(core.Finding));
  const project = agent('fixed-benchmark-agent', runs(circuit('fixed-benchmark@1', include(inspect))));
  let markdownCalls = 0;
  const result = await runBenchmark(
    Object.freeze({ root, project }),
    async () => { markdownCalls += 1; throw new Error('Markdown adapter must not run.'); },
    core,
    { foundation: 'off' }
  );

  assert.equal(markdownCalls, 0);
  assert.equal(result.passed, true);
  assert.equal(result.passedCount, 1);
});
