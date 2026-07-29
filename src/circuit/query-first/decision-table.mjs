import { digestJson } from '../../core/canonical.mjs';
import { NllError, invariant } from '../../core/errors.mjs';
import { guaranteeCeilingFromValue, verifiedGuarantee } from '../../runtime/guarantees.mjs';
import { TRUTH, evaluateTruth, materializeTemplate, validateExpression } from './expressions.mjs';
import {
  executeLongTextQuery, validateLongTextQuery, validateQueryExpressionFields
} from './query.mjs';

const HIT_POLICIES = new Set(['unique', 'priority', 'collect']);
const UNKNOWN_POLICIES = new Set(['report-undetermined', 'block-circuit']);

function queryAliases(query) {
  return new Set([query.from.as, ...(query.joins || []).map((join) => join.from.as), '$value', '$rowId']);
}

function validateTemplate(template, aliases, query, path) {
  if (template === null || typeof template !== 'object') return;
  if (Array.isArray(template)) {
    template.forEach((value, index) => validateTemplate(value, aliases, query, `${path}[${index}]`));
    return;
  }
  const keys = Object.keys(template);
  const reserved = ['field', 'literal', 'anchorFrom'].filter((key) => Object.hasOwn(template, key));
  invariant(reserved.length === 0 || (reserved.length === 1 && keys.length === 1),
    'decision-schema-error', `${path} mixes a template leaf with object fields.`);
  if (keys.length === 1 && keys[0] === 'field') {
    validateExpression(template, aliases, path);
    validateQueryExpressionFields(template, query, path);
    return;
  }
  if (keys.length === 1 && keys[0] === 'literal') return;
  if (keys.length === 1 && keys[0] === 'anchorFrom') {
    invariant(typeof template.anchorFrom === 'string' && aliases.has(template.anchorFrom),
      'decision-witness-error', `${path} references unknown anchor binding ${template.anchorFrom}.`);
    return;
  }
  for (const [key, value] of Object.entries(template)) {
    validateTemplate(value, aliases, query, `${path}.${key}`);
  }
}

function validateDecisionTable(table, query) {
  validateLongTextQuery(query);
  invariant(table?.kind === 'DecisionTable' && table.schemaVersion === 1,
    'decision-schema-error', 'Decision table kind and schemaVersion must be DecisionTable@1.');
  const tableUnknown = Object.keys(table).filter((key) => ![
    'kind', 'schemaVersion', 'id', 'input', 'hitPolicy', 'unknownPolicy', 'verifyWith', 'rows'
  ].includes(key));
  invariant(tableUnknown.length === 0, 'decision-schema-error',
    `Decision table contains unsupported keys: ${tableUnknown.join(', ')}.`);
  invariant(typeof table.id === 'string' && table.id,
    'decision-schema-error', 'DecisionTable requires a stable id.');
  invariant(table.input === query.id, 'decision-schema-error',
    `Decision table ${table.id} input must name query ${query.id}.`);
  invariant(HIT_POLICIES.has(table.hitPolicy), 'decision-schema-error',
    `Decision table ${table.id} has unsupported hit policy ${table.hitPolicy}.`);
  invariant(UNKNOWN_POLICIES.has(table.unknownPolicy), 'decision-schema-error',
    `Decision table ${table.id} requires an explicit unknown policy.`);
  invariant(Array.isArray(table.rows) && table.rows.length > 0,
    'decision-schema-error', `Decision table ${table.id} requires rows.`);
  const aliases = queryAliases(query);
  const rowIds = new Set();
  for (const [index, row] of table.rows.entries()) {
    const rowUnknown = Object.keys(row).filter((key) => ![
      'id', 'authority', 'when', 'then', 'priority', 'verifyWith'
    ].includes(key));
    invariant(rowUnknown.length === 0, 'decision-schema-error',
      `Decision row at index ${index} contains unsupported keys: ${rowUnknown.join(', ')}.`);
    invariant(typeof row.id === 'string' && row.id && !rowIds.has(row.id),
      'decision-schema-error', `Decision table ${table.id} has a missing or duplicate row id.`);
    rowIds.add(row.id);
    invariant(Array.isArray(row.authority) && row.authority.length > 0
      && row.authority.every((reference) => typeof reference === 'string'),
    'decision-schema-error', `Decision row ${row.id} requires authority references.`);
    validateExpression(row.when, aliases, `$table.rows[${index}].when`);
    validateQueryExpressionFields(row.when, query, `$table.rows[${index}].when`);
    invariant(row.then && typeof row.then === 'object' && !Array.isArray(row.then),
      'decision-schema-error', `Decision row ${row.id} requires a candidate template.`);
    validateTemplate(row.then, aliases, query, `$table.rows[${index}].then`);
    if (table.hitPolicy === 'priority') {
      invariant(Number.isFinite(row.priority), 'decision-schema-error',
        `Priority row ${row.id} requires a finite priority.`);
    }
  }
  const verifiers = new Set(table.rows.map((row) => row.verifyWith || table.verifyWith).filter(Boolean));
  invariant(verifiers.size === 1, 'decision-schema-error',
    `Decision table ${table.id} initial profile requires one exact verifier shared by all rows.`);
  return { table, verifier: [...verifiers][0] };
}

