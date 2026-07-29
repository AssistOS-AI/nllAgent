import { lstat, readdir } from 'node:fs/promises';
import { basename } from 'node:path';
import { NllError } from '../core/errors.mjs';
import { readJson, readUtf8, readUtf8Strict } from '../core/io.mjs';
import { containedPath } from '../core/paths.mjs';
import { analyzeText } from '../runtime/analyzer.mjs';
import { evaluateSemantically } from './llm-evaluator.mjs';

async function discoverCases(root) {
  const metadata = await lstat(root).catch(() => null);
  if (!metadata) return [];
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
    throw new NllError('benchmark-unsafe', `Benchmark suite must be a regular directory: ${root}`);
  }
  const entries = await readdir(root, { withFileTypes: true });
  const cases = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isSymbolicLink()) throw new NllError('benchmark-unsafe', `Benchmark cases must not be symbolic links: ${containedPath(root, entry.name)}`);
    if (!entry.isDirectory()) continue;
    const caseRoot = containedPath(root, entry.name);
    const input = containedPath(caseRoot, 'input.md');
    const expected = containedPath(caseRoot, 'expected.md');
    const expectedLayers = containedPath(caseRoot, 'expected.json');
    const caseMetadata = containedPath(caseRoot, 'case.json');
    const required = [input, expected, expectedLayers, caseMetadata];
    const fileMetadata = await Promise.all(required.map((path) => lstat(path).catch(() => null)));
    if (fileMetadata.some((item) => !item?.isFile() || item.isSymbolicLink())) {
      throw new NllError('benchmark-case-incomplete', `Benchmark case ${entry.name} requires regular input.md, expected.md, expected.json, and case.json files.`);
    }
    cases.push({ id: entry.name, root: caseRoot, input, expected, expectedLayers, metadataPath: caseMetadata });
  }
  return cases;
}

function compareText(expected, actual) {
  const normalize = (value) => value.replace(/\r\n/gu, '\n').replace(/[ \t]+$/gmu, '').replace(/\s*$/u, '\n');
  return { equal: normalize(expected) === normalize(actual), expected: normalize(expected), actual: normalize(actual) };
}

async function runBenchmark(agent, release, registries, options = {}) {
  const roots = ['public', 'development', 'holdout', 'scenarios', 'adversarial', 'metamorphic', 'mutations']
    .map((suite) => containedPath(agent.root, 'benchmark', suite));
  const cases = (await Promise.all(roots.map(discoverCases))).flat();
  if (cases.length === 0) throw new NllError('benchmark-empty', 'No benchmark cases were found.', { agent: agent.manifest.name });
  const duplicateIds = [...new Set(cases.map((item) => item.id).filter((id, index, values) => values.indexOf(id) !== index))];
  if (duplicateIds.length) throw new NllError('benchmark-duplicate-case', 'Benchmark case identifiers must be unique across suites.', { duplicateIds });
  const results = [];
  for (const testCase of cases) {
    const [input, expected] = await Promise.all([readUtf8Strict(testCase.input), readUtf8(testCase.expected)]);
    testCase.metadata = await readJson(testCase.metadataPath);
    const analysis = await analyzeText({
      agentName: agent.manifest.name, text: input, release, registries,
      language: agent.manifest.defaultLanguage || 'und', budgets: options.budgets,
      differentialQueryFirst: true, foundation: options.foundation || 'core'
    });
    const comparison = compareText(expected, analysis.report);
    const layers = await readJson(testCase.expectedLayers);
    const layerFailures = compareLayers(layers, analysis);
    for (const differential of analysis.queryFirstDifferentials || []) {
      if (!differential.passed) layerFailures.push(`query-first physical plan drift in ${differential.circuit}`);
    }
    layerFailures.push(...validateCaseMetadata(testCase.metadata));
    let semanticEvaluation = null;
    if (testCase.metadata.evaluation?.mode === 'llm') {
      try {
        semanticEvaluation = await evaluateSemantically(testCase, expected, analysis.report, layers, registries);
        if (!semanticEvaluation.passed) layerFailures.push('semantic evaluation failed');
      } catch (error) {
        layerFailures.push(`semantic evaluation unavailable: ${error.message}`);
      }
    }
    const reportPassed = testCase.metadata.reportComparison === 'semantic'
      ? semanticEvaluation?.passed === true
      : testCase.metadata.reportComparison === 'structured'
        ? true
        : comparison.equal;
    results.push({
      id: testCase.id, suite: basename(testCase.root.slice(0, testCase.root.lastIndexOf('/'))),
      passed: reportPassed && layerFailures.length === 0,
      ...(!reportPassed ? { expected: comparison.expected, actual: comparison.actual } : {}),
      layerFailures,
      semanticEvaluation,
      status: analysis.status, findingCount: analysis.findings.length,
      queryFirstDifferentials: analysis.queryFirstDifferentials || []
    });
  }
  const passed = results.filter((result) => result.passed).length;
  const policyFailures = benchmarkPolicyFailures(release.manifest.benchmarkPolicy || {}, cases);
  return {
    kind: 'BenchmarkResult', schemaVersion: 1, release: release.manifest.version,
    passed: passed === results.length && policyFailures.length === 0,
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed,
      families: countBy(cases, (testCase) => testCase.metadata?.family || 'unspecified'),
      rules: countBy(cases, (testCase) => testCase.metadata?.rule || 'unspecified'),
      policyFailures
    },
    results
  };
}

