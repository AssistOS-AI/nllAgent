export {
  FOUNDATION_CORE,
  FOUNDATION_MODES,
  FOUNDATION_PRODUCER,
  FOUNDATION_TYPES,
  configureFoundation,
  foundationPackDescriptor,
  materializeFoundationCore,
  normalizeTerm,
  parseStateSentence,
  parseTemporalSentence
} from './core-ontology.mjs';
export {
  arithmeticConsistencyCircuit,
  emotionalConsistencyCircuit,
  foundationCoreCircuitSources,
  physicalConsistencyCircuit,
  stateConsistencyCircuit,
  temporalConsistencyCircuit
} from './core-circuits.mjs';
export {
  EXCLUSIVE_STATE_PAIRS,
  registerFoundationOperators,
  registerFoundationVerifiers,
  stateConflictCandidates,
  stateConflictRecords,
  temporalCycleCandidates,
  temporalCycleRecords,
  verifyFoundationCandidates
} from './core-reasoning.mjs';
export {
  FOUNDATION_CLASSES,
  FOUNDATION_MEASURES,
  MEASURE_UNITS,
  normalizeFoundationTerm,
  parseArithmeticSentence,
  parseEmotionSentence,
  parseQuantitySentence,
  typeAssertionFromState
} from './domain-ontology.mjs';
export {
  DECIMAL_PATTERN,
  MAX_DECIMAL_COMPONENT_DIGITS,
  compareExactDecimals,
  evaluateArithmeticPayload,
  parseExactDecimal,
  renderRational
} from './exact-arithmetic.mjs';
export {
  arithmeticCandidates,
  emotionalCandidates,
  emotionalViolationRecords,
  physicalCandidates,
  physicalViolationRecords,
  quantityBoundViolation,
  registerExtendedFoundationOperators,
  registerExtendedFoundationVerifiers,
  unitCompatible,
  verifyArithmeticCandidates,
  verifyEmotionalCandidates,
  verifyPhysicalCandidates
} from './extended-reasoning.mjs';
