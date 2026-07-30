---
id: DS019
title: Controlled Natural Language and Generation
status: implemented
owner: nllAgent maintainers
summary: Defines CNLFrame, paired dialects, exact semantic round-trip, model-assisted documents, reanalysis, and assurance.
---

# Introduction

Controlled generation constructs meaning before wording and checks meaning after wording.

# Core Content

`CNLFrame` is an opaque typed value with a frame kind and named semantic slots. A `CnlDialect` pairs one deterministic
renderer with one parser. Rendering is verified only when parsing reconstructs the same kind and every critical and
declared slot: actor, modality, action, object, negation, time, condition, exception, authority, and domain slots.

The renderer never invents a missing slot. It rejects the frame or requests clarification. Lexical variation is allowed
only when the paired parser reconstructs an equivalent frame. Modal weakening, lost exceptions, changed negation,
different actors, or changed deadlines fail round-trip.

Longer prose may be model-assisted. A circuit first emits a semantic plan and evidence set, then calls a writer. The
result is a `GeneratedDocument` linked to plan and model artifact. It returns through LongTextJS and audit circuits;
plausibility is not semantic verification.

# Decisions & Questions

### Question #1: Which equivalence rule was selected?

Response: `experiments/architecture/cnl-equivalence.experiment.mjs` accepts a surface variant with identical slots and
rejects lost exception or weakened modality. Exact normalized slot equivalence is normative for verified CNL.

### Question #2: Can a free-text report be called CNL?

Response: Only if a declared dialect parser reconstructs the full required frame and the comparator accepts it.
Otherwise it is explicitly model-assisted or human-authored prose with a different assurance level.

### Question #3: What is implemented now?

Response: Opaque frames, paired dialects, exact comparison, deterministic verified rendering, a working editorial plan
dialect, and generated-document identity are implemented. Automated CLI realization reanalysis and revision remain
partial.
