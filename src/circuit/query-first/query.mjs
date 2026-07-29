import { digestJson } from '../../core/canonical.mjs';
import { NllError, invariant } from '../../core/errors.mjs';
import {
  TRUTH, UNKNOWN_VALUE, collectFieldPaths, evaluateTruth, evaluateValue, validateExpression
} from './expressions.mjs';

const RELATIONS = new Set([
  'source', 'blocks', 'anchors', 'schemas', 'ontologyPacks', 'views', 'scopes', 'worlds', 'mentions',
  'entities', 'identityCandidates', 'observations', 'task', 'capabilities', 'coverage',
  'gaps', 'diagnostics'
]);
const JOIN_KINDS = new Set(['innerJoin', 'semiJoin', 'antiJoin']);
const TYPE_PATTERN = /^[A-Za-z][A-Za-z0-9._-]*@\d+(?:\.\d+){0,2}(?:-[0-9A-Za-z.-]+)?$/u;
const RELATION_FIELDS = Object.freeze({
  source: ['id', 'revision', 'originalDigest', 'mediaType', 'language', 'lineEnding', 'encoding', 'channels', 'structure', 'content'],
  blocks: ['id', 'kind', 'text', 'anchor', 'order', 'path', 'level', 'content', 'language', 'fenced'],
  anchors: ['id', 'source', 'revision', 'range', 'quote', 'block', 'structuralPath', 'context', 'digest'],
  ontologyPacks: [
    'kind', 'id', 'version', 'dialect', 'mode', 'digest', 'default', 'languageProfile',
    'observationTypes', 'principles', 'vocabularies', 'limitations'
  ],
  views: ['id', 'source', 'scope', 'blockIds', 'complete', 'selection'],
  scopes: ['id', 'kind', 'source', 'parent', 'relationships'],
  worlds: ['id', 'assumptions', 'mutuallyExclusiveWith'],
  mentions: ['id', 'type', 'scope', 'anchors', 'status', 'producer', 'payload', 'world'],
  entities: ['id', 'type', 'scope', 'mentions', 'status', 'producer', 'payload', 'world'],
  identityCandidates: ['id', 'left', 'right', 'relation', 'evidence', 'scope', 'status', 'world'],
  observations: ['id', 'type', 'status', 'scope', 'anchors', 'support', 'alternatives', 'confidence', 'payload', 'provenance', 'world'],
  task: ['goal', 'scope', 'absencePolicy', 'desiredGuarantee', 'budgets', 'reviewPolicy', 'expectedOutput'],
  capabilities: ['type', 'producer', 'coverage', 'statuses'],
  coverage: ['id', 'source', 'revision', 'scope', 'types', 'producer', 'mode', 'exclusions', 'failures', 'verified', 'channels', 'method'],
  gaps: ['id', 'kind', 'type', 'scope', 'producer', 'reason', 'critical', 'recoverable', 'anchor'],
  diagnostics: ['id', 'kind', 'code', 'message', 'severity', 'count', 'reason', 'anchor'],
  schemas: []
});
const STRUCTURAL_PAYLOAD_FIELDS = Object.freeze({
  'document.block@1': ['text', 'order', 'structuralRole', 'content', 'level', 'language', 'fenced'],
  'document.paragraph@1': ['text', 'order', 'structuralRole'],
  'document.heading@1': ['text', 'order', 'structuralRole', 'content', 'level'],
  'document.sentence@1': ['text', 'order', 'parentBlock'],
  'document.line@1': ['text', 'line'],
  'document.list-item@1': ['text', 'order', 'structuralRole', 'content'],
  'document.quote@1': ['text', 'order', 'structuralRole', 'content'],
  'document.code-block@1': ['text', 'order', 'structuralRole', 'language', 'fenced'],
  'document.thematic-break@1': ['text', 'order', 'structuralRole'],
  'foundation.entity-mention@1': ['label', 'normalized', 'role', 'world', 'grammar'],
  'foundation.state-assertion@1': [
    'subject', 'subjectKey', 'predicate', 'predicateKey', 'polarity',
    'time', 'timeKey', 'timeFrame', 'world', 'grammar'
  ],
  'foundation.type-assertion@1': [
    'subject', 'subjectKey', 'type', 'typeKey', 'polarity',
    'time', 'timeKey', 'timeFrame', 'world', 'grammar'
  ],
  'foundation.temporal-relation@1': [
    'earlier', 'earlierKey', 'later', 'laterKey', 'relation', 'world', 'grammar'
  ],
  'foundation.arithmetic-assertion@1': [
    'left', 'operator', 'right', 'result', 'world', 'grammar'
  ],
  'foundation.quantity-assertion@1': [
    'subject', 'subjectKey', 'measure', 'measureKey', 'value', 'unit', 'unitKey',
    'time', 'timeKey', 'timeFrame', 'world', 'grammar'
  ],
  'foundation.emotion-assertion@1': [
    'experiencer', 'experiencerKey', 'emotion', 'emotionKey', 'polarity',
    'target', 'targetKey', 'time', 'timeKey', 'timeFrame', 'world', 'grammar'
  ]
});

