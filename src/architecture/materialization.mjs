import { NllError, invariant } from '../core/errors.mjs';
import {
  ArchitectureReference, ArchitectureValue, SOURCE_FORM, assertInstances, assertUnique, freeze, quote,
  sourceChain, validateId
} from './common.mjs';

class ObservationRequirement extends ArchitectureValue {
  constructor(concept, roles) {
    invariant(concept instanceof ArchitectureReference && concept.referenceKind === 'concept',
      'invalid-observation-concept', 'Observation requirements need a concept reference.');
    assertInstances(roles, ArchitectureReference, 'invalid-observation-role', 'Observation roles must be references.');
    if (roles.some((role) => role.referenceKind !== 'role')) {
      throw new NllError('invalid-observation-role', 'Observation requirements accept only role references.');
    }
    assertUnique(roles, (role) => role.id, 'duplicate-observation-role', 'observation role');
    super('ObservationRequirement', { concept, roles: freeze(roles) });
  }
  get concept() { return this.detail('concept'); }
  get roles() { return this.detail('roles'); }
  [SOURCE_FORM]() { return `observe(${this.concept[SOURCE_FORM]()}${this.roles.length ? `,${this.roles.map((role) => role[SOURCE_FORM]()).join(',')}` : ''})`; }
}

class ResolutionRequirement extends ArchitectureValue {
  constructor(id) { super('ResolutionRequirement', { id: validateId(id, 'invalid-resolution-requirement', 'Resolution requirement') }); }
  get id() { return this.detail('id'); }
  [SOURCE_FORM]() { return `resolveRequirement(${quote(this.id)})`; }
}

class CoverageMode extends ArchitectureValue {
  constructor(id) {
    if (!['COMPLETE', 'PARTIAL'].includes(id)) throw new NllError('invalid-coverage-mode', `Unsupported coverage mode: ${id}`);
    super('CoverageMode', { id });
  }
  get id() { return this.detail('id'); }
  [SOURCE_FORM]() { return `coverageMode(${quote(this.id)})`; }
}

class MaterializationCoverage extends ArchitectureValue {
  constructor(mode, concept, scope) {
    invariant(mode instanceof CoverageMode, 'invalid-coverage-mode', 'Expected a CoverageMode.');
    invariant(concept instanceof ArchitectureReference && concept.referenceKind === 'concept',
      'invalid-coverage-concept', 'Coverage requires a concept reference.');
    invariant(scope instanceof ArchitectureReference && scope.referenceKind === 'scope',
      'invalid-coverage-scope', 'Coverage requires a scope reference.');
    super('MaterializationCoverage', { mode, concept, scope });
  }
  get mode() { return this.detail('mode'); }
  get concept() { return this.detail('concept'); }
  get scope() { return this.detail('scope'); }
  [SOURCE_FORM]() { return `materializationCoverage(${this.mode[SOURCE_FORM]()},${this.concept[SOURCE_FORM]()},${this.scope[SOURCE_FORM]()})`; }
}

class GroundingRequirement extends ArchitectureValue {
  constructor(id) { super('GroundingRequirement', { id: validateId(id, 'invalid-grounding-requirement', 'Grounding requirement') }); }
  get id() { return this.detail('id'); }
  [SOURCE_FORM]() { return `groundingRequirement(${quote(this.id)})`; }
}

class AlternativeRequirement extends ArchitectureValue {
  constructor(id) { super('AlternativeRequirement', { id: validateId(id, 'invalid-alternative-requirement', 'Alternative requirement') }); }
  get id() { return this.detail('id'); }
  [SOURCE_FORM]() { return `alternativeRequirement(${quote(this.id)})`; }
}

class MaterializationProfile extends ArchitectureValue {
  constructor(id, fields) { super('MaterializationProfile', { id, ...fields }); }
  get id() { return this.detail('id'); }
  get observations() { return this.detail('observations'); }
  get resolutions() { return this.detail('resolutions'); }
  get coverageRequirements() { return this.detail('coverageRequirements'); }
  get groundingRequirements() { return this.detail('groundingRequirements'); }
  get alternatives() { return this.detail('alternatives'); }
  [SOURCE_FORM]() {
    let source = `materializationProfile(${quote(this.id)})`;
    source = sourceChain(source, 'observations', this.observations);
    source = sourceChain(source, 'resolve', this.resolutions);
    source = sourceChain(source, 'coverage', this.coverageRequirements);
    source = sourceChain(source, 'groundEveryClaimWith', this.groundingRequirements);
    source = sourceChain(source, 'preserveAlternatives', this.alternatives);
    return `${source}.seal()`;
  }
}