function countBy(values, selector) {
  const counts = {};
  for (const value of values) {
    const key = selector(value);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function validateCaseMetadata(metadata) {
  const failures = [];
  if (metadata.kind !== 'NaturalLanguageLinterBenchmarkCase') {
    failures.push('case.json kind must be NaturalLanguageLinterBenchmarkCase');
  }
  if (typeof metadata.rule !== 'string' || !metadata.rule) failures.push('case.json requires rule');
  if (typeof metadata.family !== 'string' || !metadata.family) failures.push('case.json requires family');
  if (!['mechanically-derived', 'model-agreed', 'human-confirmed', 'contested'].includes(metadata.validationStatus)) {
    failures.push('case.json validationStatus is invalid');
  }
  return failures;
}

function benchmarkPolicyFailures(policy, cases) {
  const failures = [];
  if (Number.isInteger(policy.minimumCases) && cases.length < policy.minimumCases) {
    failures.push(`benchmark requires at least ${policy.minimumCases} cases, found ${cases.length}`);
  }
  for (const suite of policy.requiredSuites || []) {
    if (!cases.some((testCase) => basename(testCase.root.slice(0, testCase.root.lastIndexOf('/'))) === suite)) {
      failures.push(`benchmark suite ${suite} is required but empty`);
    }
  }
  for (const rulePolicy of policy.rules || []) {
    const ruleCases = cases.filter((testCase) => testCase.metadata?.rule === rulePolicy.rule);
    for (const family of rulePolicy.requiredFamilies || []) {
      if (!ruleCases.some((testCase) => testCase.metadata?.family === family)) {
        failures.push(`rule ${rulePolicy.rule} is missing benchmark family ${family}`);
      }
    }
  }
  return failures;
}

function compareLayers(expected, analysis) {
  const failures = [];
  if (expected.circuit?.status && expected.circuit.status !== analysis.status) {
    failures.push(`expected status ${expected.circuit.status}, received ${analysis.status}`);
  }
  if (expected.compatibility?.status && expected.compatibility.status !== analysis.compatibility.status) {
    failures.push(`expected compatibility ${expected.compatibility.status}, received ${analysis.compatibility.status}`);
  }
  if (Number.isInteger(expected.circuit?.findingCount)
    && expected.circuit.findingCount !== analysis.findings.length) {
    failures.push(`expected ${expected.circuit.findingCount} findings, received ${analysis.findings.length}`);
  }
  const rules = analysis.findings.map((finding) => finding.rule).sort();
  if (expected.circuit?.findingRules
    && JSON.stringify([...expected.circuit.findingRules].sort()) !== JSON.stringify(rules)) {
    failures.push('finding rule identifiers differ');
  }
  for (const rule of expected.circuit?.forbiddenFindingRules || []) {
    if (rules.includes(rule)) failures.push(`forbidden finding rule ${rule} was emitted`);
  }
  for (const expectedFinding of expected.findings || []) {
    const candidates = analysis.findings.filter((finding) =>
      (!expectedFinding.rule || finding.rule === expectedFinding.rule)
      && (!expectedFinding.verdict || finding.verdict === expectedFinding.verdict)
      && (!expectedFinding.severity || finding.severity === expectedFinding.severity)
      && (!expectedFinding.guarantee || finding.guarantee === expectedFinding.guarantee)
      && (!expectedFinding.quote || finding.mainAnchor?.quote === expectedFinding.quote));
    const minimum = expectedFinding.minimumCount ?? 1;
    if (candidates.length < minimum) {
      failures.push(`missing finding ${expectedFinding.rule || expectedFinding.verdict || 'matching assertion'}`);
    }
  }
  for (const observation of expected.observations || []) {
    const candidates = analysis.program.observations.filter((item) => item.type === observation.type);
    const matched = candidates.filter((item) => {
      const quotes = (item.anchors || []).map((anchorId) => analysis.program.anchors[anchorId]?.quote || '');
      const quoteMatches = observation.quote === undefined
        || item.payload?.text?.includes(observation.quote)
        || quotes.some((quote) => quote.includes(observation.quote));
      const statusMatches = !observation.status || item.status === observation.status;
      const payloadMatches = Object.entries(observation.payload || {})
        .every(([key, value]) => item.payload?.[key] === value);
      return quoteMatches && statusMatches && payloadMatches;
    });
    const minimum = observation.minimumCount ?? 1;
    if (matched.length < minimum) {
      failures.push(`missing observation ${observation.type}${observation.quote ? ` containing ${observation.quote}` : ''}`);
    }
  }
  for (const expectedCoverage of expected.coverage || []) {
    const matched = analysis.program.coverage.some((coverage) =>
      (!expectedCoverage.type || coverage.types?.includes(expectedCoverage.type))
      && (!expectedCoverage.mode || coverage.mode === expectedCoverage.mode)
      && (expectedCoverage.verified === undefined || coverage.verified === expectedCoverage.verified));
    if (!matched) failures.push(`missing coverage assertion for ${expectedCoverage.type || expectedCoverage.mode}`);
  }
  return failures;
}

export {
  benchmarkPolicyFailures,
  compareLayers,
  compareText,
  discoverCases,
  runBenchmark,
  validateCaseMetadata
};
