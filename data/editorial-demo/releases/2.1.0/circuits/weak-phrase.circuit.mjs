export default circuit({
  kind: 'CircuitJS',
  id: 'editorial.weak-phrase',
  version: '2.1.0',
  description: 'Find the whole phrase “de fapt” in narrative Markdown paragraphs and exclude dialogue lines.',
  sourceRuleReferences: ['authority/style-guide.md#rule-ed-001-weak-phrase-in-narration'],
  generation: {
    constraints: [{
      kind: 'CNLConstraint', schemaVersion: 1, id: 'ED-001', modality: 'must-not',
      instruction: 'Use the whole phrase “de fapt” in narrative Markdown paragraphs.',
      scope: 'narrative Markdown paragraph; dialogue lines beginning with an em dash or en dash and fenced code are excluded',
      priority: 'required',
      verification: { circuit: 'editorial.weak-phrase@2.1.0', rule: 'ED-001' },
      sourceRuleReferences: ['authority/style-guide.md#rule-ed-001-weak-phrase-in-narration']
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
      id: 'matches', primitive: 'call', operator: 'text.lexical-occurrences@1',
      inputs: {
        observations: port('paragraphs'),
        rules: [{
          id: 'ED-001', term: 'de fapt', wholeWord: true, caseSensitive: false,
          locale: 'ro', scopeKinds: ['document.paragraph@1'], excludedPrefixes: ['—', '–'],
          verdict: 'editorial-warning', severity: 'warning',
          explanation: 'The narrative paragraph contains the weak phrase “de fapt”.',
          remediation: 'Check whether the contrast is necessary; remove or replace the phrase when it adds no meaning.',
          limitations: ['Dialogue classification uses the released paragraph-prefix convention.'],
          sourceRuleReferences: ['authority/style-guide.md#rule-ed-001-weak-phrase-in-narration']
        }]
      }
    },
    { id: 'verified', primitive: 'verify', verifier: 'text.exact-match@1', inputs: { candidates: node('matches') } },
    { id: 'findings', primitive: 'emit', inputs: { verified: node('verified') } }
  ],
  outputs: { findings: node('findings') },
  budgets: { nodes: 12, wallTimeMs: 5000 }
});
