import { digestJson, normalizeJson } from '../../core/canonical.mjs';
import { invariant } from '../../core/errors.mjs';
import { evaluateDecisionTable, validateDecisionTable } from './decision-table.mjs';
import { deriveQueryContract, executeLongTextQuery, validateLongTextQuery } from './query.mjs';

const DIALECT = 'circuitjs-query-first@1';

function portName(query, relation) {
  return `query:${query.id}:${relation.as}`;
}

function observationRelations(query) {
  return [query.from, ...(query.joins || []).map((join) => join.from)]
    .filter((relation) => relation.relation === 'observations');
}

function normalizeQueries(definition) {
  invariant(definition.queries && typeof definition.queries === 'object'
    && !Array.isArray(definition.queries) && Object.keys(definition.queries).length > 0,
  'query-schema-error', 'Query-first circuit requires named queries.');
  const queries = new Map();
  for (const [name, source] of Object.entries(definition.queries)) {
    const query = validateLongTextQuery(source);
    invariant(!queries.has(query.id), 'query-schema-error', `Duplicate query id ${query.id}.`);
    queries.set(name, query);
    queries.set(query.id, query);
  }
  return queries;
}

function normalizeTables(definition, queries, registries) {
  invariant(Array.isArray(definition.decisionTables) && definition.decisionTables.length > 0,
    'decision-schema-error', 'Query-first circuit requires decisionTables.');
  const ids = new Set();
  return definition.decisionTables.map((source) => {
    const query = queries.get(source.input);
    invariant(query, 'decision-schema-error', `Decision table ${source.id || '<unknown>'} names unknown query ${source.input}.`);
    const table = { ...source, input: query.id };
    const validated = validateDecisionTable(table, query);
    invariant(!ids.has(table.id), 'decision-schema-error', `Duplicate decision table id ${table.id}.`);
    ids.add(table.id);
    invariant(registries.verifiers.has(validated.verifier), 'unknown-verifier',
      `Decision table ${table.id} verifier ${validated.verifier} is not registered.`);
    return { table, query, verifier: validated.verifier };
  });
}

