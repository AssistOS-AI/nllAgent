# nllAgent audit

- Agent: privacy-retention
- Run: isolated-analysis
- Status: reported-with-limits
- Source: agentsEval/privacy-retention/analysis-task/task/input.md@working
- Foundation: off
- Findings: 6

## error: retention-violated

RET-001 assessment for R1 (support-transcript): VIOLATED; 7 years.

- Evidence: agentsEval/privacy-retention/analysis-task/task/input.md@working:1877-1951 — “RETENTION | id=R1 | category=support-transcript | years=7 | scope=scope-r1”
- Evidence: agentsEval/privacy-retention/analysis-task/task/input.md@working:1953-1998 — “COVERAGE | scope=scope-r1 | exceptions=closed”

## info: retention-accepted-exception

RET-001 assessment for R2 (tax-invoice): ACCEPTED_EXCEPTION; 8 years.

- Evidence: agentsEval/privacy-retention/analysis-task/task/input.md@working:2965-3032 — “RETENTION | id=R2 | category=tax-invoice | years=8 | scope=scope-r2”
- Evidence: agentsEval/privacy-retention/analysis-task/task/input.md@working:3034-3146 — “EXCEPTION | retention=R2 | status=documented | authority=Fictional Tax Records Act section 41 | until=2032-12-31”

## info: retention-satisfied

RET-001 assessment for R3 (customer-profile): SATISFIED; 5 years.

- Evidence: agentsEval/privacy-retention/analysis-task/task/input.md@working:3990-4062 — “RETENTION | id=R3 | category=customer-profile | years=5 | scope=scope-r3”

## warning: retention-unknown

RET-001 assessment for R4 (research-interview): UNKNOWN; 9 years.

- Evidence: agentsEval/privacy-retention/analysis-task/task/input.md@working:4862-4936 — “RETENTION | id=R4 | category=research-interview | years=9 | scope=scope-r4”
- Evidence: agentsEval/privacy-retention/analysis-task/task/input.md@working:4938-4981 — “COVERAGE | scope=scope-r4 | exceptions=open”

## error: retention-conflict

RET-001 assessment for R5 (fraud-case): CONFLICT; incompatible duration or exception evidence (9 years).

- Evidence: agentsEval/privacy-retention/analysis-task/task/input.md@working:5920-5986 — “RETENTION | id=R5 | category=fraud-case | years=9 | scope=scope-r5”
- Evidence: agentsEval/privacy-retention/analysis-task/task/input.md@working:5988-6109 — “EXCEPTION | retention=R5 | status=documented | authority=Fictional Financial Integrity Code article 12 | until=2031-06-30”
- Evidence: agentsEval/privacy-retention/analysis-task/task/input.md@working:6111-6193 — “EXCEPTION | retention=R5 | status=undocumented | authority=none | until=unresolved”

## error: retention-conflict

RET-001 assessment for R6 (marketing-suppression): CONFLICT; incompatible duration or exception evidence (3, 7 years).

- Evidence: agentsEval/privacy-retention/analysis-task/task/input.md@working:6998-7075 — “RETENTION | id=R6 | category=marketing-suppression | years=3 | scope=scope-r6”
- Evidence: agentsEval/privacy-retention/analysis-task/task/input.md@working:7077-7154 — “RETENTION | id=R6 | category=marketing-suppression | years=7 | scope=scope-r6”

## Limits

- ontology
