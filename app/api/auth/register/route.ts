import { assertSameOrigin, clientIp, handle, json, readJson, sessionCookie } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { RateLimiter } from "@/lib/rate-limit";
import { getStore, toPublicUser } from "@/lib/store";
import { parseRegistration } from "@/lib/validation";

const registerLimiter = new RateLimiter(5, 60 * 60_000);

export const POST = handle(async (request) => {
  assertSameOrigin(request);
  const input = parseRegistration(await readJson(request));
  const limit = registerLimiter.check(clientIp(request));
  if (!limit.allowed) {
    throw new ApiError(429, "rate_limited", "Demasiados registros desde esta red.", { retryAfterSeconds: limit.retryAfterSeconds });
  }
  // New accounts are always clients; admins are provisioned through configuration.
  const user = toPublicUser(getStore().createUser({ ...input, role: "client" }));
  return json({ success: true, user }, { status: 201, headers: { "set-cookie": await sessionCookie(user) } });
});
