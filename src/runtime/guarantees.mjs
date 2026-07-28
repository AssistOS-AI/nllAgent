const GUARANTEE_ORDER = Object.freeze([
  'review-required',
  'model-judgment',
  'evidence-certified',
  'human-confirmed',
  'mechanically-certified'
]);

const STATUS_CEILINGS = Object.freeze({
  unknown: 'review-required',
  assumed: 'review-required',
  proposed: 'evidence-certified',
  derived: 'evidence-certified',
  given: 'mechanically-certified',
  extracted: 'mechanically-certified',
  certified: 'mechanically-certified',
  'human-confirmed': 'human-confirmed'
});

function guaranteeMeet(...levels) {
  const defined = levels.flat().filter((level) => level && level !== 'candidate' && level !== 'rejected');
  if (!defined.length) return null;
  let weakest = GUARANTEE_ORDER.length - 1;
  for (const level of defined) {
    const rank = GUARANTEE_ORDER.indexOf(level);
    if (rank < 0) throw new TypeError(`Unknown guarantee level ${level}.`);
    weakest = Math.min(weakest, rank);
  }
  return GUARANTEE_ORDER[weakest];
}

function guaranteeCeilingFromValue(value, ceilings = []) {
  if (Array.isArray(value)) {
    for (const item of value) guaranteeCeilingFromValue(item, ceilings);
  } else if (value && typeof value === 'object') {
    if (value.guaranteeCeiling) ceilings.push(value.guaranteeCeiling);
    else if (value.guarantee && GUARANTEE_ORDER.includes(value.guarantee)) ceilings.push(value.guarantee);
    if (STATUS_CEILINGS[value.status]) ceilings.push(STATUS_CEILINGS[value.status]);
    for (const item of Object.values(value)) guaranteeCeilingFromValue(item, ceilings);
  }
  return guaranteeMeet(ceilings);
}

function verifiedGuarantee(candidate, verifierGuarantee = 'mechanically-certified') {
  return guaranteeMeet(candidate?.guaranteeCeiling, verifierGuarantee) || verifierGuarantee;
}

function guaranteeSatisfies(available, required) {
  if (!required) return true;
  if (required === 'mechanically-certified') return available === required;
  if (required === 'human-confirmed') return available === required;
  const availableRank = GUARANTEE_ORDER.indexOf(available);
  const requiredRank = GUARANTEE_ORDER.indexOf(required);
  return availableRank >= requiredRank && requiredRank >= 0;
}

export {
  GUARANTEE_ORDER,
  STATUS_CEILINGS,
  guaranteeCeilingFromValue,
  guaranteeMeet,
  guaranteeSatisfies,
  verifiedGuarantee
};
