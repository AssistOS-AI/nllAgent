import { dirname, resolve } from 'node:path';
import { BenchmarkCase } from './api.mjs';
import { loadModule, readUtf8 } from '../core/io.mjs';
import { listModules } from '../storage/workspace.mjs';

function findingTypes(findings, vocabulary) {
  return findings.map((finding) => finding.value(vocabulary.findingType));
}

function evaluateExpectations(testCase, findings, vocabulary) {
  const types = findingTypes(findings, vocabulary);
  const failures = [];
  for (const expectation of testCase.expectations) {
    if (expectation.expectationKind === 'findingCount' && findings.length !== expectation.value) {
      failures.push(`expected ${expectation.value} finding(s), received ${findings.length}`);
    } else if (expectation.expectationKind === 'containsFinding' && !types.includes(expectation.value)) {
      failures.push(`missing finding type ${expectation.value}`);
    } else if (expectation.expectationKind === 'excludesFinding' && types.includes(expectation.value)) {
      failures.push(`unexpected finding type ${expectation.value}`);
    }
  }
  return Object.freeze(failures);
}

async function runBenchmark(agent, analyze, vocabulary) {
  const modules = (await listModules(resolve(agent.root, 'benchmark'))).filter((path) => path.endsWith('/case.mjs'));
  const results = [];
  for (const modulePath of modules) {
    const loaded = await loadModule(modulePath);
    if (!(loaded.default instanceof BenchmarkCase)) continue;
    const testCase = loaded.default;
    const inputPath = resolve(dirname(modulePath), testCase.inputPath);
    const analysis = await analyze(await readUtf8(inputPath), `${testCase.id}.md`);
    const failures = evaluateExpectations(testCase, analysis.findings, vocabulary);
    results.push(Object.freeze({ id: testCase.id, passed: !failures.length, failures }));
  }
  return Object.freeze({
    passed: results.every((result) => result.passed),
    total: results.length,
    passedCount: results.filter((result) => result.passed).length,
    results: Object.freeze(results)
  });
}

export { evaluateExpectations, runBenchmark };
