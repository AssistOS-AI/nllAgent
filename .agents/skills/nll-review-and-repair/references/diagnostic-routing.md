# Diagnostic routing

Route each diagnostic to the layer with authority, apply the smallest semantic repair there, and rerun every dependent
gate. The file where a symptom appears is not necessarily the owner.

| Diagnostic family | Owning layer | Required action |
| --- | --- | --- |
| Unmapped or invented authority clause | Rule analysis | Re-index authority and rebuild downstream plan |
| Duplicate concept, role type/cardinality mismatch, hidden rule behavior | OntologyJS | Repair signature or move contextual logic to circuit |
| Invalid span, lost scope, unresolved identity, fabricated coverage | LongTextJS / profile | Correct observation or preserve alternative/gap |
| Method not applicable, missing step/provider, unclassified cycle | Architecture plan | Re-plan decomposition, reuse, capability, or fixed point |
| Wrong primitive concrete result or undeclared shared effect | Primitive SDK | Repair primitive and run all consumers |
| Unbound variable, wrong status, absence without coverage, effect drift | CircuitJS | Repair query/decision/effect/schedule and trace |
| Missing/unsound abstract transfer or symbolic encoder | Assurance | Add conservative semantics or narrow the declared goal |
| Invalid rewrite or undischarged required proof | Assurance / plan | Repair theory or reconsider unsupported guarantee |
| Surviving semantic mutant | Benchmark | Add independent case or trace property; keep authority oracle |
| Oracle conflicts with authority | Independent rule review | Stop; do not edit expected output silently |
| Provider ambiguity, duplicate ID, stale context/build | Integration | Pin provider, repair assembly, regenerate context |

## Routing questions

Before editing, answer with evidence:

1. Which authority span or executable invariant is violated?
2. Is the defect about what can be represented, what was observed, what was computed, or how that computation was
   assured?
3. Does the proposed repair change an upstream public contract?
4. Which tests, benchmarks, contexts, and task snapshots become stale after the change?

If the answer to the first question is unavailable, retain the issue as a blocker. Do not infer semantic authority
from current code or expected output.

## Repair scope

In a training candidate, modify only files under the candidate `generated/` root. If an SDK or host-runtime defect is
suspected, report it as an external blocker; this skill is not authorized to patch host code. In a task review, modify
only task-local LongTextJS, notes, and handoff. Never edit active agent ontology, circuits, tests, benchmarks, or
provider pins from a task workspace.

## Downstream invalidation

- authority or RuleAnalysis change invalidates ontology adequacy, plan, profile, circuits, assurance, and benchmarks;
- ontology change invalidates profile, primitive/circuit type checks, calibration materialization, and benchmarks;
- plan or profile change invalidates circuits, task context, assurance, and benchmark coverage;
- primitive or circuit change invalidates assurance, traces, benchmarks, pack sealing, and task context;
- benchmark-only strengthening invalidates qualification but not semantic modules;
- task LongText repair invalidates only that task snapshot, trace, result, and report.

Regenerate `AgentAuthoringContext` whenever the selected build, ontology, circuits, profile, demand, SDK imports,
providers, validation commands, tests, or benchmarks change. A context digest mismatch is a blocker, not a warning.

## Completion record

For each diagnostic record code, authority evidence, owning layer, files changed, commands rerun, trace or benchmark
that demonstrates the repair, and any residual limitation. A retained blocker names the downstream results that cannot
be claimed. Avoid narrative statements such as “looks fixed”.
