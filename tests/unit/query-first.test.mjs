import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TRUTH, candidateProjection, evaluateDecisionTable, evaluateTruth,
  executeLongTextQuery, executeQueryFirstReference, lowerQueryFirstCircuit,
  programRelation, validateLongTextQuery
} from '../../src/circuit/query-first/index.mjs';
import { compileCircuit } from '../../src/circuit/compiler.mjs';
import { evaluateCircuitModule } from '../../src/circuit/module-loader.mjs';
import { compileMarkdown } from '../../src/longtext/compiler.mjs';
import { executeCircuit } from '../../src/runtime/scheduler.mjs';
import { compareQueryFirstExecution } from '../../src/runtime/analyzer.mjs';
import { createStandardRegistries } from '../../src/runtime/standard-operators.mjs';

function paragraphQuery() {
  return {
    kind: 'LongTextQuery', schemaVersion: 1, id: 'q:paragraphs',
    from: {
      relation: 'observations', as: 'p', type: 'document.paragraph@1',
      statuses: ['extracted']
    },
    where: {
      op: 'eq', left: { field: 'p.payload.structuralRole' }, right: { literal: 'paragraph' }
    },
    select: {
      paragraph: { ref: 'p' }, text: { field: 'p.payload.text' }, order: { field: 'p.payload.order' }
    },
    orderBy: [
      { expr: { field: 'p.payload.order' }, direction: 'asc' },
      { expr: { field: 'p.id' }, direction: 'asc' }
    ],
    budgets: { rowsRead: 100, intermediateRows: 100 }
  };
}

function phraseTable() {
  return {
    kind: 'DecisionTable', schemaVersion: 1, id: 'table:phrases', input: 'q:paragraphs',
    hitPolicy: 'collect', unknownPolicy: 'report-undetermined',
    verifyWith: 'query.decision-replay@1',
    rows: [{
      id: 'QF-001', priority: 10,
      authority: ['authority/style-guide.md#qf-001'],
      when: {
        op: 'wholeWord', left: { field: 'p.payload.text' }, right: { literal: 'in fact' },
        caseSensitive: false, locale: 'und'
      },
      then: {
        rule: 'QF-001', verdict: 'violation', severity: 'warning',
        subject: { field: 'p.id' }, scope: { field: 'p.scope' },
        mainAnchor: { anchorFrom: 'p' },
        explanation: 'The narrative paragraph contains the whole phrase “in fact”.',
        remediation: 'Remove or replace the phrase.'
      }
    }]
  };
}

function queryFirstDefinition() {
  return {
    kind: 'CircuitJSQueryFirst', dialect: 'circuitjs-query-first@1',
    id: 'editorial.query-first-phrase', version: '1.0.0',
    description: 'Demonstrate typed LongTextJS query and evidence-aware table lowering.',
    sourceRuleReferences: ['authority/style-guide.md#qf-001'],
    queries: { paragraphs: paragraphQuery() },
    decisionTables: [phraseTable()],
    budgets: { nodes: 20, wallTimeMs: 5000 }
  };
}

test('LongText relation adapters expose every canonical program construction', () => {
  const program = compileMarkdown('# Heading\n\nIn fact, yes.\n\n> Quote\n\n- item\n');
  const relations = [
    'source', 'blocks', 'anchors', 'schemas', 'ontologyPacks', 'views', 'scopes', 'worlds', 'mentions',
    'entities', 'identityCandidates', 'observations', 'task', 'capabilities', 'coverage',
    'gaps', 'diagnostics'
  ];
  for (const relation of relations) assert.ok(Array.isArray(programRelation(program, relation)), relation);
  assert.equal(programRelation(program, 'source').length, 1);
  assert.equal(programRelation(program, 'task').length, 1);
  assert.ok(programRelation(program, 'blocks').length >= 4);
  assert.ok(programRelation(program, 'anchors').every((anchor) =>
    Array.from(program.source.content).slice(anchor.range.start, anchor.range.end).join('') === anchor.quote));
});

