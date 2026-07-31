export default function materializeScientificReport({ source, api, ontology }) {
  const {
    claim,
    coverage,
    explicit,
    groundedAt,
    semanticUnit,
    span
  } = api;
  const {
    QuantitativeClaim,
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
    sourceAnchor
  } = ontology;

  function codePointOffset(utf16Offset) {
    return [...source.text.slice(0, utf16Offset)].length;
  }

  function paragraphAnchor(needle) {
    const found = source.text.indexOf(needle);
    if (found < 0 || source.text.indexOf(needle, found + 1) >= 0) {
      throw new Error(`Expected one source occurrence for anchor needle: ${needle}`);
    }
    const paragraphStart = source.text.lastIndexOf('\n\n', found) + 2;
    const nextBreak = source.text.indexOf('\n\n', found);
    const paragraphEnd = nextBreak < 0 ? source.text.length : nextBreak;
    return span(source, codePointOffset(paragraphStart), codePointOffset(paragraphEnd));
  }

  const common = Object.freeze({
    metric: 'adjusted absolute responder-rate difference',
    estimand: 'treatment-policy',
    baseline: 'placebo',
    population: 'modified-intention-to-treat',
    aggregation: 'model-adjusted-marginal-estimate',
    horizon: 'week-24',
    unit: 'percentage-points',
    precision: 'one-decimal',
    reference: false
  });

  const specifications = [
    {
      ...common,
      id: 'TABLE-7', section: 'table-7', kind: 'result', value: 0.143, unit: 'proportion',
      precision: 'three-decimal-proportion', reference: true,
      needle: 'Table 7 is titled “Modified intention-to-treat treatment-policy responder analysis at week 24.”'
    },
    {
      ...common,
      id: 'PRIMARY-RESULT', section: 'primary-efficacy-results', kind: 'result', value: 14.3,
      needle: 'The adjusted absolute difference was 0.143, corresponding to 14.3 percentage points.'
    },
    {
      ...common,
      id: 'DRAFT-PRIMARY-12', section: 'primary-efficacy-results', kind: 'result', value: 12.0,
      needle: 'A draft sentence remaining in the results narrative states that the adjusted absolute difference was 12.0 percentage'
    },
    {
      ...common,
      id: 'EXECUTIVE-14', section: 'executive-summary', kind: 'summary', value: 14.3,
      needle: 'The same summary reports a 14.3 percentage-point adjusted difference in week-24 responder rate'
    },
    {
      ...common,
      id: 'EXECUTIVE-RELATIVE-18', section: 'executive-summary', kind: 'summary',
      metric: 'relative improvement', value: 18, unit: 'percent',
      needle: 'The executive summary states that AX-17 improved the primary responder outcome by 18% relative to placebo'
    },
    {
      ...common,
      id: 'PER-PROTOCOL-17-8', section: 'sensitivity-results', kind: 'result',
      population: 'per-protocol', value: 17.8,
      needle: 'The per-protocol week-24 adjusted responder-rate difference was 17.8 percentage points'
    },
    {
      ...common,
      id: 'HYPOTHETICAL-15-6', section: 'sensitivity-results', kind: 'result',
      estimand: 'hypothetical-no-rescue', value: 15.6,
      needle: 'Under the hypothetical no-rescue estimand in the modified intention-to-treat population'
    },
    {
      ...common,
      id: 'OBSERVED-12-4', section: 'primary-efficacy-results', kind: 'result',
      aggregation: 'unadjusted-observed-case', value: 12.4,
      needle: 'The unadjusted observed-case responder rates were 0.602 and 0.478'
    },
    {
      ...common,
      id: 'CONCLUSION-14', section: 'integrated-conclusion', kind: 'summary', value: 14.3,
      needle: 'The integrated conclusion states that the primary week-24 modified intention-to-treat treatment-policy analysis showed'
    }
  ];

  const units = specifications.map((value) => {
    const anchor = paragraphAnchor(value.needle);
    const term = identifiedClaim(
      value.id,
      claimId(value.id), claimSection(value.section), claimKind(value.kind), metric(value.metric),
      estimand(value.estimand), baseline(value.baseline), population(value.population),
      aggregation(value.aggregation), horizon(value.horizon), estimate(value.value),
      estimateUnit(value.unit), precision(value.precision), isReference(value.reference), sourceAnchor(anchor)
    );
    return semanticUnit(`scientific-claim-${value.id}`, claim(term, explicit(), groundedAt(anchor)));
  });

  return [
    ...units,
    coverage(QuantitativeClaim, 'scientific-primary-response-support', 'closed')
  ];
}
