---
id: DS010
title: Semantic Demand, Compatibility, and Coverage
status: implemented
owner: nllAgent maintainers
summary: Defines demand derivation, signature and operational compatibility, coverage-sensitive absence, and local blocking.
---

# Introduction

Loading valid source and circuit modules does not prove that a document can satisfy a circuit's semantic requirements.

# Core Content

The runtime derives `SemanticDemand` from patterns, stage read contracts, capability contracts, evidence policies,
identity/time operations, and coverage-sensitive absence. Compatibility compares that demand with the sealed ontology,
materialized store, available circuits, tools, models, dialects, and declared scope closure.

Signature compatibility checks exact concept and role identities. Operational compatibility checks requested services.
Coverage compatibility checks whether the relevant concept and scope are complete enough for a negative conclusion.
Failure is local to the dependent graph and produces `BLOCKED_ONTOLOGY`, `BLOCKED_CAPABILITY`, or `UNKNOWN`.

Partial independent findings may be returned, but a required global assessment remains blocked when one mandatory branch
is incomplete. Open-world empty results never prove absence. A producer cannot assert closed coverage beyond its
declared method and scope.

# Decisions & Questions

### Question #1: May an ontology cast be inferred from similar names?

Response: No. Compatibility uses exact imported identity and explicit subtype or conversion relations. Similar spelling
is evidence for an authoring proposal, not a runtime cast.

### Question #2: Can one gap stop every circuit?

Response: Only circuits depending on that demand are blocked. Aggregators must distinguish completed partial outputs
from a final assessment whose mandatory inputs are missing.

### Question #3: How does authoring use SemanticDemand?

Response: LongText materializers and Coding Agent skills inspect it to prioritize relevant concepts without treating the
demand as permission to invent facts or ignore other source meaning.
