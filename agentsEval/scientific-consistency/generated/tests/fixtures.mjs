import {
  claim,
  coverage,
  explicit,
  groundedAt,
  longTextProgram,
  semanticUnit,
  source,
  span
} from '../../../../src/longtext/index.mjs';
import {
  aggregation,
  baseline,
  claimId,
  claimKind,
  claimSection,
  estimate,
  estimateUnit,
  estimand,
  horizon,
  identifiedClaim,
  isReference,
  metric,
  population,
  precision,
  QuantitativeClaim,
  sourceAnchor
} from '../ontologies/index.mjs';
import { resultScope } from '../materialization/scientific.profile.mjs';

const defaults = Object.freeze({
  section: 'primary-results',
  kind: 'result',
  metric: 'adjusted absolute responder-rate difference',
  estimand: 'treatment-policy',
  baseline: 'placebo',
  population: 'modified-intention-to-treat',
  aggregation: 'model-adjusted-marginal-estimate',
  horizon: 'week-24',
  value: 14.3,
  unit: 'percentage-points',
  precision: 'one-decimal',
  reference: false
});

function codePointOffset(text, utf16Offset) {
  return [...text.slice(0, utf16Offset)].length;
}

function makeProgram(id, specifications, coverageState = 'closed') {
  const claims = specifications.map((value) => ({ ...defaults, ...value }));
  const text = claims.map((value) => value.text).join('\n\n');
  const sourceValue = source(`${id}.md`, text, 'benchmark');
  const units = claims.map((value) => {
    const utf16Start = text.indexOf(value.text);
    const start = codePointOffset(text, utf16Start);
    const anchor = span(sourceValue, start, start + [...value.text].length);
    const term = identifiedClaim(
      value.id,
      claimId(value.id), claimSection(value.section), claimKind(value.kind), metric(value.metric),
      estimand(value.estimand), baseline(value.baseline), population(value.population),
      aggregation(value.aggregation), horizon(value.horizon), estimate(value.value),
      estimateUnit(value.unit), precision(value.precision), isReference(value.reference), sourceAnchor(anchor)
    );
    return semanticUnit(`claim-${value.id}`, claim(term, explicit(), groundedAt(anchor)));
  });
  return longTextProgram(
    id,
    sourceValue,
    ...units,
    coverage(QuantitativeClaim, resultScope, coverageState)
  );
}

function reference(value = {}) {
  return {
    id: 'TABLE-7',
    text: 'Table 7 reports an adjusted absolute difference of 0.143 for the week-24 modified intention-to-treat treatment-policy analysis.',
    value: 0.143,
    unit: 'proportion',
    precision: 'three-decimal-proportion',
    reference: true,
    ...value
  };
}

export { defaults, makeProgram, reference };
