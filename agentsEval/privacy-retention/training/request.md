# Training request: privacy-retention

Compile the fictional Northstar Services retention authority in
`../../authority/retention-rules.md` into one immutable nllAgent build. The build must classify each in-scope retention
record as `SATISFIED`, `VIOLATED`, `ACCEPTED_EXCEPTION`, `UNKNOWN`, or `CONFLICT`; preserve ontology and execution
blockers; require closed, record-relevant exception coverage before concluding absence; and attach exact source
evidence to every assessment.

Use the repository SDK before local algorithms. Produce an executable OntologyJS vocabulary, RuleAnalysis,
CircuitArchitecturePlan, MaterializationProfile, compact CircuitJS, calibration tests, semantic benchmark cases,
mutation evidence, a sealed RulePack, and an agent assembly. Keep the source-observation layer separate from derived
assessments. Do not call a model at runtime and do not create JSON or TypeScript artifacts.

The independent evaluation document is `../../input.md`. It is not training authority and must be materialized later
in an isolated analysis task by the `nll-analyze-task` skill.