function resolveAnchor(environment, program) {
  for (const value of Object.values(environment)) {
    if (value?.range && value?.quote !== undefined) return value;
    const anchorId = value?.anchors?.[0];
    if (anchorId && program.anchors?.[anchorId]) return program.anchors[anchorId];
  }
  return null;
}

function resolveSupportAnchors(environment, program) {
  const anchors = [];
  for (const value of Object.values(environment)) {
    if (value?.range && value?.quote !== undefined && value.id) anchors.push(value.id);
    for (const anchorId of value?.anchors || []) {
      if (program.anchors?.[anchorId]) anchors.push(anchorId);
    }
  }
  return [...new Set(anchors)].sort();
}

function candidateBase(row, table, queryRow, environment, program) {
  const rendered = materializeTemplate(row.then, environment, program, `$table.${table.id}.${row.id}.then`);
  const mainAnchor = rendered.mainAnchor || resolveAnchor(environment, program);
  invariant(mainAnchor, 'decision-witness-error', `Decision row ${row.id} did not produce a source anchor.`);
  const base = {
    ...rendered,
    kind: 'FindingCandidate', guarantee: 'candidate',
    ...(guaranteeCeilingFromValue(environment) ? {
      guaranteeCeiling: guaranteeCeilingFromValue(environment)
    } : {}),
    rule: rendered.rule || row.id,
    verdict: rendered.verdict || 'violation', severity: rendered.severity || 'warning',
    mainAnchor, supportAnchors: rendered.supportAnchors || resolveSupportAnchors(environment, program),
    sourceRuleReferences: [...row.authority],
    limitations: rendered.limitations || [],
    decision: {
      query: table.input, table: table.id, row: row.id,
      hitPolicy: table.hitPolicy, state: 'MATCH'
    },
    dependencies: [...queryRow.dependencies]
  };
  return {
    ...base,
    id: `candidate:${digestJson({ table: table.id, row: row.id, queryRow: queryRow.rowId, base }).slice(7, 31)}`
  };
}

function buildCandidate(row, table, query, queryRow, program) {
  const environment = { ...queryRow.bindings, $value: queryRow.value, $rowId: queryRow.rowId };
  const base = candidateBase(row, table, queryRow, environment, program);
  const replayDigest = digestJson(base);
  return {
    ...base,
    witness: {
      kind: 'QueryDecisionWitness', sourceDigest: program.source.revision,
      query, decisionTable: table, queryRowId: queryRow.rowId,
      decisionRowId: row.id, dependencies: [...queryRow.dependencies], replayDigest
    }
  };
}

function selectedRows(table, matches, unknowns) {
  if (table.hitPolicy === 'collect') return {
    rows: [...matches].sort((left, right) =>
      (right.priority || 0) - (left.priority || 0) || left.id.localeCompare(right.id)),
    unresolved: unknowns.length > 0
  };
  if (table.hitPolicy === 'unique') {
    if (matches.length > 1) throw new NllError('decision-overlap',
      `Decision table ${table.id} unique policy matched ${matches.map((row) => row.id).join(', ')}.`);
    return { rows: unknowns.length ? [] : matches, unresolved: unknowns.length > 0 };
  }
  if (!matches.length) return { rows: [], unresolved: unknowns.length > 0 };
  const maximum = Math.max(...matches.map((row) => row.priority));
  const winners = matches.filter((row) => row.priority === maximum);
  if (winners.length > 1) throw new NllError('decision-priority-tie',
    `Decision table ${table.id} has a priority tie between ${winners.map((row) => row.id).join(', ')}.`);
  const unresolved = unknowns.some((row) => row.priority >= maximum);
  return { rows: unresolved ? [] : winners, unresolved };
}

