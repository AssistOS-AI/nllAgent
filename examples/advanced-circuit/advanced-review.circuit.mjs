export default circuit({
  kind: 'CircuitJS',
  id: 'example.advanced-review',
  version: '1.0.0',
  description: 'Select narrative paragraphs and apply the trusted paragraph-length algorithm.',
  sourceRuleReferences: ['example:narrative-paragraphs-have-at-most-twelve-words'],
  inputs: {
    narrativeParagraphs: observationBinding({
      type: 'document.paragraph@1',
      cardinality: 'many',
      statuses: ['extracted'],
      coverage: 'closed-world',
      critical: true,
      where: [{ path: 'payload.structuralRole', operator: 'eq', value: 'paragraph' }]
    })
  },
  nodes: [{
    id: 'lengthCandidates',
    primitive: 'call',
    operator: 'example.paragraph-length@1',
    inputs: { paragraphs: binding('narrativeParagraphs'), maximumWords: 12 }
  }, {
    id: 'verifiedLengths',
    primitive: 'verify',
    verifier: 'example.paragraph-length@1',
    inputs: { candidates: node('lengthCandidates') }
  }, {
    id: 'findings',
    primitive: 'emit',
    inputs: { verified: node('verifiedLengths') }
  }],
  outputs: { findings: node('findings') },
  budgets: { nodes: 3, wallTimeMs: 1000 }
});