function lowerQueryFirstCircuit(source, registries) {
  const definition = normalizeJson(source);
  const unknown = Object.keys(definition).filter((key) => ![
    'kind', 'dialect', 'id', 'version', 'purpose', 'description',
    'sourceRuleReferences', 'queries', 'decisionTables', 'budgets'
  ].includes(key));
  invariant(unknown.length === 0, 'invalid-circuit',
    `Query-first circuit contains unsupported keys: ${unknown.join(', ')}.`);
  invariant(definition.kind === 'CircuitJSQueryFirst', 'invalid-circuit',
    'Query-first circuit kind must be CircuitJSQueryFirst.');
  invariant(definition.dialect === DIALECT, 'invalid-circuit',
    `Query-first circuit dialect must be ${DIALECT}.`);
  invariant((definition.purpose || 'validation') === 'validation', 'invalid-circuit',
    'The initial query-first profile supports validation circuits only.');
  const queryLookup = normalizeQueries(definition);
  const namedQueries = [...new Map(Object.values(definition.queries).map((query) => [query.id, query])).values()];
  const tables = normalizeTables(definition, queryLookup, registries);
  const inputs = {};
  const nodes = [];
  const sourceMap = [];
  const queryNodes = new Map();
  for (const query of namedQueries) {
    const boundRelations = {};
    for (const relation of observationRelations(query)) {
      const name = portName(query, relation);
      inputs[name] = {
        type: relation.type, cardinality: 'many', statuses: relation.statuses || [],
        coverage: relation.coverage || 'any', critical: relation.critical !== false,
        ...(relation.scopeRelation ? { scopeRelation: relation.scopeRelation } : {})
      };
      boundRelations[relation.as] = { $port: name };
    }
    const nodeId = `query:${query.id}`;
    nodes.push({
      id: nodeId, primitive: 'call', operator: 'longtext.query@1',
      inputs: { query, boundRelations }, logical: { query: query.id }
    });
    queryNodes.set(query.id, nodeId);
    sourceMap.push({ physicalNode: nodeId, logical: { query: query.id } });
  }
  const verifiedNodes = [];
  const decisionNodes = [];
  for (const { table, query, verifier } of tables) {
    const tableNode = `decision:${table.id}`;
    const candidateNode = `decision-candidates:${table.id}`;
    const verifiedNode = `decision-verified:${table.id}`;
    nodes.push({
      id: tableNode, primitive: 'call', operator: 'decision.table@1',
      inputs: { queryResult: { $node: queryNodes.get(query.id) }, table, query },
      logical: { query: query.id, table: table.id }
    });
    nodes.push({
      id: candidateNode, primitive: 'call', operator: 'decision.candidates@1',
      inputs: { result: { $node: tableNode } },
      logical: { table: table.id, role: 'candidate-construction' }
    });
    nodes.push({
      id: verifiedNode, primitive: 'verify', verifier,
      inputs: { candidates: { $node: candidateNode } },
      logical: { table: table.id, role: 'verification', verifier }
    });
    verifiedNodes.push(verifiedNode);
    decisionNodes.push(tableNode);
    sourceMap.push(
      { physicalNode: tableNode, logical: { query: query.id, table: table.id } },
      { physicalNode: candidateNode, logical: { table: table.id, role: 'candidate-construction' } },
      { physicalNode: verifiedNode, logical: { table: table.id, role: 'verification', verifier } }
    );
  }
  let verified = { $node: verifiedNodes[0] };
  if (verifiedNodes.length > 1) {
    nodes.push({
      id: 'decision-verified:merge', primitive: 'merge',
      inputs: Object.fromEntries(verifiedNodes.map((id) => [id, { $node: id }])),
      logical: { role: 'verified-decision-merge' }
    });
    verified = { $node: 'decision-verified:merge' };
  }
  nodes.push({
    id: 'query-first:emit', primitive: 'emit', inputs: { verified },
    logical: { role: 'verified-publication' }
  });
  sourceMap.push({ physicalNode: 'query-first:emit', logical: { role: 'verified-publication' } });
  const authority = definition.sourceRuleReferences || [...new Set(tables.flatMap(({ table }) =>
    table.rows.flatMap((row) => row.authority)))];
  const circuit = {
    kind: 'CircuitJS', id: definition.id, version: definition.version,
    description: definition.description,
    sourceRuleReferences: authority,
    authoringProfile: DIALECT,
    queryFirstAuthorDigest: digestJson(definition),
    inputs, nodes,
    outputs: {
      findings: { $node: 'query-first:emit' },
      decisionTraces: decisionNodes.map((id) => ({ $node: id }))
    },
    budgets: definition.budgets || {}
  };
  const queryContract = {
    kind: 'CircuitQueryContract', schemaVersion: 1,
    circuit: `${definition.id}@${definition.version}`,
    queries: namedQueries.map(deriveQueryContract)
  };
  return {
    author: definition, circuit, queryContract,
    sourceMap: { kind: 'QueryFirstSourceMap', schemaVersion: 1, entries: sourceMap },
    authorDigest: digestJson(definition), generatedGraphDigest: digestJson(circuit)
  };
}

async function executeQueryFirstReference(source, program, registries) {
  const definition = normalizeJson(source);
  const queries = normalizeQueries(definition);
  const tables = normalizeTables(definition, queries, registries);
  const queryResults = new Map();
  for (const query of new Map(Object.values(definition.queries).map((item) => [item.id, item])).values()) {
    queryResults.set(query.id, executeLongTextQuery(query, program));
  }
  const decisions = [];
  const verified = [];
  for (const item of tables) {
    const result = evaluateDecisionTable(queryResults.get(item.query.id), item.table, item.query, program);
    decisions.push(result);
    verified.push(...await registries.verifiers.get(item.verifier).execute(
      { candidates: result.candidates }, { program, circuit: definition, node: null, options: {} }
    ));
  }
  return { queryResults: Object.fromEntries(queryResults), decisions, verified };
}

export { DIALECT, executeQueryFirstReference, lowerQueryFirstCircuit };