function assertKnownKeys(value, allowed, path, code = 'query-schema-error') {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  invariant(unknown.length === 0, code, `${path} contains unsupported keys: ${unknown.join(', ')}.`);
}

function validateRelation(specification, aliases, path) {
  invariant(specification && typeof specification === 'object' && !Array.isArray(specification),
    'query-schema-error', `${path} must be a relation specification.`);
  assertKnownKeys(specification, [
    'relation', 'as', 'type', 'statuses', 'fields', 'coverage', 'critical', 'scopeRelation'
  ], path);
  invariant(RELATIONS.has(specification.relation), 'query-schema-error',
    `${path} names unsupported relation ${specification.relation}.`);
  invariant(typeof specification.as === 'string' && /^[A-Za-z][A-Za-z0-9_-]*$/u.test(specification.as),
    'query-binding-error', `${path}.as must be a stable binding name.`);
  invariant(!aliases.has(specification.as), 'query-binding-error',
    `${path} repeats binding ${specification.as}.`);
  if (specification.relation === 'observations') {
    invariant(typeof specification.type === 'string' && TYPE_PATTERN.test(specification.type),
      'query-schema-error', `${path} observation scans require one exact nominal type.`);
    invariant(specification.statuses === undefined || (Array.isArray(specification.statuses)
      && specification.statuses.length > 0 && specification.statuses.every((status) => typeof status === 'string')),
    'query-schema-error', `${path}.statuses must be a non-empty string array.`);
    invariant(specification.fields === undefined || (Array.isArray(specification.fields)
      && specification.fields.length > 0 && specification.fields.every((field) =>
        typeof field === 'string' && /^[A-Za-z_$][A-Za-z0-9_$-]*(?:\.[A-Za-z_$][A-Za-z0-9_$-]*)*$/u.test(field))),
    'query-schema-error', `${path}.fields must contain explicit observation field paths.`);
    invariant(STRUCTURAL_PAYLOAD_FIELDS[specification.type] || specification.fields,
      'query-schema-unavailable', `${path} requires fields for unregistered schema ${specification.type}.`);
  } else {
    invariant(specification.type === undefined && specification.statuses === undefined,
      'query-schema-error', `${path} may declare type or statuses only for observations.`);
  }
  aliases.add(specification.as);
}

function validateFieldPaths(
  expression, specifications, selectNames, path, allowValue = false, allowRowId = false
) {
  for (const field of collectFieldPaths(expression)) {
    if (field === '$rowId') {
      invariant(allowRowId, 'query-binding-error', `${path} cannot read $rowId before row identity exists.`);
      continue;
    }
    const [alias, ...segments] = field.split('.');
    if (alias === '$value') {
      invariant(allowValue && segments.length === 1 && selectNames.has(segments[0]),
        'query-unknown-field', `${path} references unknown projected field ${field}.`);
      continue;
    }
    const specification = specifications.get(alias);
    invariant(specification, 'query-binding-error', `${path} references unknown binding ${alias}.`);
    const relative = segments.join('.');
    const root = segments[0];
    invariant(RELATION_FIELDS[specification.relation].includes(root),
      'query-unknown-field', `${path} references unknown field ${field}.`);
    if (specification.relation !== 'observations') continue;
    const declared = specification.fields || [];
    const allowedPayload = STRUCTURAL_PAYLOAD_FIELDS[specification.type] || [];
    if (root === 'payload') {
      invariant(segments.length >= 2 && (allowedPayload.includes(segments[1]) || declared.includes(relative)),
        'query-unknown-field', `${path} references unknown field ${field} on ${specification.type}.`);
    } else if (declared.length && !RELATION_FIELDS.observations.includes(relative)) {
      invariant(declared.includes(relative), 'query-unknown-field',
        `${path} references undeclared field ${field} on ${specification.type}.`);
    }
  }
}

function querySpecifications(query) {
  return new Map([query.from, ...(query.joins || []).map((join) => join.from)]
    .map((specification) => [specification.as, specification]));
}

