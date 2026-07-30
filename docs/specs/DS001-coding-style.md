---
id: DS001
title: Coding Style and Repository Structure
status: implemented
owner: nllAgent maintainers
summary: Defines the JavaScript-only repository, opaque semantic values, module layout, security style, and test organization.
---

# Introduction

This is the coding-style authority for production code, tests, examples, generated modules, and repository-owned skills.

# Core Content

## Runtime and modules

The runtime targets Node.js 22 or newer. Executable code and structured artifacts use ESM `.mjs`. There is no build
step and no TypeScript. Markdown is used for human material. Modules have no I/O, process, network, or registry mutation
at import time; constructing and exporting immutable DSL programs is allowed.

Ontology and DSL boundaries use opaque classes, private state, `Map`, `Set`, typed constructors, and frozen values.
Plain objects and arrays may be local algorithm values but are not semantic artifacts and cannot be committed directly
to `SemanticStore`. Cross-boundary validation must throw `NllError` with a stable English code and message.

## Layout and size

`src/ontology`, `src/longtext`, `src/store`, `src/circuit`, `src/planner`, and `src/runtime` own the semantic pipeline.
`src/generation`, `src/benchmark`, `src/learning`, `src/artifacts`, `src/report`, `src/storage`, and `src/cli` own their
named boundaries. Core ontologies live under `ontologies/`; executable agents live under `data/<agent>/`.

Source modules should remain below 400 lines and require decomposition above 500 lines. Tests mirror component
boundaries and use Node's built-in test runner. Shell invocation uses argument arrays with `shell: false`. Filesystem
writes are atomic sibling-write-and-rename operations, and path inputs are contained beneath explicit roots.

## Documentation

All persistent documentation and diagnostics are English. DS files define contracts; architecture pages explain mental
models; tutorials teach one task; reference pages enumerate exact APIs and commands. Documentation must label partial or
experimental behavior at the claim site and must not preserve obsolete terminology for historical convenience.

# Decisions & Questions

### Question #1: Why `.mjs` without package metadata?

Response: `.mjs` gives unambiguous ESM behavior directly in Node.js and keeps the repository executable without a
metadata format or package-manager interpretation layer.

### Question #2: Are object literals forbidden inside JavaScript algorithms?

Response: No. They are ordinary local host-language values. The restriction is semantic: only recognized opaque DSL
values, terms, artifacts, and transactions may cross into persistent semantic state.

### Question #3: Why are functions allowed in CircuitJS now?

Response: A JavaScript DSL that forbids JavaScript control flow is not the requested internal language. Safety is
provided by module isolation, explicit `ExecutionContext` effects, transactions, budgets, and trace—not by pretending
source code is data.
