import { NllError, invariant } from '../../core/errors.mjs';

const TRUTH = Object.freeze({ TRUE: 'TRUE', FALSE: 'FALSE', UNKNOWN: 'UNKNOWN' });
const UNKNOWN_VALUE = Symbol('query-unknown-value');
const BINARY_OPERATORS = new Set([
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'includes', 'startsWith', 'endsWith', 'wholeWord'
]);
const LOGICAL_OPERATORS = new Set(['and', 'or', 'not', 'isPresent']);

function assertExpressionKeys(expression, allowed, path) {
  const unknown = Object.keys(expression).filter((key) => !allowed.includes(key));
  invariant(unknown.length === 0, 'query-expression-error',
    `${path} contains unsupported keys: ${unknown.join(', ')}.`);
}

function validateExpression(expression, aliases, path = '$expression') {
  invariant(expression && typeof expression === 'object' && !Array.isArray(expression),
    'query-expression-error', `${path} must be an expression object.`);
  const forms = ['field', 'ref', 'literal', 'op'].filter((key) => Object.hasOwn(expression, key));
  invariant(forms.length === 1, 'query-expression-error', `${path} must contain exactly one expression form.`);
  if (Object.hasOwn(expression, 'field')) {
    assertExpressionKeys(expression, ['field'], path);
    invariant(typeof expression.field === 'string' && expression.field,
      'query-expression-error', `${path}.field must be a non-empty path.`);
    const [alias, ...segments] = expression.field.split('.');
    invariant(alias === '$value' || alias === '$rowId' || aliases.has(alias),
      'query-binding-error', `${path} references unknown binding ${alias}.`);
    invariant(alias === '$rowId' ? segments.length === 0 : segments.length > 0,
      'query-expression-error', `${path}.field must name a binding field.`);
    invariant(segments.every((segment) => /^[A-Za-z_$][A-Za-z0-9_$-]*$/u.test(segment)),
      'query-expression-error', `${path}.field contains an unsupported path segment.`);
    return;
  }
  if (Object.hasOwn(expression, 'ref')) {
    assertExpressionKeys(expression, ['ref'], path);
    invariant(typeof expression.ref === 'string' && aliases.has(expression.ref),
      'query-binding-error', `${path} references unknown binding ${expression.ref}.`);
    return;
  }
  if (Object.hasOwn(expression, 'literal')) {
    assertExpressionKeys(expression, ['literal'], path);
    return;
  }
  invariant(BINARY_OPERATORS.has(expression.op) || LOGICAL_OPERATORS.has(expression.op),
    'query-expression-error', `${path} uses unsupported operator ${expression.op}.`);
  if (expression.op === 'and' || expression.op === 'or') {
    assertExpressionKeys(expression, ['op', 'args'], path);
    invariant(Array.isArray(expression.args) && expression.args.length > 0,
      'query-expression-error', `${path}.${expression.op} requires non-empty args.`);
    expression.args.forEach((item, index) => validateExpression(item, aliases, `${path}.args[${index}]`));
    return;
  }
  if (expression.op === 'not' || expression.op === 'isPresent') {
    assertExpressionKeys(expression, ['op', 'arg'], path);
    validateExpression(expression.arg, aliases, `${path}.arg`);
    return;
  }
  assertExpressionKeys(
    expression,
    expression.op === 'wholeWord'
      ? ['op', 'left', 'right', 'caseSensitive', 'locale'] : ['op', 'left', 'right'],
    path
  );
  validateExpression(expression.left, aliases, `${path}.left`);
  validateExpression(expression.right, aliases, `${path}.right`);
  if (expression.op === 'wholeWord') {
    invariant(expression.caseSensitive === undefined || typeof expression.caseSensitive === 'boolean',
      'query-expression-error', `${path}.caseSensitive must be boolean.`);
    invariant(expression.locale === undefined || typeof expression.locale === 'string',
      'query-expression-error', `${path}.locale must be a string.`);
  }
}

function readField(environment, path) {
  if (path === '$rowId') return environment.$rowId ?? UNKNOWN_VALUE;
  const [alias, ...segments] = path.split('.');
  let value = environment[alias];
  if (value === undefined) return UNKNOWN_VALUE;
  for (const segment of segments) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, segment)) return UNKNOWN_VALUE;
    value = value[segment];
  }
  return value;
}

function evaluateValue(expression, environment) {
  if (Object.hasOwn(expression, 'literal')) return expression.literal;
  if (Object.hasOwn(expression, 'field')) return readField(environment, expression.field);
  if (Object.hasOwn(expression, 'ref')) return environment[expression.ref] ?? UNKNOWN_VALUE;
  const truth = evaluateTruth(expression, environment);
  return truth === TRUTH.UNKNOWN ? UNKNOWN_VALUE : truth === TRUTH.TRUE;
}

function booleanTruth(value) {
  if (value === UNKNOWN_VALUE) return TRUTH.UNKNOWN;
  if (value === true) return TRUTH.TRUE;
  if (value === false) return TRUTH.FALSE;
  return TRUTH.UNKNOWN;
}

