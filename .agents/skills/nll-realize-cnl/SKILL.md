---
name: nll-realize-cnl
description: Realize or minimally revise Markdown from a circuit-produced CNLGenerationPlan. Use only for the optional final-text stage of an nllAgent planning run; the CNL plan itself is the primary product and must not be rewritten as a constraint list.
---

# Realize a CNL generation plan

## Contract

Treat the supplied `CNLGenerationPlan` as the complete, ordered specification for one document. It was already derived from the source idea by qualified CircuitJS planning circuits. Do not reinterpret the authority corpus, invent additional rules, or convert the plan into another DSL.

Return only JSON compatible with the requested schema:

```json
{"document":"complete Markdown document"}
```

The `document` value must contain the complete requested text, not an outline, commentary, or a description of what should be written.

## Initial realization

1. Preserve every explicit fact in `sourceIdea`.
2. Follow `contentPlan` in order and satisfy each step's instruction and required content.
3. Apply `realizationGuidance` throughout the document.
4. Respect the declared document type, audience, language, and purpose.
5. Do not mention the CNL plan, circuits, validation, or internal rule identifiers in the document.
6. Do not claim that the result is compliant. Validation is performed separately by nllAgent.

## Revision

When the request includes a previous document and structured validation findings:

1. Keep all text that does not contribute to a finding.
2. Make the smallest changes that address the cited findings.
3. Preserve the source idea and every unaffected plan step.
4. Return the complete revised document in the same JSON shape.

If a finding conflicts with the plan, preserve the plan and make no unsupported repair. The runtime, not this skill, decides whether another revision or human review is required.
