# Privacy-retention forward evaluation

## Business scenario

This forward evaluation trained a fictional privacy-retention agent and analyzed a separate Northstar Services
register. The 2,010-word authority defines a five-year maximum, a strict documented-obligation exception, exact-scope
coverage, conflict handling, and evidence duties. The 1,935-word input distributes seven schedules and review notes
across eleven sections, including cross-section exception evidence, open and closed scopes, contradictory claims, and
an unmapped category.

## Skill sequence exercised

1. `nll-train-agent` validated a `TRAIN` context, read all five theory references and the SDK catalog, then produced
   `training/generated/` with OntologyJS, RuleAnalysis, plan, profile, SDK-first CircuitJS, assurance, tests,
   benchmarks, RulePack, agent assembly, and final typed context.
2. `nll-analyze-task` validated an `ANALYZE` context before reading the input, generated the dependency-free
   `analysis-task/generated/program.mjs`, checked exact Unicode spans, and handed the program to deterministic
   isolated execution.
3. `nll-review-and-repair` validated a `REVIEW` context and independently traced authority to output. It repaired an
   incomplete-exception defect and a ConstraintKernel plan-drift defect, then reran every downstream gate.

## Actual results

- Ontology: 11 concepts and 26 roles; invalid cardinality and sort examples are rejected.
- Plan: four typed steps; zero MethodCatalog diagnostics.
- Tests: 8/8 passed.
- Semantic benchmark: 10/10 cases passed, including conformity, violation, complete and incomplete exceptions, open
  coverage, two conflict forms, scope isolation, boundary, explicit undocumented evidence, and ontology gap.
- Mutations: inclusive comparator, dropped exception, and forced closed coverage all failed their authority oracle.
- Task LongTextJS: 18 units, 37 store terms, 17 exact claims, one ontology gap, no materialized findings.
- Deterministic output: six findings in the expected sequence—`VIOLATED`, `ACCEPTED_EXCEPTION`, `SATISFIED`, `UNKNOWN`,
  `CONFLICT`, `CONFLICT`—plus the R7 ontology limitation.
- Trace: 40 events after SDK constraint integration; constraint and decision primitives, evidence verifiers, stage
  commit, and circuit commit are visible.

The human report and executable result are in `analysis-task/run/`. Exact representative span checks include R1's
duration, R2's documented obligation, both R5 exception statements, both R6 duration statements, and the R7 gap.

## Performance

Thirty warm-process repetitions on the current machine separate the phases:

- task LongTextJS construction plus SemanticStore publication: 3.136 ms average, 4.148 ms maximum;
- deterministic CircuitJS execution after the SDK constraint repair: 1.324 ms average, 2.378 ms maximum;
- isolated CLI-style Node process including import, materialization, execution, and artifact writing: approximately
  0.19–0.20 seconds wall time, with roughly 76–78 MiB peak RSS in the recorded `/usr/bin/time` samples;
- full candidate unit suite: approximately 0.23 seconds; candidate validation and 10-case benchmark: under one second
  in the combined local run.

Coding-agent authoring/review is a separate, interactive phase and is not included in deterministic circuit timing.
The full forward-evaluation wall window also includes repository inspection, context creation, defect repair, and
repeat validation, so it is not presented as a generation throughput measurement. Machine-readable measurements are
persisted in `analysis-task/performance.mjs`; the human view is `analysis-task/performance.md`.

## Limitations

The host candidate validator still expects a calibration Markdown materializer; the final agent therefore contains an
explicitly allow-listed calibration adapter that is a no-op for real task source identities. Actual analysis is driven
by task-local generated LongTextJS. Host context role checkers and native context reporting have the typed-build and
Set-count mismatches documented by independent review. Generic preflight is conservative across the JavaScript
grouping macro-stage. The mutation probes are bounded, and the current benchmark API delegates evidence/trace checking
to the test module. These limits do not change the concrete task results, but they bound the assurance claimed.
