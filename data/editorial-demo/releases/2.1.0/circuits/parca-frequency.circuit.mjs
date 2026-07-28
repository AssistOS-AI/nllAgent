export default circuit({
  kind: 'CircuitJS',
  id: 'editorial.parca-frequency',
  version: '2.1.0',
  description: 'Enforce a maximum of two whole-word “parcă” occurrences per narrative paragraph.',
  sourceRuleReferences: ['authority/style-guide.md#rule-ed-002-repeated-parcă-in-one-narrative-paragraph'],
  generation: {
    constraints: [{
      kind: 'CNLConstraint', schemaVersion: 1, id: 'ED-002', modality: 'must',
      instruction: 'Keep the whole word “parcă” at no more than two occurrences in each narrative Markdown paragraph.',
      scope: 'each narrative Markdown paragraph independently; dialogue lines beginning with an em dash or en dash and fenced code are excluded',
      priority: 'required',
      verification: { circuit: 'editorial.parca-frequency@2.1.0', rule: 'ED-002' },
      sourceRuleReferences: ['authority/style-guide.md#rule-ed-002-repeated-parcă-in-one-narrative-paragraph']
    }]
  },
  inputs: {
    paragraphs: {
      type: 'document.paragraph@1', cardinality: 'many', statuses: ['extracted'],
      coverage: 'closed-world', critical: true
    }
  },
  nodes: [
    {
      id: 'excesses', primitive: 'call', operator: 'text.frequency-threshold@1',
      inputs: {
        observations: port('paragraphs'),
        rules: [{
          id: 'ED-002', term: 'parcă', maximum: 2, wholeWord: true, caseSensitive: false,
          locale: 'ro', scopeKinds: ['document.paragraph@1'], excludedPrefixes: ['—', '–'],
          verdict: 'editorial-warning', severity: 'warning',
          explanation: 'The same narrative paragraph repeats “parcă” above the approved limit of two.',
          remediation: 'Keep at most two occurrences in this paragraph or vary the construction.',
          limitations: ['The threshold is evaluated independently for every Markdown paragraph.'],
          sourceRuleReferences: ['authority/style-guide.md#rule-ed-002-repeated-parcă-in-one-narrative-paragraph']
        }]
      }
    },
    { id: 'verified', primitive: 'verify', verifier: 'text.frequency-threshold@1', inputs: { candidates: node('excesses') } },
    { id: 'findings', primitive: 'emit', inputs: { verified: node('verified') } }
  ],
  outputs: { findings: node('findings') },
  budgets: { nodes: 12, wallTimeMs: 5000 }
});
