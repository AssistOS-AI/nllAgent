---
id: DS006
title: Ingestion, Anchors, Structure, and Views
status: accepted
owner: nllAgent maintainers
summary: Defines format adapters, canonical Markdown ingestion, stable block identity, channels, source maps, incremental changes, and view materialization.
---

# Introduction

Ingestion converts untrusted source files into canonical source packages. Markdown is the required CLI input format, while the adapter contract supports future DOCX, PDF, HTML, text, table, email, and multimodal sources.

# Core Content

## Adapter contract

An adapter must declare supported media types, format version, channels, structural fidelity, hidden-content handling, offset mapping, deterministic behavior, resource limits, and known losses. It must produce source bytes or digest, canonical text, a block tree, channel declarations, source maps, diagnostics, and a structural coverage record.

The Markdown adapter must preserve the original UTF-8 file, line endings in source metadata, heading hierarchy, paragraphs, lists, block quotes, fenced code, thematic breaks, and blank-line boundaries. It must assign deterministic block identifiers based on structural path and local content digest. It must treat embedded HTML and links as data and must not fetch external resources.

The implemented adapter decodes input with fatal UTF-8 validation, records encoding, original digest, line-ending profile, channel declarations, and structure dialect, normalizes canonical line endings, and addresses ranges by Unicode code point. Block identifiers combine kind, heading path, local content digest, and a deterministic duplicate ordinal. Every generated anchor carries a structural path plus bounded prefix and suffix context. Physical-line observations preserve blank boundaries, while dedicated observations distinguish headings, paragraphs, list items, quotes, code blocks, thematic breaks, and heuristic sentences.

## Canonicalization and security

Ingestion must reject invalid UTF-8 unless an explicit replacement policy is selected. It must normalize line endings for canonical text while retaining the original digest. It must detect NUL bytes, bidirectional controls, suspicious invisible characters, oversized lines, embedded instructions, and format features not represented by the adapter. Detection produces diagnostics and possibly gaps; content is never executed.

## Segmentation

The structural compiler must derive line, heading, paragraph, sentence, list-item, quote, and code-block views for Markdown. Sentence segmentation may be heuristic and must declare its profile. Semantic boundaries such as narrative scenes or regulatory articles belong to versioned extraction profiles, not the universal Markdown adapter.

Chunking is an execution optimization only. Anchors and block identifiers remain global. Overlap windows must map back to canonical offsets and deduplicate observations by anchored identity. No circuit may treat a chunk boundary as semantic unless the source structure declares it.

## Anchor verification and relocation

Anchor creation must verify that the quote exactly matches canonical text at the declared internal range. On a changed source revision, relocation must try stable block identity, structural path, contextual selector, and controlled unique quote matching in that order. Relocated anchors become candidates requiring revalidation; historical anchors remain bound to the old revision.

## Views and indexes

Views must be reconstructible from their selection expression and source revision. Core indexes include lexical token and pattern indexes, block and heading indexes, mention indexes, temporal indexes, claim indexes, and dependency indexes. Indexes are derived caches and may be rebuilt; they are never the source of record.

## Incremental compilation

A change set identifies added, removed, changed, and moved blocks. The dependency graph must invalidate affected observations, states, findings, views, and coverage records while preserving independent artifacts. When safe incremental comparison is unavailable, the compiler must fall back to full compilation rather than reuse stale results.

# Decisions & Questions

### Question #1: Why is Markdown the only mandatory source adapter in the first complete repository implementation?

Response: The user contract explicitly supplies `.md` files. The architecture and registry implement all adapter boundaries, but claiming full-fidelity DOCX, PDF, spreadsheet, OCR, and multimodal parsing without dedicated dependencies and fixtures would be false. Missing adapters are explicit capabilities, not hidden omissions.

### Question #2: Are semantic scenes inferred during structural ingestion?

Response: No. Ingestion exposes objective structure. Scene segmentation is a domain observation with producer version, evidence, alternatives, and benchmark support.

### Question #3: Can an anchor quote be redacted in a report?

Response: Yes. The internal anchor retains the authorized source relation, while rendering applies access and redaction policy. A redacted report must not claim that the visible quote alone permits independent verification.

### Question #4: What happens when the Markdown source contains suspicious controls or malformed structure?

Response: NUL and configured oversized-line violations create critical source gaps. Bidirectional controls, invisible characters, instruction-like text, and unclosed fences create explicit diagnostics or non-critical gaps. Compatibility decides whether the declared task can continue; the adapter never executes embedded content.

### Question #5: Why store both an exact range and contextual selectors?

Response: The exact range proves the quote against the current source revision. Structural path and bounded context support controlled relocation after edits, but a relocated anchor remains a candidate and cannot silently inherit the old certificate.

# Conclusion

Ingestion provides a deterministic, secure, globally addressable source layer. Domain meaning is added later through explicit observation profiles rather than hidden inside format parsing.
