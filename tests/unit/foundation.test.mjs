import assert from 'node:assert/strict';
import test from 'node:test';
import { compileCircuit } from '../../src/circuit/compiler.mjs';
import {
  evaluateArithmeticPayload,
  FOUNDATION_CLASSES,
  foundationCoreCircuitSources,
  foundationPackDescriptor,
  MEASURE_UNITS,
  parseArithmeticSentence,
  parseEmotionSentence,
  parseQuantitySentence,
  parseStateSentence,
  parseTemporalSentence,
  typeAssertionFromState,
  unitCompatible
} from '../../src/foundation/index.mjs';
import { compileMarkdown } from '../../src/longtext/compiler.mjs';
import { createStandardRegistries } from '../../src/runtime/standard-operators.mjs';
import { executeCircuit } from '../../src/runtime/scheduler.mjs';

const SOURCE = [
  'The north door is open at noon. The north door is not open at noon.',
  '',
  'The launch happened before the inspection. The inspection happened before the launch.'
].join('\n');

test('foundation-core materializes every bounded ontology family by default', () => {
  const extendedSource = [
    SOURCE,
    '2 plus 2 equals 4.',
    'The sample has mass 2 kg at noon.',
    'Alice is a person.',
    'Alice feels calm toward Bob at noon.'
  ].join(' ');
  const program = compileMarkdown(extendedSource);
  assert.equal(program.ontologyPacks[0].id, 'foundation-core');
  assert.equal(program.ontologyPacks[0].version, '1.1.0');
  assert.equal(program.ontologyPacks[0].digest, foundationPackDescriptor().digest);
  assert.equal(program.observations.filter((item) => item.type === 'foundation.state-assertion@1').length, 3);
  assert.equal(program.observations.filter((item) => item.type === 'foundation.temporal-relation@1').length, 2);
  assert.equal(program.observations.filter((item) => item.type === 'foundation.type-assertion@1').length, 1);
  assert.equal(program.observations.filter((item) => item.type === 'foundation.arithmetic-assertion@1').length, 1);
  assert.equal(program.observations.filter((item) => item.type === 'foundation.quantity-assertion@1').length, 1);
  assert.equal(program.observations.filter((item) => item.type === 'foundation.emotion-assertion@1').length, 1);
  assert.ok(program.observations.filter((item) => item.type === 'foundation.entity-mention@1').length >= 10);
  assert.ok(program.ontologyPacks[0].vocabularies.classes.includes('inanimate object'));
  assert.ok(program.ontologyPacks[0].vocabularies.measures.includes('temperature'));
  assert.ok(Object.isFrozen(program.ontologyPacks[0].vocabularies.units.mass));
  assert.throws(() => program.ontologyPacks[0].vocabularies.units.mass.push('stone'), TypeError);
  const coverage = program.coverage.find((item) => item.id === 'coverage:foundation-controlled-english');
  assert.equal(coverage.mode, 'open-world');
  assert.equal(coverage.verified, true);
  assert.ok(coverage.exclusions.includes('contingent world knowledge'));
  assert.ok(program.ontologyPacks[0].observationTypes.every((type) =>
    program.capabilities.some((capability) => capability.type === type)));
});

test('foundation parsing exposes its exact controlled-English boundary', () => {
  assert.deepEqual(parseStateSentence('The door is not open at noon.'), {
    subject: 'The door', subjectKey: 'the door', predicate: 'open', predicateKey: 'open',
    polarity: 'denied', time: 'noon', timeKey: 'noon', timeFrame: 'present',
    world: 'world:source', grammar: 'copular-state@1'
  });
  assert.equal(parseStateSentence('Alice opened the door.'), null);
  assert.equal(parseTemporalSentence('The launch happened after the inspection.'), null);
  assert.equal(parseTemporalSentence('A happened before B.').relation, 'before');
  assert.deepEqual(parseArithmeticSentence('0.1 plus 0.2 equals 0.3.'), {
    left: '0.1', operator: 'plus', right: '0.2', result: '0.3',
    world: 'world:source', grammar: 'exact-decimal-equality@1'
  });
  assert.equal(parseArithmeticSentence('Two plus two equals four.'), null);
  assert.equal(parseArithmeticSentence(`${'9'.repeat(129)} plus 1 equals 1.`), null);
  assert.equal(parseQuantitySentence('The sample has mass -2 kg at noon.').unitKey, 'kg');
  assert.equal(parseQuantitySentence('The sample weighs two kilograms.'), null);
  assert.deepEqual(parseEmotionSentence('Alice did not feel afraid toward Bob at noon.'), {
    experiencer: 'Alice', experiencerKey: 'alice', emotion: 'afraid', emotionKey: 'afraid',
    polarity: 'denied', target: 'Bob', targetKey: 'bob', time: 'noon', timeKey: 'noon',
    timeFrame: 'past', world: 'world:source', grammar: 'literal-emotion-attribution@1'
  });
  assert.equal(parseEmotionSentence('Alice smiled nervously.'), null);
  assert.equal(typeAssertionFromState(parseStateSentence('Alice is a person.')).typeKey, 'person');
  assert.equal(typeAssertionFromState(parseStateSentence('Alice is a doctor.')), null);
});

