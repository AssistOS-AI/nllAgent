# Agent context: privacy-retention

Purpose: **TRAIN**  
Build: **undefined** (undefined)  
Context digest: `28d49bdb38f62c4dc2f60191bc34bce313e709e8ff6bdfd4590939dd4c14ca8c`

## Theory identities

- `theory-input/retention-rules.md` — sha256:f671decfced459ccc551e2416f533fba7320619972f13b45f4287fb17f5e86e1

## Ontology available to generated code

### nll.core@1

| Concept | Sort | Required/allowed roles |
| --- | --- | --- |
| nll.core@1:Document | nll.core@1:Entity | nll.core@1:named[1..1] |
| nll.core@1:Finding | nll.core@1:Proposition | nll.core@1:assurance[1..1], nll.core@1:evidence[0..*], nll.core@1:findingType[1..1], nll.core@1:message[1..1], nll.core@1:severity[1..1] |
| nll.core@1:Paragraph | nll.core@1:Entity | nll.core@1:grounded[1..1], nll.core@1:order[1..1], nll.core@1:text[1..1] |
| nll.core@1:Sentence | nll.core@1:Entity | nll.core@1:grounded[1..1], nll.core@1:order[1..1], nll.core@1:text[1..1] |
| nll.core@1:StateAssertion | nll.core@1:State | nll.core@1:during[0..1], nll.core@1:polarity[1..1], nll.core@1:predicate[1..1], nll.core@1:subject[1..1] |

| Role | Source | Target | Cardinality |
| --- | --- | --- | --- |
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

## Exact materialization demand

Concepts: none
Roles: none
Capabilities: none
Operations: none
Evidence policies: none
Closed coverage required: none

Materialization profile: **nll.bootstrap.profile@1**

Observed concepts: `nll.core@1:Document`
Resolution duties: none
Grounding duties: `source-span`
Alternatives to preserve: none

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
- `generated/tests-required` — required-by-training-contract

Benchmarks:
- `generated/benchmarks-required` — required-by-training-contract

Commands:

- `node tools/nll.mjs ontology check generated/ontologies/index.mjs`
- `node --test generated/tests/*.test.mjs`
- `node tools/nll.mjs benchmark run generated/agent.mjs`

