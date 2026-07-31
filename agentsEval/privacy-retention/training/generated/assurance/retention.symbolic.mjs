import {
  branchDecision, concolicTrace, generateBranchGoals, pathCondition, replayWitness,
  symbolicPredicate, symbolicVariable, witness, witnessReplayProtocol
} from '../../../../../src/interpreters/index.mjs';

const duration = symbolicVariable('duration');
const documented = symbolicVariable('documented');
const coverage = symbolicVariable('coverage');
const exceeds = symbolicPredicate('>', duration, 5);

const seedTrace = concolicTrace(
  'retention-six-years-closed-no-exception',
  branchDecision('duration-limit', exceeds, true),
  branchDecision('documented-exception', symbolicPredicate('===', documented, false), true),
  branchDecision('exception-coverage', symbolicPredicate('===', coverage, 'closed'), true)
);

const violationWitness = witness(
  'retention-violation-six-years',
  new Map([['duration', 6], ['documented', false], ['coverage', 'closed']]),
  pathCondition(...seedTrace.decisions),
  'retention-violated'
);

function branchGoals() {
  return generateBranchGoals(seedTrace);
}

function concreteWitnessProtocol(analyze) {
  return witnessReplayProtocol(
    (candidate) => candidate.assignments,
    async (assignments) => {
      const years = assignments.get('duration');
      const hasDocumented = assignments.get('documented');
      const coverageState = assignments.get('coverage');
      const exception = hasDocumented
        ? '\nEXCEPTION | retention=W1 | status=documented | authority=Fictional Witness Act | until=2032-01-01\n'
        : '';
      const text = [
        '# Symbolic witness replay',
        '',
        `RETENTION | id=W1 | category=witness-category | years=${years} | scope=scope-w1`,
        exception,
        `COVERAGE | scope=scope-w1 | exceptions=${coverageState}`,
        ''
      ].join('\n');
      return analyze(text, 'symbolic-witness.md');
    },
    (analysis, candidate) => analysis.findings.some((finding) =>
      finding.value('findingType') === candidate.expected)
  );
}

async function replayViolationWitness(analyze) {
  return replayWitness(violationWitness, concreteWitnessProtocol(analyze));
}

export {
  branchGoals, concreteWitnessProtocol, replayViolationWitness, seedTrace, violationWitness
};

