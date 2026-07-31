import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as coreVocabulary from '../../ontologies/core/index.mjs';
import { renderLongTextModule, renderResultModule, renderTraceModule } from '../artifacts/source-printer.mjs';
import { quote } from '../core/canonical-source.mjs';
import { CNLFrame, renderVerified } from '../generation/cnl.mjs';
import * as longTextApi from '../longtext/api.mjs';
import { compileMarkdown, source } from '../longtext/index.mjs';
import { LongTextProgram } from '../longtext/model.mjs';
import { renderReport } from '../report/markdown-renderer.mjs';
import { foundationCircuit } from '../foundation/circuit.mjs';
import { materializeFoundation } from '../foundation/materializer.mjs';
import { executeCircuit } from '../runtime/scheduler.mjs';
import { ExecutionTrace } from '../runtime/trace.mjs';
import { SemanticStore } from '../store/semantic-store.mjs';
import { Term } from '../ontology/model.mjs';

const [agentPath, generatedPath, inputPath, outputRoot, mode, foundation] = process.argv.slice(2);
const agentLoaded = await import(pathToFileURL(agentPath).href);
const generatedLoaded = await import(pathToFileURL(generatedPath).href);
const ontologyLoaded = await import(pathToFileURL(join(dirname(agentPath), 'ontologies', 'index.mjs')).href);
const project = agentLoaded.default;
const generated = generatedLoaded.default;
if (typeof generated !== 'function' && !(generated instanceof LongTextProgram)) {
  throw new Error('Generated LongTextJS must export a materializer function or a LongTextProgram.');
}

const text = await readFile(inputPath, 'utf8');
const sourceValue = source(inputPath, text, 'working');
const vocabulary = Object.freeze({ ...coreVocabulary, ...ontologyLoaded });
let program;
if (generated instanceof LongTextProgram) program = generated;
else {
  const generatedMaterializer = (context) => generated(Object.freeze({
    ...context, api: longTextApi, ontology: ontologyLoaded, vocabulary
  }));
  const materializers = foundation === 'core'
    ? [materializeFoundation, generatedMaterializer, ...project.materializers]
    : [generatedMaterializer, ...project.materializers];
  program = await compileMarkdown(sourceValue, vocabulary, materializers);
}

const store = new SemanticStore();
store.publish(program);
const trace = new ExecutionTrace(`${mode}:${sourceValue.digest}`);
const circuits = mode === 'plan'
  ? project.planningCircuits
  : foundation === 'off' ? project.circuits : [foundationCircuit, ...project.circuits];
for (const template of circuits) {
  await executeCircuit(template, store, { trace, tools: project.tools });
}
const findings = store.outputs.filter((output) => output instanceof Term && output.concept.name === 'Finding');
const frame = store.outputs.find((output) => output instanceof CNLFrame);
const document = frame && project.dialects[0] ? renderVerified(frame, project.dialects[0]) : null;
const status = mode === 'plan'
  ? frame ? 'planned' : 'blocked-capability'
  : store.gaps.length ? 'reported-with-limits' : 'reported';
await mkdir(join(outputRoot, 'longtext'), { recursive: true });
await mkdir(join(outputRoot, 'trace'), { recursive: true });
const options = {
  moduleDirectory: join(outputRoot, 'longtext'),
  longTextApi: join(import.meta.dirname, '..', 'longtext', 'api.mjs'),
  ontologyApi: join(import.meta.dirname, '..', 'ontology', 'api.mjs'),
  artifactsApi: join(import.meta.dirname, '..', 'artifacts', 'api.mjs'),
  traceApi: join(import.meta.dirname, '..', 'runtime', 'trace.mjs'),
  cnlApi: join(import.meta.dirname, '..', 'generation', 'cnl.mjs'),
  ontologyModule: join(dirname(agentPath), 'ontologies', 'index.mjs')
};
await writeFile(join(outputRoot, 'input.md'), text, 'utf8');
await writeFile(join(outputRoot, 'longtext', 'program.mjs'), renderLongTextModule(program, options), 'utf8');
await writeFile(join(outputRoot, 'trace', 'run.trace.mjs'), renderTraceModule(trace, { ...options, moduleDirectory: join(outputRoot, 'trace') }), 'utf8');
const structuredOutputs = mode === 'plan' && frame ? [frame] : findings;
await writeFile(join(outputRoot, 'result.mjs'), renderResultModule('isolated-analysis', status, structuredOutputs, {
  ...options,
  moduleDirectory: outputRoot,
  longTextModule: join(outputRoot, 'longtext', 'program.mjs'),
  sourceId: sourceValue.id
}), 'utf8');
const report = mode === 'plan'
  ? document?.content || `# Planning blocked\n\nStatus: ${status}\n`
  : renderReport({
    agent: project.id, run: 'isolated-analysis', status, source: sourceValue, findings,
    foundation, vocabulary: coreVocabulary, limitations: store.gaps.map((gap) => gap.gapKind)
  });
await writeFile(join(outputRoot, 'report.md'), report, 'utf8');
await writeFile(join(outputRoot, 'summary.mjs'), [
  `export const status = ${quote(status)};`,
  `export const findingCount = ${findings.length};`,
  `export const program = ${quote(relative(outputRoot, join(outputRoot, 'longtext', 'program.mjs')))};`,
  ''
].join('\n'), 'utf8');
process.stdout.write(`completed ${status} ${findings.length}\n`);
