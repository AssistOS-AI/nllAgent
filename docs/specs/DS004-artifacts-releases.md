---
id: DS004
title: Artifacts, Releases, and Reproducibility
status: accepted
owner: nllAgent maintainers
summary: Defines canonical serialization, digests, immutable validation and planning packages, semantic versioning, lineage, and replay.
---

# Introduction

Reproducibility depends on stable artifact identities rather than conversation history. This specification defines the canonical package and version rules shared by production and learning.

# Core Content

## Planning release surface

`planningCircuits` is an optional release-manifest array distinct from validation `circuits`. Validation circuits do not embed CNL projections. Manual publication compiles and aligns both circuit families and includes both in observation-contract bundles and semantic diff. Idea-specific CNL plans and optional realizations never enter the release package.

## Runtime CNL products

The release produces two run-owned CNL profiles. `CNLAuditReport` (`CNL/Audit-1`) binds an existing source digest to terminal status, compatibility, coverage, verified audit observations, findings, conflicts, limitations, and any issue. `CNLGenerationPlan` (`CNL/Plan-1`) binds an idea digest to document design, ordered content, realization guidance, provenance, and verified rule-to-plan applications. Markdown renderings are deterministic views and do not replace these canonical objects.

## Canonical data

Persistent semantic artifacts must be JSON-compatible values serialized with recursively sorted object keys, preserved array order, UTF-8 encoding, and a final newline. Hash identifiers must use SHA-256 over canonical bytes and include the `sha256:` prefix. Timestamps, latency, retry duration, process identifiers, and local absolute paths must not enter semantic hashes.

Every schema, extractor profile, circuit, operator reference, verifier reference, compatibility profile, explanation policy, benchmark manifest, and release manifest must carry a stable identifier and version. Production references must resolve to exact versions and digests. Ranges and `latest` are authoring conveniences only and must be locked before publication.

## Release package

A newly authored release manifest has kind `NaturalLanguageLinterRelease`. A release must contain or lock:

- the theory package and canonical CircuitJS graphs;
- LongTextJS schemas and observation contracts;
- extraction profiles and neutral observation demands;
- operator and verifier registry references;
- explanation policies and finding contracts;
- compatibility profiles and operational-context requirements;
- benchmark policy plus the identities and results of suites used during publication;
- an immutable snapshot of every natural benchmark case actually executed by the publication command;
- threshold and mutation policy;
- model profile digest;
- semantic diff from its parent;
- the statically derived observation contracts and producer-consumer alignment report;
- known limitations and publication record;
- reproduction recipe.

The release directory becomes immutable after manual publication. The publication command must verify every declared file digest, validate all critical observation consumers against structural, extraction, or adapter producers, and prove that both candidate files and agent benchmark files remained stable while tests ran. It copies the tested candidate and benchmark cases into a temporary release directory, rechecks both copied snapshots, adds trusted check artifacts, and atomically renames it into the immutable version path. A failed copy or build removes only that temporary directory and cannot leave a partial version. The derived contracts, alignment matrix, benchmark results, and `publication.json` record are copied into the release even when the author did not provide separate files. Loading checks both directions: every declared file must exist with the published digest, and every regular file other than `release.json` and `publication.json` must appear in the manifest. After loading the new release successfully, the same command atomically writes the active pointer containing the release identifier and manifest digest.

## Versioning and lineage

Release identifiers are exact and maintainer-assigned. Semantic versioning is recommended when it communicates real changes: patch for implementation corrections, minor for compatible additions, and major for changed meaning or compatibility. The runtime does not infer or increment versions, and examples must not invent a lineage. The repository MVP begins with the real baseline `0.1.0`; a first candidate may omit a parent.

Lineage may branch. A challenger may target a new domain or interpretation without replacing the current champion. Findings and runs remain permanently linked to the exact release that produced them. Migration must never rewrite historical anchors, findings, certificates, captures, or reports.

## Reproduction

Deterministic replay must use the captured source, release, operational context, and model captures. If all operator inputs and captures are available, replay must reproduce the same semantic trace and report apart from explicitly non-semantic telemetry. If a fresh model call is required, the operation is rerun, not replayed, and receives a new run identifier.

# Decisions & Questions

### Question #1: Why use canonical JSON rather than JavaScript module exports for release artifacts?

Response: Canonical JSON remains the persisted comparison form. Circuit authors may use restricted `.circuit.mjs`; the loader evaluates only the DSL expression and immediately normalizes it to plain JSON before static circuit analysis. Release identity is computed from the normalized content, so authoring syntax does not change runtime semantics.

### Question #2: Are published releases physically write-protected?

Response: The library records local file digests at publication, refuses in-place release writes through its API, and checks the snapshot whenever it loads the release. The mechanism is deliberately simple and detects accidental or out-of-band changes in the project workspace.

### Question #3: What happens when a benchmark expected result changes because policy changed?

Response: The benchmark receives a new version and the theory release is major when existing valid outcomes change. Historical benchmark snapshots remain available for old-release reproduction.

### Question #4: Why snapshot candidate files both before and after publication checks?

Response: Benchmark success is meaningful only for the exact bytes that become the release. Comparing the candidate tree before and after the checks prevents concurrent or agentic edits from replacing a tested circuit during manual publication.

### Question #5: Which planning artifacts belong to a release rather than a run?

Response: A release may contain `planningCircuits`. Publication freezes and hashes them with schemas, validation circuits, authority mappings, and benchmarks. A run owns the idea-specific CNL plan and any optional realizations, captures, and validation attempts. Changing plan structure, content-selection logic, applied rule provenance, rule-to-plan witness semantics, or planning-circuit behavior is a semantic release change.

### Question #6: Does the MVP need an invented release history?

Response: No. New candidates use `NaturalLanguageLinterRelease`, and the repository starts with the real `0.1.0` baseline. Later releases exist only when a maintainer publishes an actual candidate. Version numbers communicate real package identity, not fictional maturity.

# Conclusion

Canonical content addressing, immutable releases, exact dependency locks, and explicit semantic versioning give every report a stable and reviewable identity.
