import * as coreVocabulary from '../../ontologies/core/index.mjs';
import { CNLFrame, renderVerified } from '../generation/cnl.mjs';
import { compileMarkdown, source } from '../longtext/index.mjs';
import { LongTextProgram } from '../longtext/model.mjs';
import { NllError } from '../core/errors.mjs';
import { Term } from '../ontology/model.mjs';
import { SemanticStore } from '../store/semantic-store.mjs';
import { foundationCircuit } from '../foundation/circuit.mjs';
import { materializeFoundation } from '../foundation/materializer.mjs';
import { executeCircuit } from './scheduler.mjs';
import { ExecutionTrace } from './trace.mjs';

async function materializeProject(project, sourceValue, foundation = 'core') {
  const materializers = foundation === 'core'
    ? [materializeFoundation, ...project.materializers]
    : [...project.materializers];
  const program = await compileMarkdown(sourceValue, coreVocabulary, materializers);
  const store = new SemanticStore();
  store.publish(program);
  return Object.freeze({ program, store });
}

async function executeProgram(project, program, options = {}) {
  if (!(program instanceof LongTextProgram)) {
    throw new NllError('invalid-program', 'Deterministic analysis requires a LongTextProgram.');
  }
  const store = options.store || new SemanticStore();
  if (!options.store) store.publish(program);
  const trace = new ExecutionTrace(`audit:${program.source.digest}`);
  const circuits = options.foundation === 'off'
    ? project.circuits
    : [foundationCircuit, ...project.circuits];
  for (const template of circuits) {
    await executeCircuit(template, store, {
      trace,
      tools: project.tools
    });
  }
  const findings = store.outputs.filter((output) => output instanceof Term && output.concept.name === 'Finding');
  return Object.freeze({
    source: program.source,
    program,
    store,
    trace,
    findings,
    status: store.gaps.length ? 'reported-with-limits' : 'reported'
  });
}

async function analyzeProject(project, text, sourceId, options = {}) {
  const sourceValue = source(sourceId, text, options.revision || 'working');
  const { program, store } = await materializeProject(project, sourceValue, options.foundation);
  return executeProgram(project, program, { ...options, store });
}

async function analyzeLongTextProject(project, program, options = {}) {
  return executeProgram(project, program, options);
}

async function planProject(project, text, sourceId, options = {}) {
  const sourceValue = source(sourceId, text, options.revision || 'working');
  const { program, store } = await materializeProject(project, sourceValue, options.foundation);
  const trace = new ExecutionTrace(`plan:${sourceValue.digest}`);
  for (const template of project.planningCircuits) {
    await executeCircuit(template, store, {
      trace,
      tools: project.tools
    });
  }
  const frame = store.outputs.find((output) => output instanceof CNLFrame);
  const dialect = project.dialects[0];
  const document = frame && dialect ? renderVerified(frame, dialect) : null;
  return Object.freeze({ source: sourceValue, program, store, trace, frame, document, status: frame ? 'planned' : 'blocked-capability' });
}

export { analyzeLongTextProject, analyzeProject, materializeProject, planProject };
