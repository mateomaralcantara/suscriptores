import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Reseller API keys: "gr_<prefix>_<secret>". Only the prefix and a SHA-256 hash of the full key
 * are stored, so a database leak does not expose usable keys. Pure helpers (node:crypto only).
 */
export const API_KEY_PATTERN = /^gr_([a-f0-9]{12})_([A-Za-z0-9_-]{43})$/;

export function generateApiKey() {
  const prefix = randomBytes(6).toString("hex");
  const secret = randomBytes(32).toString("base64url");
  const key = `gr_${prefix}_${secret}`;
  return { key, prefix, hash: hashApiKey(key) };
}

export function hashApiKey(key: string) {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

export function parseApiKey(key: string) {
  const match = API_KEY_PATTERN.exec(key.trim());
  return match ? { prefix: match[1], key: key.trim() } : null;
}

export function apiKeyMatches(key: string, storedHash: string) {
  const given = Buffer.from(hashApiKey(key), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Maps internal order statuses to the strings resellers' panels expect from an SMM API v2. */
export function toApiV2Status(status: string) {
  switch (status) {
    case "completed": return "Completed";
    case "partial": return "Partial";
    case "canceled": case "failed": case "refunded": return "Canceled";
    case "processing": return "In progress";
    case "cancel_requested": return "In progress";
    default: return "Pending";
  }
}
