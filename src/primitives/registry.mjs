import { NllError } from '../core/errors.mjs';
import { PrimitiveDescriptor, PrimitiveProvider } from './model.mjs';

class PrimitiveRegistry {
  #descriptors = new Map();
  #providers = new Map();
  #sealed = false;
  #assertOpen() {
    if (this.#sealed) throw new NllError('primitive-registry-sealed', 'PrimitiveRegistry is sealed.');
  }
  register(...descriptors) {
    this.#assertOpen();
    for (const descriptor of descriptors) {
      if (!(descriptor instanceof PrimitiveDescriptor)) {
        throw new NllError('invalid-primitive-descriptor', 'PrimitiveRegistry accepts only sealed descriptors.');
      }
      if (this.#descriptors.has(descriptor.id)) throw new NllError('duplicate-primitive', descriptor.id);
      this.#descriptors.set(descriptor.id, descriptor);
    }
    return this;
  }
  provide(...providers) {
    this.#assertOpen();
    for (const provider of providers) {
      if (!(provider instanceof PrimitiveProvider)) {
        throw new NllError('invalid-primitive-provider', 'PrimitiveRegistry accepts only PrimitiveProvider values.');
      }
      if (this.#providers.has(provider.id)) throw new NllError('duplicate-primitive-provider', provider.id);
      const registered = this.#descriptors.get(provider.descriptor.id);
      if (registered && registered !== provider.descriptor) {
        throw new NllError('primitive-provider-descriptor-conflict', provider.descriptor.id);
      }
      if (!registered) this.#descriptors.set(provider.descriptor.id, provider.descriptor);
      this.#providers.set(provider.id, provider);
    }
    return this;
  }
  get(id) { return this.#descriptors.get(id); }
  list() { return Object.freeze([...this.#descriptors.values()]); }
  provider(id) { return this.#providers.get(id); }
  providersForMethod(methodId) {
    return Object.freeze([...this.#providers.values()].filter((provider) => provider.methodId === methodId)
      .sort((left, right) => left.id.localeCompare(right.id)));
  }
  providers() { return Object.freeze([...this.#providers.values()].sort((left, right) => left.id.localeCompare(right.id))); }
  seal() { this.#sealed = true; return this; }
  async checkLaws(id, cases) {
    const descriptor = this.get(id);
    if (!descriptor) throw new NllError('missing-primitive', `Unknown primitive: ${id}.`);
    const failures = [];
    for (const law of descriptor.laws) {
      if (!law.checker) continue;
      for (const testCase of cases) {
        if (!await law.checker(descriptor, testCase)) failures.push(Object.freeze({ law: law.id, testCase }));
      }
    }
    return Object.freeze(failures);
  }
}

export { PrimitiveRegistry };
