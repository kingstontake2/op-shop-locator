import "server-only";
import { Redis } from "@upstash/redis";

let redis: Redis | null | undefined;

/**
 * Returns an Upstash Redis client when REST credentials are configured.
 * Returns null when absent so local/dev can run without cache or rate limits.
 */
export function getRedis(): Redis | null {
  if (redis !== undefined) {
    return redis;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    redis = null;
    return redis;
  }

  redis = new Redis({ url, token });
  return redis;
}

export function isRedisConfigured(): boolean {
  return getRedis() !== null;
}
