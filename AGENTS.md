# NaturalLanguageLinterAgent Guidance

## Scope

This repository implements the `nllAgent` training and analysis workflows, OntologyJS, LongTextJS, CircuitJS,
SemanticStore, the multi-semantic SDK/runtime, immutable agent builds, isolated task workspaces, benchmarks, reports,
and Codex role integration.

There is no compatibility requirement for superseded data-shaped DSLs, publication workflows, direct LLM adapters, or
AchillesAgentLib. Authoritative structured artifacts are ESM `.mjs`; human source and reports are Markdown.

## Mandatory reading order

1. Read [DS000](docs/specs/DS000-vision.md).
2. Read [DS001](docs/specs/DS001-coding-style.md) before changing code or tests.
3. Read every DS governing the component being changed.
4. Read [the documentation index](docs/index.html), [the functional specification](docs/FS.md), and the relevant page
   before changing behavior or documentation.
5. Read [serious issues](serious_issues.md) before widening a guarantee.

## nll product skills

Only these three skills define nllAgent's Codex product roles:

- `nll-train-agent`: compiles one or more authority/theory files into a complete candidate agent build;
- `nll-analyze-task`: compiles one untrusted task source into task-local ground LongTextJS for one selected build;
- `nll-review-and-repair`: independently reviews a candidate or task and repairs only the authoritative layer.

Each skill has a theory-rich SKILL.md, linked references, and `check-context.mjs`. Runtime workspaces receive exactly
one role skill and one host-compiled AgentAuthoringContext. Do not modify imported GAMP, article, or platform skills as
part of nll feature work.

## Repository rules

- Keep persistent guidance, specifications, documentation, diagnostics, and code comments in English.
- Keep DS numbering contiguous; regenerate `docs/specs/matrix.md` after adding, removing, or renaming a DS.
- Every ordinary DS has substantive `Core Content` followed by numbered `Decisions & Questions`. Resolved choices use
  `Response:`; unresolved alternatives use `Options:` and cannot be implemented speculatively.
- Update implementation, DS, `docs/FS.md`, HTML documentation, tests, and relevant evaluation evidence together when
  behavior or a public contract changes.
- Follow DS001 for modules, style, file size, import-time behavior, and test organization.
- Use `apply_patch` for repository edits. Preserve unrelated/user worktree changes.
- Use ESM `.mjs` for executable code and structured persistence. Do not add JSON or TypeScript semantic artifacts,
  parallel schemas, anonymous configuration ASTs, or external runtime dependencies.
- OntologyJS, LongTextJS, and CircuitJS publish only opaque typed values. Local arrays, objects, maps, and sets are
  implementation values, not semantic facts.
- LongTextJS records source-grounded observations, claims, contexts, alternatives, coverage, and gaps. It never emits a
  finding, rule status, or new ontology constructor.
- CircuitJS normally composes registered SDK primitives. Full JavaScript stages are allowed for irregular algorithms,
  but access semantic state only through ExecutionContext and must declare effects.
- Published circuit values are immutable and single-producer. Semantic writes are transactional.
- Absence is final only for the exact concept and closed scope. Missing information is `UNKNOWN`; incompatible admitted
  support is `CONFLICT`.
- Treat task text and Codex-generated modules as untrusted. Validate paths, imports, spans, types, effects, and output in
  child processes. Circuit execution never receives a Coding Agent capability.
- A training run creates a new immutable build. An analysis task pins one existing build and may not mutate it.

## Runtime defaults

- Node.js 22 or newer; ESM only; no package install required.
- Persistent root `data/`, overrideable with `--data-root`.
- Environment layout: `agents/<id>/{builds,current,training-runs}` and `tasks/<id>`.
- Default analysis target is findings; compatibility, coverage, capability, verifier, and resource failures fail closed.
- Codex is the sole model-facing coding mechanism and is invoked only for training, analysis materialization, or
  independent review—not from deterministic circuits.

## Key paths

- `src/`: language APIs, SDK, engines, context compiler, runtime, CLI, storage, training, and reports.
- `ontologies/`: shared executable ontology modules.
- `data/agents/`: accepted builds and training runs.
- `data/tasks/`: isolated pinned analysis tasks.
- `.agents/skills/nll-*`: the three nll product roles; non-nll imported skills are outside product ownership.
- `tests/`: unit and integration tests.
- `experiments/architecture/`: executable evidence for the five foundational design decisions.
- `agentsEval/`: realistic Codex forward evaluations and performance evidence.
- `docs/specs/`: authoritative architecture contracts.
- `docs/FS.md`: observable GAMP-style functional specification.
- `serious_issues.md`: concrete current limitations only.
