# Materialization notes

The program materializes nine quantitative claims spanning the executive summary, primary results, sensitivity
results, Table 7, and integrated conclusion. It preserves metric, estimand, comparator, population, aggregation,
horizon, unit, precision, claim kind, and exact paragraph anchor for each observation.

The report explicitly states that efficacy-claim extraction is closed for the named sections. This program closes
`QuantitativeClaim` only in the narrower `scientific-primary-response-support` scope used by the selected summary
support circuit. It does not claim exhaustive extraction of subgroup, symptom-score, safety, pharmacokinetic,
external-medical, or general-document concepts.

The 18% executive phrase is materialized as the relative metric actually written. The editorial possibility of a
future wording change is not promoted into the current source world. No finding or assessment is materialized here.