test('foundation controlled forms cover every published verb, operation, measure, and unit', () => {
  for (const [verb, frame] of [
    ['is', 'present'], ['are', 'present'], ['was', 'past'], ['were', 'past']
  ]) assert.equal(parseStateSentence(`Subject ${verb} ready.`)?.timeFrame, frame, verb);

  for (const verb of ['happened', 'occurred', 'happens', 'occurs', 'took place', 'takes place']) {
    assert.equal(parseTemporalSentence(`A ${verb} before B.`)?.relation, 'before', verb);
  }
  for (const [source, operator] of [
    ['4 plus 2 equals 6.', 'plus'],
    ['4 minus 2 equals 2.', 'minus'],
    ['4 times 2 equals 8.', 'times'],
    ['4 divided by 2 equals 2.', 'divided-by']
  ]) assert.equal(parseArithmeticSentence(source)?.operator, operator, source);

  for (const [verb, polarity, frame] of [
    ['feels', 'affirmed', 'present'], ['does not feel', 'denied', 'present'],
    ['felt', 'affirmed', 'past'], ['did not feel', 'denied', 'past']
  ]) {
    const emotion = parseEmotionSentence(`Alice ${verb} calm.`);
    assert.equal(emotion?.polarity, polarity, verb);
    assert.equal(emotion?.timeFrame, frame, verb);
  }

  for (const [measure, units] of Object.entries(MEASURE_UNITS)) {
    for (const unit of units) {
      const suffix = unit ? ` ${unit}` : '';
      const quantity = parseQuantitySentence(`Sample has ${measure} 1${suffix}.`);
      assert.equal(quantity?.measureKey, measure, `${measure}:${unit}`);
      assert.equal(unitCompatible({ payload: quantity }), true, `${measure}:${unit}`);
    }
    assert.equal(unitCompatible({ payload: { measureKey: measure, unitKey: 'wrong-unit' } }), false, measure);
  }
  for (const kind of FOUNDATION_CLASSES) {
    const assertion = typeAssertionFromState(parseStateSentence(`Subject is a ${kind}.`));
    assert.equal(assertion?.typeKey, kind, kind);
  }
});

test('exact arithmetic uses rational decimal semantics and rejects undefined division', () => {
  assert.deepEqual(evaluateArithmeticPayload({
    left: '0.1', operator: 'plus', right: '0.2', result: '0.3'
  }), { valid: true, reason: null, computed: '3/10' });
  assert.deepEqual(evaluateArithmeticPayload({
    left: '1', operator: 'divided-by', right: '0', result: '0'
  }), { valid: false, reason: 'division-by-zero', computed: null });
  assert.equal(evaluateArithmeticPayload({ left: '5', operator: 'minus', right: '2', result: '3' }).valid, true);
  assert.equal(evaluateArithmeticPayload({ left: '-2', operator: 'times', right: '3', result: '-6' }).valid, true);
  assert.equal(evaluateArithmeticPayload({ left: '1', operator: 'divided-by', right: '4', result: '0.25' }).valid, true);
});

