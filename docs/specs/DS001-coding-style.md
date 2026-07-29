---
id: DS001
title: Coding Style and Repository Structure
status: accepted
owner: nllAgent maintainers
summary: Defines ESM module rules, source layout, error handling, dependency policy, and modular testing requirements.
---

# Introduction

This specification is the coding-style authority for the repository. It governs production code, tools, tests, scripts, examples, and code embedded in local nllAgent skills.

# Core Content

## Runtime and module format

Production code must target Node.js 22 or newer and use ESM `.mjs` modules. Modules must have no operational side effects at import time. Import-time work is limited to constant construction and function or class definitions. File I/O, process spawning, model initialization, registry mutation, and environment validation must occur through explicit functions.

Generated or learned CircuitJS and LongTextJS artifacts must normalize to JSON-compatible plain data. Canonical persisted LongTextJS uses JSON. Circuit authors may use restricted `.circuit.mjs` containing exactly one direct `export default circuit({...})` or `export default queryFirstCircuit({...})` expression and only the injected constructors accepted for that form. The dedicated loader masks strings and comments for capability analysis; rejects imports, indirection, functions, classes, control flow, asynchronous execution, templates, filesystem/network/process globals, dynamic code generation, prototype mechanisms, and non-plain results; then evaluates the expression in a short-lived `node:vm` context with string and WebAssembly code generation disabled. Conversion to plain data is lossless and rejects accessors, cycles, unsupported scalar types, non-finite numbers, and symbol keys rather than dropping them through JSON serialization. No other subsystem may evaluate generated source. Production must not dynamically import agent circuit modules or resolve implicit `latest` dependencies.

Declarative query, expression, decision-table, pattern, and aggregate values introduced by a supported CircuitJS profile follow the same rule. They are finite plain-data ASTs, not callbacks or embedded source. A proposed profile must not expand the injected MJS capability set until its normalized schema, canonicalization, static checks, and publication path are implemented. Builder convenience is subordinate to one inspectable normalized value.

A trusted runtime extension is a different code class. A host application may explicitly load one regular, non-symlink,
self-contained `.mjs` file through `loadRuntimeExtension()` and install it into registries before circuit compilation. The
module may contain real JavaScript functions because it is reviewed host code, not an agent-authored circuit or source
artifact. The loader rejects module imports and re-exports so the recorded entry digest identifies the complete extension
source. Installation requires explicit operator or verifier schemas, determinism, effects, cost, limits, failures, checked
properties, and execution functions. The wrapper passes frozen plain-data copies and rejects non-plain output. The module
runs with host authority and therefore must have no import-time side effects; it is not a sandbox for untrusted code.

## Layout

Reusable implementation belongs in `src/`, grouped by bounded responsibility: core utilities, LongTextJS compilation, the versioned platform foundation, CircuitJS compilation and execution, storage, releases, reporting, benchmark and publication checks, learning orchestration, model integration, security, and CLI parsing. Foundation ontology, circuits, and replay semantics belong in `src/foundation/`; they must not be duplicated into agent releases. Thin entrypoints belong in `bin/` or `src/cli/`. Tests mirror those boundaries under `tests/unit/` and `tests/integration/`.

Persistent mutable artifacts belong under `data/` and must not be imported by library modules. Agent-specific learned skills belong in `.agents/skills/<skill-name>/` and must be self-contained. Imported skill code must not be copied into `src/`.

## Documentation structure

Documentation must use the reader-facing layer appropriate to its purpose. DS files define stable contracts and resolved rationale. Tutorials teach one complete task through source text, author DSL, commands, and observable results. Concept pages explain boundaries and consequences. Reference pages enumerate schemas, primitives, options, or artifacts for lookup. Intermediate JSON and generated plans belong in a tutorial only when inspection of that layer is the lesson.

Each document states the question it answers and its non-scope, introduces motivation before mechanism, and links to one authoritative deeper explanation instead of repeating it. Lists are reserved for genuine choices or independent items; tables are reserved for repeated exact mappings. Documentation must not imply that proposed behavior, benchmark fixtures, model output, or derived indexes are implemented guarantees.

## Functions and data

Functions should be small, total where practical, and explicit about I/O. Pure transformations must not receive filesystem handles or mutable process state. Records crossing module boundaries must be plain objects and arrays. Public functions must validate external input and return typed result objects or throw an `NllError` with a stable `code`, `message`, and optional structured `details`.

Identifiers and persistent field names must use English. File names must use lowercase kebab-case or established compound names. Class names use PascalCase; functions and variables use camelCase; constants use uppercase snake case only for actual immutable constants.

## File and line limits

Source modules should remain below 400 lines. A module above 500 lines requires decomposition unless it is generated or a declarative registry whose cohesion is demonstrable. Lines should remain below 120 characters where practical. Exceptions are immutable hashes, URLs, generated schemas, and test fixtures where wrapping reduces fidelity. `fileSizesCheck.sh` is the repository check for these limits.