function validateCoverageRequirement(requirement, path) {
  invariant(requirement && typeof requirement === 'object' && !Array.isArray(requirement),
    'unsafe-negation', `${path} requires a coverage-domain object.`);
  assertKnownKeys(requirement, [
    'mode', 'verified', 'scope', 'channels', 'producer', 'method', 'exclusions', 'failures'
  ], path, 'unsafe-negation');
  invariant(requirement.mode === 'closed-world' && requirement.verified === true,
    'unsafe-negation', `${path} requires verified closed-world coverage.`);
  if (requirement.channels !== undefined) {
    invariant(Array.isArray(requirement.channels) && requirement.channels.length > 0,
      'unsafe-negation', `${path}.channels must be a non-empty array.`);
  }
  invariant(requirement.failures === undefined
    || (Array.isArray(requirement.failures) && requirement.failures.length === 0),
  'unsafe-negation', `${path}.failures must be absent or empty in the exact initial profile.`);
}

function validateLongTextQuery(query) {
  invariant(query?.kind === 'LongTextQuery' && query.schemaVersion === 1,
    'query-schema-error', 'Query kind and schemaVersion must be LongTextQuery@1.');
  assertKnownKeys(query, [
    'kind', 'schemaVersion', 'id', 'from', 'joins', 'where', 'select', 'orderBy', 'budgets'
  ], '$query');
  invariant(typeof query.id === 'string' && query.id,
    'query-schema-error', 'LongTextQuery requires a stable id.');
  const aliases = new Set();
  validateRelation(query.from, aliases, '$query.from');
  for (const [index, join] of (query.joins || []).entries()) {
    invariant(join && JOIN_KINDS.has(join.kind), 'query-schema-error',
      `$query.joins[${index}] has an unsupported join kind.`);
    assertKnownKeys(join, ['kind', 'from', 'on', 'requiresCoverage'], `$query.joins[${index}]`);
    validateRelation(join.from, aliases, `$query.joins[${index}].from`);
    validateExpression(join.on, aliases, `$query.joins[${index}].on`);
    if (join.kind === 'antiJoin') validateCoverageRequirement(join.requiresCoverage, `$query.joins[${index}]`);
  }
  const specifications = querySpecifications(query);
  if (query.where) {
    validateExpression(query.where, aliases, '$query.where');
    validateFieldPaths(query.where, specifications, new Set(), '$query.where');
  }
  for (const [index, join] of (query.joins || []).entries()) {
    validateFieldPaths(join.on, specifications, new Set(), `$query.joins[${index}].on`);
  }
  invariant(query.select && typeof query.select === 'object' && !Array.isArray(query.select)
    && Object.keys(query.select).length > 0, 'query-schema-error', 'Query select must be a non-empty object.');
  for (const [name, expression] of Object.entries(query.select)) {
    validateExpression(expression, aliases, `$query.select.${name}`);
    validateFieldPaths(expression, specifications, new Set(), `$query.select.${name}`);
  }
  invariant(Array.isArray(query.orderBy) && query.orderBy.length > 0,
    'query-order-required', 'Query orderBy must declare at least one deterministic key.');
  for (const [index, order] of query.orderBy.entries()) {
    invariant(order && ['asc', 'desc'].includes(order.direction || 'asc'),
      'query-order-required', `$query.orderBy[${index}] has an invalid direction.`);
    assertKnownKeys(order, ['expr', 'direction'], `$query.orderBy[${index}]`, 'query-order-required');
    validateExpression(order.expr, aliases, `$query.orderBy[${index}].expr`);
    validateFieldPaths(
      order.expr, specifications, new Set(Object.keys(query.select)),
      `$query.orderBy[${index}].expr`, true, true
    );
  }
  for (const [name, value] of Object.entries(query.budgets || {})) {
    invariant(['rowsRead', 'intermediateRows'].includes(name), 'query-budget-error',
      `Query budget ${name} is unsupported.`);
    invariant(Number.isInteger(value) && value >= 0, 'query-budget-error',
      `Query budget ${name} must be a non-negative integer.`);
  }
  return query;
}

function validateQueryExpressionFields(expression, query, path = '$expression') {
  validateExpression(expression, queryAliasesForValidation(query), path);
  validateFieldPaths(
    expression, querySpecifications(query), new Set(Object.keys(query.select || {})), path, true, true
  );
}

function queryAliasesForValidation(query) {
  return new Set([query.from.as, ...(query.joins || []).map((join) => join.from.as)]);
}

function programRelation(program, relation) {
  if (relation === 'source' || relation === 'task') return program[relation] ? [program[relation]] : [];
  if (relation === 'anchors') return Object.values(program.anchors || {}).sort(compareIdentity);
  const value = program[relation];
  return Array.isArray(value) ? [...value] : [];
}

