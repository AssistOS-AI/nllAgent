---
name: nll-author-circuits
description: Compile natural-language rules into CircuitJS rules, decision tables, JavaScript stages, subcircuits, contracts, tests, and traces.
---

# Author CircuitJS

## Goal

Create an executable rule family over the active ontology and calibration stores while preserving evidence, four-valued
logic, scope, capability requirements, and procedural expressiveness.

## Required inputs

- Authority Markdown and exact spans.
- Active ontology and LongText calibration programs.
- Expected semantic outputs, evidence policy, exceptions, priority, and existing traces.

## Required outputs

- `.rule.mjs`, `.stage.mjs`, `.operator.mjs`, and `.circuit.mjs` modules as required.
- Capability contracts, independent verifiers for strong assurance claims, tests, and benchmark cases.
- A short README describing premises, exceptions, status mapping, and evidence policy.

## Workflow

1. Write the premise query and expected bindings for each rule.
2. Choose a declarative rule for inspectable matching, a decision table for finite policies, or a normal JavaScript
   stage for graph, iterative, asynchronous, or global algorithms.
3. Require closed coverage for every final absence test.
4. Emit ontology terms with evidence and assurance through `ExecutionContext`; never access physical store indexes.
5. Compose stages by typed capabilities and explicit scheduling dependencies.
6. Run checks, inspect output-to-source traces, and repair the ontology or LongText layer when the fault originates
   there.

## Completion gate

Every applicable authority rule has an executable path; unknown, conflict, exception, and blocked states remain
distinct; failed stages commit no partial terms; every output reaches source evidence through trace; and tests pass.

