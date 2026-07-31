import { readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import {
  DEFAULT_METHOD_CATALOG, RuleAnalysis, RulePack, CircuitArchitecturePlan, checkArchitecturePlan,
  methodRequest
} from '../architecture/index.mjs';
import { CircuitTemplate } from '../circuit/model.mjs';
import { AgentAuthoringContext } from '../context/index.mjs';
import * as coreVocabulary from '../../ontologies/core/index.mjs';
import { AgentProject } from '../agent/api.mjs';
import { runBenchmark } from '../benchmark/runner.mjs';
import { NllError, asNllError } from '../core/errors.mjs';
import { atomicWrite, loadModule, readUtf8 } from '../core/io.mjs';
import { abstractPreflight } from '../interpreters/abstract-interpreter.mjs';
import { LongTextProgram } from '../longtext/model.mjs';
import { Ontology } from '../ontology/api.mjs';
import { PrimitiveDescriptor } from '../primitives/model.mjs';
import { analyzeProject } from '../runtime/agent-runner.mjs';
import { conservativeAbstractCircuit } from '../runtime/multi-semantic.mjs';

async function moduleFiles(path) {
  const info = await stat(path).catch(() => null);
  if (info?.isFile()) return extname(path) === '.mjs' ? [path] : [];
  if (!info?.isDirectory()) throw new NllError('module-not-found', `Path not found: ${path}`);
  const files = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new NllError('tooling-symlink', `Tool input contains a symbolic link: ${entry.name}`);
    const child = join(path, entry.name);
    if (entry.isDirectory()) files.push(...await moduleFiles(child));
    else if (entry.isFile() && entry.name.endsWith('.mjs')) files.push(child);
  }
  return files.sort();
}

async function defaultsAt(path) {
  const values = [];
  for (const file of await moduleFiles(path)) values.push(Object.freeze({ file, value: (await loadModule(file)).default }));
  return values;
}

function line(value = '') { return `${value}\n`; }

async function sourceCommand(operation, path, rest) {
  const text = await readUtf8(path);
  if (operation === 'span') {
    const start = Number(rest[0]);
    const end = Number(rest[1]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) {
      throw new NllError('invalid-span', 'source span requires non-negative start and end offsets.');
    }
    return `# Source span\n\n${[...text].slice(start, end).join('')}\n`;
  }
  const lines = text.split('\n');
  const headings = lines.flatMap((value, index) => value.startsWith('#') ? [`- line ${index + 1}: ${value}`] : []);
  return `# Source outline\n\nCharacters: ${[...text].length}\nLines: ${lines.length}\n\n${headings.join('\n') || '- no headings'}\n`;
}

async function checkTyped(path, Type, label) {
  const modules = await defaultsAt(path);
  const invalid = modules.filter(({ value }) => !(value instanceof Type));
  if (invalid.length) throw new NllError('invalid-tool-artifact', `${invalid[0].file} does not export ${label}.`);
  return `# ${label} check\n\nAccepted modules: ${modules.length}\n`;
}

async function ontologyCommand(operation, path) {
  const loaded = await loadModule(path);
  if (!(loaded.default instanceof Ontology)) throw new NllError('invalid-ontology-module', `${path} does not export an Ontology.`);
  const view = loaded.default.inspect();
  if (operation === 'inspect') {
    return `# Ontology ${view.id}\n\nConcepts: ${view.concepts.length}\nRoles: ${view.roles.length}\nSorts: ${view.sorts.length}\n\n${view.concepts.map((value) => `- ${value.id}`).join('\n')}\n`;
  }
  return `# Ontology check\n\nAccepted: ${view.id}\nConcepts: ${view.concepts.length}\nRoles: ${view.roles.length}\n`;
}

async function contextCommand(operation, path) {
  const loaded = await loadModule(path);
  const context = loaded.default;
  if (!(context instanceof AgentAuthoringContext)) {
    throw new NllError('invalid-agent-context-module', `${path} does not export an AgentAuthoringContext.`);
  }
  if (operation === 'inspect') {
    const build = context.agent.value('build');
    const agentId = typeof build === 'string' ? context.agent.id : build.agentId;
    const buildId = typeof build === 'string' ? build : build.id;
    return `# Agent authoring context\n\nContext: ${context.id}\nPurpose: ${context.purpose}\n`
      + `Agent: ${agentId}\nBuild: ${buildId}\nDigest: ${context.digest}\n\n`
      + `Ontologies: ${context.ontologies.length}\nCircuits: ${context.circuits.length}\n`
      + `Concept demands: ${context.semanticDemand.concepts.size}\nRole demands: ${context.semanticDemand.roles.size}\n`
      + `Coverage demands: ${context.semanticDemand.coverageRequirements.length}\nSDK imports: ${context.sdkImports.length}\n`
      + `Providers: ${context.providers.length}\nTests: ${context.tests.length}\nBenchmarks: ${context.benchmarks.length}\n`;
  }
  return `# Agent authoring context check\n\nAccepted: ${context.id}\nPurpose: ${context.purpose}\nDigest: ${context.digest}\n`;
}

