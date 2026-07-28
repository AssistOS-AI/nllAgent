export default circuit({
  kind: 'CircuitJS',
  purpose: 'generation',
  id: 'editorial.cnl-plan',
  version: '1.0.0',
  description: 'Compile a Romanian editorial brief into a CNL bundle whose constraints retain their validation oracles.',
  sourceRuleReferences: [
    'authority/style-guide.md#rule-ed-001-weak-phrase-in-narration',
    'authority/style-guide.md#rule-ed-002-repeated-parcă-in-one-narrative-paragraph'
  ],
  inputs: {
    brief: {
      type: 'document.line@1', cardinality: 'at-least-one', statuses: ['extracted'],
      coverage: 'closed-world', critical: true
    }
  },
  nodes: [
    {
      id: 'candidate-plan', primitive: 'call', operator: 'generation.cnl-plan@1',
      inputs: {
        brief: port('brief'),
        constraints: [
          {
            kind: 'CNLConstraint', schemaVersion: 1, id: 'ED-001', modality: 'must-not',
            instruction: 'Use the whole phrase “de fapt” in narrative Markdown paragraphs.',
            scope: 'narrative Markdown paragraph; dialogue lines beginning with an em dash or en dash and fenced code are excluded',
            priority: 'required',
            verification: { circuit: 'editorial.weak-phrase@2.1.0', rule: 'ED-001' },
            sourceRuleReferences: ['authority/style-guide.md#rule-ed-001-weak-phrase-in-narration']
          },
          {
            kind: 'CNLConstraint', schemaVersion: 1, id: 'ED-002', modality: 'must',
            instruction: 'Keep the whole word “parcă” at no more than two occurrences in each narrative Markdown paragraph.',
            scope: 'each narrative Markdown paragraph independently; dialogue lines beginning with an em dash or en dash and fenced code are excluded',
            priority: 'required',
            verification: { circuit: 'editorial.parca-frequency@2.1.0', rule: 'ED-002' },
            sourceRuleReferences: ['authority/style-guide.md#rule-ed-002-repeated-parcă-in-one-narrative-paragraph']
          }
        ]
      }
    },
    {
      id: 'verified-plan', primitive: 'verify', verifier: 'generation.cnl-plan@1',
      inputs: { candidates: node('candidate-plan') }
    },
    { id: 'published-plan', primitive: 'emit', inputs: { verified: node('verified-plan') } }
  ],
  outputs: { plan: node('published-plan') },
  budgets: { nodes: 12, wallTimeMs: 5000 }
});
