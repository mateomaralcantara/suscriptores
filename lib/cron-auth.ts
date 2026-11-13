import { timingSafeEqual } from "node:crypto";

/** True when the request carries `Authorization: Bearer <CRON_SECRET>` (constant-time compare). */
export function isCronAuthorized(authorization: string | null, secret: string | undefined) {
  if (!secret || secret.length < 16 || !authorization?.startsWith("Bearer ")) return false;
  const given = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
