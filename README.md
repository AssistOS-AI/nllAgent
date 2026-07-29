# NaturalLanguageLinterAgent

NaturalLanguageLinterAgent (`nllAgent`) is a Node.js 22+ ESM library and CLI with two CNL output modes over the same LongTextJS–CircuitJS architecture. Audit mode applies versioned review theories to an existing Markdown document and emits a canonical <code>CNLAuditReport</code>. Specification mode applies planning theories to a high-level idea and emits a verified <code>CNLGenerationPlan</code> for a future document. Optional realization can turn that plan into text, after which audit mode checks the candidate again.

The product has two deliberately separate systems:

- Production audit reads an immutable published release. It compiles the document into LongTextJS, executes validation circuits, verifies findings, and persists `cnl-audit.json` (`CNL/Audit-1`) plus its `report.md` view. A configured AchillesAgentLib `LLMAgent` is preferred for semantic observations; a constrained Coding Agent adapter is the automatic fallback when Achilles is unavailable or unconfigured.
- Production specification compiles a high-level idea through LongTextJS and dedicated planning circuits into `cnl-plan.json` (`CNL/Plan-1`). The verifier requires a rule-to-plan witness for every applied rule. Optional realization proposes and revises Markdown, while unchanged audit circuits remain the final oracle.
- Learning gives a Coding Agent a disposable staging workspace containing rule sources, selected issues, examples, and five focused learning skills. Host-side audit promotes only whitelisted authoring artifacts. Learning can create candidates but cannot publish them. A maintainer explicitly publishes and activates one candidate with a manual development command.

`Coding Agent` is an architectural role. OpenAI Codex is the current reference adapter and explains the compatibility names `--translator codex`, `--codex-bin`, and `NLL_CODEX_BIN`; LongTextJS, CircuitJS, benchmarks, releases, and publication checks do not depend on Codex as a product.

## Try the executable agent

The repository includes `data/editorial-demo`, with authority material, restricted CircuitJS circuits, ten natural benchmark cases, one published MVP baseline (`0.1.0`), and an active release pointer.

```bash
node bin/nllagent.mjs benchmark --agent editorial-demo

node bin/nllagent.mjs run \
  --agent editorial-demo \
  --input data/editorial-demo/benchmark/public/weak-phrase/input.md \
  --output /tmp/editorial-report.md

node bin/nllagent.mjs plan \
  --agent editorial-demo --release 0.1.0 \
  --input data/editorial-demo/examples/planning/idea.md \
  --output /tmp/editorial-plan.cnl.md \
  --translator none
```

Every audit run gets its own directory under `data/<agent>/runs/`. It persists the copied input, LongTextJS program, compatibility and coverage results, circuit trace, verifier results, findings, canonical `cnl-audit.json`, and rendered `report.md`. Planning uses `planning-runs/` and persists canonical `cnl-plan.json` plus `plan.cnl.md`. A stopped run still writes an audit and a reusable issue; missing knowledge is never reported as compliance.

Ordinary `run`, `plan`, and `benchmark` commands select `foundation-core@1.1.0`. This bounded platform pack recognizes documented controlled-English state, type, `before`, exact arithmetic, quantity, and literal-emotion assertions. Five replay-verified circuits check only the published logical, temporal, arithmetic, elementary physical, and emotion/type invariants. The choice and digest are persisted in `foundation.json`. Use `--foundation off` for a deliberately different world model; changing political, geographic, social, economic, and legal facts are not hardcoded as timeless core truth.

## Core CLI

```bash
nllagent agent init --agent editorial
nllagent agent list
nllagent agent inspect --agent editorial

nllagent run --agent editorial --input manuscript.md --output report.md
nllagent plan --agent editorial --input idea.md --output plan.cnl.md
nllagent plan --agent editorial --input idea.md --output plan.cnl.md \
  --realize-output draft.md --max-revisions 2
nllagent benchmark --agent editorial
nllagent model inspect --json

nllagent issue list --agent editorial
nllagent feedback add --agent editorial --run <run-id> \
  --type observation-correction --message "The actor is Alice."

nllagent learn --agent editorial --rules ./rulebook
nllagent release publish --agent editorial --candidate 0.1.0
```

Each named agent owns separate authority, schemas, extraction profiles, circuits, benchmark suites, candidates, releases, runs, issues, and feedback. Several Coding Agents can therefore build different theories and benchmarks through the same runtime without sharing an active release or domain ontology.

## Translation selection

`--translator auto` is the default. It prefers a configured AchillesAgentLib and calls its `LLMAgent`; translation and realization roles prefer Spark when exposed. If Achilles is not configured, auto uses the current reference Coding Agent adapter. Each model call gets only its role-specific runtime skill: `nll-translate-longtext` for observations and `nll-realize-cnl` for optional realization or revision. Circuit-produced CNL planning does not require a model when its input observations are deterministic.

