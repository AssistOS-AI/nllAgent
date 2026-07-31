import { invariant } from '../core/errors.mjs';

class AssuranceMode {
  #id;

  constructor(id) {
    this.#id = id;
    Object.freeze(this);
  }

  get id() { return this.#id; }
  toString() { return this.#id; }
}

class AssuranceComponent {
  #id;

  constructor(id) {
    this.#id = id;
    Object.freeze(this);
  }

  get id() { return this.#id; }
  toString() { return this.#id; }
}

const EXECUTE_ONLY = new AssuranceMode('EXECUTE_ONLY');
const ANALYZED = new AssuranceMode('ANALYZED');
const WITNESSED = new AssuranceMode('WITNESSED');
const LOCALLY_CERTIFIED = new AssuranceMode('LOCALLY_CERTIFIED');
const GENERATIVE = new AssuranceMode('GENERATIVE');

const MATERIALIZATION_COMPATIBILITY = new AssuranceComponent('MATERIALIZATION_COMPATIBILITY');
const CONCRETE_EXECUTION = new AssuranceComponent('CONCRETE_EXECUTION');
const EXECUTION_TRACE = new AssuranceComponent('EXECUTION_TRACE');
const ABSTRACT_PREFLIGHT = new AssuranceComponent('ABSTRACT_PREFLIGHT');
const PRECISION_REPORT = new AssuranceComponent('PRECISION_REPORT');
const SYMBOLIC_WITNESS = new AssuranceComponent('SYMBOLIC_WITNESS');
const CONCOLIC_BRANCH_GOALS = new AssuranceComponent('CONCOLIC_BRANCH_GOALS');
const WITNESS_REPLAY = new AssuranceComponent('WITNESS_REPLAY');
const LOCAL_PROOF_OBLIGATIONS = new AssuranceComponent('LOCAL_PROOF_OBLIGATIONS');
const PROOF_REPLAY = new AssuranceComponent('PROOF_REPLAY');
const TYPED_SYNTHESIS = new AssuranceComponent('TYPED_SYNTHESIS');
const CNL_ROUND_TRIP = new AssuranceComponent('CNL_ROUND_TRIP');

const ALL_MODES = Object.freeze([EXECUTE_ONLY, ANALYZED, WITNESSED, LOCALLY_CERTIFIED, GENERATIVE]);

function uniqueById(values) {
  const seen = new Set();
  return Object.freeze(values.filter((value) => {
    if (seen.has(value.id)) return false;
    seen.add(value.id);
    return true;
  }));
}

class AssuranceProfile {
  #modes;

  constructor(modes) {
    invariant(modes.every((mode) => mode instanceof AssuranceMode && ALL_MODES.includes(mode)),
      'invalid-assurance-profile', 'AssuranceProfile accepts only registered assurance modes.');
    this.#modes = uniqueById([EXECUTE_ONLY, ...modes]);
    Object.freeze(this);
  }

  get modes() { return this.#modes; }
  includes(mode) { return this.#modes.includes(mode); }
  compose(other) {
    invariant(other instanceof AssuranceProfile, 'invalid-assurance-profile',
      'AssuranceProfile.compose requires another profile.');
    return new AssuranceProfile([...this.#modes, ...other.#modes]);
  }
}

class AssuranceTarget {
  #id;
  #requiredModes;

  constructor(id, requiredModes) {
    invariant(typeof id === 'string' && id.length > 0, 'invalid-assurance-target',
      'Assurance target id must be a non-empty string.');
    invariant(requiredModes.every((mode) => mode instanceof AssuranceMode && ALL_MODES.includes(mode)),
      'invalid-assurance-target', `Assurance target ${id} contains an unknown mode.`);
    this.#id = id;
    this.#requiredModes = uniqueById([EXECUTE_ONLY, ...requiredModes]);
    Object.freeze(this);
  }

  get id() { return this.#id; }
  get requiredModes() { return this.#requiredModes; }
}

class AssuranceExecutionPlan {
  #target;
  #profile;
  #components;

  constructor(target, profile, components) {
    this.#target = target;
    this.#profile = profile;
    this.#components = uniqueById(components);
    Object.freeze(this);
  }

  get target() { return this.#target; }
  get profile() { return this.#profile; }
  get components() { return this.#components; }
  includesMode(mode) { return this.#profile.includes(mode); }
  includesComponent(component) { return this.#components.includes(component); }
}

function componentsFor(profile) {
  const components = [MATERIALIZATION_COMPATIBILITY, CONCRETE_EXECUTION, EXECUTION_TRACE];
  if (profile.includes(ANALYZED)) components.push(ABSTRACT_PREFLIGHT, PRECISION_REPORT);
  if (profile.includes(WITNESSED)) components.push(SYMBOLIC_WITNESS, CONCOLIC_BRANCH_GOALS, WITNESS_REPLAY);
  if (profile.includes(LOCALLY_CERTIFIED)) components.push(LOCAL_PROOF_OBLIGATIONS, PROOF_REPLAY);
  if (profile.includes(GENERATIVE)) components.push(TYPED_SYNTHESIS, CNL_ROUND_TRIP);
  return components;
}

function assuranceProfile(...modes) { return new AssuranceProfile(modes); }
function assuranceTarget(id, ...requiredModes) { return new AssuranceTarget(id, requiredModes); }

function composeAssurance(target, requestedProfile = assuranceProfile()) {
  invariant(target instanceof AssuranceTarget, 'invalid-assurance-target',
    'composeAssurance requires an AssuranceTarget.');
  invariant(requestedProfile instanceof AssuranceProfile, 'invalid-assurance-profile',
    'composeAssurance requires an AssuranceProfile.');
  const profile = requestedProfile.compose(new AssuranceProfile(target.requiredModes));
  return new AssuranceExecutionPlan(target, profile, componentsFor(profile));
}

const ALL_FINDINGS = assuranceTarget('AllFindings', EXECUTE_ONLY);
const WITNESSED_FINDING = assuranceTarget('WitnessedFinding', WITNESSED);
const CERTIFIED_ASSESSMENT = assuranceTarget('CertifiedAssessment', LOCALLY_CERTIFIED);
const CNL_REPAIR = assuranceTarget('CNLRepair', GENERATIVE);

export {
  ABSTRACT_PREFLIGHT, ALL_FINDINGS, ANALYZED, AssuranceComponent, AssuranceExecutionPlan,
  AssuranceMode, AssuranceProfile, AssuranceTarget, CERTIFIED_ASSESSMENT, CNL_REPAIR, CNL_ROUND_TRIP,
  CONCOLIC_BRANCH_GOALS, CONCRETE_EXECUTION, EXECUTE_ONLY, EXECUTION_TRACE, GENERATIVE,
  LOCAL_PROOF_OBLIGATIONS, LOCALLY_CERTIFIED, MATERIALIZATION_COMPATIBILITY, PRECISION_REPORT,
  PROOF_REPLAY, SYMBOLIC_WITNESS, TYPED_SYNTHESIS, WITNESSED, WITNESSED_FINDING, WITNESS_REPLAY,
  assuranceProfile, assuranceTarget, composeAssurance
};
