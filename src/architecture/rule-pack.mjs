import { NllError, invariant } from '../core/errors.mjs';
import {
  ArchitectureReference, ArchitectureValue, SOURCE_FORM, assertInstances, assertUnique, freeze, quote,
  sourceChain, validateId
} from './common.mjs';
import { InterpreterMode } from './methods.mjs';
import { MaterializationProfile } from './materialization.mjs';
import { CircuitArchitecturePlan } from './plan.mjs';

class ProviderDescriptor extends ArchitectureValue {
  constructor(id, fields) { super('ProviderDescriptor', { id, ...fields }); }
  get id() { return this.detail('id'); }
  get component() { return this.detail('component'); }
  get capabilities() { return this.detail('capabilities'); }
  get guarantees() { return this.detail('guarantees'); }
  get localToPack() { return this.detail('localToPack'); }
  get cost() { return this.detail('cost'); }
  provides(capability) { return this.capabilities.some((value) => value.id === capability.id); }
  [SOURCE_FORM]() {
    let source = `provider(${quote(this.id)}).component(${this.component[SOURCE_FORM]()})`;
    source = sourceChain(source, 'provides', this.capabilities);
    source = sourceChain(source, 'guarantees', this.guarantees);
    if (this.localToPack) source += '.local()';
    if (this.cost !== 0) source += `.cost(${this.cost})`;
    return `${source}.seal()`;
  }
}