function compareIdentity(left, right) {
  return String(left?.id || digestJson(left)).localeCompare(String(right?.id || digestJson(right)));
}

function relationRows(program, specification, boundRelations = {}) {
  const provided = boundRelations[specification.as];
  let rows = Array.isArray(provided) ? provided : programRelation(program, specification.relation);
  if (specification.relation === 'observations') {
    rows = rows.filter((row) => row.type === specification.type
      && (!specification.statuses?.length || specification.statuses.includes(row.status)));
  }
  return rows;
}

function canonicalDependency(value, relation, program) {
  if (relation === 'source') return `source:${value.id}@${value.revision}`;
  if (relation === 'task') return `task:${program.id}`;
  if (typeof value?.id === 'string') return `${relation}:${value.id}`;
  return `${relation}:${digestJson(value)}`;
}

function exactCoverage(program, specification, requirement) {
  const tokens = (program.coverage || []).filter((token) => token.source === program.source.id
    && token.revision === program.source.revision
    && token.mode === 'closed-world' && token.verified === true
    && (!token.failures || token.failures.length === 0)
    && token.types?.includes(specification.type)
    && (!requirement.scope || token.scope === requirement.scope)
    && (!requirement.producer || token.producer === requirement.producer)
    && (!requirement.method || token.method === requirement.method)
    && (!requirement.channels || requirement.channels.every((channel) => token.channels?.includes(channel)))
    && (!requirement.exclusions || JSON.stringify(token.exclusions || []) === JSON.stringify(requirement.exclusions)));
  const statusesSupported = (token) => !specification.statuses?.length || (program.capabilities || []).some((capability) =>
    capability.type === specification.type && capability.producer === token.producer
    && specification.statuses.every((status) => capability.statuses?.includes(status)));
  return tokens.find(statusesSupported) || null;
}

function enforceBudget(counters, query) {
  const rowsRead = query.budgets?.rowsRead ?? 100_000;
  const intermediateRows = query.budgets?.intermediateRows ?? 100_000;
  if (counters.rowsRead > rowsRead || counters.intermediateRows > intermediateRows) {
    throw new NllError('query-budget-exceeded', `Query ${query.id} exceeded its row budget.`, {
      counters, budgets: { rowsRead, intermediateRows }
    });
  }
}

function executeJoins(environments, query, program, boundRelations, counters, state) {
  let current = environments;
  for (const join of query.joins || []) {
    const rightRows = relationRows(program, join.from, boundRelations);
    counters.rowsRead += rightRows.length;
    const next = [];
    for (const environment of current) {
      let matched = false;
      let unknown = false;
      for (const right of rightRows) {
        const candidate = { ...environment, [join.from.as]: right };
        const truth = evaluateTruth(join.on, candidate);
        if (truth === TRUTH.TRUE) {
          matched = true;
          if (join.kind === 'innerJoin') next.push(candidate);
          if (join.kind !== 'innerJoin') break;
        } else if (truth === TRUTH.UNKNOWN) unknown = true;
      }
      if (join.kind === 'semiJoin' && matched) next.push(environment);
      if (join.kind === 'antiJoin' && !matched) {
        const token = unknown ? null : exactCoverage(program, join.from, join.requiresCoverage);
        if (token) {
          next.push(environment);
          state.coverageTokens.add(token.id || canonicalDependency(token, 'coverage', program));
        } else {
          state.unknown = true;
          state.diagnostics.push({
            code: unknown ? 'query-incomplete-comparison' : 'unsafe-negation',
            query: query.id, binding: join.from.as, requiredCoverage: join.requiresCoverage
          });
        }
      }
    }
    current = next;
    counters.intermediateRows += current.length;
    enforceBudget(counters, query);
  }
  return current;
}

