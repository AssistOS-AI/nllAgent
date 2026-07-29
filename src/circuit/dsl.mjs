function reference(kind, name) {
  return Object.freeze({ [`$${kind}`]: name });
}

function port(name) {
  return reference('port', name);
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

export { circuit, node, port, queryFirstCircuit };
