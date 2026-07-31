---
name: nll-train-agent
description: "Compile one or more natural-language authority or theory files into a complete, tested nllAgent theory: OntologyJS vocabulary, CircuitJS programs, materialization profile, architecture plan, tests, semantic benchmarks, optional CNL dialect, and agent assembly. Use for a new trained agent, a changed rule theory, an ontology or circuit repair, a new rule family, or any diagnostic that requires changing the persistent theory rather than one document task."
---

# Train an nllAgent

Build one coherent agent theory. Treat rule analysis, ontology design, circuit engineering, assurance, tests, and
integration as phases of this single job; do not delegate them to a catalog of vague micro-skills.

## Required inputs

Read, in this order:

1. `request.md` and every Markdown file under `theory-input/`.
2. The host-generated `context/agent-context.md` and its authoritative `context/agent-context.mjs` companion. The
   module must have purpose `TRAIN`, even for a new agent whose current circuit set is empty.
3. [term-algebra-and-authority.md](references/term-algebra-and-authority.md).
4. [ontologyjs.md](references/ontologyjs.md) before creating or changing vocabulary.
5. [circuit-engineering.md](references/circuit-engineering.md) before choosing circuit boundaries or methods.
6. [multi-semantics.md](references/multi-semantics.md) only for methods and assurance required by the plan.
7. [validation-and-layout.md](references/validation-and-layout.md) before writing tests, benchmarks, or assembly.
8. The SDK catalog and examples named by the generated context. Inspect the exact APIs; do not invent substitutes.

Run `node .agents/skills/nll-train-agent/scripts/check-context.mjs context/agent-context.mjs` before editing.
An environment may contain many agents; use only the selected build and reusable providers named by this context.

## Semantic authority

- Authority Markdown defines the intended rules. Preserve exact source spans and unresolved ambiguity.
- OntologyJS defines observable vocabulary and local invariants, never contextual verdicts or policy exceptions.
- CircuitJS defines query, derivation, decision, verification, and generation behavior.
- A `CircuitArchitecturePlan` records responsibility, decomposition, reused SDK providers, methods, assurance, and
  materialization requirements. A method is local to a subproblem; it is not the identity of the whole circuit.
- Concrete circuit execution is operational authority. Abstract, symbolic, proof, and synthesis modes add bounded
  assurance and never silently replace concrete execution.
- LongTextJS calibration cases describe source observations only. They never contain expected findings.

## Mandatory workflow

1. Index every authority file. Build RuleAnalysis with scope, modality, premises, exceptions, priorities, evidence,
   outcomes, and the conditions for `UNKNOWN`, `CONFLICT`, and `NOT_APPLICABLE`.
2. Compare the required vocabulary with the active ontology. Reuse identities before extending. Keep source-observable
   concepts separate from circuit-derived findings.
3. Decompose each rule into typed subproblems. Consult the context's MethodCatalog and provider catalog. Reuse an exact
   circuit, then SDK primitives, then a new reusable primitive; use a typed JavaScript macro-node only for genuinely
   irregular logic.
4. Write the architecture plan and derive the MaterializationProfile. Include exact concepts, roles, identity/time/
   quantity operations, evidence policy, alternatives, and coverage scopes needed by absence.
5. Implement leaf circuits before root composition. Use four-valued predicates, explicit rule statuses, typed ports,
   declared effects, evidence on every finding, and schedules that preserve dependency order.
6. Add only the assurance required by the plan. Unsupported abstract operations return conservative top; symbolic
   witnesses earn assurance only after concrete replay; proof checks remain local; synthesized repairs must execute
   concretely and pass CNL round-trip where applicable.
7. Create independent calibration tests and semantic benchmarks. Include conforming, violating, valid-exception,
   incomplete-exception, open/closed coverage, ambiguity, conflict, ontology blocker, boundary, and relevant mutation
   cases. Never weaken an oracle to make implementation pass.
8. Assemble `agent.mjs` and `pack.mjs`, pin providers, run every native check listed in the context, run `node --test`,
   run the agent benchmark, inspect traces, and repair the authoritative layer.

## Output and ownership

Write only under `generated/`. Produce a complete candidate rooted there:

```text
generated/
  agent.mjs
  theory/sources/*.md
  theory/rules/*.mjs
  ontologies/*.ontology.mjs
  plans/*.plan.mjs
  materialization/*.profile.mjs
  primitives/*.primitive.mjs        # only when the SDK has no exact provider
  circuits/*.circuit.mjs
  assurance/*.mjs                   # only when required by the plan
  tests/*.test.mjs
  benchmarks/**/{input.md,case.mjs,expected.mjs}
  cnl/*.grammar.mjs                  # only when the theory generates controlled text
  pack.mjs
  reports/training-report.md
  handoff.md
```

Use only `.mjs` and Markdown. Do not create JSON, TypeScript, package metadata, hidden configuration ASTs, symlinks,
or external dependencies. Use normal JavaScript locally, but publish semantic values only through SDK constructors.

## Completion gate

Stop only when the candidate imports in the host validation capsule, all required theory clauses map to executable
paths, ontology and circuit checks pass, every finding traces to source evidence, tests and benchmarks pass, required
mutants fail, providers are unambiguous, and `handoff.md` lists commands, timings, diagnostics, and remaining bounded
limitations. Otherwise leave a blocker with code, evidence, and authoritative layer; do not claim completion.

## Repair routing

Repair vocabulary/type/cardinality errors in OntologyJS; observation/span/identity/coverage errors in calibration
LongTextJS or its profile; method/capability/cycle errors in the architecture plan; status/effect/evidence errors in
CircuitJS; precision/encoder/proof/rewrite issues in assurance; oracle conflicts through independent authority review.
