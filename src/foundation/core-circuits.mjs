function stateConsistencyCircuit() {
  return {
    kind: 'CircuitJS',
    id: 'foundation.logical-consistency',
    version: '1.0.0',
    description: 'Report explicit polarity and mutually-exclusive state conflicts recognized by foundation-core.',
    sourceRuleReferences: ['builtin:foundation-core@1#bounded-non-contradiction'],
    inputs: {
      assertions: {
        type: 'foundation.state-assertion@1',
        cardinality: 'many',
        statuses: ['extracted'],
        coverage: 'open-world',
        critical: true
      }
    },
    nodes: [{
      id: 'candidates',
      primitive: 'call',
      operator: 'foundation.state-conflicts@1',
      inputs: { assertions: { $port: 'assertions' } }
    }, {
      id: 'verified',
      primitive: 'verify',
      verifier: 'foundation.state-conflicts@1',
      inputs: { candidates: { $node: 'candidates' } }
    }, {
      id: 'findings',
      primitive: 'emit',
      inputs: { verified: { $node: 'verified' } }
    }],
    outputs: { findings: { $node: 'findings' } },
    budgets: { nodes: 8, wallTimeMs: 2000 }
  };
}

function temporalConsistencyCircuit() {
  return {
    kind: 'CircuitJS',
    id: 'foundation.temporal-consistency',
    version: '1.0.0',
    description: 'Report directed cycles in explicit before relations recognized by foundation-core.',
    sourceRuleReferences: ['builtin:foundation-core@1#strict-before-acyclicity'],
    inputs: {
      relations: {
        type: 'foundation.temporal-relation@1',
        cardinality: 'many',
        statuses: ['extracted'],
        coverage: 'open-world',
        critical: true
      }
    },
    nodes: [{
      id: 'candidates',
      primitive: 'call',
      operator: 'foundation.temporal-cycles@1',
      inputs: { relations: { $port: 'relations' } }
    }, {
      id: 'verified',
      primitive: 'verify',
      verifier: 'foundation.temporal-cycles@1',
      inputs: { candidates: { $node: 'candidates' } }
    }, {
      id: 'findings',
      primitive: 'emit',
      inputs: { verified: { $node: 'verified' } }
    }],
    outputs: { findings: { $node: 'findings' } },
    budgets: { nodes: 8, wallTimeMs: 2000 }
  };
}

function arithmeticConsistencyCircuit() {
  return {
    kind: 'CircuitJS',
    id: 'foundation.arithmetic-consistency',
    version: '1.0.0',
    description: 'Report false exact decimal equalities and division by zero recognized by foundation-core.',
    sourceRuleReferences: ['builtin:foundation-core@1#exact-arithmetic'],
    inputs: {
      assertions: {
        type: 'foundation.arithmetic-assertion@1', cardinality: 'many',
        statuses: ['extracted'], coverage: 'open-world', critical: true
      }
    },
    nodes: [{
      id: 'candidates', primitive: 'call', operator: 'foundation.arithmetic-conflicts@1',
      inputs: { assertions: { $port: 'assertions' } }
    }, {
      id: 'verified', primitive: 'verify', verifier: 'foundation.arithmetic-conflicts@1',
      inputs: { candidates: { $node: 'candidates' } }
    }, {
      id: 'findings', primitive: 'emit', inputs: { verified: { $node: 'verified' } }
    }],
    outputs: { findings: { $node: 'findings' } },
    budgets: { nodes: 8, wallTimeMs: 2000 }
  };
}

function physicalConsistencyCircuit() {
  return {
    kind: 'CircuitJS',
    id: 'foundation.physical-consistency',
    version: '1.0.0',
    description: 'Report elementary quantity, unit, and physical-bound inconsistencies.',
    sourceRuleReferences: [
      'builtin:foundation-core@1#exact-quantity-consistency',
      'builtin:foundation-core@1#bounded-physical-quantities'
    ],
    inputs: {
      assertions: {
        type: 'foundation.quantity-assertion@1', cardinality: 'many',
        statuses: ['extracted'], coverage: 'open-world', critical: true
      }
    },
    nodes: [{
      id: 'candidates', primitive: 'call', operator: 'foundation.physical-conflicts@1',
      inputs: { assertions: { $port: 'assertions' } }
    }, {
      id: 'verified', primitive: 'verify', verifier: 'foundation.physical-conflicts@1',
      inputs: { candidates: { $node: 'candidates' } }
    }, {
      id: 'findings', primitive: 'emit', inputs: { verified: { $node: 'verified' } }
    }],
    outputs: { findings: { $node: 'findings' } },
    budgets: { nodes: 8, wallTimeMs: 2000 }
  };
}

function emotionalConsistencyCircuit() {
  return {
    kind: 'CircuitJS',
    id: 'foundation.emotional-consistency',
    version: '1.0.0',
    description: 'Report explicit emotion polarity, disjoint type, and inanimate emotion inconsistencies.',
    sourceRuleReferences: [
      'builtin:foundation-core@1#emotion-polarity-consistency',
      'builtin:foundation-core@1#disjoint-foundation-types',
      'builtin:foundation-core@1#inanimate-emotion-attribution'
    ],
    inputs: {
      emotions: {
        type: 'foundation.emotion-assertion@1', cardinality: 'many',
        statuses: ['extracted'], coverage: 'open-world', critical: true
      },
      types: {
        type: 'foundation.type-assertion@1', cardinality: 'many',
        statuses: ['extracted'], coverage: 'open-world', critical: true
      }
    },
    nodes: [{
      id: 'candidates', primitive: 'call', operator: 'foundation.emotional-conflicts@1',
      inputs: { emotions: { $port: 'emotions' }, types: { $port: 'types' } }
    }, {
      id: 'verified', primitive: 'verify', verifier: 'foundation.emotional-conflicts@1',
      inputs: { candidates: { $node: 'candidates' } }
    }, {
      id: 'findings', primitive: 'emit', inputs: { verified: { $node: 'verified' } }
    }],
    outputs: { findings: { $node: 'findings' } },
    budgets: { nodes: 8, wallTimeMs: 2000 }
  };
}

function foundationCoreCircuitSources() {
  return [
    stateConsistencyCircuit(), temporalConsistencyCircuit(), arithmeticConsistencyCircuit(),
    physicalConsistencyCircuit(), emotionalConsistencyCircuit()
  ];
}

export {
  arithmeticConsistencyCircuit,
  emotionalConsistencyCircuit,
  foundationCoreCircuitSources,
  physicalConsistencyCircuit,
  stateConsistencyCircuit,
  temporalConsistencyCircuit
};
