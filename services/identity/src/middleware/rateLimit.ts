import type { Request, Response, NextFunction } from "express";

type Bucket = { count: number; resetAt: number };

/**
 * Rate limiter with Redis backing for multi-replica deployments.
 * Falls back to in-memory when Redis is unavailable (dev only).
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  keyFn?: (req: Request) => string;
  message?: string;
}) {
  const { windowMs, max, message = "Too many requests, please try again later" } = options;
  const keyFn = options.keyFn ?? ((req) => req.ip || "unknown");

  // In-memory fallback (single-replica only)
  const buckets = new Map<string, Bucket>();
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, Math.min(windowMs, 60_000));
  if (typeof cleanup.unref === "function") cleanup.unref();

  let redisClient: any = null;
  let redisConnecting = false;

  async function getRedis() {
    if (redisClient) return redisClient;
    if (redisConnecting) return null;
    const url = process.env.REDIS_URL;
    if (!url) return null;
    redisConnecting = true;
    try {
      const Redis = (await import("ioredis")).default;
      redisClient = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
      await redisClient.connect();
      console.log("[rateLimit] Redis connected — distributed rate limiting enabled");
      return redisClient;
    } catch {
      console.warn("[rateLimit] Redis unavailable — using in-memory fallback (NOT safe for multi-replica)");
      redisClient = null;
      return null;
    } finally {
      redisConnecting = false;
    }
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `ratelimit:${keyFn(req)}`;
    const now = Date.now();

    const redis = await getRedis();
    if (redis) {
      try {
        const multi = redis.multi();
        multi.zremrangebyscore(key, 0, now - windowMs);
        multi.zadd(key, now.toString(), `${now}-${Math.random()}`);
        multi.zcard(key);
        multi.pexpire(key, windowMs);
        const results = await multi.exec();
        const count = Number(results[2][1]);
        const resetAt = now + windowMs;

        res.setHeader("X-RateLimit-Limit", String(max));
        res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - count)));
        res.setHeader("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));

        if (count > max) {
          void import("../utils/logger")
            .then(({ logSystemEvent }) =>
              logSystemEvent(
                "rate_limit_exceeded",
                "SECURITY",
                `Rate limit exceeded for ${keyFn(req)}`,
                "WARNING",
                req,
                {
                  category: "SECURITY",
                  statusCode: 429,
                  endpoint: req.originalUrl || req.url,
                  httpMethod: req.method,
                  tags: ["rate_limit", "security"],
                }
              )
            )
            .catch(() => undefined);
          return res.status(429).json({ error: message });
        }
        return next();
      } catch {
        // Redis error — fall through to in-memory
      }
    }

    // In-memory fallback
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      void import("../utils/logger")
        .then(({ logSystemEvent }) =>
          logSystemEvent(
            "rate_limit_exceeded",
            "SECURITY",
            `Rate limit exceeded for ${keyFn(req)}`,
            "WARNING",
            req,
            {
              category: "SECURITY",
              statusCode: 429,
              endpoint: req.originalUrl || req.url,
              httpMethod: req.method,
              tags: ["rate_limit", "security"],
            }
          )
        )
        .catch(() => undefined);
      return res.status(429).json({ error: message });
    }
    next();
  };
}

export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyFn: (req) => `${req.ip}:${(req.body?.email as string) || "anon"}`,
  message: "Too many login attempts. Please wait and try again.",
});
