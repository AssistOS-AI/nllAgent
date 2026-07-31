# Training layout and validation

Use this reference after the architecture plan is stable. Validation must establish semantic behavior, evidence, and
failure modes, not merely successful imports.

## Candidate isolation

Write the entire candidate below the host-provided `generated/` root. The active agent remains immutable until the host
validates and promotes that candidate atomically. Imports may target only the SDK capsule and candidate-owned modules
allowed by the generated context. Never write into another agent or a task workspace.

Keep one natural-language theory source in `theory/sources/` for each indexed authority input and one executable rule
analysis module in `theory/rules/`. Group ontology and circuits by semantic family. A root `agent.mjs` and `pack.mjs`
pin exact modules and providers; they are executable assembly, not data manifests.

## Calibration versus benchmark

Calibration examples help design the theory. Their LongTextJS modules contain observations only. Benchmark expected
modules are independent oracles derived from authority. Do not place an expected finding in a LongText program and do
not rewrite an oracle because the implementation disagrees.

Every important rule family needs cases for:

- a clearly conforming document;
- a clear violation;
- a valid exception and an incomplete exception;
- open and closed coverage for every absence-sensitive premise;
- a significant ambiguity and incompatible claims;
- an ontology or capability blocker;
- exact numeric, temporal, or cardinality boundaries;
- cross-section evidence when the rule is not local.

Expected modules should assert status, semantic subject, evidence spans, interpretation class, assurance, and critical
trace properties. Comparing only a message string or final status permits correct-looking results derived from wrong
premises.

## Mutation discipline

Use semantic mutations that represent credible implementation errors: invert a comparator, remove an exception,
promote proposed evidence, collapse alternatives, merge identities, remove a required role, or treat open coverage as
closed. The suite must reject relevant mutants. A surviving mutant means the benchmark is weak, not that the mutant is
acceptable.

## Validation order

Run checks in dependency order so diagnostics point to the owning layer:

1. import and seal ontology modules; run valid and invalid constructor tests;
2. compare architecture plans with authority and available providers;
3. type/effect-check any new primitive and run its concrete laws;
4. compose circuits; check ports, capabilities, schedules, effects, and absence requirements;
5. run preflight and other assurance checks required by the plan;
6. validate calibration LongTextJS spans, types, alternatives, gaps, and coverage;
7. run concrete cases and inspect evidence-bearing traces;
8. run semantic coverage and mutations;
9. import `agent.mjs` and sealed `pack.mjs` in the host validation capsule;
10. execute the full pack on at least one realistic multi-section document.

Read the reports, not only exit codes. A passed command with missing expected trace coverage is not a passed semantic
gate.

## Handoff

`handoff.md` records authority revisions, context digest, files produced, exact commands, elapsed timings, benchmark
and mutation summaries, diagnostics repaired, and bounded limitations. It must not contain private reasoning. A
remaining blocker names its code, evidence, affected rule, owning layer, and downstream checks not run.

Only a fully validated candidate may be promoted. Promotion creates a new immutable agent build. Existing task folders
remain pinned to the build with which they were analyzed.
