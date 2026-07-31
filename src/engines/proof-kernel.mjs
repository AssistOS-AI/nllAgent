import { invariant } from '../core/errors.mjs';

const ESTABLISHED = 'ESTABLISHED';
const REFUTED = 'REFUTED';
const UNDETERMINED = 'UNDETERMINED';
const PREMISE = 'PREMISE';
const REITERATE = 'REITERATE';
const AND_INTRO = 'AND_INTRO';
const AND_LEFT = 'AND_LEFT';
const AND_RIGHT = 'AND_RIGHT';
const MODUS_PONENS = 'MODUS_PONENS';
const DETAILS = new WeakMap();

class ProofValue {
  constructor(kind, details) {
    DETAILS.set(this, Object.freeze({ kind, ...details }));
    Object.freeze(this);
  }
  get kind() { return DETAILS.get(this).kind; }
  detail(name) { return DETAILS.get(this)[name]; }
}

class ProofFormula extends ProofValue {}

class ProofAtom extends ProofFormula {
  constructor(name) {
    invariant(typeof name === 'string' && name.length > 0,
      'invalid-proof-atom', 'Proof atoms require a non-empty name.');
    super('ProofAtom', { name });
  }
  get name() { return this.detail('name'); }
}

class ProofNot extends ProofFormula {
  constructor(operand) {
    invariant(operand instanceof ProofFormula, 'invalid-proof-formula', 'Negation requires a proof formula.');
    super('ProofNot', { operand });
  }
  get operand() { return this.detail('operand'); }
}

class ProofAnd extends ProofFormula {
  constructor(left, right) {
    invariant(left instanceof ProofFormula && right instanceof ProofFormula,
      'invalid-proof-formula', 'Conjunction requires two proof formulas.');
    super('ProofAnd', { left, right });
  }
  get left() { return this.detail('left'); }
  get right() { return this.detail('right'); }
}

class ProofImplies extends ProofFormula {
  constructor(antecedent, consequent) {
    invariant(antecedent instanceof ProofFormula && consequent instanceof ProofFormula,
      'invalid-proof-formula', 'Implication requires two proof formulas.');
    super('ProofImplies', { antecedent, consequent });
  }
  get antecedent() { return this.detail('antecedent'); }
  get consequent() { return this.detail('consequent'); }
}

function formulaKey(formula) {
  if (formula instanceof ProofAtom) return `atom(${formula.name})`;
  if (formula instanceof ProofNot) return `not(${formulaKey(formula.operand)})`;
  if (formula instanceof ProofAnd) return `and(${formulaKey(formula.left)},${formulaKey(formula.right)})`;
  if (formula instanceof ProofImplies) {
    return `implies(${formulaKey(formula.antecedent)},${formulaKey(formula.consequent)})`;
  }
  return undefined;
}

function sameFormula(left, right) { return formulaKey(left) === formulaKey(right); }

class ProofStep extends ProofValue {
  constructor(id, rule, conclusion, references) {
    invariant(typeof id === 'string' && id.length > 0,
      'invalid-proof-step', 'Proof steps require a non-empty ID.');
    invariant([PREMISE, REITERATE, AND_INTRO, AND_LEFT, AND_RIGHT, MODUS_PONENS].includes(rule),
      'unsupported-proof-rule', `Unsupported proof rule: ${String(rule)}.`);
    invariant(conclusion instanceof ProofFormula && references.every((item) => typeof item === 'string'),
      'invalid-proof-step', 'Proof steps require a formula and string references.');
    super('ProofStep', { id, rule, conclusion, references: Object.freeze([...references]) });
  }
  get id() { return this.detail('id'); }
  get rule() { return this.detail('rule'); }
  get conclusion() { return this.detail('conclusion'); }
  get references() { return this.detail('references'); }
}

class ProofCertificate extends ProofValue {
  constructor(goal, steps, finalStep) {
    invariant(goal instanceof ProofFormula && steps.every((step) => step instanceof ProofStep),
      'invalid-proof-certificate', 'Proof certificates require a goal and proof steps.');
    invariant(typeof finalStep === 'string' && finalStep.length > 0,
      'invalid-proof-certificate', 'Proof certificates require a final step ID.');
    super('ProofCertificate', { goal, steps: Object.freeze([...steps]), finalStep });
  }
  get goal() { return this.detail('goal'); }
  get steps() { return this.detail('steps'); }
  get finalStep() { return this.detail('finalStep'); }
}

class ProofTraceStep extends ProofValue {
  constructor(stepId, accepted, message) { super('ProofTraceStep', { stepId, accepted, message }); }
  get stepId() { return this.detail('stepId'); }
  get accepted() { return this.detail('accepted'); }
  get message() { return this.detail('message'); }
}