function compare(left, operator, right, expression) {
  if (left === UNKNOWN_VALUE || right === UNKNOWN_VALUE) return TRUTH.UNKNOWN;
  let value;
  if (operator === 'eq') value = left === right;
  else if (operator === 'neq') value = left !== right;
  else if (['gt', 'gte', 'lt', 'lte'].includes(operator)) {
    invariant(typeof left === typeof right && ['number', 'string'].includes(typeof left)
      && (typeof left !== 'number' || (Number.isFinite(left) && Number.isFinite(right))),
    'query-type-error', `${operator} requires two finite numbers or two strings.`);
    if (operator === 'gt') value = left > right;
    else if (operator === 'gte') value = left >= right;
    else if (operator === 'lt') value = left < right;
    else value = left <= right;
  }
  else if (operator === 'in') {
    invariant(Array.isArray(right), 'query-type-error', 'in requires an array as its right operand.');
    value = right.includes(left);
  }
  else if (operator === 'includes') {
    invariant(Array.isArray(left) || (typeof left === 'string' && typeof right === 'string'),
      'query-type-error', 'includes requires an array or two strings.');
    value = left.includes(right);
  } else if (operator === 'startsWith' || operator === 'endsWith') {
    invariant(typeof left === 'string' && typeof right === 'string', 'query-type-error',
      `${operator} requires two strings.`);
    value = operator === 'startsWith' ? left.startsWith(right) : left.endsWith(right);
  }
  else if (operator === 'wholeWord') {
    invariant(typeof left === 'string' && typeof right === 'string', 'query-type-error',
      'wholeWord requires two strings.');
    value = containsWholeWord(left, right, expression);
  }
  else throw new NllError('query-expression-error', `Unsupported comparison ${operator}.`);
  return value ? TRUTH.TRUE : TRUTH.FALSE;
}

function containsWholeWord(text, term, options = {}) {
  if (typeof text !== 'string' || typeof term !== 'string' || !term) return false;
  const locale = options.locale || 'und';
  const source = options.caseSensitive ? text : text.toLocaleLowerCase(locale);
  const needle = options.caseSensitive ? term : term.toLocaleLowerCase(locale);
  let cursor = 0;
  while (cursor <= source.length - needle.length) {
    const offset = source.indexOf(needle, cursor);
    if (offset < 0) return false;
    const before = source[offset - 1];
    const after = source[offset + needle.length];
    if ((!before || !/[\p{L}\p{N}_]/u.test(before))
      && (!after || !/[\p{L}\p{N}_]/u.test(after))) return true;
    cursor = offset + Math.max(needle.length, 1);
  }
  return false;
}

function evaluateTruth(expression, environment) {
  if (Object.hasOwn(expression, 'field') || Object.hasOwn(expression, 'ref')
    || Object.hasOwn(expression, 'literal')) {
    return booleanTruth(evaluateValue(expression, environment));
  }
  if (expression.op === 'and') {
    const values = expression.args.map((item) => evaluateTruth(item, environment));
    if (values.includes(TRUTH.FALSE)) return TRUTH.FALSE;
    return values.every((value) => value === TRUTH.TRUE) ? TRUTH.TRUE : TRUTH.UNKNOWN;
  }
  if (expression.op === 'or') {
    const values = expression.args.map((item) => evaluateTruth(item, environment));
    if (values.includes(TRUTH.TRUE)) return TRUTH.TRUE;
    return values.every((value) => value === TRUTH.FALSE) ? TRUTH.FALSE : TRUTH.UNKNOWN;
  }
  if (expression.op === 'not') {
    const value = evaluateTruth(expression.arg, environment);
    return value === TRUTH.UNKNOWN ? value : value === TRUTH.TRUE ? TRUTH.FALSE : TRUTH.TRUE;
  }
  if (expression.op === 'isPresent') {
    return evaluateValue(expression.arg, environment) === UNKNOWN_VALUE ? TRUTH.FALSE : TRUTH.TRUE;
  }
  return compare(
    evaluateValue(expression.left, environment), expression.op,
    evaluateValue(expression.right, environment), expression
  );
}

function collectFieldPaths(expression, output = new Set()) {
  if (!expression || typeof expression !== 'object') return output;
  if (typeof expression.field === 'string') output.add(expression.field);
  for (const value of Object.values(expression)) {
    if (Array.isArray(value)) value.forEach((item) => collectFieldPaths(item, output));
    else if (value && typeof value === 'object') collectFieldPaths(value, output);
  }
  return output;
}

function materializeTemplate(template, environment, program, path = '$template') {
  if (template === null || typeof template !== 'object') return template;
  if (Array.isArray(template)) {
    return template.map((item, index) => materializeTemplate(item, environment, program, `${path}[${index}]`));
  }
  const keys = Object.keys(template);
  if (keys.length === 1 && keys[0] === 'field') {
    const value = readField(environment, template.field);
    invariant(value !== UNKNOWN_VALUE, 'decision-unknown', `${path} references unavailable field ${template.field}.`);
    return value;
  }
  if (keys.length === 1 && keys[0] === 'literal') return template.literal;
  if (keys.length === 1 && keys[0] === 'anchorFrom') {
    const value = environment[template.anchorFrom];
    if (value?.range && value?.quote !== undefined) return value;
    const anchorId = value?.anchors?.[0];
    invariant(anchorId && program.anchors?.[anchorId], 'decision-witness-error',
      `${path} cannot resolve an anchor from ${template.anchorFrom}.`);
    return program.anchors[anchorId];
  }
  return Object.fromEntries(Object.entries(template).map(([key, value]) => [
    key, materializeTemplate(value, environment, program, `${path}.${key}`)
  ]));
}

export {
  BINARY_OPERATORS,
  LOGICAL_OPERATORS,
  TRUTH,
  UNKNOWN_VALUE,
  collectFieldPaths,
  evaluateTruth,
  evaluateValue,
  materializeTemplate,
  readField,
  validateExpression
};
