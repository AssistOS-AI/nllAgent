class NllError extends Error {
  constructor(code, message, details = new Map()) {
    super(message);
    this.name = 'NllError';
    this.code = code;
    this.details = details instanceof Map ? new Map(details) : new Map(Object.entries(details));
  }

  toDiagnostic() {
    return Object.freeze({ code: this.code, message: this.message, details: new Map(this.details) });
  }
}

function invariant(condition, code, message, details) {
  if (!condition) throw new NllError(code, message, details);
}

function asNllError(error) {
  return error instanceof NllError
    ? error
    : new NllError('runtime-fault', error instanceof Error ? error.message : String(error));
}

export { NllError, asNllError, invariant };