test('queries can inspect the selected ontology pack and every foundation observation schema', () => {
  const program = compileMarkdown([
    'The hatch is open at noon.',
    'Alice is a person.',
    'A happened before B.',
    '2 plus 2 equals 4.',
    'The sample has mass 2 kg.',
    'Alice feels calm at noon.'
  ].join(' '));
  const packQuery = {
    kind: 'LongTextQuery', schemaVersion: 1, id: 'q:ontology-packs',
    from: { relation: 'ontologyPacks', as: 'pack' },
    select: {
      id: { field: 'pack.id' }, mode: { field: 'pack.mode' }, digest: { field: 'pack.digest' },
      vocabularies: { field: 'pack.vocabularies' }
    },
    orderBy: [{ expr: { field: 'pack.id' }, direction: 'asc' }]
  };
  const stateQuery = {
    kind: 'LongTextQuery', schemaVersion: 1, id: 'q:foundation-states',
    from: {
      relation: 'observations', as: 's', type: 'foundation.state-assertion@1',
      statuses: ['extracted']
    },
    select: {
      subject: { field: 's.payload.subject' }, predicate: { field: 's.payload.predicate' }
    },
    orderBy: [{ expr: { field: 's.id' }, direction: 'asc' }]
  };
  const packs = executeLongTextQuery(packQuery, program);
  const states = executeLongTextQuery(stateQuery, program);
  assert.deepEqual(packs.rows.map((row) => row.value.mode), ['core']);
  assert.match(packs.rows[0].value.digest, /^sha256:/u);
  assert.ok(packs.rows[0].value.vocabularies.classes.includes('person'));
  assert.ok(packs.rows[0].value.vocabularies.measures.includes('mass'));
  assert.deepEqual(states.rows.map((row) => row.value), [
    { subject: 'Alice', predicate: 'a person' },
    { subject: 'The hatch', predicate: 'open' }
  ]);

  const cases = [
    ['foundation.type-assertion@1', 'typeKey', 'person'],
    ['foundation.temporal-relation@1', 'relation', 'before'],
    ['foundation.arithmetic-assertion@1', 'operator', 'plus'],
    ['foundation.quantity-assertion@1', 'measureKey', 'mass'],
    ['foundation.emotion-assertion@1', 'emotionKey', 'calm']
  ];
  for (const [type, field, expected] of cases) {
    const result = executeLongTextQuery({
      kind: 'LongTextQuery', schemaVersion: 1, id: `q:${field}`,
      from: { relation: 'observations', as: 'o', type, statuses: ['extracted'] },
      select: { value: { field: `o.payload.${field}` } },
      orderBy: [{ expr: { field: 'o.id' }, direction: 'asc' }]
    }, program);
    assert.deepEqual(result.rows.map((row) => row.value.value), [expected], type);
  }
});

test('three-valued expressions preserve unavailable values instead of coercing them to false', () => {
  const environment = { p: { payload: { score: 7, text: 'In fact.' } } };
  assert.equal(evaluateTruth({
    op: 'and', args: [
      { op: 'gt', left: { field: 'p.payload.score' }, right: { literal: 5 } },
      { op: 'eq', left: { field: 'p.payload.missing' }, right: { literal: true } }
    ]
  }, environment), TRUTH.UNKNOWN);
  assert.equal(evaluateTruth({
    op: 'wholeWord', left: { field: 'p.payload.text' }, right: { literal: 'in fact' },
    caseSensitive: false
  }, environment), TRUTH.TRUE);
});

