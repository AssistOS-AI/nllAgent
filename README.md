# NaturalLanguageLinterAgent

NaturalLanguageLinterAgent (`nllAgent`) is a Node.js 22+ research environment for compiling natural-language business
theory into inspectable semantic analyzers. Codex writes executable OntologyJS and CircuitJS during training and writes
source-grounded LongTextJS for each analysis task. The accepted circuits then run deterministically; a model never
produces the business verdict directly.

All authoritative structured artifacts are ESM `.mjs` modules. Authority, input, reports, and design notes are
Markdown. There is no JSON semantic format, TypeScript layer, AchillesAgentLib integration, or hidden configuration
object standing in for a DSL.

## The two operations

Train a named agent from one or more ordered theory files:

```bash
node bin/nllagent-train.mjs train \
  --agent privacy-retention \
  --theory policies/retention.md \
  --theory policies/exceptions.md \
  --data-root data
```

Training invokes Codex with `nll-train-agent`, validates the generated ontology, plan, profile, circuits, tests, and
semantic benchmarks, invokes an independent `nll-review-and-repair` pass, and promotes one immutable build only when all
gates pass.

Analyze one document with exactly one accepted agent build:

```bash
node bin/nllagent-analyze.mjs analyze \
  --agent privacy-retention \
  --task policy-review-2026-07 \
  --input documents/customer-policy.md \
  --output reports/customer-policy.md \
  --data-root data
```

Analysis pins the current build, compiles an exact context from that build, and invokes Codex with `nll-analyze-task`
to write task-local LongTextJS. The host validates Unicode spans, ontology types, alternatives, and coverage before
running the frozen circuits. The task cannot edit or retrain the selected agent.

The unified `bin/nllagent.mjs` exposes the same `train` and `analyze` commands plus deterministic benchmark and
inspection operations. Run `node bin/nllagent.mjs --help` for the full surface.

## Semantic architecture

- OntologyJS defines qualified sorts, concepts, roles, cardinalities, subtyping, lexicalization, and opaque
  constructors.
- LongTextJS is the ground program of one source revision: terms, claims, mentions, contexts, alternatives, coverage,
  gaps, and exact anchors.
- CircuitJS defines typed query, four-valued decisions, derivation, verification, dynamic subcircuits, controlled
  generation, and ordinary JavaScript macro-nodes.
- SemanticStore is the single typed term graph. Circuits see query and transaction APIs, not physical indexes.
- The public execution graph uses immutable single-producer values. Normal local mutation, loops, recursion, classes,
  and `async/await` remain available inside a typed macro-node.

Generated circuits normally compose the SDK catalog in [`src/sdk/`](src/sdk/). It maps the MethodCatalog to concrete
query, truth, constraint, relation, rewrite, proof, synthesis, witness, and refinement providers. Custom code is used
when a domain algorithm is genuinely irregular, with effects and assurance boundaries declared explicitly.

## Persistent environment

```text
data/
  agents/<agent-id>/
    builds/<immutable-build-id>/
    current/
    training-runs/<run-id>/
  tasks/<task-id>/
    input/
    pin/
    generation/
    longtext/
    output/
```

An environment can hold many unrelated trained agents. Every task pins one build and context digest before Codex reads
the source. Retraining never changes an existing task.

## Skills and native tools

Only three nll product skills are used:

- `nll-train-agent`: complete theory compilation;
- `nll-analyze-task`: one source to task-local LongTextJS;
- `nll-review-and-repair`: independent trace/authority review and layer-correct repair.

Their SKILL.md files link detailed theory references and execute context validators. Deterministic authoring tools are
available through `node tools/nll.mjs`, including source, ontology, context, plan, circuit, LongText, engine, benchmark,
and RulePack checks.

## Validation and documentation

```bash
node --test
node experiments/architecture/run.mjs
node scripts/check.mjs
```

Realistic forward evaluations live under [`agentsEval/`](agentsEval/). They use medium-size authority and input
documents, generated code, concrete task outputs, independent review, mutation evidence, and phase-separated timing.

Start with [the documentation index](docs/index.html), [the quick tutorial](docs/quick-tutorial.html), and the
[functional specification](docs/FS.md). The contiguous [DS specifications](docs/specs/matrix.md) are architectural
authority. [serious_issues.md](serious_issues.md) lists only current bounded implementation gaps.
