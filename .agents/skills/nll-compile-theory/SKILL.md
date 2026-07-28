---
name: nll-compile-theory
description: Compile approved NaturalLanguageLinterAgent scope and Markdown authority into rule cards, versioned LongTextJS observation contracts, restricted CircuitJS MJS modules, witnesses, and candidate release artifacts. Use only in controlled learning runs, never to alter production releases directly.
---

# Compile Natural Linter Theory

Build a reviewable theory from source anchors through verified findings. Author circuits as the restricted `export default circuit({...})` DSL; do not import modules or use filesystem, network, process, asynchronous, prototype, or code-generation capabilities.

## Required reading

Read the learning job's scope contract and authority map. Read `docs/specs/DS005-longtextjs.md`, `DS008-circuitjs.md`, `DS009-runtime-operators.md`, `DS010-compatibility-coverage.md`, `DS011-findings-verification-reporting.md`, and `DS013-learning-coding-agent-skills.md`.

## Workflow

1. Create one rule card per independently applicable rule. Include source references, scope, trigger, premises, outcome, exceptions, priority, absence policy, guarantee ceiling, and examples.
2. Design a minimal pragmatic vocabulary. Distinguish source observations from concepts whose value can change when the rulebook changes.
3. Define observation contracts with exact nominal type versions, fields, epistemic statuses, scope, cardinality, producers, and coverage requirements.
4. Select a supported reasoning pattern: relational, derivation/fixpoint, state maintenance, temporal, search, argumentation, or rubric judgment.
5. Synthesize `.circuit.mjs` using only `circuit`, `port`, and `node`, plus registered primitives, operators, and verifiers. Put literal rules in node inputs or versioned rule packages.
6. Design the witness before `emit`. Every emitted path must be dominated by `verify`; subjective judgments must retain their non-mechanical guarantee ceiling.
7. Derive observation demand backward from each emit and compare it with the designed producer contract.
8. Run static compilation and public cases. When an operator or verifier is missing, create a proposal and blocking issue; never hide behavior in inline code or bypass verification.
9. Assemble a complete candidate under `candidates/<semantic-version>/` with `release.json`, circuits, compatibility profile, authority mappings, schemas, extraction profiles, and explanation policy.

## Canonical constraints

Use exact versions and repository-relative paths. Circuits require `kind`, `id`, `version`, `inputs`, `nodes`, `outputs`, budgets, and source-rule references. Input ports declare type and critical coverage. Learned artifacts may reference registered implementations but may not modify runtime code.

## Completion check

The candidate must pass the restricted module loader, link only registered capabilities, map every finding to authority, expose every critical observation demand, and return an explicit limitation when a required capability or budget is unavailable.
