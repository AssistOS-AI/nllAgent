function inclusiveComparatorMutant(years) {
  return years >= 5;
}

function exceptionDroppingMutant(years) {
  return years > 5 ? 'VIOLATED' : 'SATISFIED';
}

function forceClosedCoverageMutant(years, coverage) {
  const effectiveCoverage = coverage === 'open' ? 'closed' : coverage;
  return years > 5 && effectiveCoverage === 'closed' ? 'VIOLATED' : 'UNKNOWN';
}

export { exceptionDroppingMutant, forceClosedCoverageMutant, inclusiveComparatorMutant };
