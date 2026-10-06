import crypto from "crypto";
import { connectToRedis } from "./redis";

export type LimiterType = "send" | "auth" | "login" | "signup" | "password_reset";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTimestamp: number;
}

const WINDOW_SECONDS = 60;

function limitFor(type: LimiterType, plan: "free" | "pro"): number {
  if (type === "auth" || type === "login" || type === "signup" || type === "password_reset") {
    return 10;
  }
  return plan === "pro" ? 300 : 30;
}

function safeKey(type: LimiterType, plan: "free" | "pro", key: string): string {
  return crypto.createHash("sha256").update(`${type}:${plan}:${key}`).digest("hex");
}

// In-memory fallback used when Redis is unavailable (e.g. local dev without
// REDIS_URL). Per-instance only, but keeps security-critical limiters
// functional instead of failing closed and bricking development.
const memoryLimiters = new Map<string, { count: number; resetAt: number }>();

function memoryRateLimit(limitKey: string, limit: number): RateLimitResult {
  const now = Date.now();
  for (const [key, entry] of memoryLimiters) {
    if (entry.resetAt <= now) memoryLimiters.delete(key);
  }
  const existing = memoryLimiters.get(limitKey);
  const current = existing && existing.resetAt > now ? existing.count + 1 : 1;
  const resetAt =
    existing && existing.resetAt > now ? existing.resetAt : now + WINDOW_SECONDS * 1000;
  memoryLimiters.set(limitKey, { count: current, resetAt });
  return {
    success: current <= limit,
    limit,
    remaining: Math.max(0, limit - current),
    resetTimestamp: Math.floor(resetAt / 1000),
  };
}

export async function rateLimit(
  type: LimiterType,
  key: string,
  plan: "free" | "pro" = "free"
): Promise<RateLimitResult> {
  const limit = limitFor(type, plan);
  const hashedKey = safeKey(type, plan, key);
  const limitKey = `rl_${hashedKey}`;

  try {
    if (!process.env.REDIS_URL) {
      return memoryRateLimit(limitKey, limit);
    }

    const client = connectToRedis();
    const script = `
      local current = redis.call("INCR", KEYS[1])
      if current == 1 then
        redis.call("EXPIRE", KEYS[1], ARGV[1])
      end
      return current
    `;

    const current = (await client.eval(script, 1, limitKey, WINDOW_SECONDS)) as number;
    const ttl = await client.ttl(limitKey);
    const resetTimestamp = Math.floor(Date.now() / 1000) + (ttl > 0 ? ttl : WINDOW_SECONDS);
    const remaining = Math.max(0, limit - current);

    if (current > limit) {
      return { success: false, limit, remaining: 0, resetTimestamp };
    }

    return { success: true, limit, remaining, resetTimestamp };
  } catch (error) {
    console.error("Rate limiter unavailable", {
      type,
      error: error instanceof Error ? error.message : "Unknown",
    });
    const success = false;
    return {
      success,
      limit,
      remaining: success ? limit : 0,
      resetTimestamp: Math.floor(Date.now() / 1000) + WINDOW_SECONDS,
    };
  }
}
