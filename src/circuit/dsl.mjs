function reference(kind, name) {
  return Object.freeze({ [`$${kind}`]: name });
}

function port(name) {
  return reference('port', name);
}

function binding(name) {
  return reference('port', name);
}

function observationBinding(definition) {
  return definition;
}

function node(name) {
  return reference('node', name);
}

function circuit(definition) {
  return definition;
}

function queryFirstCircuit(definition) {
  return definition;
}

export { binding, circuit, node, observationBinding, port, queryFirstCircuit };
