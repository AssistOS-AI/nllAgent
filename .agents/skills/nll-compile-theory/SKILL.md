---
name: nll-compile-theory
description: Compile approved NaturalLanguageLinterAgent scope and Markdown authority into rule cards, versioned LongTextJS observation contracts, restricted CircuitJS MJS modules, witnesses, and candidate release artifacts. Use only in controlled learning runs, never to alter production releases directly.
---

# Compile Natural Linter Theory

Build a reviewable theory from source anchors through verified findings. Author circuits as the restricted `export default circuit({...})` DSL; do not import modules or use filesystem, network, process, asynchronous, prototype, or code-generation capabilities.

## Required reading

Read the learning job's scope contract and authority map. Read `docs/specs/DS005-longtextjs.md`, `DS008-circuitjs.md`, `DS009-runtime-operators.md`, `DS010-compatibility-coverage.md`, `DS011-findings-verification-reporting.md`, `DS013-learning-coding-agent-skills.md`, `DS020-query-first-circuit-authoring.md`, and `DS021-foundation-ontology-validation.md`. Check DS020's status and the candidate toolchain before using any query-first syntax.

## Workflow

1. Create one rule card per independently applicable rule. Include source references, scope, trigger, premises, outcome, exceptions, priority, absence policy, guarantee ceiling, and examples.
2. Design a minimal pragmatic vocabulary. Reuse LongTextJS's upper-ontology structures for evidence, mentions,
   scoped identity hypotheses, worlds, time, status, provenance, alternatives, coverage, and gaps. Add versioned domain
   schemas for events, relations, actions, emotions, obligations, or measurements only when an output-reachable rule
   requires them. Distinguish an anchored name from an entity identity, an exact lexical marker from its discourse or
   emotional interpretation, and source observations from concepts whose value can change when the rulebook changes.
3. Define observation contracts with exact nominal type versions, fields, epistemic statuses, scope, cardinality, producers, and coverage requirements.
4. Reuse DS021 observation types only with their exact controlled-English and open-world meanings. Never duplicate a
   foundation circuit identifier, reinterpret a foundation warning as domain compliance, or assume those types exist
   when the selected foundation is `off`.
5. Write `circuit-form-decision.md` for each rule family. Choose the smallest correct supported form in this order: reuse one exact registered operator as `call -> verify -> emit`; use a supported named query and decision table for repeated local alternatives; use a registered aggregate or ordered-pattern operator; use a direct graph for recursion, truth maintenance, state, search, solver, or argumentation behavior. Explain why a simpler prior form is insufficient.
6. If the host compiler and publication report do not advertise `circuitjs-query-first@1`, treat DS020 examples as design guidance only and emit ordinary CircuitJS. Never place an unsupported dialect label or unvalidated query/table object in a publishable candidate.
7. Synthesize `.circuit.mjs` using either direct `circuit`, `observationBinding`, `binding`, and `node` or the supported
   `queryFirstCircuit` plain-data form, plus registered primitives, operators, and verifiers. In a direct graph,
   `observationBinding({... where: [...]})` may express only a conjunction of safe local field comparisons; use a
   named query for joins, grouping, ordered patterns, coverage-aware absence, or reusable relational logic. `port()`
   remains a compatibility alias for `binding()` and is not a query engine. Put literal rules in node inputs or
   versioned rule packages. Do not add graph nodes that merely rename or pass through values without a contract reason.
8. Design the witness before `emit`. Every emitted path must be dominated by `verify`; subjective judgments must retain their non-mechanical guarantee ceiling.
9. Derive observation demand backward from each emit. When query-first is supported, also inspect the generated QueryContract and ensure its types, statuses, fields, scopes, order, coverage, and producer demand are neutral and exact.
10. Run static compilation and public cases. When an operator, verifier, typed registry contract, identity producer,
    knowledge pack, or query compiler capability is missing, create a proposal and blocking issue; never hide behavior
    in inline code or bypass verification. An operator proposal must contain its permitted primitive, structured input
    and output schemas, determinism, effects, capabilities, cost and limits, failure codes, ordering, coverage, witness,
    independent verifier, natural cases, and semantic mutants. Learning may reference an installed digest-locked
    runtime extension from the trusted catalog, but it may only propose new executable extension code; it cannot
    install or publish that host code.
11. Assemble a complete candidate under `candidates/<semantic-version>/` with `release.json`, circuits, compatibility profile, authority mappings, schemas, extraction profiles, explanation policy, and the form-selection record.
12. Write `capability-gap-report.json`. Mark every applicable serious issue from scope as `resolved`, `mitigated`, or
    `blocked`, link the reproducer and evidence, and state the remaining guarantee ceiling. A limitation is not resolved
    merely because the candidate stopped exercising it. Add `capabilityGapReport: 'capability-gap-report.json'` to the
    candidate manifest. Omit both the report and manifest field when scope found no applicable serious issue.

## Canonical constraints

Use exact versions and repository-relative paths. Circuits require `kind`, `id`, `version`, `inputs`, `nodes`, `outputs`, budgets, and source-rule references. Input bindings declare type, local matchers, and critical coverage. Learned artifacts may reference registered implementations but may not modify runtime code.

## Completion check

The candidate must pass the restricted module loader, link only registered capabilities, map every finding to authority, expose every critical observation demand, use the simplest justified supported form, and return an explicit limitation when a required capability or budget is unavailable.
