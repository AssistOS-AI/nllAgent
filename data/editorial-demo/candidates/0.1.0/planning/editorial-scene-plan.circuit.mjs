export default circuit({
  kind: 'CircuitJS',
  purpose: 'planning',
  id: 'editorial.scene-cnl-plan',
  version: '0.1.0',
  description: 'Compile a prose idea into an ordered, idea-specific CNL generation plan under the published editorial theory.',
  sourceRuleReferences: [
    'authority/style-guide.md#rule-ed-001-weak-phrase-in-narration',
    'authority/style-guide.md#rule-ed-002-repeated-perhaps-in-one-narrative-paragraph'
  ],
  inputs: {
    idea: {
      type: 'document.line@1', cardinality: 'at-least-one', statuses: ['extracted'],
      coverage: 'closed-world', critical: true
    }
  },
  nodes: [
    {
      id: 'candidate-plan', primitive: 'call', operator: 'planning.cnl-plan@1',
      inputs: {
        idea: port('idea'),
        appliedRules: ['ED-001', 'ED-002'],
        sourceRuleReferences: [
          'authority/style-guide.md#rule-ed-001-weak-phrase-in-narration',
          'authority/style-guide.md#rule-ed-002-repeated-perhaps-in-one-narrative-paragraph'
        ],
        ruleApplications: [
          { rule: 'ED-001', planLocations: ['realizationGuidance:3', 'realizationGuidance:5'] },
          { rule: 'ED-002', planLocations: ['realizationGuidance:4', 'realizationGuidance:5'] }
        ],
        plan: {
          title: 'Plan for a controlled English literary scene',
          document: {
            type: 'short literary scene in Markdown', language: 'English',
            audience: 'adult literary readers',
            purpose: 'Realize the supplied idea as a coherent scene with concrete narrative prose.'
          },
          contentPlan: [
            {
              id: 'establish-scene',
              instruction: 'Open by establishing the people, place, time, and immediate atmosphere contained in the source idea.',
              requiredContent: ['Ground the scene in these supplied facts and intentions: {{idea}}']
            },
            {
              id: 'develop-action', dependsOn: ['establish-scene'],
              instruction: 'Develop the central action or tension through concrete perception, movement, and causally connected detail.'
            },
            {
              id: 'close-scene', dependsOn: ['develop-action'],
              instruction: 'Close on an action, image, or decision that resolves the immediate scene while preserving the supplied intent.'
            }
          ],
          realizationGuidance: [
            'Preserve every explicit fact and requested relation from the source idea.',
            'Use restrained, concrete narrative prose and keep the progression between plan steps visible.',
            'Do not use the whole phrase “in fact” in narrative paragraphs.',
            'Use the whole word “perhaps” no more than twice in any one narrative paragraph.',
            'Treat Markdown paragraphs beginning with an em dash or en dash as dialogue when applying the two editorial rules.'
          ]
        }
      }
    },
    { id: 'verified-plan', primitive: 'verify', verifier: 'planning.cnl-plan@1', inputs: { candidates: node('candidate-plan') } },
    { id: 'published-plan', primitive: 'emit', inputs: { verified: node('verified-plan') } }
  ],
  outputs: { plan: node('published-plan') },
  budgets: { nodes: 12, wallTimeMs: 5000 }
});
