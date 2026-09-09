export const sandboxHeaders = {
  "content-type": "application/json; charset=utf-8",
  "x-growth-mode": "sandbox",
};

export function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, {
    ...init,
    headers: { ...sandboxHeaders, ...(init.headers ?? {}) },
  });
}

export async function safeBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
