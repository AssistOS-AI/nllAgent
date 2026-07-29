export default circuit({
  kind: 'CircuitJS',
  id: 'example.paragraph-length',
  version: '1.0.0',
  description: 'Apply the example JavaScript paragraph-length extension.',
  sourceRuleReferences: ['example:paragraphs-must-have-at-most-twelve-words'],
  inputs: {
    paragraphs: {
      type: 'document.paragraph@1',
      cardinality: 'many',
      statuses: ['extracted'],
      coverage: 'closed-world',
      critical: true
    }
  },
  nodes: [{
    id: 'candidates',
    primitive: 'call',
    operator: 'example.paragraph-length@1',
    inputs: { paragraphs: port('paragraphs'), maximumWords: 12 }
  }, {
    id: 'verified',
    primitive: 'verify',
    verifier: 'example.paragraph-length@1',
    inputs: { candidates: node('candidates') }
  }, {
    id: 'findings',
    primitive: 'emit',
    inputs: { verified: node('verified') }
  }],
  outputs: { findings: node('findings') },
  budgets: { nodes: 3, wallTimeMs: 1000 }
});
