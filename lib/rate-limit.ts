import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { NextRequest } from "next/server";
import { rateLimitKey } from "./cache-keys";
import { getRedis } from "./redis";

export type RateLimitOperation = "nearby" | "details" | "geocode";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  /** True when Redis is unavailable and limiting was skipped. */
  bypassed: boolean;
};

const LIMITS: Record<
  RateLimitOperation,
  { requests: number; window: `${number} d` }
> = {
  nearby: { requests: 30, window: "1 d" },
  details: { requests: 60, window: "1 d" },
  geocode: { requests: 30, window: "1 d" },
};

const limiters = new Map<RateLimitOperation, Ratelimit>();

function prefixFor(operation: RateLimitOperation): string {
  // rateLimitKey(op, id) => opshop:rl:{op}:{id}; strip trailing colon for Upstash prefix.
  return rateLimitKey(operation, "").replace(/:$/, "");
}

function getLimiter(operation: RateLimitOperation): Ratelimit | null {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  const existing = limiters.get(operation);
  if (existing) {
    return existing;
  }

  const { requests, window } = LIMITS[operation];
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: prefixFor(operation),
    analytics: false,
  });
  limiters.set(operation, limiter);
  return limiter;
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export async function checkRateLimit(
  operation: RateLimitOperation,
  identifier: string,
): Promise<RateLimitResult> {
  const { requests } = LIMITS[operation];
  const limiter = getLimiter(operation);

  if (!limiter) {
    return {
      success: true,
      limit: requests,
      remaining: requests,
      reset: Date.now() + 86_400_000,
      bypassed: true,
    };
  }

  // Prefix is opshop:rl:{operation}; Upstash appends :{identifier}.
  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
    bypassed: false,
  };
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "X-RateLimit-Reset": String(result.reset),
  };
}

export function rateLimitedResponse(result: RateLimitResult): Response {
  const resetSeconds = Math.max(
    0,
    Math.ceil((result.reset - Date.now()) / 1000),
  );
  return Response.json(
    {
      error: "Rate limit exceeded. Try again tomorrow.",
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    },
    {
      status: 429,
      headers: {
        ...rateLimitHeaders(result),
        "Retry-After": String(resetSeconds),
      },
    },
  );
}