class MaterializationProfileBuilder {
  #id;
  #observations = [];
  #resolutions = [];
  #coverage = [];
  #grounding = [];
  #alternatives = [];
  #sealed = false;
  constructor(id) { this.#id = validateId(id, 'invalid-materialization-profile-id', 'Materialization profile id'); }
  #assertOpen() { if (this.#sealed) throw new NllError('materialization-profile-sealed', `Materialization profile ${this.#id} is sealed.`); }
  observations(...values) { this.#assertOpen(); assertInstances(values, ObservationRequirement, 'invalid-observation-requirement', 'Expected an ObservationRequirement.'); this.#observations.push(...values); return this; }
  observe(value, ...roles) {
    return value instanceof ObservationRequirement
      ? this.observations(value, ...roles)
      : this.observations(new ObservationRequirement(value, roles));
  }
  resolve(...values) { this.#assertOpen(); assertInstances(values, ResolutionRequirement, 'invalid-resolution-requirement', 'Expected a ResolutionRequirement.'); this.#resolutions.push(...values); return this; }
  coverage(...values) { this.#assertOpen(); assertInstances(values, MaterializationCoverage, 'invalid-materialization-coverage', 'Expected a MaterializationCoverage.'); this.#coverage.push(...values); return this; }
  groundEveryClaimWith(...values) { this.#assertOpen(); assertInstances(values, GroundingRequirement, 'invalid-grounding-requirement', 'Expected a GroundingRequirement.'); this.#grounding.push(...values); return this; }
  preserveAlternatives(...values) { this.#assertOpen(); assertInstances(values, AlternativeRequirement, 'invalid-alternative-requirement', 'Expected an AlternativeRequirement.'); this.#alternatives.push(...values); return this; }
  seal() {
    this.#assertOpen();
    invariant(this.#observations.length > 0, 'missing-observation-requirement', `Materialization profile ${this.#id} observes no concepts.`);
    invariant(this.#grounding.length > 0, 'missing-grounding-requirement', `Materialization profile ${this.#id} has no grounding requirement.`);
    assertUnique(this.#observations, (value) => value.concept.id, 'duplicate-observation-requirement', 'observation requirement');
    assertUnique(this.#resolutions, (value) => value.id, 'duplicate-resolution-requirement', 'resolution requirement');
    assertUnique(this.#coverage, (value) => `${value.mode.id}:${value.concept.id}:${value.scope.id}`, 'duplicate-materialization-coverage', 'materialization coverage');
    assertUnique(this.#grounding, (value) => value.id, 'duplicate-grounding-requirement', 'grounding requirement');
    assertUnique(this.#alternatives, (value) => value.id, 'duplicate-alternative-requirement', 'alternative requirement');
    this.#sealed = true;
    return new MaterializationProfile(this.#id, {
      observations: freeze(this.#observations), resolutions: freeze(this.#resolutions),
      coverageRequirements: freeze(this.#coverage), groundingRequirements: freeze(this.#grounding),
      alternatives: freeze(this.#alternatives)
    });
  }
}

const coverageMode = (id) => new CoverageMode(id);
const COMPLETE = coverageMode('COMPLETE');
const PARTIAL = coverageMode('PARTIAL');
const observe = (concept, ...roles) => new ObservationRequirement(concept, roles);
const resolveRequirement = (id) => new ResolutionRequirement(id);
const materializationCoverage = (mode, concept, scope) => new MaterializationCoverage(mode, concept, scope);
const requireComplete = (concept, scope) => materializationCoverage(COMPLETE, concept, scope);
const allowPartial = (concept, scope) => materializationCoverage(PARTIAL, concept, scope);
const groundingRequirement = (id) => new GroundingRequirement(id);
const alternativeRequirement = (id) => new AlternativeRequirement(id);
const materializationProfile = (id) => new MaterializationProfileBuilder(id);

export {
  AlternativeRequirement, COMPLETE, CoverageMode, GroundingRequirement, MaterializationCoverage,
  MaterializationProfile, MaterializationProfileBuilder, ObservationRequirement, PARTIAL,
  ResolutionRequirement, allowPartial, alternativeRequirement, coverageMode, groundingRequirement,
  materializationCoverage, materializationProfile, observe, requireComplete, resolveRequirement
};
