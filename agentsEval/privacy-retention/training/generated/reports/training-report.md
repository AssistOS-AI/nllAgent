# Privacy-retention training report

## Result

The fictional Northstar retention authority was compiled into one executable ESM build. The build contains a sealed
OntologyJS vocabulary, RuleAnalysis, CircuitArchitecturePlan, MaterializationProfile, one hierarchical CircuitJS
assessment circuit, bounded abstract/symbolic/proof assurance, ten semantic benchmark cases, three mutation probes,
and a pinned RulePack. The final build context has purpose `ANALYZE`; training and review used separate role contexts.

The authority source contains 2,010 words and 14,033 Unicode code points. The circuit classifies the inclusive
five-year boundary, closed-scope absence, open-scope uncertainty, complete documented exceptions, incomplete
exceptions, conflicting exception statements, conflicting durations, scope isolation, and an ontology gap.

## SDK use

The concrete circuit uses the shared `constraints.solve@1` provider for the five-year comparison and
`decision.evaluate@1` for the four-valued status table. Its single JavaScript stage performs record grouping and exact
evidence assembly through the public SemanticStore view. Trace tests require both SDK primitive nodes.

## Validation evidence

- `node tools/nll.mjs ontology check .../ontologies/index.mjs`: 11 concepts, 26 roles, accepted.
- `node tools/nll.mjs plan check .../plans/retention.plan.mjs`: zero diagnostics.
- `node tools/nll.mjs circuit check .../circuits/retention.circuit.mjs`: one stage, accepted.
- `node --test .../tests/privacy-retention.test.mjs`: 8/8 tests passed in approximately 0.22 seconds.
- `node src/training/validate-candidate.mjs ... privacy-retention typed`: candidate and RulePack accepted; 10/10
  benchmark cases passed.
- ProofKernel: local violation implication `ESTABLISHED`.
- Symbolic witness: above-limit, closed-scope violation replay `CONFIRMED`.
- Mutation probes: inclusive-comparator, dropped-exception, and forced-closed-coverage defects were all rejected.

## Review repairs

Independent review found and repaired two candidate-layer defects. First, a `documented` status without a real
authority and review/end date was incorrectly accepted; RET-002 now requires both fields, and a new closed-scope
incomplete-exception case is `VIOLATED`. Second, the plan declared ConstraintKernel while concrete code used a local
comparison; the circuit now executes the shared SDK constraint provider and tests require its trace node.

## Bounded limitations

The calibration materializer is allow-listed to benchmark source identities because the current host candidate
validator runs Markdown benchmark fixtures through `AgentProject.materializers`. It returns no values for task source
identities; production analysis is supplied exclusively by task-local `nll-analyze-task` LongTextJS. The generic native
preflight sees the JavaScript grouping stage as opaque and reports one conservative precision diagnostic; the
scenario-owned abstract model covers the planned duration/coverage discriminants. The benchmark API asserts finding
count and type, while the training test adds evidence and primitive-trace assertions.