## Dependencies

The core runtime must prefer Node.js standard-library modules and must not introduce external runtime dependencies without explicit approval. AchillesAgentLib is authorized as an optional peer runtime for all LLM interactions. Dependency resolution must support a manual override, `ACHILLES_AGENT_LIB_PATH`, an installed package, and documented local-development layouts. Failure to resolve AchillesAgentLib must affect only model-assisted operations; deterministic agents must continue to work.

When AchillesAgentLib is selected, every model call must use its `LLMAgent.executePrompt()` contract. Callers pass task metadata tags and semantic roles rather than make provider-specific calls from circuits. Translation-class roles prefer configured Spark models and fall back to the configured fast alias. Runtime configuration must allow explicit programmatic overrides to take precedence over environment defaults.

The Coding Agent boundary has two explicit uses: an isolated learning orchestrator invoked by `nllagent learn`, and a production translation adapter used by DS018 when Achilles is unavailable, unconfigured, or explicitly bypassed. The production route must expose only `nll-translate-longtext`, run inside the current run directory, return the same schema-bound response as Achilles, and never edit the theory. Vendor-specific executable arguments belong inside an adapter; callers and release artifacts depend only on the generic request, workspace, result, and capture contracts.

## Security and process execution

Shell commands must be spawned with argument arrays and `shell: false`. User-provided agent names and paths must be validated before resolution. Code must reject traversal outside configured roots. Secrets, raw authorization artifacts, and complete model credentials must never be written into runs, traces, issues, reports, or benchmark fixtures.

Atomic persistent writes must use a temporary sibling file followed by rename. Immutable artifacts must be verified by digest before reuse. Lock acquisition must be bounded and must fail with a typed diagnostic rather than wait indefinitely.

## Testing

Every module with nontrivial branching must have focused unit tests. Every CLI command must have an integration test. Runtime tests must use deterministic fixture circuits and stub model gateways. Tests must cover success, fail-closed compatibility, incomplete coverage, verifier rejection, invalid agent paths, immutable release protection, benchmark mismatch, and issue creation.

Tests must not call external LLMs or Coding Agents by default. Learning command tests must inject a fake agent adapter or process runner. Model-assisted extractors must accept an injected `LLMAgent`-compatible test double. Security tests must cover executable wrappers around circuit definitions, function-valued nested data, forged witnesses, replay identity, cache isolation, and attempts to modify protected learning context. Temporary test roots must be created below the operating system temporary directory and cleaned only when their exact validated path is known.

# Decisions & Questions

### Question #1: Why use `.mjs` instead of TypeScript?

Response: The base text explicitly recommends Node.js ESM `.mjs`, and the requested deliverable is an MJS library. Runtime validation preserves contracts without requiring a build step. Type declarations may be added later as generated or hand-maintained companion artifacts.

### Question #2: Why is AchillesAgentLib optional rather than bundled?

Response: The local Achilles guidance forbids assuming installation and forbids adding dependencies without explicit approval. Deterministic runtime behavior should remain functional without a model provider. Model-assisted behavior fails with a precise configuration issue.

### Question #3: How are routing-sensitive model calls tagged?

Response: Runtime configuration defines `extraction`, `judgment`, `evaluation`, `explanation`, `documentation`, `specification`, `orchestration`, and `testing` tags. Agent packages select a semantic task role; the model gateway maps it to configured tags and tiers.

### Question #4: Why is `node:vm` acceptable for CircuitJS authoring?

Response: The project needs a practical MJS DSL rather than a hand-written parser for every expression. The loader does not execute an imported module: it accepts one expression, exposes only three data constructors, blocks capability-bearing syntax, imposes a short timeout, and immediately converts the result to plain JSON data. Static circuit analysis and registry linking still occur afterward.

### Question #5: Why reject values that JSON serialization could silently omit?

Response: Silent omission would let the reviewed author form differ from the canonical circuit that is published. Rejecting functions, accessors, unsupported scalars, cycles, and non-finite numbers makes normalization lossless and keeps the stored graph identical to the author's declarative value.

### Question #6: Should a new declarative profile add JavaScript callbacks for concise queries?

Response: No. Concision does not justify hiding field dependencies, type assumptions, effects, cost, or coverage obligations inside executable closures. Query and decision syntax must normalize to plain data that the compiler can inspect before runtime.

### Question #7: How can a programmer add an algorithm if circuit modules cannot contain functions?

Response: The programmer implements an exact operator and, where publication depends on it, a replay verifier in a
trusted runtime-extension module. The host loads and registers that module explicitly. A CircuitJS node then names the
versioned registry entry and passes plain data to it. This keeps algorithm code testable as ordinary JavaScript without
giving an untrusted document, learned circuit, or query callback code authority.

# Conclusion

The codebase must remain a deterministic, inspectable ESM system whose generated artifacts are data, whose model access is mediated, and whose tests can exercise every production contract without network access.