async function planCommand(operation, path) {
  const loaded = await loadModule(path);
  const plan = loaded.default;
  if (!(plan instanceof CircuitArchitecturePlan)) throw new NllError('invalid-plan-module', `${path} does not export a CircuitArchitecturePlan.`);
  if (operation === 'suggest') {
    const suggestions = plan.steps.flatMap((step) => {
      const request = methodRequest(`${plan.id}:${step.id}`).shapes(...step.problemShapes).signals(...step.signals)
        .assurance(...plan.assurance).seal();
      return DEFAULT_METHOD_CATALOG.suggest(request).map((value) => `- ${step.id}: ${value.descriptor.id}`);
    });
    return `# Method suggestions\n\n${suggestions.join('\n') || '- no steps'}\n`;
  }
  const diagnostics = checkArchitecturePlan(plan, DEFAULT_METHOD_CATALOG);
  return `# Architecture plan check\n\nDiagnostics: ${diagnostics.length}\n${diagnostics.map((value) => `- ${value.code}: ${value.message}`).join('\n')}\n`;
}

async function circuitCommand(operation, path) {
  const loaded = await loadModule(path);
  if (!(loaded.default instanceof CircuitTemplate)) throw new NllError('invalid-circuit-module', `${path} does not export a CircuitTemplate.`);
  const circuit = loaded.default;
  if (operation === 'preflight') {
    const result = abstractPreflight(conservativeAbstractCircuit(circuit));
    return `# Circuit preflight\n\nCircuit: ${circuit.id}\nStatus: ${result.status}\nDiagnostics: ${result.diagnostics.length}\n`;
  }
  return `# Circuit check\n\nCircuit: ${circuit.id}\nRules: ${circuit.rules.length}\nStages: ${circuit.stages.length}\nSubcircuits: ${circuit.subcircuits.length}\n`;
}

async function engineCommand(family, path) {
  const loaded = await loadModule(path);
  if (typeof loaded.default !== 'function') {
    throw new NllError('invalid-engine-program', `${path} must export a function that runs the ${family} experiment.`);
  }
  const result = await loaded.default();
  if (!result || (typeof result.kind !== 'string' && typeof result.status !== 'string')) {
    throw new NllError('invalid-engine-result', `${family} program did not return an opaque engine result.`);
  }
  return `# ${family} run\n\nKind: ${result.kind || result.constructor.name}\nStatus: ${result.status || 'completed'}\n`;
}

async function benchmarkCommand(path) {
  const modulePath = (await stat(path)).isDirectory() ? join(path, 'agent.mjs') : path;
  const loaded = await loadModule(modulePath);
  if (!(loaded.default instanceof AgentProject)) throw new NllError('invalid-agent-module', `${modulePath} does not export an AgentProject.`);
  const agent = Object.freeze({ root: dirname(modulePath), project: loaded.default });
  const result = await runBenchmark(agent, (text, id) => analyzeProject(agent.project, text, id, { foundation: 'off' }), coreVocabulary);
  return `# Benchmark run\n\nPassed: ${result.passedCount}/${result.total}\nStatus: ${result.passed ? 'PASSED' : 'FAILED'}\n`;
}

async function runNativeTool(argv, context) {
  try {
    const args = [...argv];
    const reportIndex = args.indexOf('--report');
    const reportPath = reportIndex >= 0 ? resolve(context.cwd, args[reportIndex + 1]) : null;
    if (reportIndex >= 0) args.splice(reportIndex, 2);
    const [family, operation, rawPath, ...rest] = args;
    if (!family || !operation || !rawPath) throw new NllError('invalid-arguments', 'Expected <family> <operation> <path>.');
    const path = resolve(context.cwd, rawPath);
    let report;
    if (family === 'source') report = await sourceCommand(operation, path, rest);
    else if (family === 'rules') report = await checkTyped(path, RuleAnalysis, 'RuleAnalysis');
    else if (family === 'ontology') report = await ontologyCommand(operation, path);
    else if (family === 'context') report = await contextCommand(operation, path);
    else if (family === 'methods' || family === 'plan') report = await planCommand(family === 'methods' ? 'suggest' : operation, path);
    else if (family === 'primitive') report = await checkTyped(path, PrimitiveDescriptor, 'PrimitiveDescriptor');
    else if (family === 'circuit') report = await circuitCommand(operation, path);
    else if (family === 'longtext') report = await checkTyped(path, LongTextProgram, 'LongTextProgram');
    else if (['constraint', 'relation', 'rewrite', 'proof', 'synthesis'].includes(family)) report = await engineCommand(family, path);
    else if (family === 'benchmark') report = await benchmarkCommand(path);
    else if (family === 'pack') report = await checkTyped(path, RulePack, 'RulePack');
    else throw new NllError('invalid-arguments', `Unknown native tool family: ${family}.`);
    if (reportPath) await atomicWrite(reportPath, report);
    context.stdout.write(report);
    return 0;
  } catch (caught) {
    const error = asNllError(caught);
    context.stderr.write(line(`nll: ${error.code}: ${error.message}`));
    return 1;
  }
}

export { defaultsAt, moduleFiles, runNativeTool };
