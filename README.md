# NaturalLanguageLinterAgent

NaturalLanguageLinterAgent (`nllAgent`) is a Node.js 22+ experiment for turning natural-language rules and long
documents into inspectable semantic programs. Its executable authoring and persistence format is ESM `.mjs`; human
inputs and reports are Markdown.

The architecture has three internal JavaScript DSLs:

- OntologyJS defines typed concepts, roles, constraints, lexicalization, and constructor identity.
- LongTextJS materializes source-grounded terms, claims, contexts, alternatives, coverage, and explicit gaps.
- CircuitJS matches the same terms and composes rules, decision tables, dynamic subcircuits, and ordinary JavaScript
  macro-nodes.

The DSL values are opaque runtime objects, not configuration records. Ontology constructors create ground `Term`
instances or typed `Pattern` instances depending on their arguments. `SemanticStore` exposes a stable query and
transaction boundary while keeping indexes private. Published values between circuit nodes are immutable and
single-assignment; local variables inside a procedural stage remain normal JavaScript.

## Run the included experiment

`data/editorial-demo/agent.mjs` assembles an executable ontology, materializer, two audit circuits, a planning circuit,
a controlled-language dialect, and ten source-grounded benchmark cases.

```bash
node bin/nllagent.mjs benchmark --agent editorial-demo

node bin/nllagent.mjs run \
  --agent editorial-demo \
  --input data/editorial-demo/benchmark/public/weak-phrase/input.md \
  --output /tmp/editorial-report.md

node bin/nllagent.mjs plan \
  --agent editorial-demo \
  --input data/editorial-demo/examples/planning/idea.md \
  --output /tmp/editorial-plan.cnl.md
```

`run` and `plan` preserve the established CLI use cases. Each invocation also writes reimportable `.mjs` modules
for the LongText program, semantic result, and trace under the agent workspace. Missing ontology, coverage, capability,
or execution evidence is reported explicitly rather than converted to a successful verdict.

## CLI

```text
nllagent run --agent <name> --input <file.md> --output <report.md>
nllagent plan --agent <name> --input <idea.md> --output <plan.cnl.md>
nllagent benchmark --agent <name>
nllagent learn --agent <name> --rules <folder>
nllagent agent init|list|inspect
nllagent issue list
nllagent feedback add
nllagent model inspect
```

The old publication workflow and structured-data flags are intentionally absent. Agent composition happens in
`agent.mjs`; executable modules, source files, and Markdown reports are the durable repository artifacts.

The default `foundation-core@2` materializes a deliberately narrow controlled form for literal state assertions and
checks explicit polarity conflicts. Use `--foundation off` when an agent supplies a deliberately different world.
Changing political, legal, geographic, economic, or social facts never belong in the timeless core.

## Authoring model

A typical agent owns:

```text
data/my-agent/
  agent.mjs
  authority/
  ontologies/
  longtext/
  circuits/
  cnl/
  benchmark/
```

`agent.mjs` imports and composes those modules with normal ESM. LongText modules describe what the source expresses;
they do not contain findings. Circuits read through semantic queries and publish validated terms through atomic
transactions. Procedural operators may use loops, recursion, classes, exceptions, and `async/await`, but interact
with semantic state only through `ExecutionContext`.

## Validation

```bash
node scripts/check.mjs
```

The check runs unit and integration tests, the five architecture experiments, the editorial benchmark, specification
matrix generation, documentation link checks, module syntax checks, and the repository-format audit.

The five experiments under `experiments/architecture/` resolved the former open questions: hybrid term identity,
the ontology-behavior boundary, factorized lazy alternatives, exact model-artifact reuse, and exact critical-slot CNL
round-trip.

## Reading path

Start with [the quick tutorial](docs/quick-tutorial.html), then read
[the architecture](docs/architecture.html), [OntologyJS](docs/ontologyjs.html),
[LongTextJS](docs/longtextjs.html), [CircuitJS](docs/circuitjs.html),
[SemanticStore](docs/semantic-store.html), and [runtime semantics](docs/runtime.html).
[Controlled generation](docs/generation.html), [benchmarks](docs/benchmark.html), and
[the experiments](docs/experiments.html) cover the verification boundary.

The contiguous DS set under [`docs/specs/`](docs/specs/) is authoritative. The
[specification matrix](docs/specs/matrix.md) provides the complete contract map.
[Current serious issues](serious_issues.md) records only gaps that remain true of this implementation.
