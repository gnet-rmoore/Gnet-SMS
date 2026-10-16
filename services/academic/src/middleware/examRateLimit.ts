import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;

if (redis) {
  redis.on("error", (err) => {
    console.warn("[exam-rate-limit] redis error:", err?.message || err);
  });
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
  limit: number;
};

export async function examRateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  // No Redis configured (e.g. local dev) -> fail open, do not throttle.
  if (!redis) {
    return { allowed: true, remaining: limit, retryAfter: windowSec, limit };
  }
  const bucket = Math.floor(Date.now() / 1000 / windowSec);
  const k = `rl:exam:${key}:${bucket}`;
  try {
    const c = await redis.incr(k);
    if (c === 1) {
      await redis.expire(k, windowSec + 5);
    }
    return {
      allowed: c <= limit,
      remaining: Math.max(0, limit - c),
      retryAfter: windowSec,
      limit,
    };
  } catch (err: any) {
    // Fail open on Redis failure so exam writes are never blocked by the limiter.
    console.warn("[exam-rate-limit] incr failed:", err?.message || err);
    return { allowed: true, remaining: limit, retryAfter: windowSec, limit };
  }
}
