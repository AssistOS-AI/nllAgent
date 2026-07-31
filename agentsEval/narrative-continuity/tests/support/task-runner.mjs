import { readFile } from 'node:fs/promises';
import * as coreVocabulary from '../../../../ontologies/core/index.mjs';
import { compileMarkdown } from '../../../../src/longtext/compiler.mjs';
import * as longTextApi from '../../../../src/longtext/api.mjs';
import { source } from '../../../../src/longtext/api.mjs';
import { ExecutionGraph } from '../../../../src/runtime/execution-graph.mjs';
import { executeCircuit } from '../../../../src/runtime/scheduler.mjs';
import { ExecutionTrace } from '../../../../src/runtime/trace.mjs';
import { SemanticStore } from '../../../../src/store/semantic-store.mjs';
import circuit from '../../circuits/continuity.circuit.mjs';
import generated from '../../task/generated/program.mjs';
import * as vocabulary from '../../ontologies/index.mjs';

const INPUT = new URL('../../task/task/input.md', import.meta.url);

async function materializeTask() {
  const text = await readFile(INPUT, 'utf8');
  const sourceValue = source('narrative-continuity-task.md', text, 'task-r1');
  const allVocabulary = Object.freeze({ ...coreVocabulary, ...vocabulary });
  const materializer = (context) => generated(Object.freeze({
    ...context, api: longTextApi, ontology: vocabulary, vocabulary: allVocabulary
  }));
  const program = await compileMarkdown(sourceValue, allVocabulary, [materializer]);
  const store = new SemanticStore();
  store.publish(program);
  return Object.freeze({ text, source: sourceValue, program, store });
}

async function executeTask(materialized) {
  const graph = new ExecutionGraph();
  const trace = new ExecutionTrace('narrative-continuity-forward-task');
  const execution = await executeCircuit(circuit, materialized.store, { graph, trace });
  return Object.freeze({ ...materialized, graph, trace, execution });
}

async function runTask() { return executeTask(await materializeTask()); }

export { executeTask, materializeTask, runTask };
