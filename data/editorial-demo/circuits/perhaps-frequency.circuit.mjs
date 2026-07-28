export default circuit({
  kind: 'CircuitJS',
  id: 'editorial.perhaps-frequency',
  version: '0.1.0',
  description: 'Enforce a maximum of two whole-word “perhaps” occurrences per narrative paragraph.',
  sourceRuleReferences: ['authority/style-guide.md#rule-ed-002-repeated-perhaps-in-one-narrative-paragraph'],
  inputs: {
    paragraphs: {
      type: 'document.paragraph@1',
      cardinality: 'many',
      statuses: ['extracted'],
      coverage: 'closed-world',
      critical: true
    }
  },
  nodes: [
    {
      id: 'excesses',
      primitive: 'call',
      operator: 'text.frequency-threshold@1',
      inputs: {
        observations: port('paragraphs'),
        rules: [{
          id: 'ED-002',
          term: 'perhaps',
          maximum: 2,
          wholeWord: true,
          caseSensitive: false,
          locale: 'en',
          scopeKinds: ['document.paragraph@1'],
          excludedPrefixes: ['—', '–'],
          verdict: 'editorial-warning',
          severity: 'warning',
          explanation: 'The same narrative paragraph repeats “perhaps” above the approved limit of two.',
          remediation: 'Keep at most two occurrences in this paragraph or vary the construction.',
          limitations: ['The threshold is evaluated independently for every Markdown paragraph.'],
          sourceRuleReferences: ['authority/style-guide.md#rule-ed-002-repeated-perhaps-in-one-narrative-paragraph']
        }]
      }
    },
    {
      id: 'verified',
      primitive: 'verify',
      verifier: 'text.frequency-threshold@1',
      inputs: { candidates: node('excesses') }
    },
    {
      id: 'findings',
      primitive: 'emit',
      inputs: { verified: node('verified') }
    }
  ],
  outputs: { findings: node('findings') },
  budgets: { nodes: 12, wallTimeMs: 5000 }
});