test('LongTextJS sentence boundaries preserve decimal quantities and exact anchors', () => {
  const program = compileMarkdown('The sample has temperature -273.16 C. Next is valid.');
  const sentences = program.observations.filter((item) => item.type === 'document.sentence@1');
  assert.deepEqual(sentences.map((item) => item.payload.text), [
    'The sample has temperature -273.16 C.', 'Next is valid.'
  ]);
  const quantity = program.observations.find((item) => item.type === 'foundation.quantity-assertion@1');
  assert.equal(quantity.payload.value, '-273.16');
  assert.equal(quantity.payload.unitKey, 'c');
  assert.equal(program.anchors[quantity.anchors[0]].quote, 'The sample has temperature -273.16 C.');
});

test('foundation circuits construct, independently verify, and emit both core inconsistency forms', async () => {
  const program = compileMarkdown(SOURCE);
  const registries = createStandardRegistries();
  const findings = [];
  for (const source of foundationCoreCircuitSources()) {
    const result = await executeCircuit(compileCircuit(source, registries), program, registries);
    findings.push(...result.outputs.findings);
  }
  assert.deepEqual(findings.map((item) => item.rule).sort(), [
    'FOUNDATION-LOGIC-001', 'FOUNDATION-TIME-001'
  ]);
  assert.ok(findings.every((item) => item.guarantee === 'mechanically-certified'));
  assert.ok(findings.every((item) => item.verifierResult.status === 'accept'));

  const candidate = registries.operators.get('foundation.state-conflicts@1').execute({
    assertions: program.observations.filter((item) => item.type === 'foundation.state-assertion@1')
  }, { program });
  candidate[0].witness.observationIds[1] = 'observation:forged';
  const replay = registries.verifiers.get('foundation.state-conflicts@1').execute(
    { candidates: candidate }, { program }
  );
  assert.equal(replay[0].verifierResult.status, 'reject');
});

test('foundation state reasoning covers explicit exclusive pairs but keeps time contexts separate', async () => {
  const program = compileMarkdown([
    'The hatch is open at noon. The hatch is closed at noon.',
    'The lamp is on at noon. The lamp is off at dusk.'
  ].join('\n'));
  const registries = createStandardRegistries();
  const circuit = compileCircuit(foundationCoreCircuitSources()[0], registries);
  const result = await executeCircuit(circuit, program, registries);
  assert.equal(result.outputs.findings.length, 1);
  assert.equal(result.outputs.findings[0].witness.conflictKind, 'mutually-exclusive-states');
  assert.equal(result.outputs.findings[0].subject, 'The hatch');
});

test('foundation arithmetic circuit detects false equality and division by zero but accepts exact decimals', async () => {
  const program = compileMarkdown([
    '0.1 plus 0.2 equals 0.3.',
    '2 times 3 equals 7.',
    '1 divided by 0 equals 0.'
  ].join(' '));
  const registries = createStandardRegistries();
  const circuit = compileCircuit(foundationCoreCircuitSources()[2], registries);
  const result = await executeCircuit(circuit, program, registries);
  assert.deepEqual(result.outputs.findings.map((item) => item.witness.reason).sort(), [
    'division-by-zero', 'incorrect-equality'
  ]);
  assert.ok(result.outputs.findings.every((item) => item.verifierResult.status === 'accept'));

  const candidates = registries.operators.get('foundation.arithmetic-conflicts@1').execute({
    assertions: program.observations.filter((item) => item.type === 'foundation.arithmetic-assertion@1')
  }, { program });
  candidates[0].witness.computed = 'forged';
  const replay = registries.verifiers.get('foundation.arithmetic-conflicts@1').execute(
    { candidates: [candidates[0]] }, { program }
  );
  assert.equal(replay[0].verifierResult.status, 'reject');
});