class ProviderBuilder {
  #id;
  #component = null;
  #capabilities = [];
  #guarantees = [];
  #local = false;
  #cost = 0;
  #sealed = false;
  constructor(id) { this.#id = validateId(id, 'invalid-provider-id', 'Provider id'); }
  #assertOpen() { if (this.#sealed) throw new NllError('provider-sealed', `Provider ${this.#id} is sealed.`); }
  component(value) { this.#assertOpen(); invariant(value instanceof ArchitectureReference && value.referenceKind === 'circuit', 'invalid-provider-component', 'Provider component must be a circuit reference.'); this.#component = value; return this; }
  provides(...values) { this.#assertOpen(); assertInstances(values, ArchitectureReference, 'invalid-provider-capability', 'Expected a capability reference.'); if (values.some((value) => value.referenceKind !== 'capability')) throw new NllError('invalid-provider-capability', 'Providers may provide only capability references.'); this.#capabilities.push(...values); return this; }
  guarantees(...values) { this.#assertOpen(); assertInstances(values, ArchitectureReference, 'invalid-provider-guarantee', 'Expected a guarantee reference.'); if (values.some((value) => value.referenceKind !== 'guarantee')) throw new NllError('invalid-provider-guarantee', 'Provider guarantees must use guarantee references.'); this.#guarantees.push(...values); return this; }
  local(value = true) { this.#assertOpen(); this.#local = Boolean(value); return this; }
  cost(value) { this.#assertOpen(); if (!Number.isSafeInteger(value) || value < 0) throw new NllError('invalid-provider-cost', 'Provider cost must be a non-negative integer.'); this.#cost = value; return this; }
  seal() {
    this.#assertOpen();
    invariant(this.#component, 'missing-provider-component', `Provider ${this.#id} has no circuit component.`);
    invariant(this.#capabilities.length > 0, 'missing-provider-capability', `Provider ${this.#id} provides no capability.`);
    assertUnique(this.#capabilities, (value) => value.id, 'duplicate-provider-capability', 'provider capability');
    assertUnique(this.#guarantees, (value) => value.id, 'duplicate-provider-guarantee', 'provider guarantee');
    this.#sealed = true;
    return new ProviderDescriptor(this.#id, {
      component: this.#component, capabilities: freeze(this.#capabilities), guarantees: freeze(this.#guarantees),
      localToPack: this.#local, cost: this.#cost
    });
  }
}

class ProviderPin extends ArchitectureValue {
  constructor(capability, authorized, selected) {
    super('ProviderPin', { capability, authorized: freeze(authorized), selected });
  }
  get capability() { return this.detail('capability'); }
  get authorized() { return this.detail('authorized'); }
  get selected() { return this.detail('selected'); }
  [SOURCE_FORM]() {
    let source = `providerPin(${this.capability[SOURCE_FORM]()})`;
    source = sourceChain(source, 'authorize', this.authorized);
    source += `.select(${this.selected[SOURCE_FORM]()})`;
    return `${source}.seal()`;
  }
}

class ProviderPinBuilder {
  #capability;
  #authorized = [];
  #selected = null;
  #sealed = false;
  constructor(capability) {
    invariant(capability instanceof ArchitectureReference && capability.referenceKind === 'capability',
      'invalid-provider-pin-capability', 'Provider pin requires a capability reference.');
    this.#capability = capability;
  }
  #assertOpen() { if (this.#sealed) throw new NllError('provider-pin-sealed', `Provider pin ${this.#capability.id} is sealed.`); }
  authorize(...values) { this.#assertOpen(); assertInstances(values, ProviderDescriptor, 'invalid-authorized-provider', 'Expected a ProviderDescriptor.'); this.#authorized.push(...values); return this; }
  select(value) { this.#assertOpen(); invariant(value instanceof ProviderDescriptor, 'invalid-selected-provider', 'Expected a ProviderDescriptor.'); this.#selected = value; return this; }
  seal() {
    this.#assertOpen();
    invariant(this.#authorized.length > 0, 'missing-authorized-provider', `Provider pin ${this.#capability.id} authorizes no providers.`);
    invariant(this.#selected, 'missing-provider-pin', `Provider pin ${this.#capability.id} has no selected provider.`);
    assertUnique(this.#authorized, (value) => value.id, 'duplicate-authorized-provider', 'authorized provider');
    const authorized = this.#authorized.find((value) => value.id === this.#selected.id);
    invariant(authorized?.[SOURCE_FORM]() === this.#selected[SOURCE_FORM](), 'unauthorized-provider-pin',
      `Selected provider ${this.#selected.id} is not the authorized descriptor.`);
    invariant(this.#authorized.every((value) => value.provides(this.#capability)),
      'provider-capability-mismatch', `Every provider pinned for ${this.#capability.id} must provide it.`);
    this.#sealed = true;
    return new ProviderPin(this.#capability, this.#authorized, authorized);
  }
}

class RulePack extends ArchitectureValue {
  constructor(id, fields) { super('RulePack', { id, ...fields }); }
  get id() { return this.detail('id'); }
  get sources() { return this.detail('sources'); }
  get ontologies() { return this.detail('ontologies'); }
  get plans() { return this.detail('plans'); }
  get materializationProfiles() { return this.detail('materializationProfiles'); }
  get circuits() { return this.detail('circuits'); }
  get assurance() { return this.detail('assurance'); }
  get benchmarks() { return this.detail('benchmarks'); }
  get providerPins() { return this.detail('providerPins'); }
  providerFor(capability) {
    invariant(capability instanceof ArchitectureReference && capability.referenceKind === 'capability',
      'invalid-provider-capability', 'Provider lookup requires a capability reference.');
    const pin = this.providerPins.find((value) => value.capability.id === capability.id);
    if (!pin) throw new NllError('unresolved-provider-pin', `RulePack ${this.id} does not pin ${capability.id}.`);
    return pin.selected;
  }
  [SOURCE_FORM]() {
    let source = `rulePack(${quote(this.id)})`;
    source = sourceChain(source, 'sources', this.sources);
    source = sourceChain(source, 'ontology', this.ontologies);
    source = sourceChain(source, 'plans', this.plans);
    source = sourceChain(source, 'materialization', this.materializationProfiles);
    source = sourceChain(source, 'circuits', this.circuits);
    source = sourceChain(source, 'assurance', this.assurance);
    source = sourceChain(source, 'benchmarks', this.benchmarks);
    source = sourceChain(source, 'providers', this.providerPins);
    return `${source}.seal()`;
  }
}

class RulePackBuilder {
  #id;
  #sources = [];
  #ontologies = [];
  #plans = [];
  #profiles = [];
  #circuits = [];
  #assurance = [];
  #benchmarks = [];
  #providers = [];
  #sealed = false;
  constructor(id) { this.#id = validateId(id, 'invalid-rule-pack-id', 'RulePack id'); }
  #assertOpen() { if (this.#sealed) throw new NllError('rule-pack-sealed', `RulePack ${this.#id} is sealed.`); }
  #references(values, kind, field) { assertInstances(values, ArchitectureReference, `invalid-pack-${field}`, `Expected ${kind} references.`); if (values.some((value) => value.referenceKind !== kind)) throw new NllError(`invalid-pack-${field}`, `RulePack ${field} must use ${kind} references.`); }
  sources(...values) { this.#assertOpen(); this.#references(values, 'authority-file', 'source'); this.#sources.push(...values); return this; }
  ontology(...values) { this.#assertOpen(); this.#references(values, 'ontology', 'ontology'); this.#ontologies.push(...values); return this; }
  plans(...values) { this.#assertOpen(); assertInstances(values, CircuitArchitecturePlan, 'invalid-pack-plan', 'Expected a CircuitArchitecturePlan.'); this.#plans.push(...values); return this; }
  plan(...values) { return this.plans(...values); }
  materialization(...values) { this.#assertOpen(); assertInstances(values, MaterializationProfile, 'invalid-pack-materialization', 'Expected a MaterializationProfile.'); this.#profiles.push(...values); return this; }
  circuits(...values) { this.#assertOpen(); this.#references(values, 'circuit', 'circuit'); this.#circuits.push(...values); return this; }
  assurance(...values) { this.#assertOpen(); assertInstances(values, InterpreterMode, 'invalid-pack-assurance', 'Expected an InterpreterMode.'); this.#assurance.push(...values); return this; }
  benchmarks(...values) { this.#assertOpen(); this.#references(values, 'benchmark', 'benchmark'); this.#benchmarks.push(...values); return this; }
  providers(...values) { this.#assertOpen(); assertInstances(values, ProviderPin, 'invalid-pack-provider-pin', 'Expected a ProviderPin.'); this.#providers.push(...values); return this; }
  seal() {
    this.#assertOpen();
    const required = [[this.#sources, 'source'], [this.#ontologies, 'ontology'], [this.#plans, 'plan'],
      [this.#profiles, 'materialization profile'], [this.#circuits, 'circuit'], [this.#assurance, 'assurance mode'],
      [this.#benchmarks, 'benchmark'], [this.#providers, 'provider pin']];
    for (const [values, label] of required) invariant(values.length > 0, 'incomplete-rule-pack', `RulePack ${this.#id} has no ${label}.`);
    for (const values of [this.#sources, this.#ontologies, this.#plans, this.#profiles, this.#circuits, this.#assurance, this.#benchmarks]) {
      assertUnique(values, (value) => value.id, 'duplicate-rule-pack-entry', 'RulePack entry');
    }
    assertUnique(this.#providers, (value) => value.capability.id, 'duplicate-provider-pin', 'provider pin');
    this.#sealed = true;
    return new RulePack(this.#id, {
      sources: freeze(this.#sources), ontologies: freeze(this.#ontologies), plans: freeze(this.#plans),
      materializationProfiles: freeze(this.#profiles), circuits: freeze(this.#circuits),
      assurance: freeze(this.#assurance), benchmarks: freeze(this.#benchmarks), providerPins: freeze(this.#providers)
    });
  }
}

const provider = (id) => new ProviderBuilder(id);
const providerPin = (capability) => new ProviderPinBuilder(capability);
const rulePack = (id) => new RulePackBuilder(id);

export {
  ProviderBuilder, ProviderDescriptor, ProviderPin, ProviderPinBuilder, RulePack, RulePackBuilder,
  provider, providerPin, rulePack
};
