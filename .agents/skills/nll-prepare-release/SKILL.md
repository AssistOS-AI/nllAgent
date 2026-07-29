---
name: nll-prepare-release
description: Prepare a NaturalLanguageLinterAgent candidate for an explicit manual publication command without changing publication checks, benchmark expectations, published releases, or the active pointer. Use as the final skill of a controlled learning run.
---

# Prepare a NaturalLanguageLinterAgent Candidate

Treat candidate preparation as development work, not as publication. This skill checks that an existing candidate is coherent and reports what remains before a maintainer manually runs `nllagent release publish`.

## Required reading

Read `docs/specs/DS004-artifacts-releases.md`, `DS012-benchmarks-release-gate.md`, `DS013-learning-coding-agent-skills.md`, `DS015-security-governance.md`, `DS020-query-first-circuit-authoring.md`, and `DS021-foundation-ontology-validation.md`, the candidate manifest, the available benchmark report, and the declared limitations.

## Preparation checklist

1. Confirm that the candidate version matches its directory and that any lineage reference is real or omitted for the first baseline.
2. Confirm that every circuit statically compiles and every emit is verification-dominated.
3. Confirm exact operator, verifier, schema, extraction, compatibility, and authority versions.
4. Run the available public benchmark suites without changing their expected results.
5. Confirm that every `.circuit.mjs` passes the restricted loader and requests no undeclared effects or unbounded capability.
6. Describe changed outcomes, types, coverage, compatibility, guarantees, and likely reanalysis impact.
7. Record known limitations and the exact candidate version in the learning result.
8. Reject a candidate that claims an unsupported query-first dialect. When the host advertises support, require normalized query/table artifacts, QueryContracts, source maps, static diagnostics, generated graph digests, and the differential evidence mandated by that profile.
9. Reject a candidate that collides with a foundation circuit identifier, overstates a foundation observation's
   open-world meaning, or silently depends on core while claiming foundation-off compatibility.

## Authority boundary

Do not copy files into `releases/`, edit `active-release.json`, or invoke publication. The maintainer decides whether and when to run the manual publication command. Publication reruns the trusted checks and snapshots the candidate and benchmark.

## Failure behavior

If a preparation check fails, classify it and return to the appropriate earlier skill. Never weaken checks, rewrite expectations to match the candidate, suppress a failing family, or describe an unpublished candidate as a release.

## Completion check

Finish with the exact candidate version, public validation results, known limitations, and an explicit statement that manual publication has not occurred.