test('foundation physical circuit checks every documented range, units, and exact quantity disagreement', async () => {
  const invalid = [
    'Mass sample has mass -1 kg at noon.',
    'Duration sample has duration -1 s at noon.',
    'Distance sample has distance -1 m at noon.',
    'Length sample has length -1 m at noon.',
    'Speed sample has speed -1 m/s at noon.',
    'Low probability has probability -0.1.',
    'High probability has probability 1.1.',
    'Low percentage has percentage -1 %.',
    'High percentage has percentage 101 %.',
    'Kelvin sample has temperature -0.1 K.',
    'Celsius sample has temperature -273.16 C.',
    'Fahrenheit sample has temperature -459.68 F.',
    'Unit sample has mass 2 seconds.',
    'Road has distance 4 km at noon.',
    'Road has distance 5 km at noon.'
  ];
  const valid = [
    'Zero mass has mass 0 kg.',
    'Certain trial has probability 1.',
    'Complete work has percentage 100 %.',
    'Kelvin boundary has temperature 0 K.',
    'Celsius boundary has temperature -273.15 C.',
    'Fahrenheit boundary has temperature -459.67 F.'
  ];
  const program = compileMarkdown([...invalid, ...valid].join(' '));
  const registries = createStandardRegistries();
  const circuit = compileCircuit(foundationCoreCircuitSources()[3], registries);
  const result = await executeCircuit(circuit, program, registries);
  assert.equal(result.outputs.findings.filter((item) => item.rule === 'FOUNDATION-PHYSICS-001').length, 13);
  assert.equal(result.outputs.findings.filter((item) => item.rule === 'FOUNDATION-QUANTITY-001').length, 1);
  assert.ok(result.outputs.findings.every((item) => item.verifierResult.status === 'accept'));
  assert.ok(result.outputs.findings.some((item) => item.witness.violationKind === 'unit-incompatible'));
  assert.ok(result.outputs.findings.some((item) => item.witness.violationKind === 'below-absolute-zero'));

  const candidates = registries.operators.get('foundation.physical-conflicts@1').execute({
    assertions: program.observations.filter((item) => item.type === 'foundation.quantity-assertion@1')
  }, { program });
  candidates[0].witness.observationIds = ['observation:forged'];
  const replay = registries.verifiers.get('foundation.physical-conflicts@1').execute(
    { candidates: [candidates[0]] }, { program }
  );
  assert.equal(replay[0].verifierResult.status, 'reject');
});

test('foundation emotion and type circuit detects explicit contradictions without forbidding mixed emotions', async () => {
  const program = compileMarkdown([
    'Alice feels afraid at noon.',
    'Alice does not feel afraid at noon.',
    'Alice feels happy at noon.',
    'Alice feels sad at noon.',
    'The statue is an inanimate object.',
    'The statue is a person.',
    'The statue feels lonely.',
    'The robot is an inanimate object.',
    'The robot is a sentient agent.',
    'The sculpture is an inanimate object.',
    'The sculpture is an animal.',
    'The old statue was an inanimate object.',
    'The old statue feels lonely.',
    'Bob feels calm at noon.',
    'Bob does not feel calm at dusk.'
  ].join(' '));
  const registries = createStandardRegistries();
  const circuit = compileCircuit(foundationCoreCircuitSources()[4], registries);
  const result = await executeCircuit(circuit, program, registries);
  const rules = result.outputs.findings.map((item) => item.rule);
  assert.equal(rules.filter((rule) => rule === 'FOUNDATION-EMOTION-001').length, 1);
  assert.equal(rules.filter((rule) => rule === 'FOUNDATION-ONTOLOGY-001').length, 3);
  assert.equal(rules.filter((rule) => rule === 'FOUNDATION-PSYCHOLOGY-001').length, 1);
  assert.ok(result.outputs.findings.every((item) => item.verifierResult.status === 'accept'));
  assert.equal(result.outputs.findings.some((item) => item.explanation.includes('happy')), false);

  const candidates = registries.operators.get('foundation.emotional-conflicts@1').execute({
    emotions: program.observations.filter((item) => item.type === 'foundation.emotion-assertion@1'),
    types: program.observations.filter((item) => item.type === 'foundation.type-assertion@1')
  }, { program });
  candidates[0].witness.violationKind = 'forged';
  const replay = registries.verifiers.get('foundation.emotional-conflicts@1').execute(
    { candidates: [candidates[0]] }, { program }
  );
  assert.equal(replay[0].verifierResult.status, 'reject');
});

test('foundation off leaves structural LongTextJS intact and creates no foundation observations', () => {
  const program = compileMarkdown(SOURCE, { foundation: 'off' });
  assert.deepEqual(program.ontologyPacks, [{ kind: 'FoundationSelection', mode: 'off' }]);
  assert.equal(program.observations.some((item) => item.type.startsWith('foundation.')), false);
  assert.equal(program.capabilities.some((item) => item.type.startsWith('foundation.')), false);
  assert.ok(program.observations.some((item) => item.type === 'document.sentence@1'));
});
