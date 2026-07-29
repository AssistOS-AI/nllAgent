---
id: DS015
title: Runtime Boundaries and Change Control
status: accepted
owner: nllAgent maintainers
summary: Defines the practical data/code boundary, restricted MJS execution, model-call isolation, budgets, feedback authority, release change control, and recovery behavior.
---

# Introduction

nllAgent reads arbitrary document text, asks language models to translate some passages, and lets a Coding Agent propose theory changes. This specification defines the small set of practical boundaries needed to keep those operations coherent and reproducible. It does not add package signing, confidentiality infrastructure, or organizational ceremony to the local research system.

# Core Content

## Source and instruction boundary

Production Markdown is document content even when it contains imperative language, code, quoted prompts, or agent instructions. Model requests place it in a labelled source section and require a schema-bound response. The runtime rechecks exact quotes and never converts source instructions into changes to prompts, skills, operator registries, authority ordering, or the active release. External links remain text unless an explicit adapter is added.

## Restricted MJS and registered operations

CircuitJS may be authored as JSON or restricted `.circuit.mjs`. The MJS loader accepts one direct DSL constructor expression, exposes only `circuit`, `port`, and `node`, and rejects wrappers, functions, classes, control flow, module imports, async execution, templates, runtime globals, external calls, code generation, and prototype mechanisms. Lossless conversion rejects accessors, cycles, unsupported scalars, and non-finite numbers before static analysis.

Every computational node resolves a registered operator, every verification node resolves a registered verifier, and emitted findings must be dominated by verified data. Operator records declare determinism and effects. Model and external-process behavior is reached only through an explicit adapter, not through inline circuit code.

Trusted runtime extensions are explicitly outside the restricted author sandbox. Only a host application may load one
regular non-symlink ESM entry through the library API; source documents, circuits, candidates, learning agents, and the
ordinary CLI cannot choose it. The current loader requires one self-contained file without imports or re-exports,
records its source digest, validates complete registry metadata, and wraps execution with frozen plain-data copies and
plain-data output validation. The extension still runs in the host process and can exercise host authority through
JavaScript globals. It must therefore be reviewed as application code, and its declared effects and digest improve
auditability and reproducibility rather than create a sandbox.

Declarative query and decision-table values are subject to the same capability boundary. They contain no callbacks, code strings, dynamic paths, arbitrary regular expressions, imports, recursion, asynchronous behavior, mutation, prototypes, clock, random, process, filesystem, or network access. The implemented subset bounds scanned and intermediate rows and inherits graph node and wall-time budgets. AST-depth, literal-byte, memory, and trace-specific limits remain required before stable promotion. A query cannot write observations, statuses, coverage, gaps, provenance, releases, or indexes presented as evidence.

Compiler optimization is also a trusted change surface. Query dialect, canonicalization, coverage matching, registered-function semantics, and dependency propagation are versioned. The benchmark path compares reference evaluation and lowered graph execution and rejects drift. Native optimization and automatic fallback are not implemented and cannot be claimed.

## Model and Coding Agent boundaries

Achilles calls go only through `LLMAgent.executePrompt()`. Translation-class roles prefer configured Spark models. When Achilles is not configured, the Coding Agent translation adapter runs in a call folder under the current run with only `nll-translate-longtext`; it produces proposed observations or semantic evaluation JSON, not code changes.

The learning Coding Agent runs from a disposable per-run staging copy and sees symbolic links to only the five learning skills. Authority, feedback, specifications, release context, and trusted registries are copied for reading, while only staged authoring, benchmark, proposal, candidate, and current learning-run files are promotable. Deletions and protected changes fail the audit without touching the real agent. Publication is a later explicit maintainer command outside learning.

## Budgets and stored diagnostics

Model providers and Coding Agent adapters use their normal runtime configuration. nllAgent stores the selected backend, adapter and model identities, request and response digests, result, timing, events, and diagnostics needed to explain a run; it does not copy provider credentials into artifacts. Calls, circuit nodes, wall time, fixpoint iterations, and search states are bounded. Budget exhaustion is recorded as `stopped-budget` instead of being treated as compliance or absence.

