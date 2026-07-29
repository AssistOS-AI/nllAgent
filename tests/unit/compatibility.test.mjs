import assert from 'node:assert/strict';
import test from 'node:test';
import { compileCircuit } from '../../src/circuit/compiler.mjs';
import { compileMarkdown } from '../../src/longtext/compiler.mjs';
import { evaluateCompatibility } from '../../src/runtime/compatibility.mjs';
import { createStandardRegistries } from '../../src/runtime/standard-operators.mjs';

function compileConsumer(id, port, definition, registries) {
  return compileCircuit({
    kind: 'CircuitJS', id, version: '1.0.0', inputs: { [port]: definition },
    nodes: [{ id: `consume-${port}`, primitive: 'merge', inputs: { records: { $port: port } } }],
    outputs: { diagnostics: { $node: `consume-${port}` } }
  }, registries);
}

test('compatibility blocks a critical observation type without a producer', () => {
  const registries = createStandardRegistries();
  const circuit = compileConsumer('narrative.scene-check', 'scenes', {
    type: 'narrative.scene@1', critical: true
  }, registries);
  const report = evaluateCompatibility(compileMarkdown('Text.\n'), [circuit], { formats: ['text/markdown'] });
  assert.equal(report.status, 'incompatible');
  assert.deepEqual(report.blockedCircuits, ['narrative.scene-check']);
});

test('quality gaps limit a produced observation type without blocking its circuit', () => {
  const registries = createStandardRegistries();
  const circuit = compileConsumer('narrative.event-check', 'events', {
    type: 'narrative.event@1', critical: true, statuses: ['proposed']
  }, registries);
  const program = compileMarkdown('Alice left the phone in the car.\n');
  program.capabilities.push({
    type: 'narrative.event@1', producer: 'profile:narrative-events@1',
    coverage: 'open', statuses: ['proposed']
  });
  program.gaps.push({
    kind: 'model-output', type: 'narrative.event@1', producer: 'profile:narrative-events@1',
    block: 'paragraph:1', failures: ['one candidate used a non-exact quote']
  });

  const report = evaluateCompatibility(program, [circuit], { formats: ['text/markdown'] });
  assert.equal(report.status, 'compatible-with-limits');
  assert.deepEqual(report.activeCircuits, ['narrative.event-check']);
  assert.deepEqual(report.blockedCircuits, []);
  assert.equal(report.circuits[0].obligations[0].status, 'satisfied-with-limits');
});

test('insufficient semantic materialization blocks a critical port even when a producer exists', () => {
  const registries = createStandardRegistries();
  const circuit = compileConsumer('narrative.event-minimum', 'events', {
    type: 'narrative.event@1', critical: true, statuses: ['proposed']
  }, registries);
  const program = compileMarkdown('No relevant event is present.\n');
  program.capabilities.push({
    type: 'narrative.event@1', producer: 'profile:narrative-events@1',
    coverage: 'open', statuses: ['proposed']
  });
  program.gaps.push({
    kind: 'insufficient-materialization', type: 'narrative.event@1',
    producer: 'profile:narrative-events@1', required: 1, actual: 0
  });

  const report = evaluateCompatibility(program, [circuit], { formats: ['text/markdown'] });
  assert.equal(report.status, 'incompatible');
  assert.deepEqual(report.blockedCircuits, ['narrative.event-minimum']);
});

test('compatibility considers every producer for the same observation type', () => {
  const registries = createStandardRegistries();
  const circuit = compileConsumer('narrative.multi-producer', 'events', {
    type: 'narrative.event@1', critical: true, statuses: ['extracted']
  }, registries);
  const program = compileMarkdown('Event.\n');
  program.capabilities.push(
    { type: 'narrative.event@1', producer: 'approved@1', coverage: 'closed', statuses: ['extracted'] },
    { type: 'narrative.event@1', producer: 'proposal@1', coverage: 'open', statuses: ['proposed'] }
  );
  program.observations.push({
    id: 'event:1', type: 'narrative.event@1', status: 'extracted',
    scope: 'view:whole', anchors: [], payload: {}
  });
  const report = evaluateCompatibility(program, [circuit], { formats: ['text/markdown'] });
  assert.equal(report.status, 'compatible');
  assert.equal(report.circuits[0].obligations[0].evidence.producers.length, 2);
});

test('closed-world coverage must belong to the current source revision', () => {
  const registries = createStandardRegistries();
  const circuit = compileConsumer('document.complete-paragraphs', 'paragraphs', {
    type: 'document.paragraph@1', critical: true,
    statuses: ['extracted'], coverage: 'closed-world'
  }, registries);
  const wrongSource = compileMarkdown('Paragraph.\n');
  wrongSource.coverage[0].source = 'source:another-document';
  const wrongRevision = compileMarkdown('Paragraph.\n');
  wrongRevision.coverage[0].revision = 'sha256:wrong-revision';

  assert.equal(
    evaluateCompatibility(wrongSource, [circuit], { formats: ['text/markdown'] }).status,
    'incompatible'
  );
  assert.equal(
    evaluateCompatibility(wrongRevision, [circuit], { formats: ['text/markdown'] }).status,
    'incompatible'
  );
});
