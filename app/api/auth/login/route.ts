import { assertSameOrigin, clientIp, handle, json, readJson, sessionCookie } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { RateLimiter } from "@/lib/rate-limit";
import { getStore, toPublicUser } from "@/lib/store";
import { parseCredentials } from "@/lib/validation";

const loginLimiter = new RateLimiter(10, 5 * 60_000);

export const POST = handle(async (request) => {
  assertSameOrigin(request);
  const { email, password } = parseCredentials(await readJson(request));
  const limit = loginLimiter.check(`${clientIp(request)}:${email}`);
  if (!limit.allowed) {
    throw new ApiError(429, "rate_limited", "Demasiados intentos. Espera unos minutos.", { retryAfterSeconds: limit.retryAfterSeconds });
  }
  const user = getStore().verifyCredentials(email, password);
  if (!user) throw new ApiError(401, "invalid_credentials", "Correo o contraseña incorrectos.");
  const publicUser = toPublicUser(user);
  return json({ success: true, user: publicUser }, { headers: { "set-cookie": await sessionCookie(publicUser) } });
});