## Local release consistency

Release manifests name exact schemas, circuits, operators, verifiers, profiles, adapters, runtime versions, and authority sources. Manual publication records ordinary content digests so loading can detect accidental changes or partially updated packages before the active pointer changes. A changed operator or model profile triggers the affected tests. This is local consistency checking; the project does not require a separate signing infrastructure.

The selected foundation pack is an immutable platform input recorded beside the release. Source text, a model, an agent candidate, or repeated feedback cannot change its ontology or circuits during a run. Contingent world knowledge must not be hidden in foundation code: a future knowledge pack must identify sources, digest, effective interval, jurisdiction, world, update and expiry policy, guarantee ceiling, and tests so stale or fictional-world mismatches are visible.

## Feedback authority

Feedback records its run, type, message, optional finding, and reviewer context. Repetition alone does not turn a comment or a production document into a rule. Learning must distinguish extractor corrections, theory corrections, ontology extensions, report corrections, and operational-context fixes, then encode the proposed behavior as a benchmark case and candidate change.

## Recovery

If a release is found faulty, the active pointer can move back to a previously published release. Old releases and runs are retained so their behavior remains explainable. The semantic diff and impact map identify affected rules and reports. The failure becomes an issue and, when useful, a minimal regression case.

Findings state their actual guarantee: exact mechanical check, evidence replay over proposed observations, model judgment, human confirmation, or review required. The project does not need a global autonomy label to express this distinction.

# Decisions & Questions

### Question #1: What does the agent-local workspace accomplish?

Response: It gives the Coding Agent a small, relevant disposable tree, local persistent guidance, and only the intended learning skills. The changed-path audit becomes a whitelist-based promotion step into the named agent. Its purpose is capability containment, clean behavior, and reproducibility, not confidentiality.

### Question #2: May learned operator code enter the runtime registry automatically?

Response: No. Learning may create a proposal and tests. The platform implementation must add and register the operator, with a replay verifier and focused tests, before a circuit can link to it.

### Question #3: Can an override force an incompatible run to continue?

Response: A policy may allow a distinct exploratory run with reduced guarantee and explicit override provenance. It cannot relabel the original release as compatible or become an automatic precedent.

### Question #4: How is prompt injection handled during CNL planning and optional realization?

Response: The idea is untrusted LongTextJS input and cannot modify planning circuits or authority. CNL is emitted only through the published planning graph and trusted verifier. If realization is requested, the plan and previous candidate are untrusted call content; the Coding Agent links only `nll-realize-cnl`, cannot edit release artifacts, and returns schema-bound text. The realized text is re-ingested as untrusted data and cannot instruct its own validation circuits.

### Question #5: Is a non-Turing-complete query AST automatically safe?

Response: No. Finite declarative inputs can still amplify joins, groups, traces, literals, or pattern states, and a faulty optimizer can drop evidence or coverage. Safety requires structural validation, explicit budgets, exact registries, dependency preservation, differential tests, and fallback—not only the absence of loops.

### Question #6: Why not hardcode current political, economic, or geographic facts as common sense?

Response: They change, depend on time and jurisdiction, and may be disputed or fictionalized. Treating them as timeless executable axioms would create stale hidden authority. They require an optional sourced and dated knowledge-pack contract.

### Question #7: Why allow trusted extension code at all?

Response: Difficult rules need real algorithms, and forcing them into tables or generic data transforms would make the
system less reviewable. The safe boundary is not “no JavaScript exists”; it is “untrusted documents and declarative
circuits cannot supply JavaScript.” A maintainer-owned host may install reviewed code under an exact contract and digest,
while the graph, witness, verifier, budgets, and publication checks remain visible.

# Conclusion

The project uses concrete boundaries where they help: source/instruction separation, restricted MJS, registered operations, exact-quote validation, agent-local skills, changed-path audit, budgets, replay verification, local release consistency, and explicit manual publication. These mechanisms support ambitious semantic experiments without hiding uncertainty or adding unrelated infrastructure.
