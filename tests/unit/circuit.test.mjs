import assert from 'node:assert/strict';
import test from 'node:test';
import { compileCircuit } from '../../src/circuit/compiler.mjs';
import { compileMarkdown } from '../../src/longtext/compiler.mjs';
import { guaranteeMeet, guaranteeSatisfies } from '../../src/runtime/guarantees.mjs';
import { bindPorts, executeCircuit } from '../../src/runtime/scheduler.mjs';
import { createStandardRegistries } from '../../src/runtime/standard-operators.mjs';

const registries = createStandardRegistries();

function validCircuit() {
  return {
    kind: 'CircuitJS', id: 'test.literal', version: '1.0.0',
    inputs: { paragraphs: { type: 'document.paragraph@1', coverage: 'closed-world' } },
    nodes: [
      { id: 'matches', primitive: 'call', operator: 'text.lexical-occurrences@1', inputs: {
        observations: { $port: 'paragraphs' }, rules: [{ id: 'T-1', term: 'perhaps', severity: 'error' }]
      } },
      { id: 'checked', primitive: 'verify', verifier: 'text.exact-match@1', inputs: { candidates: { $node: 'matches' } } },
      { id: 'out', primitive: 'emit', inputs: { verified: { $node: 'checked' } } }
    ],
    outputs: { findings: { $node: 'out' } }
  };
}

test('Circuit compiler rejects an unverified emit path', () => {
  const circuit = validCircuit();
  circuit.nodes = [circuit.nodes[0], { id: 'out', primitive: 'emit', inputs: { candidates: { $node: 'matches' } } }];
  assert.throws(() => compileCircuit(circuit, registries), /not dominated/u);
});

test('Circuit compiler links operators for every computational primitive', () => {
  assert.throws(() => compileCircuit({
    kind: 'CircuitJS', id: 'unknown-derive', version: '1.0.0', inputs: {},
    nodes: [{ id: 'derive', primitive: 'derive', operator: 'missing.operator@1', inputs: {} }],
    outputs: { values: { $node: 'derive' } }
  }, createStandardRegistries()), (error) => error.code === 'unknown-operator');
});

test('Circuit compiler rejects dead declarations and validates nominal versions', () => {
  const circuit = validCircuit();
  circuit.inputs.unused = { type: 'narrative.unused@1', statuses: ['proposed'] };
  assert.throws(() => compileCircuit(circuit, registries), /unused input ports/u);
  delete circuit.inputs.unused;
  circuit.nodes.push({ id: 'dead', primitive: 'guard', inputs: { condition: true } });
  assert.throws(() => compileCircuit(circuit, registries), /cannot affect a declared output/u);
  circuit.nodes.pop();
  circuit.inputs.paragraphs.type = 'unversioned';
  assert.throws(() => compileCircuit(circuit, registries), /versioned nominal/u);
});

test('Circuit runtime emits a mechanically verified source finding', async () => {
  const program = compileMarkdown('She perhaps hesitates.\n');
  const result = await executeCircuit(compileCircuit(validCircuit(), registries), program, registries);
  assert.equal(result.outputs.findings.length, 1);
  assert.equal(result.outputs.findings[0].kind, 'Finding');
  assert.equal(result.outputs.findings[0].guarantee, 'mechanically-certified');
  assert.equal(result.outputs.findings[0].mainAnchor.quote, 'perhaps');
});

test('runtime port binding enforces accepted statuses and cardinality', () => {
  const program = compileMarkdown('One paragraph.');
  const circuit = validCircuit();
  circuit.inputs.paragraphs.statuses = ['proposed'];
  circuit.inputs.paragraphs.cardinality = 'at-least-one';
  assert.throws(() => bindPorts(program, circuit), (error) => error.code === 'port-cardinality-failed');
});

test('deterministic verification preserves a proposed semantic premise ceiling', async () => {
  const program = compileMarkdown('She perhaps hesitates.');
  const paragraph = program.observations.find((item) => item.type === 'document.paragraph@1');
  paragraph.status = 'proposed';
  const result = await executeCircuit(compileCircuit(validCircuit(), registries), program, registries);
  assert.equal(result.outputs.findings[0].guarantee, 'evidence-certified');
});

test('node cache keys include the complete LongTextJS program context', async () => {
  const localRegistries = createStandardRegistries();
  localRegistries.operators.register({
    id: 'test.source-revision@1',
    description: 'Expose source revision for cache isolation testing.',
    execute: (_inputs, context) => context.program.source.revision
  });
  const compiled = compileCircuit({
    kind: 'CircuitJS', id: 'test.cache-context', version: '1.0.0', inputs: {},
    nodes: [{ id: 'revision', primitive: 'call', operator: 'test.source-revision@1', inputs: {} }],
    outputs: { value: { $node: 'revision' } }
  }, localRegistries);
  const values = new Map();
  const cache = {
    async get(key) { return values.get(JSON.stringify(key)) ?? null; },
    async set(key, value) { values.set(JSON.stringify(key), value); }
  };
  const first = await executeCircuit(compiled, compileMarkdown('First.'), localRegistries, { cache });
  const second = await executeCircuit(compiled, compileMarkdown('Second.'), localRegistries, { cache });
  assert.notEqual(first.outputs.value, second.outputs.value);
  assert.equal(second.trace[0].cacheHit, false);
});

test('human confirmation remains distinct from mechanical certification', () => {
  assert.equal(guaranteeMeet('human-confirmed', 'mechanically-certified'), 'human-confirmed');
  assert.equal(guaranteeSatisfies('human-confirmed', 'mechanically-certified'), false);
  assert.equal(guaranteeSatisfies('mechanically-certified', 'human-confirmed'), false);
  assert.equal(guaranteeSatisfies('human-confirmed', 'evidence-certified'), true);
});