```bash
export ACHILLES_AGENT_LIB_PATH=/path/to/achillesAgentLib

nllagent run --agent model-assisted \
  --input document.md --output report.md --translator auto

nllagent run --agent model-assisted \
  --input document.md --output report.md --translator codex

nllagent run --agent deterministic \
  --input document.md --output report.md --translator none
```

Deterministic agents require neither backend. If the selected backend cannot materialize a critical observation within its schema and budget, the run ends as incompatible, incomplete, or budget-exhausted and records the precise gap.

## Library and authoring boundary

`src/index.mjs` exports LongTextJS compilation, restricted CircuitJS `.mjs` loading, static circuit compilation, scheduling, registries, standard reasoning operators, replay verifiers, release management, benchmark execution, storage, reporting, translation backends, and the production runner.

Circuit author modules contain only one direct `export default circuit({...})` or experimental `export default queryFirstCircuit({...})` expression. The loader removes general JavaScript capabilities, converts the expression losslessly to JSON-compatible plain data, and applies the same compiler used for JSON circuits. Agent-editable circuits can refer only to registered operators and verifiers; they cannot add hidden executable code.

Programmers can still add real algorithms. A host application may load one reviewed, self-contained
`NllRuntimeExtension` ESM file, install its JavaScript operators and verifiers into the registries, and inject those
registries into programmatic runs. Inputs and context are frozen plain-data copies, results must be plain data, cache
identity includes the extension digest, and releases that reference the entries lock that digest. The standard CLI does
not accept executable extension paths. Run the included example with `node examples/runtime-extension/run.mjs`.

DS020 now has an experimental implemented subset over the same architecture: canonical LongTextJS is exposed as a finite read-only query world, and typed query plus evidence-aware table values lower to ordinary CircuitJS. The compiler validates the supported relation, expression, anti-join, order, and hit-policy semantics; publication records QueryContracts and source maps; benchmarks compare reference and lowered execution. The current editorial release remains the simpler correct form—one exact operator, one verifier, and one emit node—while aggregates, ordered patterns, native indexes, and advanced reasoning remain direct operators or graphs.

## Development and documentation

```bash
npm test
npm run docs:verify
npm run check:sizes
npm run check
```

Open [`docs/index.html`](docs/index.html) for the documentation. The shortest reading path is:

1. [`docs/quick-tutorial.html`](docs/quick-tutorial.html) — one source, the exact default verbal rule,
   real CircuitJS DSL, one command, and one verified result.
2. [`docs/circuits-in-practice.html`](docs/circuits-in-practice.html) — the practical dataflow model,
   port binding, multiple records, cycles, filtering, and real JavaScript operators.
3. [`docs/foundation.html`](docs/foundation.html) — what the default baseline checks, what it cannot know,
   and how alternative worlds opt out.
4. [`docs/concepts.html`](docs/concepts.html) — terminology, abbreviations, scientific lineage,
   guarantee limits, and ethical commitments.
5. [`docs/dsl.html`](docs/dsl.html) — why the document and the reusable theory are separate programs.
6. [`docs/longtextjs.html`](docs/longtextjs.html) and [`docs/circuitjs.html`](docs/circuitjs.html) —
   the two DSLs as implemented today.
7. [`docs/circuit-tutorial.html`](docs/circuit-tutorial.html) — an interactive, node-by-node model
   of LongTextJS port binding, CircuitJS execution, verification, and both CNL products.
8. [`docs/connection.html`](docs/connection.html) — the observation contract that links
   CircuitJS demand to LongTextJS producers and concrete materialization.
9. [`docs/verification.html`](docs/verification.html) — one production verification,
   chronologically and file by file.
10. [`docs/generation.html`](docs/generation.html) — one idea-to-CNL planning run and its optional
   realization branch.
11. [`docs/learning-architecture.html`](docs/learning-architecture.html) — one learning,
   candidate preparation and manual publication cycle.
12. [`docs/query-first.html`](docs/query-first.html) — the experimental query-first subset, its
   representation choices, executable semantics, and remaining promotion gates.

The sidebar keeps the LongTextJS document side and CircuitJS theory side visibly separate. Operational details continue in the complete [`docs/cli.html`](docs/cli.html) man page, [`docs/learning.html`](docs/learning.html), and [`docs/benchmark.html`](docs/benchmark.html).

The contiguous DS set under [`docs/specs/`](docs/specs/) is authoritative; use [`docs/specsLoader.html?spec=matrix.md`](docs/specsLoader.html?spec=matrix.md) to browse it. [`serious_issues.md`](serious_issues.md) records concrete gaps that the documentation and publication records must not overclaim.
