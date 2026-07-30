# Architecture experiment decisions

These experiments turn the five formerly open architecture questions into executable counterexamples. Run them with
`node experiments/architecture/run.mjs`.

1. Source entities and anchored events require explicit identities. Immutable values and derived terms use structural
   identity, which preserves useful deduplication without merging two people merely because their names match.
2. An ontology behavior receives only one local value. If it needs store queries, evidence, a world, priority, or an
   exception, it is a CircuitJS rule or stage.
3. Alternative contexts remain factorized over a shared base and are enumerated only when demanded. The fixture reduces
   262,144 eager worlds to 12 relevant compatible worlds without confidence-based pruning.
4. A model artifact is reusable only for an exact semantic request key containing source, prompt, model, adapter,
   ontology, evidence policy, role, and context. Accepted output is frozen; a fresh inference is a new artifact.
5. Verified controlled language requires exact normalized equivalence of critical semantic slots. Surface wording may
   vary only when the paired parser reconstructs the same frame.
