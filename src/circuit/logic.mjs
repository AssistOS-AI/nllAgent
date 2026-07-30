import { SemanticValue } from '../ontology/model.mjs';

class LogicValue extends SemanticValue {
  constructor(name) { super('LogicValue', { name }); }
  get name() { return this.detail('name'); }
  toString() { return this.name; }
}

const TRUE = new LogicValue('TRUE');
const FALSE = new LogicValue('FALSE');
const UNKNOWN = new LogicValue('UNKNOWN');
const CONFLICT = new LogicValue('CONFLICT');

function logicalNot(value) {
  if (value === TRUE) return FALSE;
  if (value === FALSE) return TRUE;
  return value;
}

function logicalAnd(left, right) {
  if (left === FALSE || right === FALSE) return FALSE;
  if (left === CONFLICT || right === CONFLICT) return CONFLICT;
  if (left === UNKNOWN || right === UNKNOWN) return UNKNOWN;
  return TRUE;
}

function logicalOr(left, right) {
  if (left === TRUE || right === TRUE) return TRUE;
  if (left === CONFLICT || right === CONFLICT) return CONFLICT;
  if (left === UNKNOWN || right === UNKNOWN) return UNKNOWN;
  return FALSE;
}

export { CONFLICT, FALSE, TRUE, UNKNOWN, LogicValue, logicalAnd, logicalNot, logicalOr };
