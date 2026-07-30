# Editorial experiment guidance

This workspace is an executable example of the OntologyJS, LongTextJS, CircuitJS, and controlled-generation
architecture.

- `agent.mjs` is the only assembly root.
- Extend vocabulary under `ontologies/`.
- Describe source observations under `longtext/`; do not add findings there.
- Implement rules and full JavaScript algorithms under `circuits/`.
- Keep dialect renderers and parsers under `cnl/`.
- Every benchmark case contains `input.md` and `case.mjs`; expected values are typed benchmark DSL terms.
- Run `node bin/nllagent.mjs benchmark --agent editorial-demo` from the repository root after changes.
- Do not add a release pointer, candidate tree, generated schema, or parallel data representation.
- Preserve exact source spans, explicit evidence, open-world absence, and transactional circuit writes.
