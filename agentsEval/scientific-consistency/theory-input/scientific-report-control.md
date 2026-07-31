# Cross-section scientific report control policy

## 1. Purpose and authority

This policy governs the internal quality-control review of clinical-research reports before they are submitted to a
sponsor, a regulator, a journal, or an independent review committee. It is deliberately narrower than a general
assessment of scientific truth. The control asks whether a report makes mutually compatible statements about the same
analysis target and whether any difference is explained well enough that a reader can reconstruct why the values
differ. It does not decide whether a treatment works, whether a study is ethically acceptable, or whether an external
claim is medically correct.

The audit unit is an evidence-bearing quantitative claim. A quantitative claim consists of a reported value together
with its metric, estimand, baseline or comparator, population, aggregation method, unit, time horizon, analysis set,
and source context. A number without enough of those dimensions is an incomplete claim. Section headings, table
captions, footnotes, and nearby definitions can supply dimensions when the relationship is explicit. A reviewer must
not silently borrow a baseline, population, or aggregation rule from another section merely because doing so makes two
numbers agree.

The control is intended for deterministic replay. A later reviewer must be able to recover the claim pair, each
dimension decision, every permitted conversion, the selected decision row, and the source fragments without asking a
model to recreate its judgment.

The report-control agent is expected to inspect claims across the executive summary, abstract, methods, results,
tables, appendices, and conclusions. Cross-section distance is not evidence of incompatibility. Conversely, lexical
similarity is not evidence of compatibility. The semantic identity of the analysis target controls the comparison.

## 2. Claim dimensions

The metric states what is measured. Examples include absolute risk reduction, relative risk reduction, risk ratio,
odds ratio, mean change from baseline, median time to event, response rate, and hazard ratio. Two labels may be aliases
only when the active ontology defines them as such without changing the mathematical interpretation. “Improvement” is
not an alias for any specific metric. “Twelve percentage points” and “twelve percent relative reduction” are not the
same metric even though both contain the number twelve.

The estimand states the treatment effect being targeted, including intercurrent-event strategy where the report makes
it explicit. A treatment-policy estimand and a hypothetical estimand are different targets. If a report never names
the estimand but otherwise supplies a stable analysis definition, the materialization may preserve an unresolved
estimand rather than invent one. An unresolved estimand makes a cross-section comparison `UNKNOWN` when it could alter
the conclusion.

The baseline or comparator identifies the reference from which a change or ratio is calculated. It may be placebo,
active control, each group's own baseline, pooled baseline, historical control, or a named model prediction. A value
relative to placebo is not directly comparable with a value relative to each group's own baseline. A baseline can be
represented as the same only when the source explicitly identifies it or a valid cross-reference resolves it.

The population identifies the subjects summarized. At minimum the ontology must distinguish intention-to-treat,
modified intention-to-treat, per-protocol, safety, and named subgroups when the source uses them. Whole-cohort and
subgroup claims are not contradictory merely because their values differ. Two claims about the same named population
may still be incompatible if one excludes post-randomization subjects under a different analysis-set definition.

The aggregation dimension identifies how individual observations become a reported value. Arithmetic mean, median,
least-squares mean, adjusted model estimate, pooled site estimate, and weighted meta-analytic estimate are distinct.
The report may provide a documented transformation connecting two aggregations; absent such a transformation, the
agent must not compare them as the same number.

The time horizon identifies when or over what interval the outcome is measured. Week 12, week 24, end of treatment,
and the full follow-up period are different unless the source states they coincide. The unit must be normalized only
through an authorized conversion. Percent and proportion may be normalized when the metric remains unchanged;
percentage points and relative percent must remain distinct.

## 3. Comparability gate

Rule SCI-001 requires a comparability decision before any numeric consistency decision. Two claims are comparable
only when metric, estimand, baseline, population, aggregation, time horizon, and unit are each established as the same
or as equivalent under an authorized normalization. If any required dimension is established as different, the pair
is `NOT_APPLICABLE` for numeric-conflict review. The agent may emit a non-blocking clarification observation, but it
must not call the values contradictory.

If a required dimension is absent, unresolved, or supported only by an unaccepted interpretation, comparability is
`UNKNOWN`. If admitted source evidence simultaneously supports incompatible values for a dimension, comparability is
`CONFLICT`. The agent must preserve this conflict rather than select the interpretation that creates or removes a
numeric mismatch. A claim pair cannot advance to the numeric decision while its comparability result is `UNKNOWN` or
`CONFLICT`.

Authorized normalization is bounded. The active theory permits exact conversion between a proportion and a percent,
for example 0.18 and 18%, and exact conversion between compatible time units. It does not infer a relative reduction
from an absolute difference unless the baseline risk is explicitly present and the formula is authorized. It does not
equate a raw mean with a least-squares mean. It does not round away a discrepancy beyond the declared reporting
tolerance.

## 4. Numeric consistency

Rule SCI-002 applies only to a comparable pair. Numeric values are interpreted as exact points, reported intervals, or
rounded values with a declared tolerance. Two exact normalized points are consistent when equal. A rounded value is
consistent with a more precise value when the precise value lies within the interval induced by the declared rounding
precision. Two confidence intervals are not treated as point estimates; they are comparable as intervals only when
the claims identify the same interval type and confidence level.

