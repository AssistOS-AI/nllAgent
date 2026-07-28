# NaturalLanguageLinterAgent report

- Agent: `editorial-demo`
- Release: `1.0.0`
- Source digest: `sha256:79818f1ed2fa72966f8a6958dba9821b599f2ab02979ffe60ac44672a0fdbdd9`
- Terminal status: `reported`
- Compatibility: `compatible`
- Active circuits: `editorial.weak-phrase`
- Blocked circuits: None

## Coverage

- `view:whole`: closed-world for `document.block@1`, `document.paragraph@1`, `document.heading@1`, `document.sentence@1` via `markdown-structural@1`.
- `view:whole`: closed-world for `document.line@1`, `document.list-item@1`, `document.quote@1`, `document.code-block@1`, `document.thematic-break@1` via `markdown-structural@1`.

## Findings

### 1. ED-001

- Verdict: `editorial-warning`
- Severity: `warning`
- Guarantee: `mechanically-certified`
- Location: Unicode code points 37–44
- Rule basis: authority/style-guide.md#rule-ed-001-weak-phrase-in-narration

> De fapt

The narrative paragraph contains the weak phrase “de fapt”.

Remediation: Check whether the contrast is necessary; remove or replace the phrase when it adds no meaning.

Limitations: This release treats every Markdown paragraph as narration and does not infer dialogue.
