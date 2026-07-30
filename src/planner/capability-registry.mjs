import { NllError } from '../core/errors.mjs';

class CapabilityRegistry {
  #providers = new Map();
  register(circuit) {
    for (const provided of circuit.provided) {
      const id = provided.id ?? provided;
      const values = this.#providers.get(id) || [];
      values.push(circuit);
      this.#providers.set(id, values);
    }
    return this;
  }
  providersOf(capability) { return Object.freeze([...(this.#providers.get(capability.id ?? capability) || [])]); }
}

function planCapabilities(targets, registry, available = new Set()) {
  const selected = [];
  const visiting = new Set();
  function resolve(target) {
    const id = target.id ?? target;
    if (available.has(id)) return;
    if (visiting.has(id)) throw new NllError('capability-cycle', `Capability cycle at ${id}.`);
    visiting.add(id);
    const provider = registry.providersOf(target)[0];
    if (!provider) throw new NllError('unsatisfied-capability', `No circuit provides ${id}.`);
    for (const requirement of provider.required) resolve(requirement);
    if (!selected.includes(provider)) selected.push(provider);
    for (const provided of provider.provided) available.add(provided.id ?? provided);
    visiting.delete(id);
  }
  for (const target of targets) resolve(target);
  return Object.freeze(selected);
}

export { CapabilityRegistry, planCapabilities };
