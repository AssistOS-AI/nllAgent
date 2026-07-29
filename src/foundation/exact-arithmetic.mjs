const MAX_DECIMAL_COMPONENT_DIGITS = 128;
const DECIMAL_PATTERN = new RegExp(
  `^[+-]?\\d{1,${MAX_DECIMAL_COMPONENT_DIGITS}}(?:\\.\\d{1,${MAX_DECIMAL_COMPONENT_DIGITS}})?$`, 'u'
);

function greatestCommonDivisor(left, right) {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a || 1n;
}

function normalizeRational(numerator, denominator) {
  if (denominator === 0n) return null;
  const sign = denominator < 0n ? -1n : 1n;
  const divisor = greatestCommonDivisor(numerator, denominator);
  return {
    numerator: (numerator / divisor) * sign,
    denominator: (denominator / divisor) * sign
  };
}

function parseExactDecimal(value) {
  const source = String(value);
  if (!DECIMAL_PATTERN.test(source)) return null;
  const negative = source.startsWith('-');
  const unsigned = source.replace(/^[+-]/u, '');
  const [whole, fraction = ''] = unsigned.split('.');
  const denominator = 10n ** BigInt(fraction.length);
  const numerator = BigInt(`${whole}${fraction}`) * (negative ? -1n : 1n);
  return normalizeRational(numerator, denominator);
}

function compareRationals(left, right) {
  const difference = left.numerator * right.denominator - right.numerator * left.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

function compareExactDecimals(left, right) {
  const parsedLeft = parseExactDecimal(left);
  const parsedRight = parseExactDecimal(right);
  if (!parsedLeft || !parsedRight) return null;
  return compareRationals(parsedLeft, parsedRight);
}

function renderRational(value) {
  if (!value) return 'undefined';
  if (value.denominator === 1n) return value.numerator.toString();
  return `${value.numerator}/${value.denominator}`;
}

function evaluateArithmeticPayload(payload) {
  const left = parseExactDecimal(payload?.left);
  const right = parseExactDecimal(payload?.right);
  const stated = parseExactDecimal(payload?.result);
  if (!left || !right || !stated) return { valid: false, reason: 'invalid-decimal', computed: null };
  let computed;
  if (payload.operator === 'plus') {
    computed = normalizeRational(
      left.numerator * right.denominator + right.numerator * left.denominator,
      left.denominator * right.denominator
    );
  } else if (payload.operator === 'minus') {
    computed = normalizeRational(
      left.numerator * right.denominator - right.numerator * left.denominator,
      left.denominator * right.denominator
    );
  } else if (payload.operator === 'times') {
    computed = normalizeRational(left.numerator * right.numerator, left.denominator * right.denominator);
  } else if (payload.operator === 'divided-by') {
    if (right.numerator === 0n) return { valid: false, reason: 'division-by-zero', computed: null };
    computed = normalizeRational(left.numerator * right.denominator, left.denominator * right.numerator);
  } else {
    return { valid: false, reason: 'unknown-operator', computed: null };
  }
  return {
    valid: compareRationals(computed, stated) === 0,
    reason: compareRationals(computed, stated) === 0 ? null : 'incorrect-equality',
    computed: renderRational(computed)
  };
}

export {
  DECIMAL_PATTERN,
  MAX_DECIMAL_COMPONENT_DIGITS,
  compareExactDecimals,
  evaluateArithmeticPayload,
  parseExactDecimal,
  renderRational
};