function evaluateDecisionTable(queryResult, table, query, program) {
  validateDecisionTable(table, query);
  const candidates = [];
  const decisions = [];
  for (const queryRow of queryResult.rows) {
    const environment = { ...queryRow.bindings, $value: queryRow.value, $rowId: queryRow.rowId };
    const matches = [];
    const unknowns = [];
    const evaluations = table.rows.map((row) => {
      const truth = evaluateTruth(row.when, environment);
      if (truth === TRUTH.TRUE) matches.push(row);
      if (truth === TRUTH.UNKNOWN) unknowns.push(row);
      return { row: row.id, truth };
    });
    const selection = selectedRows(table, matches, unknowns);
    if (selection.unresolved && table.unknownPolicy === 'block-circuit') {
      throw new NllError('decision-unknown', `Decision table ${table.id} has unresolved conditions.`, {
        queryRow: queryRow.rowId, rows: unknowns.map((row) => row.id)
      });
    }
    const selectedIds = selection.rows.map((row) => row.id);
    decisions.push({
      kind: 'DecisionRecord', table: table.id, query: query.id, queryRow: queryRow.rowId,
      state: selection.unresolved ? 'UNKNOWN' : selectedIds.length ? 'MATCH' : 'NO_MATCH',
      hitPolicy: table.hitPolicy, selectedRows: selectedIds, evaluations,
      dependencies: queryRow.dependencies
    });
    for (const row of selection.rows) candidates.push(buildCandidate(row, table, query, queryRow, program));
  }
  if (queryResult.state === 'UNKNOWN') {
    if (table.unknownPolicy === 'block-circuit') {
      throw new NllError('decision-unknown', `Decision table ${table.id} input query is incomplete.`);
    }
    decisions.push({
      kind: 'DecisionRecord', table: table.id, query: query.id,
      state: 'UNKNOWN', hitPolicy: table.hitPolicy, selectedRows: [],
      evaluations: [], dependencies: [], diagnostics: queryResult.diagnostics
    });
  }
  return {
    kind: 'DecisionTableResult', schemaVersion: 1, table: table.id, query: query.id,
    state: decisions.some((decision) => decision.state === 'UNKNOWN') ? 'UNKNOWN' : 'SATISFIED',
    candidates, decisions
  };
}

function candidateProjection(candidate) {
  const { witness, verifierResult, certificate, ...projection } = candidate;
  return projection;
}

function verifyQueryDecisions({ candidates = [] }, context) {
  return candidates.map((candidate) => {
    const witness = candidate.witness || {};
    let expected;
    let diagnostics = [];
    try {
      invariant(witness.kind === 'QueryDecisionWitness', 'verification-failed', 'Missing query decision witness.');
      invariant(witness.sourceDigest === context.program.source.revision,
        'verification-failed', 'Query decision witness uses another source revision.');
      const replayQuery = validateLongTextQuery(witness.query);
      const queryResult = executeLongTextQuery(replayQuery, context.program);
      const replay = evaluateDecisionTable(queryResult, witness.decisionTable, replayQuery, context.program);
      expected = replay.candidates.find((item) => item.id === candidate.id);
      invariant(expected, 'verification-failed', 'Candidate was not reproduced by query and decision replay.');
      invariant(digestJson(candidateProjection(candidate)) === witness.replayDigest,
        'verification-failed', 'Candidate fields differ from the witnessed decision result.');
      invariant(digestJson(candidateProjection(expected)) === witness.replayDigest,
        'verification-failed', 'Replayed candidate differs from the witnessed decision result.');
    } catch (error) {
      diagnostics = [error.message];
    }
    const accepted = diagnostics.length === 0;
    return {
      ...candidate,
      guarantee: accepted ? verifiedGuarantee(candidate) : 'rejected',
      verifierResult: {
        status: accepted ? 'accept' : 'reject', verifier: 'query.decision-replay@1',
        checkedProperties: [
          'source-revision', 'query-replay', 'decision-row', 'hit-policy',
          'candidate-template', 'dependency-envelope', 'source-anchor'
        ],
        diagnostics
      },
      certificate: accepted ? {
        kind: 'QueryDecisionCertificate', sourceDigest: context.program.source.revision,
        query: witness.query.id, table: witness.decisionTable.id,
        row: witness.decisionRowId, queryRow: witness.queryRowId,
        replayDigest: witness.replayDigest
      } : null
    };
  });
}

function decisionCandidates({ result }) {
  invariant(result?.kind === 'DecisionTableResult' && Array.isArray(result.candidates),
    'decision-schema-error', 'decision.candidates@1 requires a DecisionTableResult.');
  return result.candidates;
}

export {
  HIT_POLICIES,
  UNKNOWN_POLICIES,
  candidateProjection,
  decisionCandidates,
  evaluateDecisionTable,
  validateDecisionTable,
  verifyQueryDecisions
};
