/** Error carrying an HTTP status and a stable machine-readable code. */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * The store is a process-wide singleton, but the bundler can load this module more than
 * once (pages and route handlers), so `instanceof` is unreliable across them.
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && error.name === "ApiError" && typeof (error as ApiError).status === "number" && typeof (error as ApiError).code === "string";
}
