export const sandboxHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-growth-mode": "sandbox",
};

export function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, {
    ...init,
    headers: { ...sandboxHeaders, ...(init.headers ?? {}) },
  });
}

export function apiError(status: number, error: string, details?: Record<string, string>) {
  return json({ success: false, mode: "sandbox", error, ...(details ? { details } : {}) }, { status });
}

/** Parses a JSON object body. Returns `null` when the body is missing, malformed or not an object. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Lenient parser for sandbox endpoints that accept any payload. */
export async function safeBody(request: Request): Promise<Record<string, unknown>> {
  return (await readJsonObject(request)) ?? {};
}
