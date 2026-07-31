# Agent context: privacy-retention

Purpose: **ANALYZE**  
Build: **undefined** (undefined)  
Context digest: `877158933a3b28b038cfe1826497941bbab18a63344915d30162a5aa1b30868b`

## Theory identities

- `theory/sources/retention-policy.md` — sha256:34589d56bd4c16dd37f626a3d76f94971fd906e584f189d8d152f27ce65c7876

## Ontology available to generated code

### privacy.retention.eval@1

| Concept | Sort | Required/allowed roles |
| --- | --- | --- |
| nll.core@1:Document | nll.core@1:Entity | nll.core@1:named[1..1] |
| nll.core@1:Finding | nll.core@1:Proposition | nll.core@1:assurance[1..1], nll.core@1:evidence[0..*], nll.core@1:findingType[1..1], nll.core@1:message[1..1], nll.core@1:severity[1..1] |
| nll.core@1:Paragraph | nll.core@1:Entity | nll.core@1:grounded[1..1], nll.core@1:order[1..1], nll.core@1:text[1..1] |
| nll.core@1:Sentence | nll.core@1:Entity | nll.core@1:grounded[1..1], nll.core@1:order[1..1], nll.core@1:text[1..1] |
| nll.core@1:StateAssertion | nll.core@1:State | nll.core@1:during[0..1], nll.core@1:polarity[1..1], nll.core@1:predicate[1..1], nll.core@1:subject[1..1] |
| privacy.retention.eval@1:DataController | nll.core@1:Entity | privacy.retention.eval@1:retentionName[1..1] |
| privacy.retention.eval@1:ExceptionCoverageEvidence | nll.core@1:Event | privacy.retention.eval@1:coverageScope[1..1], privacy.retention.eval@1:coverageState[1..1], privacy.retention.eval@1:sourceAnchor[1..1] |
| privacy.retention.eval@1:ExceptionEvidence | nll.core@1:Event | privacy.retention.eval@1:exceptionRecordId[1..1], privacy.retention.eval@1:exceptionStatus[1..1], privacy.retention.eval@1:exceptionUntil[0..1], privacy.retention.eval@1:legalAuthority[0..1], privacy.retention.eval@1:sourceAnchor[1..1] |
| privacy.retention.eval@1:PersonalDataCategory | nll.core@1:Entity | privacy.retention.eval@1:retentionName[1..1] |
| privacy.retention.eval@1:PolicyScope | nll.core@1:Entity | privacy.retention.eval@1:retentionName[1..1] |
| privacy.retention.eval@1:RetentionDeclaration | nll.core@1:Event | privacy.retention.eval@1:assessmentScope[1..1], privacy.retention.eval@1:dataCategory[1..1], privacy.retention.eval@1:durationYears[1..1], privacy.retention.eval@1:recordId[1..1], privacy.retention.eval@1:retentionActor[1..1], privacy.retention.eval@1:sourceAnchor[1..1] |

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
| privacy.retention.eval@1:assessmentScope | nll.core@1:Event | privacy.retention.eval@1:PolicyScope | 1..1 |
| privacy.retention.eval@1:coverageScope | nll.core@1:Event | privacy.retention.eval@1:PolicyScope | 1..1 |
| privacy.retention.eval@1:coverageState | nll.core@1:Event | nll.core@1:Value | 1..1 |
| privacy.retention.eval@1:dataCategory | nll.core@1:Event | privacy.retention.eval@1:PersonalDataCategory | 1..1 |
| privacy.retention.eval@1:durationYears | nll.core@1:Event | nll.core@1:Value | 1..1 |
| privacy.retention.eval@1:exceptionRecordId | nll.core@1:Event | nll.core@1:Value | 1..1 |
| privacy.retention.eval@1:exceptionStatus | nll.core@1:Event | nll.core@1:Value | 1..1 |
| privacy.retention.eval@1:exceptionUntil | nll.core@1:Event | nll.core@1:Value | 0..1 |
| privacy.retention.eval@1:legalAuthority | nll.core@1:Event | nll.core@1:Value | 0..1 |
| privacy.retention.eval@1:recordId | nll.core@1:Event | nll.core@1:Value | 1..1 |
| privacy.retention.eval@1:retentionActor | nll.core@1:Event | privacy.retention.eval@1:DataController | 1..1 |
| privacy.retention.eval@1:retentionName | nll.core@1:Entity | nll.core@1:Value | 1..1 |
| privacy.retention.eval@1:sourceAnchor | nll.core@1:Event | nll.core@1:Value | 1..1 |

## Circuit inventory

| Circuit | Requires | Provides | Methods | Components |
| --- | --- | --- | --- | --- |
| privacy.retention.root@1 | none | none | constraint-kernel, finite-decision-table, query-dataflow | privacy-retention.assess-records |

## Exact materialization demand

Concepts: `nll.core@1:Finding`, `privacy.retention.eval@1:ExceptionCoverageEvidence`, `privacy.retention.eval@1:ExceptionEvidence`, `privacy.retention.eval@1:RetentionDeclaration`
Roles: none
Capabilities: none
Operations: `circuit:privacy.retention.root@1`, `method:constraint-kernel`, `method:finite-decision-table`, `method:query-dataflow`, `stage:privacy-retention.assess-records`
Evidence policies: none
Closed coverage required: none

Materialization profile: **privacy.retention.evaluation.profile@1**

Observed concepts: `privacy.retention.eval@1:ExceptionCoverageEvidence`, `privacy.retention.eval@1:ExceptionEvidence`, `privacy.retention.eval@1:RetentionDeclaration`
Resolution duties: `explicit-record-and-scope-identity`
Grounding duties: `exact-source-span`
Alternatives to preserve: `incompatible-explicit-declarations`

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
| privacy.retention.assessment.provider@2 | privacy.retention.root@1 | agent-local circuit |
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
- `tests/privacy-retention.test.mjs` — sha256:912c70f735cf94ba983fd6fc239e0c243bf124e565d3e3a6aad52b5728745933

Benchmarks:
- `benchmarks/privacy-retention` — sha256:afdc32e9e6ac0277f9ed59f44d4e350056b41093484433c2d73558b556bae5c5

Commands:

- `node tools/nll.mjs source outline task/input.md`
- `node .agents/skills/nll-analyze-task/scripts/check-context.mjs context/agent-context.mjs`
- `node src/coding-agent/validate-generated.mjs generated/program.mjs`

