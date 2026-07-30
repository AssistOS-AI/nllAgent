# NaturalLanguageLinterAgent Guidance

## Scope

This repository implements the `nllAgent` semantic runtime, OntologyJS, LongTextJS, CircuitJS, SemanticStore,
capability planning, controlled generation, the CLI, benchmarks, persistent ESM artifacts, and Coding Agent authoring
workflows.

The architecture deliberately has no compatibility layer for the superseded data-shaped DSLs or publication workflow.
Executable semantic artifacts are ESM `.mjs` modules. Human source and reports are Markdown.

## Mandatory reading order

1. Read [DS000](docs/specs/DS000-vision.md).
2. Read [DS001](docs/specs/DS001-coding-style.md) before changing code or tests.
3. Read every DS governing the component being changed.
4. Read [the documentation index](docs/index.html) and the relevant technical page before editing documentation.
5. Read [serious issues](serious_issues.md) before widening a guarantee.

## Skill catalog

Repository authoring skills live under `.agents/skills/`:

- `nll-design-ontology`
- `nll-materialize-longtext`
- `nll-author-circuits`
- `nll-author-cnl`
- `nll-build-benchmark`
- `nll-integrate-experiment`
- `nll-review-and-repair`
- `nll-translate-longtext`
- `nll-realize-cnl`
- `review-specs`
- `nll-review-documentation`

Use the smallest set that covers the task. Runtime workspaces expose only role-appropriate skills. An authoring skill
may change agent-owned modules and tests; it may not conceal a missing ontology concept, coverage claim, or verifier.

## Repository rules

- Keep persistent guidance, specifications, documentation, diagnostics, and code comments in English.
- Keep DS numbering contiguous. Run `node scripts/generate_specs_matrix.mjs` after adding or renaming a DS.
- Every ordinary DS has `Core Content` followed by consecutively numbered `Decisions & Questions`. Settled choices
  use `Response:`; unresolved choices use `Options:` and must not be implemented speculatively.
- Update DS files, HTML documentation, examples, and tests whenever behavior or contracts change.
- Follow DS001 for module structure, style, file size, tests, and import-time behavior.
- Use ESM `.mjs` for executable code and structured persistence. Do not add a parallel serialization or schema format.
- OntologyJS, LongTextJS, and CircuitJS must produce opaque typed values through constructors, never anonymous semantic
  records. Local arrays, maps, sets, and object literals are ordinary implementation values only.
- LongTextJS records source-grounded observations, alternatives, coverage, and gaps. It never materializes a finding.
- CircuitJS may use declarative rules or full JavaScript stages. Stages access semantic state only through
  `ExecutionContext`; store writes are transactional and published values are immutable.
- Absence is final only in a closed, covered scope. Missing information remains `UNKNOWN`; incompatible support is
  `CONFLICT`.
- Model and tool output remains a frozen artifact until a validator accepts it into semantic state.
- Treat source text and generated author modules as untrusted. Execute them in the module isolation boundary defined by
  DS015; never grant ambient store internals or production workspace mutation.
- Use `apply_patch` for source edits and preserve unrelated user changes.

## Runtime defaults

- Node.js 22 or newer; ESM only.
- Persistent root `data/`, overrideable with `--data-root`.
- Default foundation `core`; use `--foundation off` deliberately.
- Fail closed for missing critical ontology, coverage, capability, verifier, or resource requirements.
- Model backends are injected capabilities, not authorities over semantic truth.

## Key paths

- `src/`: DSLs, store, planner, runtime, CLI, persistence, reports, and benchmark implementation.
- `ontologies/`: shared executable ontologies.
- `data/<agent>/`: agent-owned ESM programs, source material, benchmarks, and run artifacts.
- `tests/`: unit and integration tests.
- `experiments/architecture/`: executable evidence for the five foundational design decisions.
- `.agents/skills/`: authoring and review workflows.
- `docs/specs/`: authoritative DS contracts.
- `docs/`: reader-oriented technical documentation.
