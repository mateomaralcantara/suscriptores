/** Fixed-window in-memory rate limiter. One instance per concern (login, API...). */
export class RateLimiter {
  private limit: number;
  private windowMs: number;
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /** Registers one hit and reports whether it is allowed. */
  check(key: string, nowMs: number = Date.now()): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
    if (this.hits.size > 10_000) this.prune(nowMs);
    let entry = this.hits.get(key);
    if (!entry || entry.resetAt <= nowMs) {
      entry = { count: 0, resetAt: nowMs + this.windowMs };
      this.hits.set(key, entry);
    }
    entry.count += 1;
    const allowed = entry.count <= this.limit;
    return {
      allowed,
      remaining: Math.max(0, this.limit - entry.count),
      retryAfterSeconds: allowed ? 0 : Math.ceil((entry.resetAt - nowMs) / 1000),
    };
  }

  private prune(nowMs: number) {
    for (const [key, entry] of this.hits) if (entry.resetAt <= nowMs) this.hits.delete(key);
  }
}
