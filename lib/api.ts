export const apiHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

export function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, {
    ...init,
    headers: { ...apiHeaders, ...(init.headers ?? {}) },
  });
}

export async function safeBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

/**
 * Logs the real error server-side and returns a generic message, so internal
 * details (database, provider, configuration) never reach the client.
 */
export function internalError(scope: string, error: unknown, status = 500) {
  console.error(`[${scope}]`, error);
  return Response.json(
    { success: false, error: status === 502 ? "El proveedor no respondió correctamente. Inténtalo de nuevo." : "Error interno. Inténtalo de nuevo." },
    { status, headers: apiHeaders },
  );
}

/** Parses a JSON object body; returns null when missing, malformed or not an object. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
