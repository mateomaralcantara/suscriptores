import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

/** scrypt password hash in the form `scrypt$<salt>$<hash>` (hex). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), KEY_LENGTH);
  return timingSafeEqual(actual, expected);
}

/** Returns a list of human-readable problems; empty means the password is acceptable. */
export function passwordProblems(password: unknown): string[] {
  if (typeof password !== "string") return ["La contraseña es obligatoria."];
  const problems: string[] = [];
  if (password.length < 10) problems.push("La contraseña debe tener al menos 10 caracteres.");
  if (password.length > 200) problems.push("La contraseña no puede superar 200 caracteres.");
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) problems.push("La contraseña debe incluir letras y números.");
  return problems;
}

export function generateApiKey(): string {
  return `grl_${randomBytes(24).toString("hex")}`;
}

/** API keys are high-entropy, so a fast hash is enough; only the hash is stored. */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
