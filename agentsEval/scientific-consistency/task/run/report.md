# nllAgent audit

- Agent: scientific-consistency
- Run: isolated-analysis
- Status: reported
- Source: agentsEval/scientific-consistency/task/input.md@working
- Foundation: off
- Findings: 1

## error: scientific-numeric-inconsistency

TABLE-7 versus DRAFT-PRIMARY-12: Comparable normalized value intervals are disjoint.

- Evidence: agentsEval/scientific-consistency/task/input.md@working:7559-7982 — “Table 7 is titled “Modified intention-to-treat treatment-policy responder analysis at week 24.” Its rows report AX-17
adjusted response proportion 0.614, placebo adjusted response proportion 0.471, and AX-17-minus-placebo adjusted
difference 0.143. The table footnote states that proportions use marginal model predictions and that the difference
is an absolute contrast. The confidence interval row reports 0.051 to 0.235.”
- Evidence: agentsEval/scientific-consistency/task/input.md@working:5443-5862 — “A draft sentence remaining in the results narrative states that the adjusted absolute difference was 12.0 percentage
points for the same week-24 modified intention-to-treat treatment-policy analysis. The sentence cites the primary
model and does not name a different baseline, population, aggregation, horizon, estimand, or rounding rule. No table
or derivation supports 12.0 percentage points for this analysis target.”