class ProofResult extends ProofValue {
  constructor(status, conclusion, trace, diagnostic) {
    super('ProofResult', { status, conclusion, trace: Object.freeze([...trace]), diagnostic });
  }
  get status() { return this.detail('status'); }
  get conclusion() { return this.detail('conclusion'); }
  get trace() { return this.detail('trace'); }
  get diagnostic() { return this.detail('diagnostic'); }
}

function replayStep(step, known, premises) {
  const references = step.references.map((id) => known.get(id));
  if (references.some((formula) => !formula)) return 'Step refers to an unavailable earlier conclusion.';
  if (step.rule === PREMISE) {
    if (step.references.length !== 0) return 'PREMISE does not accept references.';
    return premises.has(formulaKey(step.conclusion)) ? undefined : 'Conclusion is not an authorized premise.';
  }
  if (step.rule === REITERATE) {
    return references.length === 1 && sameFormula(references[0], step.conclusion)
      ? undefined : 'REITERATE must preserve its referenced conclusion.';
  }
  if (step.rule === AND_INTRO) {
    const expected = references.length === 2 ? new ProofAnd(references[0], references[1]) : undefined;
    return expected && sameFormula(expected, step.conclusion)
      ? undefined : 'AND_INTRO conclusion does not join its two references.';
  }
  if (step.rule === AND_LEFT || step.rule === AND_RIGHT) {
    const source = references.length === 1 ? references[0] : undefined;
    const expected = source instanceof ProofAnd
      ? (step.rule === AND_LEFT ? source.left : source.right) : undefined;
    return expected && sameFormula(expected, step.conclusion)
      ? undefined : `${step.rule} does not select the requested conjunct.`;
  }
  if (step.rule === MODUS_PONENS && references.length === 2) {
    for (const [implication, premise] of [[references[0], references[1]], [references[1], references[0]]]) {
      if (implication instanceof ProofImplies && sameFormula(implication.antecedent, premise)
        && sameFormula(implication.consequent, step.conclusion)) return undefined;
    }
    return 'MODUS_PONENS references do not establish the conclusion.';
  }
  return `${step.rule} has invalid references.`;
}

class ProofKernel {
  verify(certificate, premises = []) {
    invariant(certificate instanceof ProofCertificate,
      'invalid-proof-certificate', 'ProofKernel.verify expects a proof certificate.');
    invariant(Array.isArray(premises) && premises.every((formula) => formula instanceof ProofFormula),
      'invalid-proof-premises', 'ProofKernel premises must be proof formulas.');
    const authorized = new Set(premises.map(formulaKey));
    const known = new Map();
    const trace = [];
    for (const step of certificate.steps) {
      if (known.has(step.id)) {
        const diagnostic = `Duplicate proof step ID: ${step.id}.`;
        trace.push(new ProofTraceStep(step.id, false, diagnostic));
        return new ProofResult(UNDETERMINED, undefined, trace, diagnostic);
      }
      const diagnostic = replayStep(step, known, authorized);
      if (diagnostic) {
        trace.push(new ProofTraceStep(step.id, false, diagnostic));
        return new ProofResult(UNDETERMINED, undefined, trace, diagnostic);
      }
      known.set(step.id, step.conclusion);
      trace.push(new ProofTraceStep(step.id, true, step.rule));
    }
    const conclusion = known.get(certificate.finalStep);
    if (!conclusion) {
      const diagnostic = `Final proof step ${certificate.finalStep} was not replayed.`;
      return new ProofResult(UNDETERMINED, undefined, trace, diagnostic);
    }
    if (sameFormula(conclusion, certificate.goal)) {
      return new ProofResult(ESTABLISHED, conclusion, trace, undefined);
    }
    if (conclusion instanceof ProofNot && sameFormula(conclusion.operand, certificate.goal)) {
      return new ProofResult(REFUTED, conclusion, trace, undefined);
    }
    return new ProofResult(UNDETERMINED, conclusion, trace,
      'The replayed final conclusion establishes neither the goal nor its negation.');
  }
}

function proofAtom(name) { return new ProofAtom(name); }
function proofNot(operand) { return new ProofNot(operand); }
function proofAnd(left, right) { return new ProofAnd(left, right); }
function proofImplies(antecedent, consequent) { return new ProofImplies(antecedent, consequent); }
function proofStep(id, rule, conclusion, ...references) { return new ProofStep(id, rule, conclusion, references); }
function proofCertificate(goal, finalStep, ...steps) { return new ProofCertificate(goal, steps, finalStep); }

export {
  AND_INTRO, AND_LEFT, AND_RIGHT, ESTABLISHED, MODUS_PONENS, PREMISE, REFUTED, REITERATE,
  UNDETERMINED, ProofAnd, ProofAtom, ProofCertificate, ProofFormula, ProofImplies, ProofKernel,
  ProofNot, ProofResult, ProofStep, ProofTraceStep, formulaKey, proofAnd, proofAtom, proofCertificate,
  proofImplies, proofNot, proofStep, sameFormula
};