test('every query-first scalar and logical expression has explicit behavior', () => {
  const environment = {
    p: { payload: { score: 7, text: 'In fact, Alpha.', tags: ['alpha', 'beta'], suffix: 'omega' } }
  };
  const truth = (op, left, right, options = {}) => evaluateTruth({
    op, left: { field: left }, right: { literal: right }, ...options
  }, environment);
  assert.equal(truth('eq', 'p.payload.score', 7), TRUTH.TRUE);
  assert.equal(truth('neq', 'p.payload.score', 8), TRUTH.TRUE);
  assert.equal(truth('gt', 'p.payload.score', 6), TRUTH.TRUE);
  assert.equal(truth('gte', 'p.payload.score', 7), TRUTH.TRUE);
  assert.equal(truth('lt', 'p.payload.score', 8), TRUTH.TRUE);
  assert.equal(truth('lte', 'p.payload.score', 7), TRUTH.TRUE);
  assert.equal(truth('in', 'p.payload.score', [6, 7]), TRUTH.TRUE);
  assert.equal(truth('includes', 'p.payload.tags', 'beta'), TRUTH.TRUE);
  assert.equal(truth('startsWith', 'p.payload.text', 'In fact'), TRUTH.TRUE);
  assert.equal(truth('endsWith', 'p.payload.suffix', 'mega'), TRUTH.TRUE);
  assert.equal(truth('wholeWord', 'p.payload.text', 'alpha', { caseSensitive: false }), TRUTH.TRUE);
  assert.equal(evaluateTruth({
    op: 'or', args: [{ literal: false }, { literal: true }]
  }, environment), TRUTH.TRUE);
  assert.equal(evaluateTruth({ op: 'not', arg: { literal: false } }, environment), TRUTH.TRUE);
  assert.equal(evaluateTruth({
    op: 'isPresent', arg: { field: 'p.payload.missing' }
  }, environment), TRUTH.FALSE);
  assert.throws(() => truth('gt', 'p.payload.score', '6'),
    (error) => error.code === 'query-type-error');
});

test('typed query validates bindings and returns deterministic rows with dependencies', () => {
  const program = compileMarkdown('In fact, first.\n\nClean.\n');
  const result = executeLongTextQuery(paragraphQuery(), program);
  assert.equal(result.state, 'SATISFIED');
  assert.deepEqual(result.rowSchema.fields, ['paragraph', 'text', 'order']);
  assert.deepEqual(result.rows.map((row) => row.value.order), [1, 2]);
  assert.ok(result.rows.every((row) => row.dependencies[0].startsWith('observations:observation:')));
  assert.throws(() => validateLongTextQuery({
    ...paragraphQuery(),
    where: { op: 'eq', left: { field: 'missing.payload.text' }, right: { literal: 'x' } }
  }), (error) => error.code === 'query-binding-error');
  assert.throws(() => validateLongTextQuery({
    ...paragraphQuery(),
    where: { op: 'eq', left: { field: 'p.payload.texxt' }, right: { literal: 'x' } }
  }), (error) => error.code === 'query-unknown-field');
  assert.throws(() => validateLongTextQuery({
    ...paragraphQuery(), accidentalLimit: 10
  }), (error) => error.code === 'query-schema-error');
  assert.throws(() => validateLongTextQuery({
    ...paragraphQuery(), select: { row: { field: '$rowId' } }
  }), (error) => error.code === 'query-binding-error');
});

test('coverage-aware anti-join distinguishes justified absence from an incomplete domain', () => {
  const program = compileMarkdown('Present paragraph.\n');
  const query = {
    kind: 'LongTextQuery', schemaVersion: 1, id: 'q:no-missing-paragraph',
    from: { relation: 'source', as: 's' },
    joins: [{
      kind: 'antiJoin',
      from: {
        relation: 'observations', as: 'p', type: 'document.paragraph@1', statuses: ['extracted']
      },
      on: {
        op: 'eq', left: { field: 'p.payload.text' }, right: { literal: 'Missing paragraph.' }
      },
      requiresCoverage: {
        mode: 'closed-world', verified: true, scope: 'view:whole', channels: ['body'],
        producer: 'markdown-structural@1', method: 'complete-structural-parse', exclusions: []
      }
    }],
    select: { revision: { field: 's.revision' } },
    orderBy: [{ expr: { field: 's.revision' }, direction: 'asc' }]
  };
  const complete = executeLongTextQuery(query, program);
  assert.equal(complete.state, 'SATISFIED');
  assert.equal(complete.rows.length, 1);
  assert.ok(complete.rows[0].dependencies.includes(program.coverage[0].id));
  program.coverage[0].failures = [{ scope: 'view:whole', reason: 'partial read' }];
  const failedCoverage = executeLongTextQuery(query, program);
  assert.equal(failedCoverage.state, 'UNKNOWN');
  assert.equal(failedCoverage.rows.length, 0);
  delete program.coverage[0].failures;
  program.coverage[0].revision = 'sha256:another-revision';
  const incomplete = executeLongTextQuery(query, program);
  assert.equal(incomplete.state, 'UNKNOWN');
  assert.equal(incomplete.rows.length, 0);
  assert.equal(incomplete.diagnostics[0].code, 'unsafe-negation');
});

