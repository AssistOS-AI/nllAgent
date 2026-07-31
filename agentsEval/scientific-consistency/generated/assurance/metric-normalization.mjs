import {
  eLeaf,
  eOperator,
  ePattern,
  ePatternLiteral,
  eRewrite,
  eTerm
} from '../../../../src/engines/index.mjs';

const canonicalize = eOperator('canonicalize-scientific-metric', 'Metric', 'MetricLexeme');

const METRIC_RULES = Object.freeze([
  ['absolute responder-rate difference', 'absolute-response-rate-difference'],
  ['adjusted absolute responder-rate difference', 'absolute-response-rate-difference'],
  ['absolute response-rate difference', 'absolute-response-rate-difference'],
  ['relative improvement', 'relative-improvement'],
  ['relative to placebo', 'relative-improvement'],
  ['mean symptom change', 'mean-symptom-change'],
  ['least-squares mean contrast', 'least-squares-mean-contrast']
].map(([lexeme, canonical]) => eRewrite(
  `metric:${lexeme}`,
  ePattern(canonicalize, ePatternLiteral('MetricLexeme', lexeme)),
  ePatternLiteral('Metric', canonical)
)));

const AUTHORIZED_METRICS = new Set(METRIC_RULES.map((rule) => rule.right.value));

function metricTerm(value) {
  return eTerm(canonicalize, eLeaf('MetricLexeme', String(value).trim().toLowerCase()));
}

function extractedMetric(result) {
  const extraction = result.value(1);
  const term = extraction.term;
  return term.leaf && AUTHORIZED_METRICS.has(term.value)
    ? Object.freeze({ status: 'NORMALIZED', value: term.value, cost: extraction.cost })
    : Object.freeze({ status: 'UNKNOWN', value: null, cost: extraction.cost });
}

function normalizeEstimate(canonicalMetric, value, unit, precisionValue = 'exact') {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return Object.freeze({ status: 'UNKNOWN', reason: 'estimate is not a finite number' });
  }
  if (canonicalMetric === 'absolute-response-rate-difference') {
    if (unit === 'proportion') return normalized(value * 100, precisionValue);
    if (unit === 'percentage-points') return normalized(value, precisionValue);
  }
  if (canonicalMetric === 'relative-improvement' && unit === 'percent') return normalized(value, precisionValue);
  if ((canonicalMetric === 'mean-symptom-change' || canonicalMetric === 'least-squares-mean-contrast')
    && unit === 'score-points') return normalized(value, precisionValue);
  return Object.freeze({ status: 'UNKNOWN', reason: `unsupported ${canonicalMetric}/${unit} conversion` });
}

function normalized(value, precisionValue) {
  const tolerance = precisionValue === 'one-decimal' ? 0.05 : precisionValue === 'three-decimal-proportion' ? 0.05 : 0;
  return Object.freeze({ status: 'NORMALIZED', value, minimum: value - tolerance, maximum: value + tolerance });
}

export { AUTHORIZED_METRICS, METRIC_RULES, extractedMetric, metricTerm, normalizeEstimate };