function executeLongTextQuery(query, program, options = {}) {
  validateLongTextQuery(query);
  const counters = { rowsRead: 0, rowsReturned: 0, intermediateRows: 0 };
  const state = { unknown: false, diagnostics: [], coverageTokens: new Set() };
  const baseRows = relationRows(program, query.from, options.boundRelations);
  counters.rowsRead += baseRows.length;
  let environments = baseRows.map((row) => ({ [query.from.as]: row }));
  counters.intermediateRows = environments.length;
  enforceBudget(counters, query);
  environments = executeJoins(
    environments, query, program, options.boundRelations || {}, counters, state
  );
  if (query.where) {
    environments = environments.filter((environment) => {
      const truth = evaluateTruth(query.where, environment);
      if (truth === TRUTH.UNKNOWN) {
        state.unknown = true;
        state.diagnostics.push({
          code: 'query-incomplete-value', query: query.id, stage: 'where',
          fields: [...collectFieldPaths(query.where)].sort()
        });
      }
      return truth === TRUTH.TRUE;
    });
  }
  const rows = environments.map((environment) => {
    const value = {};
    const unknownFields = [];
    for (const [name, expression] of Object.entries(query.select)) {
      const selected = evaluateValue(expression, environment);
      if (selected === UNKNOWN_VALUE) {
        value[name] = null;
        unknownFields.push(name);
        state.unknown = true;
      } else value[name] = selected;
    }
    if (unknownFields.length) state.diagnostics.push({
      code: 'query-incomplete-value', query: query.id, stage: 'select', fields: unknownFields
    });
    const dependencies = Object.entries(environment).map(([alias, item]) => {
      const specification = [query.from, ...(query.joins || []).map((join) => join.from)]
        .find((candidate) => candidate.as === alias);
      return canonicalDependency(item, specification.relation, program);
    });
    dependencies.push(...state.coverageTokens);
    dependencies.sort();
    const rowId = `query-row:${digestJson({ query: query.id, dependencies, value }).slice(7, 31)}`;
    return { rowId, bindings: environment, value, dependencies, ...(unknownFields.length ? { unknownFields } : {}) };
  });
  rows.sort((left, right) => compareQueryRows(left, right, query));
  counters.rowsReturned = rows.length;
  return {
    kind: 'QueryResult', schemaVersion: 1, queryId: query.id,
    queryDigest: digestJson(query), programDigest: digestJson(program),
    rowSchema: { kind: 'QueryRowSchema', fields: Object.keys(query.select) },
    state: state.unknown ? 'UNKNOWN' : 'SATISFIED', rows,
    coverageEvaluation: {
      state: state.unknown ? 'UNKNOWN' : 'SATISFIED', used: [...state.coverageTokens].sort()
    },
    diagnostics: state.diagnostics, counters
  };
}

function compareQueryRows(left, right, query) {
  for (const order of query.orderBy) {
    const leftValue = evaluateValue(order.expr, { ...left.bindings, $value: left.value, $rowId: left.rowId });
    const rightValue = evaluateValue(order.expr, { ...right.bindings, $value: right.value, $rowId: right.rowId });
    if (leftValue === rightValue) continue;
    const direction = order.direction === 'desc' ? -1 : 1;
    if (leftValue === UNKNOWN_VALUE) return direction;
    if (rightValue === UNKNOWN_VALUE) return -direction;
    invariant(typeof leftValue === typeof rightValue
      && ['number', 'string', 'boolean'].includes(typeof leftValue),
    'query-type-error', `Query ${query.id} order keys must have one shared scalar type.`);
    return (leftValue < rightValue ? -1 : 1) * direction;
  }
  return left.rowId.localeCompare(right.rowId);
}

function deriveQueryContract(query) {
  validateLongTextQuery(query);
  const relations = [query.from, ...(query.joins || []).map((join) => join.from)];
  const fieldPaths = new Set();
  collectFieldPaths(query.where, fieldPaths);
  for (const join of query.joins || []) collectFieldPaths(join.on, fieldPaths);
  Object.values(query.select).forEach((expression) => collectFieldPaths(expression, fieldPaths));
  query.orderBy.forEach((order) => collectFieldPaths(order.expr, fieldPaths));
  return {
    kind: 'QueryContract', schemaVersion: 1, query: query.id,
    relations: relations.map((relation) => ({
      relation: relation.relation, binding: relation.as,
      ...(relation.type ? {
        type: relation.type, statuses: relation.statuses || [], fields: relation.fields || [],
        coverage: relation.coverage || 'any', critical: relation.critical !== false,
        ...(relation.scopeRelation ? { scopeRelation: relation.scopeRelation } : {})
      } : {})
    })),
    fields: [...fieldPaths].sort(),
    coverageDomains: (query.joins || []).filter((join) => join.kind === 'antiJoin')
      .map((join) => ({ binding: join.from.as, type: join.from.type, ...join.requiresCoverage })),
    orderBy: query.orderBy,
    budgets: {
      rowsRead: query.budgets?.rowsRead ?? 100_000,
      intermediateRows: query.budgets?.intermediateRows ?? 100_000
    }
  };
}

export {
  JOIN_KINDS,
  RELATIONS,
  deriveQueryContract,
  exactCoverage,
  executeLongTextQuery,
  programRelation,
  validateQueryExpressionFields,
  validateLongTextQuery
};