A comparable pair is `SATISFIED` when the normalized value sets overlap under the authorized tolerance. It is
`VIOLATED` when the value sets are disjoint and every critical dimension is established. If normalization is
unsupported or the precision metadata is insufficient to determine overlap, the result is `UNKNOWN`. If the report
asserts two incompatible values for the same claim identity in equally admitted contexts, the result is `CONFLICT`;
the conflict is itself the finding rather than an arbitrary choice of one value.

Differences that are explicitly explained by an authorized derivation are not violations. For example, a table may
report an unrounded proportion of 0.143 while the narrative reports 14.3%. The derivation must preserve the claim
dimensions and be traceable to both values. A prose phrase such as “results were broadly similar” is not a derivation.

## 5. Conclusions and summary claims

Rule SCI-003 requires each quantitative conclusion or executive-summary number to have at least one compatible result
claim elsewhere in the report. This is a support rule, not a requirement that wording be identical. The supporting
claim must match the dimensions in SCI-001 and have a value consistent under SCI-002. If the report contains a
compatible result with a conflicting number, the summary claim receives the conflict or violation status produced by
SCI-002.

Absence of support is final only after coverage for quantitative result claims is closed across the designated results,
tables, and appendices scope. Before that scope is closed, “no supporting result was found” is `UNKNOWN`. The agent
must not conclude unsupported summary merely because the materializer has processed the abstract first. A coverage
declaration must name the claim concept and exact report scope; closing the document generally is insufficient.

When the conclusion is purely qualitative, SCI-003 does not invent a numeric claim. When a sentence contains a number
but the metric or population cannot be represented in the active ontology, the rule is `BLOCKED_ONTOLOGY`, not
`SATISFIED` and not a guessed classification.

## 6. Evidence and interpretation policy

Every observation claim must have an exact half-open Unicode code-point span into the immutable source revision.
Evidence for a finding includes both compared claims, the spans that establish their critical dimensions, the
normalization steps, and the applicable rule span from this policy. A table cell may be anchored separately from its
row label and caption; the materialization must preserve their structural relationship.

Explicit and independently verified claims are admitted by default. Proposed extractions may participate in an
exploratory interpretation but cannot alone support a mechanical violation. When two reasonable coreference,
population, or metric readings remain, LongTextJS records alternatives. The circuit evaluates each admitted
interpretation separately. A finding is robust only when all admitted interpretations produce it, conditional when it
depends on a named interpretation, and conflictual when interpretations produce incompatible statuses.

Missing information is not falsity. The four evidence values are `TRUE`, `FALSE`, `UNKNOWN`, and `CONFLICT`. Rule
statuses include `SATISFIED`, `VIOLATED`, `NOT_APPLICABLE`, `UNKNOWN`, `CONFLICT`, `BLOCKED_ONTOLOGY`,
`BLOCKED_CAPABILITY`, and `ERROR_EXECUTION`. A technically failed normalization never becomes a semantic mismatch.

## 7. Required outputs

The main output is a `ScientificConsistencyAssessment` for each candidate claim pair. It names the two claim
identities, comparability status, normalized values when available, final rule status, evidence spans, interpretation
context, and assurance achieved. A `ScientificConsistencyFinding` is emitted only for `VIOLATED` or semantic
`CONFLICT`. `UNKNOWN` and blockers are retained in the assessment report and must not be hidden from the aggregate.

The aggregate report separates completed findings, conditional findings, unknown assessments, blocked assessments,
and non-applicable pairs. It must never describe a report as globally consistent when a mandatory summary claim is
unknown or blocked. Findings should state the business-relevant dimensions: for example, “the executive summary and
primary-results section report incompatible week-24 modified-intention-to-treat absolute response-rate differences.”

No automatic prose repair is required by this policy. A controlled clarification sentence may be generated only if a
future target supplies a complete semantic frame and passes deterministic round-trip validation. The current agent
must focus on audit and traceability, not rewrite a clinical conclusion.

## 8. Benchmark and assurance obligations

The training benchmark must cover: equivalent percent/proportion values; a genuine compatible numeric conflict;
different metrics; different baselines; different populations; different aggregations; different horizons; missing
population; an admitted dimension conflict; rounding boundary; unsupported normalization; open and closed support
coverage; and a summary supported by a distant table claim. At least one realistic case must require evidence from
three report sections.

The mutation suite must reject, at minimum, a comparator that treats disjoint values as equal, a comparability gate
that ignores population, a normalizer that equates percentage points with relative percent, and an absence check that
treats open coverage as closed. The architecture plan should use SemanticStore query/dataflow for candidate selection,
authorized normalization for values and dimensions, ConstraintKernel for bounded numeric overlap, and a four-valued
decision table for statuses. Custom procedural code is allowed only for compact orchestration that the SDK primitives
do not already express.

Concrete execution is the operational authority. Abstract preflight may report possible statuses and missing
dimensions, but it does not emit final findings. A symbolic boundary witness earns assurance only after concrete
replay. Local proof may verify decision-row exhaustiveness if implemented, but no certificate is allowed to claim that
the source report is scientifically true.
