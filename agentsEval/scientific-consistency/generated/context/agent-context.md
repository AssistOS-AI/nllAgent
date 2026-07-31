# Agent context: scientific-consistency

Purpose: **ANALYZE**  
Build: **scientific-consistency@1** (sha256:007992eded91fea009527060a22a030ff5b3a1816a9edaf442294dd00e472caa)  
Context digest: `0e307e5a222389d4b7b50ffb295c5d3b55303807c13228e8c87dddc24e712210`

## Theory identities

- `theory-input/scientific-report-control.md` — sha256:scientific-report-control-2026-07-31

## Ontology available to generated code

### eval.scientific-report@1

| Concept | Sort | Required/allowed roles |
| --- | --- | --- |
| eval.scientific-report@1:QuantitativeClaim | nll.core@1:State | eval.scientific-report@1:aggregation[1..1], eval.scientific-report@1:baseline[1..1], eval.scientific-report@1:claimId[1..1], eval.scientific-report@1:claimKind[1..1], eval.scientific-report@1:claimSection[1..1], eval.scientific-report@1:estimand[1..1], eval.scientific-report@1:estimate[1..1], eval.scientific-report@1:estimateUnit[1..1], eval.scientific-report@1:horizon[1..1], eval.scientific-report@1:isReference[1..1], eval.scientific-report@1:metric[1..1], eval.scientific-report@1:population[1..1], eval.scientific-report@1:precision[1..1], eval.scientific-report@1:sourceAnchor[1..1] |
| eval.scientific-report@1:ScientificConsistencyAssessment | nll.core@1:Proposition | eval.scientific-report@1:assessmentEvidence[0..*], eval.scientific-report@1:assurancePath[1..1], eval.scientific-report@1:comparisonReason[1..1], eval.scientific-report@1:comparisonStatus[1..1], eval.scientific-report@1:leftClaim[1..1], eval.scientific-report@1:normalizedLeft[0..1], eval.scientific-report@1:normalizedMetric[0..1], eval.scientific-report@1:normalizedRight[0..1], eval.scientific-report@1:rightClaim[1..1] |
| nll.core@1:Document | nll.core@1:Entity | nll.core@1:named[1..1] |
| nll.core@1:Finding | nll.core@1:Proposition | nll.core@1:assurance[1..1], nll.core@1:evidence[0..*], nll.core@1:findingType[1..1], nll.core@1:message[1..1], nll.core@1:severity[1..1] |
| nll.core@1:Paragraph | nll.core@1:Entity | nll.core@1:grounded[1..1], nll.core@1:order[1..1], nll.core@1:text[1..1] |
| nll.core@1:Sentence | nll.core@1:Entity | nll.core@1:grounded[1..1], nll.core@1:order[1..1], nll.core@1:text[1..1] |
| nll.core@1:StateAssertion | nll.core@1:State | nll.core@1:during[0..1], nll.core@1:polarity[1..1], nll.core@1:predicate[1..1], nll.core@1:subject[1..1] |

