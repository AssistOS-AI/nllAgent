# nllAgent audit

- Agent: narrative-continuity
- Run: isolated-analysis
- Status: reported-with-limits
- Source: agentsEval/narrative-continuity/task/task/input.md@working
- Foundation: off
- Findings: 1

## warning: object-used-without-retrieval

The brass key is used after being left elsewhere, with no retrieval in the closed interval.

- Evidence: agentsEval/narrative-continuity/task/task/input.md@working:390-431 — “Mara left the brass key in the boathouse.”
- Evidence: agentsEval/narrative-continuity/task/task/input.md@working:3885-3927 — “Mara used the brass key in the hill tower.”
- Evidence: agentsEval/narrative-continuity/task/task/input.md@working:4356-4434 — “The account between leaving the brass key and using the brass key is complete.”

## Limits

- identity-unresolved
- retrieval-coverage-open
- coverage-identity-mismatch
- retrieval-coverage-unknown
- no-qualifying-leave-observation
