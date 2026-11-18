export class RomAnalysisError extends Error {
  readonly name = 'RomAnalysisError';
  constructor(readonly code: string, readonly resource: string, message: string, readonly details: Record<string, unknown> = {}) {
    super(message);
  }
  toJSON(): Record<string, unknown> {
    return { code: this.code, resource: this.resource, message: this.message, details: this.details };
  }
}
export function fail(code: string, resource: string, message: string, details: Record<string, unknown> = {}): never {
  throw new RomAnalysisError(code, resource, message, details);
}