test('inner and semi joins preserve deterministic bindings and query budgets fail explicitly', () => {
  const program = compileMarkdown('First paragraph.\n\nSecond paragraph.\n');
  const join = {
    kind: 'innerJoin', from: { relation: 'anchors', as: 'a' },
    on: { op: 'includes', left: { field: 'p.anchors' }, right: { field: 'a.id' } }
  };
  const query = {
    ...paragraphQuery(), joins: [join],
    select: {
      paragraph: { ref: 'p' }, anchor: { ref: 'a' }, quote: { field: 'a.quote' },
      order: { field: 'p.payload.order' }
    }
  };
  const inner = executeLongTextQuery(query, program);
  assert.equal(inner.rows.length, 2);
  assert.ok(inner.rows.every((row) => row.dependencies.some((item) => item.startsWith('anchors:'))));
  const semi = executeLongTextQuery({
    ...query, joins: [{ ...join, kind: 'semiJoin' }],
    select: { paragraph: { ref: 'p' }, order: { field: 'p.payload.order' } }
  }, program);
  assert.equal(semi.rows.length, 2);
  assert.ok(semi.rows.every((row) => row.dependencies.length === 1));
  assert.throws(() => executeLongTextQuery({
    ...paragraphQuery(), budgets: { rowsRead: 1, intermediateRows: 100 }
  }, program), (error) => error.code === 'query-budget-exceeded');
});

test('decision tables implement collect, unique overlap, priority, and unknown explicitly', () => {
  const program = compileMarkdown('In fact, perhaps.\n');
  const query = paragraphQuery();
  const queryResult = executeLongTextQuery(query, program);
  const collect = phraseTable();
  collect.rows.push({
    ...collect.rows[0], id: 'QF-002', authority: ['authority/style-guide.md#qf-002'],
    when: { op: 'wholeWord', left: { field: 'p.payload.text' }, right: { literal: 'perhaps' } },
    then: { ...collect.rows[0].then, rule: 'QF-002' }
  });
  const collected = evaluateDecisionTable(queryResult, collect, query, program);
  assert.equal(collected.candidates.length, 2);
  assert.deepEqual(collected.candidates.map((candidate) => candidate.rule), ['QF-001', 'QF-002']);
  assert.ok(collected.candidates.every((candidate) =>
    candidate.supportAnchors.every((anchor) => anchor.startsWith('anchor:'))));
  assert.deepEqual(evaluateDecisionTable({ ...queryResult }, {
    ...collect, rows: [...collect.rows].reverse()
  }, query, program).candidates.map((candidate) => candidate.rule), ['QF-001', 'QF-002']);
  assert.throws(() => evaluateDecisionTable(queryResult, { ...collect, hitPolicy: 'unique' }, query, program),
    (error) => error.code === 'decision-overlap');
  const priority = { ...collect, hitPolicy: 'priority', rows: collect.rows.map((row, index) => ({
    ...row, priority: 20 - index
  })) };
  assert.equal(evaluateDecisionTable(queryResult, priority, query, program).candidates[0].rule, 'QF-001');
  assert.throws(() => evaluateDecisionTable(queryResult, {
    ...priority, rows: priority.rows.map((row) => ({ ...row, priority: 10 }))
  }, query, program), (error) => error.code === 'decision-priority-tie');
  const unknownProgram = compileMarkdown('Unclassified paragraph.\n');
  unknownProgram.observations.find((item) => item.type === 'document.paragraph@1').type = 'test.paragraph@1';
  const unknownQuery = paragraphQuery();
  unknownQuery.from.type = 'test.paragraph@1';
  unknownQuery.from.fields = [
    'id', 'scope', 'anchors', 'status', 'payload.text', 'payload.order',
    'payload.structuralRole', 'payload.unknownFlag'
  ];
  const unknownRows = executeLongTextQuery(unknownQuery, unknownProgram);
  const unknown = phraseTable();
  unknown.rows[0].when = {
    op: 'eq', left: { field: 'p.payload.unknownFlag' }, right: { literal: true }
  };
  const unknownResult = evaluateDecisionTable(unknownRows, unknown, unknownQuery, unknownProgram);
  assert.equal(unknownResult.state, 'UNKNOWN');
  assert.equal(unknownResult.candidates.length, 0);
  assert.throws(() => evaluateDecisionTable(
    unknownRows, { ...unknown, unknownPolicy: 'block-circuit' }, unknownQuery, unknownProgram
  ), (error) => error.code === 'decision-unknown');

  const mixedProgram = compileMarkdown('In fact, known.\n\nSecond paragraph.\n');
  const second = mixedProgram.observations
    .filter((item) => item.type === 'document.paragraph@1')[1];
  delete second.payload.structuralRole;
  const mixedRows = executeLongTextQuery(paragraphQuery(), mixedProgram);
  const mixedDecision = evaluateDecisionTable(mixedRows, phraseTable(), paragraphQuery(), mixedProgram);
  assert.equal(mixedDecision.state, 'UNKNOWN');
  assert.equal(mixedDecision.candidates.length, 1);
  assert.ok(mixedDecision.decisions.some((decision) =>
    decision.state === 'UNKNOWN' && decision.queryRow === undefined));
});

