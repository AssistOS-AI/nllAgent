import { dirname, resolve } from 'node:path';
import { BenchmarkCase } from './api.mjs';
import { loadModule, readUtf8 } from '../core/io.mjs';
import { LongTextProgram } from '../longtext/model.mjs';
import { analyzeLongTextProject } from '../runtime/agent-runner.mjs';
import { NllError } from '../core/errors.mjs';
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

async function analyzeBenchmarkInput(agent, analyzeMarkdown, inputPath, testCase, options) {
  if (inputPath.endsWith('.mjs')) {
    const loaded = await loadModule(inputPath);
    if (!(loaded.default instanceof LongTextProgram)) {
      throw new NllError('invalid-benchmark-longtext', `${inputPath} must export a LongTextProgram.`);
    }
    return analyzeLongTextProject(agent.project, loaded.default, {
      foundation: options.foundation || 'off'
    });
  }
  if (typeof analyzeMarkdown !== 'function') {
    throw new NllError('benchmark-materializer-required', `Markdown benchmark ${testCase.id} requires an explicit analysis adapter.`);
  }
  return analyzeMarkdown(await readUtf8(inputPath), `${testCase.id}.md`);
}

async function runBenchmark(agent, analyzeMarkdown, vocabulary, options = {}) {
  const modules = (await listModules(resolve(agent.root, 'benchmarks'))).filter((path) => path.endsWith('/case.mjs'));
  const results = [];
  for (const modulePath of modules) {
    const loaded = await loadModule(modulePath);
    if (!(loaded.default instanceof BenchmarkCase)) continue;
    const testCase = loaded.default;
    const inputPath = resolve(dirname(modulePath), testCase.inputPath);
    const analysis = await analyzeBenchmarkInput(agent, analyzeMarkdown, inputPath, testCase, options);
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

export { analyzeBenchmarkInput, evaluateExpectations, runBenchmark };
