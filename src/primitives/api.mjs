import {
  PrimitiveBuilder, PrimitiveEffect, PrimitiveLaw, PrimitivePort, PrimitiveProvider
} from './model.mjs';

const primitive = (id) => new PrimitiveBuilder(id);
const input = (name, type) => new PrimitivePort('input', name, type);
const output = (name, type) => new PrimitivePort('output', name, type);
const reads = (target) => new PrimitiveEffect('read', target);
const writes = (target) => new PrimitiveEffect('write', target);
const callsTool = (id) => new PrimitiveEffect('tool', id);
const law = (id, checker = null) => new PrimitiveLaw(id, checker);
const deterministic = (checker = null) => law('deterministic', checker);
const monotoneInKnowledge = (checker = null) => law('monotone-in-knowledge', checker);
const preservesProvenance = (checker = null) => law('preserves-provenance', checker);
const primitiveProvider = (id, methodId, descriptor, modulePath, exportName) =>
  new PrimitiveProvider(id, methodId, descriptor, modulePath, exportName);

export {
  callsTool, deterministic, input, law, monotoneInKnowledge, output, preservesProvenance,
  primitive, primitiveProvider, reads, writes
};
