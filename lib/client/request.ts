/** Browser helper for calling our own JSON API and surfacing its error messages. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

export async function apiRequest<T>(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      method: init.method ?? "GET",
      headers: { ...(init.body !== undefined ? { "content-type": "application/json" } : {}), ...init.headers },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = payload?.error as { message?: string; details?: unknown } | undefined;
      const details = Array.isArray(error?.details) && error.details.every((item) => typeof item === "string") ? ` ${error.details.join(" ")}` : "";
      return { ok: false, message: `${error?.message ?? "No se pudo completar la operación."}${details}` };
    }
    return { ok: true, data: payload as T };
  } catch {
    return { ok: false, message: "No se pudo conectar con el servidor." };
  }
}
