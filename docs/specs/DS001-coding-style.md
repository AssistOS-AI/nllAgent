---
id: DS001
title: Coding Style and Repository Structure
status: implemented
owner: nllAgent maintainers
summary: Defines JavaScript-only modules, opaque semantic boundaries, environment layout, source limits, tests, and documentation discipline.
---

# Introduction

This specification is the coding and repository authority for runtime code, generated DSL modules, tests, examples,
repository-owned nll skills, specifications, and documentation.

# Core Content

## Runtime and module form

The supported runtime is Node.js 22 or newer. Executable code and durable structured artifacts are ESM `.mjs` modules.
Human source, theory, handoff, diagnostics, and reports use Markdown. There is no TypeScript, transpilation, package
metadata requirement, semantic JSON, or JSON snapshot. Modules must have no ambient I/O, process, network, clock, or
global-registry mutation at import time. Constructing and exporting frozen DSL values is allowed.

Ontology and DSL boundaries use opaque classes, private state, `Map`, `Set`, typed constructors, and frozen published
collections. Plain objects and arrays may be used locally inside JavaScript algorithms, but they cannot be committed to
SemanticStore or persisted as the meaning of a DSL. Cross-boundary validation throws `NllError` with stable English
codes and messages.

## Module ownership

The source tree separates language, execution, and product orchestration:

- `src/ontology`, `src/longtext`, `src/store`, and `src/circuit` own the common term language and concrete semantics;
- `src/sdk` and `src/primitives` expose reusable authoring operations and executable multi-semantic descriptors;
- `src/engines` and `src/interpreters` own bounded algorithms and assurance modes;
- `src/runtime`, `src/planner`, and `src/context` own execution graphs, capability selection, transactions, context
  compilation, and trace;
- `src/training`, `src/coding-agent`, `src/storage`, and `src/cli` own Codex orchestration, isolation, environments,
  builds, tasks, and commands;
- `src/artifacts`, `src/report`, `src/generation`, and `src/benchmark` own persistence, human presentation, CNL, and
  executable expectations.

A persistent environment has `agents/<agent-id>` and `tasks/<task-id>` roots. Each agent keeps immutable builds and one
atomic current pointer expressed as ESM. Each task pins one build and owns its source, context, generated LongTextJS,
result, trace, and report. Task files never live inside the selected agent build.

Generated training code owns its agent candidate only. Generated analysis code owns its task-local `generated/`
directory only. Imported GAMP or third-party skills are not edited as part of nllAgent behavior changes; only
repository-owned `nll-*` skills are in this contract.

## Code structure and style

Public semantic classes expose read-only getters and behavior, not mutable representation. Constructors validate all
invariants before publication. Builder APIs may be mutable until `seal()` and must reject reuse afterward. Semantic
identity is stable and independent of JavaScript variable names. Functions remain small enough to review and prefer
early invariant checks over implicit coercion.

Source modules should remain below 400 lines and must be decomposed above 500 lines unless the file is a generated
reference table whose cohesion is demonstrable. Generated business examples must remain readable; repeated semantic
construction should use local helpers, not object-shaped configuration payloads.

Asynchronous process invocation uses argument arrays with `shell: false`. User paths are resolved beneath explicit
roots. Writes use atomic sibling-write-and-rename. Recursive deletion, unresolved glob targets, symlink traversal, and
ambient environment dependence are prohibited in production paths. Error exits distinguish invalid request,
validation failure, semantic blocker, and execution failure.

## Testing

Tests use `node:test` and mirror the component boundary. Unit tests cover constructor invariants, algebra, stores,
engines, and scheduler behavior. Integration tests cover CLI, environment isolation, Codex workspace capsules,
training promotion, task build pinning, generated-module rejection, end-to-end circuit execution, and durable
artifacts. Business evaluations contain multi-page theory and task documents, independent expectations, trace checks,
semantic mutations, and timings.

Tests must inspect semantic evidence, status, context, and trace—not only exit code or count. A benchmark oracle cannot
be modified merely to make a candidate pass. Every fixed defect receives a focused regression test at its authority
boundary.

## Documentation

All persistent documentation, specifications, comments, diagnostics, and skill references are English. DS files are
the normative contract. HTML pages explain the system through concrete business scenarios, real generated code, and
actual outputs while clearly labeling partial implementation. `docs/FS.md` is the functional specification and maps
user-visible functions to tests. Path inventories are reference material, not substitutes for explanation.

DS numbering is contiguous. Every ordinary DS has substantive Core Content and consecutively numbered Decisions &
Questions. Settled decisions use `Response:`; unresolved alternatives use `Options:` and remain unimplemented.

# Decisions & Questions

### Question #1: Why `.mjs` without package metadata?

Response: `.mjs` gives Node an unambiguous ESM contract without introducing a metadata format or build step. The
repository and generated workspaces can be validated with the standard runtime alone.

### Question #2: Are object literals forbidden?

Response: No. They are normal local JavaScript values. The restriction is at semantic and persistence boundaries:
published values must be recognized opaque DSL values, terms, transactions, or registered artifacts.

### Question #3: May a source module exceed 500 lines?

Response: Only when splitting would destroy a cohesive generated reference and review documents the exception.
Runtime logic, skills, tests, and ordinary DSL programs must be decomposed.

### Question #4: How are third-party skill metadata files treated?

Response: They are imported tooling outside the semantic repository contract and are left untouched. nllAgent itself
does not create or consume JSON as ontology, DSL, plan, benchmark, task, result, or trace authority.

### Question #5: Why require business examples in HTML?

Response: The architecture is easy to overstate through diagrams and API names. A real authority clause, generated
ontology/circuit/LongText excerpt, finding, and evidence trace demonstrate the category boundaries and current
capabilities more honestly.