| Role | Source | Target | Cardinality |
| --- | --- | --- | --- |
| eval.scientific-report@1:aggregation | nll.core@1:State | nll.core@1:Value | 1..1 |
| eval.scientific-report@1:assessmentEvidence | nll.core@1:Proposition | nll.core@1:Value | 0..* |
| eval.scientific-report@1:assurancePath | nll.core@1:Proposition | nll.core@1:Value | 1..1 |
| eval.scientific-report@1:baseline | nll.core@1:State | nll.core@1:Value | 1..1 |
| eval.scientific-report@1:claimId | nll.core@1:State | nll.core@1:Value | 1..1 |
| eval.scientific-report@1:claimKind | nll.core@1:State | nll.core@1:Value | 1..1 |
| eval.scientific-report@1:claimSection | nll.core@1:State | nll.core@1:Value | 1..1 |
| eval.scientific-report@1:comparisonReason | nll.core@1:Proposition | nll.core@1:Value | 1..1 |
| eval.scientific-report@1:comparisonStatus | nll.core@1:Proposition | nll.core@1:Value | 1..1 |
| eval.scientific-report@1:estimand | nll.core@1:State | nll.core@1:Value | 1..1 |
| eval.scientific-report@1:estimate | nll.core@1:State | nll.core@1:Value | 1..1 |
| eval.scientific-report@1:estimateUnit | nll.core@1:State | nll.core@1:Value | 1..1 |
| eval.scientific-report@1:horizon | nll.core@1:State | nll.core@1:Value | 1..1 |
| eval.scientific-report@1:isReference | nll.core@1:State | nll.core@1:Value | 1..1 |
| eval.scientific-report@1:leftClaim | nll.core@1:Proposition | nll.core@1:Value | 1..1 |
| eval.scientific-report@1:metric | nll.core@1:State | nll.core@1:Value | 1..1 |
| eval.scientific-report@1:normalizedLeft | nll.core@1:Proposition | nll.core@1:Value | 0..1 |
| eval.scientific-report@1:normalizedMetric | nll.core@1:Proposition | nll.core@1:Value | 0..1 |
| eval.scientific-report@1:normalizedRight | nll.core@1:Proposition | nll.core@1:Value | 0..1 |
| eval.scientific-report@1:population | nll.core@1:State | nll.core@1:Value | 1..1 |
| eval.scientific-report@1:precision | nll.core@1:State | nll.core@1:Value | 1..1 |
| eval.scientific-report@1:rightClaim | nll.core@1:Proposition | nll.core@1:Value | 1..1 |
| eval.scientific-report@1:sourceAnchor | nll.core@1:State | nll.core@1:Value | 1..1 |
| nll.core@1:assurance | nll.core@1:Proposition | nll.core@1:Value | 1..1 |
| nll.core@1:during | nll.core@1:Situation | nll.core@1:Value | 0..1 |
| nll.core@1:evidence | nll.core@1:Proposition | nll.core@1:Value | 0..* |
| nll.core@1:findingType | nll.core@1:Proposition | nll.core@1:Value | 1..1 |
| nll.core@1:grounded | nll.core@1:Entity | nll.core@1:Value | 1..1 |
| nll.core@1:message | nll.core@1:Proposition | nll.core@1:Value | 1..1 |
| nll.core@1:named | nll.core@1:Entity | nll.core@1:Value | 1..1 |
| nll.core@1:order | nll.core@1:Entity | nll.core@1:Value | 1..1 |
| nll.core@1:polarity | nll.core@1:Situation | nll.core@1:Value | 1..1 |
| nll.core@1:predicate | nll.core@1:Situation | nll.core@1:Value | 1..1 |
| nll.core@1:severity | nll.core@1:Proposition | nll.core@1:Value | 1..1 |
| nll.core@1:subject | nll.core@1:Situation | nll.core@1:Value | 1..1 |
| nll.core@1:text | nll.core@1:Entity | nll.core@1:Value | 1..1 |

## Circuit inventory

| Circuit | Requires | Provides | Methods | Components |
| --- | --- | --- | --- | --- |
| eval.scientific-report.consistency@1 | none | none | constraint-kernel, egraph-lite, finite-decision-table, query-dataflow | scientific.assess-claims, scientific-assessment-decision |

## Exact materialization demand

Concepts: `eval.scientific-report@1:QuantitativeClaim`, `eval.scientific-report@1:ScientificConsistencyAssessment`, `nll.core@1:Finding`
Roles: none
Capabilities: none
Operations: `circuit:eval.scientific-report.consistency@1`, `decision-table`, `method:constraint-kernel`, `method:egraph-lite`, `method:finite-decision-table`, `method:query-dataflow`, `stage:scientific.assess-claims`
Evidence policies: none
Closed coverage required: none

Materialization profile: **eval.scientific-report.profile@1**

Observed concepts: `eval.scientific-report@1:QuantitativeClaim`
Resolution duties: `cross-section-claim-identity`, `metric-and-unit-normalization`
Grounding duties: `exact-unicode-source-span`
Alternatives to preserve: `estimand-reading`, `metric-reading`, `population-reading`

