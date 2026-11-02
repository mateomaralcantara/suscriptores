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
