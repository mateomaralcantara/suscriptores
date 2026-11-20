// Ayudante de fetch para componentes cliente.
export type ApiResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string; fields?: Record<string, string> };

export async function send<T = unknown>(method: string, url: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; data?: T; error?: string; fields?: Record<string, string> };
    if (!response.ok || !payload.ok) return { ok: false, error: payload.error ?? `Error ${response.status}`, fields: payload.fields };
    return { ok: true, data: payload.data as T };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor." };
  }
}
