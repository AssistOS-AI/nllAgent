# Grounding, scope, and alternatives

This reference defines the fidelity rules for source anchors, negation, modality, interpretation, and coverage.

## Exact source grounding

Every explicit or verified claim needs an anchor in the supplied source revision. Spans are half-open Unicode
code-point intervals `[start, end)`, not byte or UTF-16 offsets. Use the host source tools to confirm the excerpt. Do
not count offsets manually in a long document.

Anchor the smallest fragment that supports the semantic assertion while retaining enough context to justify modality
and scope. A duration span may support a value term, but the full clause may be necessary evidence for an obligation
or exception. Multiple terms may share a span, and one term may have multiple evidence anchors.

Never “repair” a span by changing the source excerpt. If the source revision changed, stop and request a regenerated
context/source index.

## Scope is structure

Negation and modality apply to propositions, not flattened event flags. “The operator did not confirm that Ana opened
the gate” negates the confirmation, not the opening. A conditional, exception, quotation, hypothetical example, table
note, and section-level definition each create a context that can change how a claim is used.

Keep these distinctions structural:

- asserted event versus report of that event;
- obligation, permission, prohibition, prediction, and possibility;
- negated proposition versus absence of a proposition;
- general policy versus scoped exception or specialization;
- narrator world versus quoted, hypothetical, or counterfactual world.

Do not move a term from an alternative or reported context into the main context merely because a rule can then match
it.

## Alternative readings

Use alternatives when two or more incompatible readings remain admissible, such as unresolved pronoun identity,
classification, attachment, temporal order, or authority scope. Share only observations common to all readings. Attach
confidence as metadata when justified, but do not collapse alternatives by selecting the highest score.

The runtime evaluates admitted alternatives separately and may aggregate a finding as robust, conditional, or
conflicting. The task materializer does not perform that aggregation.

## Coverage and absence

Coverage is a positive claim about the materialization procedure. It says a named concept or relation was exhaustively
observed in an exact source scope under a stated evidence policy. It is not inferred from finishing the file.

Examples:

- a complete table of legal exceptions in one policy section may close `LegalObligation` for that section;
- reading an entire novel does not automatically close every omitted transition between two scenes;
- a search for a literal word does not close a semantic concept with multiple lexical forms;
- a source that refers to external appendices cannot support document-wide closure for their contents.

If coverage is open or partial, keep it so. Circuits that depend on absence will return `UNKNOWN` or request targeted
refinement.

## Evidence policy

Preserve whether a claim is explicit, inferred, proposed, or verified. A circuit may accept only explicit or verified
evidence for a critical premise while permitting proposed materialization for a heuristic analysis. Never promote a
proposed coreference, normalized date, or authority classification merely to satisfy the demand.
