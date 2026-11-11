/** Runtime configuration. Every value is read lazily so `next build` never needs secrets. */

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Demo mode seeds the classroom accounts and enables simulated deposits.
 * It is ON by default outside production and must be enabled explicitly in production.
 */
export function isDemoMode(): boolean {
  const flag = process.env.DEMO_MODE;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return !isProduction();
}

const DEV_SESSION_SECRET = "dev-only-session-secret-not-for-production-use";

/** Secret used to sign session cookies. Mandatory (>= 32 chars) in production. */
export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (isProduction()) {
    throw new Error("SESSION_SECRET must be set to a random value of at least 32 characters in production.");
  }
  return DEV_SESSION_SECRET;
}

export const SESSION_COOKIE = "grl_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;
