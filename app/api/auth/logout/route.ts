import { assertSameOrigin, clearedSessionCookie, handle, json } from "@/lib/api";

export const POST = handle(async (request) => {
  assertSameOrigin(request);
  return json({ success: true }, { headers: { "set-cookie": clearedSessionCookie() } });
});