## SDK methods and executable providers

| Method | Problem shapes | Interpreters | Engine |
| --- | --- | --- | --- |
| cegar-refinement | refinement-demand | ABSTRACT, CONCRETE, SYMBOLIC | refinement-manager |
| constraint-kernel | quantitative-constraint, temporal-constraint | ABSTRACT, CONCOLIC, CONCRETE, PROVE, SYMBOLIC | constraint-kernel |
| egraph-lite | equivalence-normalization | ABSTRACT, CONCRETE, PROVE | egraph-lite |
| finite-decision-table | finite-decision | ABSTRACT, CONCRETE, PROVE, SYMBOLIC | decision-table |
| javascript-macro-node | irregular-procedure | ABSTRACT, CONCRETE, SYMBOLIC | javascript |
| proof-kernel | local-invariant | CONCRETE, PROVE | proof-kernel |
| query-dataflow | finite-pattern-matching | ABSTRACT, CONCRETE, SYMBOLIC | semantic-store-query |
| relation-engine | recursive-relation | ABSTRACT, CONCRETE, SYMBOLIC | relation-engine |
| symbolic-witness | ambiguity-requiring-witness | ABSTRACT, CONCOLIC, CONCRETE, SYMBOLIC | symbolic-interpreter |
| synthesis-engine | repair-synthesis | CONCRETE, SYNTHESIZE | synthesis-engine |

| Method/provider | Engine or primitive | Import |
| --- | --- | --- |
| constraints.sdk@1 | constraints.solve@1 | src/sdk/index.mjs#constraintSolvePrimitive |
| egraph.sdk@1 | egraph.normalize@1 | src/sdk/index.mjs#egraphNormalizePrimitive |
| eval.scientific-report.provider@1 | eval.scientific-report.consistency@1 | agent-local circuit |
| finite-decision.sdk@1 | decision.evaluate@1 | src/sdk/index.mjs#decisionEvaluatePrimitive |
| javascript-stage.sdk@1 | javascript.stage@1 | src/sdk/index.mjs#javascriptStagePrimitive |
| proof.sdk@1 | proof.verify@1 | src/sdk/index.mjs#proofVerifyPrimitive |
| query-dataflow.sdk@1 | semantic.query@1 | src/sdk/index.mjs#semanticQueryPrimitive |
| refinement.sdk@1 | refinement.request@1 | src/sdk/index.mjs#refinementRequestPrimitive |
| relations.sdk@1 | relations.close@1 | src/sdk/index.mjs#relationClosePrimitive |
| symbolic-witness.sdk@1 | symbolic.replay-witness@1 | src/sdk/index.mjs#witnessReplayPrimitive |
| synthesis.sdk@1 | synthesis.search@1 | src/sdk/index.mjs#synthesisSearchPrimitive |

Authorized SDK imports:

- `src/sdk/index.mjs`: `DEFAULT_METHOD_CATALOG`, `DEFAULT_PRIMITIVE_REGISTRY`, `constraintSolvePrimitive`, `decisionEvaluatePrimitive`, `egraphNormalizePrimitive`, `javascriptStagePrimitive`, `logicAndPrimitive`, `logicNotPrimitive`, `logicOrPrimitive`, `proofVerifyPrimitive`, `refinementRequestPrimitive`, `relationClosePrimitive`, `semanticAbsencePrimitive`, `semanticDerivePrimitive`, `semanticEmitPrimitive`, `semanticExistsPrimitive`, `semanticQueryPrimitive`, `synthesisSearchPrimitive`, `witnessReplayPrimitive`

## Validation resources

Tests:
- `generated/tests/scientific-consistency.test.mjs` — sha256:scientific-tests-1

Benchmarks:
- `generated/benchmarks/scientific-consistency.benchmark.mjs` — sha256:scientific-benchmark-1

Commands:

- `node .agents/skills/nll-analyze-task/scripts/check-context.mjs context/agent-context.mjs`
- `node --test generated/tests/scientific-consistency.test.mjs`

