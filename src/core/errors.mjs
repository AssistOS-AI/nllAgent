class NllError extends Error {
  constructor(code, message, details = undefined, options = undefined) {
    super(message, options);
    this.name = 'NllError';
    this.code = code;
    if (details !== undefined) this.details = details;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      ...(this.details === undefined ? {} : { details: this.details })
    };
  }
}

function asNllError(error, code = 'runtime-fault') {
  if (error instanceof NllError) return error;
  return new NllError(code, error?.message || String(error), undefined, { cause: error });
}

function invariant(condition, code, message, details) {
  if (!condition) throw new NllError(code, message, details);
}

export { NllError, asNllError, invariant };