test('the restricted query-first loader rejects executable expressions', () => {
  assert.throws(() => evaluateCircuitModule(
    `export default queryFirstCircuit({
      kind: 'CircuitJSQueryFirst', dialect: 'circuitjs-query-first@1',
      id: 'unsafe.query', version: '1.0.0', queries: {}, decisionTables: [],
      callback: () => true
    });`,
    { path: 'unsafe-query-first.circuit.mjs' }
  ), /forbidden executable functions|not permitted|exactly one direct call/u);
});

test('query-first author modules lower to verifier-dominated CircuitJS and match reference execution', async () => {
  const registries = createStandardRegistries();
  const definition = queryFirstDefinition();
  const moduleValue = evaluateCircuitModule(
    `export default queryFirstCircuit(${JSON.stringify(definition)});`,
    { path: 'query-first.circuit.mjs' }
  );
  const lowered = lowerQueryFirstCircuit(moduleValue, registries);
  const compiled = compileCircuit(moduleValue, registries);
  assert.equal(compiled.circuit.kind, 'CircuitJS');
  assert.equal(compiled.circuit.authoringProfile, 'circuitjs-query-first@1');
  assert.equal(compiled.queryContract.queries[0].relations[0].type, 'document.paragraph@1');
  assert.equal(compiled.sourceMap.entries.at(-1).physicalNode, 'query-first:emit');
  assert.equal(compiled.generatedGraphDigest, lowered.generatedGraphDigest);
  assert.throws(() => compileCircuit({ ...definition, ignoredTypo: true }, registries),
    (error) => error.code === 'invalid-circuit');

  const program = compileMarkdown('In fact, this is clear.\n\nArtifact remains clean.\n');
  const graph = await executeCircuit(compiled, program, registries);
  const reference = await executeQueryFirstReference(moduleValue, program, registries);
  const differential = await compareQueryFirstExecution(compiled, graph, program, registries);
  assert.equal(graph.outputs.findings.length, 1);
  assert.equal(graph.outputs.findings[0].rule, 'QF-001');
  assert.equal(reference.verified.length, 1);
  assert.equal(reference.verified[0].verifierResult.status, 'accept');
  assert.equal(differential.passed, true);
  const verifiedNode = compiled.sourceMap.entries.find((entry) => entry.logical.role === 'verification').physicalNode;
  assert.deepEqual(
    graph.nodeOutputs[verifiedNode].map(candidateProjection),
    reference.verified.map(candidateProjection)
  );
});
