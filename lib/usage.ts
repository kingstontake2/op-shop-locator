import "server-only";
import { getRedis } from "./redis";
import type {
  BreakableMetric,
  UsageMetric,
  UsageSnapshot,
} from "./usage-types";

export type { BreakableMetric, UsageMetric, UsageSnapshot } from "./usage-types";

const METRICS: UsageMetric[] = [
  "nearby_pages",
  "text_search",
  "details",
  "photos",
  "map_loads",
  "cache_hits",
  "cache_misses",
  "redis_commands",
];

const DAY_TTL_SECONDS = 45 * 24 * 60 * 60;
const MONTH_TTL_SECONDS = 70 * 24 * 60 * 60;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function usageCaps() {
  return {
    nearby_pages: envInt("USAGE_CAP_NEARBY", 5_000),
    text_search: envInt("USAGE_CAP_TEXT_SEARCH", 5_000),
    details: envInt("USAGE_CAP_DETAILS", 1_000),
    photos: envInt("USAGE_CAP_PHOTOS", 1_000),
    map_loads: envInt("USAGE_CAP_MAP_LOADS", 10_000),
    redis_commands: envInt("USAGE_CAP_REDIS", 500_000),
  };
}

export function usageBlockAt() {
  return {
    nearby_pages: envInt("USAGE_BLOCK_NEARBY", 4_000),
    text_search: envInt("USAGE_BLOCK_TEXT_SEARCH", 4_000),
    details: envInt("USAGE_BLOCK_DETAILS", 800),
    photos: envInt("USAGE_BLOCK_PHOTOS", 800),
  };
}

function pacificParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return { year, month, day, dayKey: `${year}-${month}-${day}`, monthKey: `${year}-${month}` };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function emptyCounts(): Record<UsageMetric, number> {
  return {
    nearby_pages: 0,
    text_search: 0,
    details: 0,
    photos: 0,
    map_loads: 0,
    cache_hits: 0,
    cache_misses: 0,
    redis_commands: 0,
  };
}

function parseHash(raw: Record<string, unknown> | null | undefined): Record<UsageMetric, number> {
  const counts = emptyCounts();
  if (!raw) return counts;
  for (const metric of METRICS) {
    const value = Number(raw[metric] ?? 0);
    counts[metric] = Number.isFinite(value) ? value : 0;
  }
  return counts;
}

function dayKeyName(dayKey: string): string {
  return `opshop:usage:day:${dayKey}`;
}

function monthKeyName(monthKey: string): string {
  return `opshop:usage:month:${monthKey}`;
}

export function warningLevel(percent: number, blocked: boolean): UsageSnapshot["warnings"][number]["level"] {
  if (blocked) return "blocked";
  if (percent >= 95) return "critical";
  if (percent >= 85) return "high";
  if (percent >= 70) return "warn";
  return "ok";
}

export function projectMonthEnd(
  used: number,
  dayOfMonth: number,
  daysInMonthCount: number,
): number {
  if (dayOfMonth <= 0) return used;
  return Math.round((used / dayOfMonth) * daysInMonthCount);
}

/**
 * Increment usage counters. Batches day + month updates and includes its own
 * Redis command overhead in redis_commands when possible.
 */
export async function recordUsage(
  deltas: Partial<Record<UsageMetric, number>>,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const entries = Object.entries(deltas).filter(
    ([, amount]) => typeof amount === "number" && amount !== 0,
  ) as Array<[UsageMetric, number]>;
  if (entries.length === 0) return;

  const { dayKey, monthKey } = pacificParts();
  const dayRedisKey = dayKeyName(dayKey);
  const monthRedisKey = monthKeyName(monthKey);

  // Pipeline: 2 keys × N fields for deltas, then +2 for redis_commands overhead.
  const commandEstimate = entries.length * 2 + 2;

  try {
    const pipeline = redis.pipeline();
    for (const [metric, amount] of entries) {
      pipeline.hincrby(dayRedisKey, metric, amount);
      pipeline.hincrby(monthRedisKey, metric, amount);
    }
    pipeline.hincrby(dayRedisKey, "redis_commands", commandEstimate);
    pipeline.hincrby(monthRedisKey, "redis_commands", commandEstimate);
    pipeline.expire(dayRedisKey, DAY_TTL_SECONDS);
    pipeline.expire(monthRedisKey, MONTH_TTL_SECONDS);
    await pipeline.exec();
  } catch {
    // Usage tracking must never break product requests.
  }
}

export async function getMonthlyCount(metric: UsageMetric): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  const { monthKey } = pacificParts();
  try {
    const value = await redis.hget<number | string>(
      monthKeyName(monthKey),
      metric,
    );
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export async function canMakeGoogleCall(
  metric: BreakableMetric,
): Promise<{
  allowed: boolean;
  used: number;
  blockAt: number;
  freeCap: number;
}> {
  const caps = usageCaps();
  const blockAt = usageBlockAt();
  const used = await getMonthlyCount(metric);
  return {
    allowed: used < blockAt[metric],
    used,
    blockAt: blockAt[metric],
    freeCap: caps[metric],
  };
}

export function freeTierBlockedResponse(metric: BreakableMetric, used: number, blockAt: number) {
  return Response.json(
    {
      error:
        "Monthly free-tier Google usage guard tripped for this app. Cached results still work; new Google lookups are paused until next month (or raise USAGE_BLOCK_*).",
      metric,
      used,
      blockAt,
    },
    { status: 503 },
  );
}

export async function getUsageSnapshot(): Promise<UsageSnapshot> {
  const { dayKey, monthKey, year, month, day } = pacificParts();
  const dayOfMonth = Number(day);
  const daysInMonthCount = daysInMonth(Number(year), Number(month));
  const caps = usageCaps();
  const blockAt = usageBlockAt();
  const redis = getRedis();

  let monthCounts = emptyCounts();
  let todayCounts = emptyCounts();

  if (redis) {
    try {
      const [monthRaw, dayRaw] = await Promise.all([
        redis.hgetall<Record<string, unknown>>(monthKeyName(monthKey)),
        redis.hgetall<Record<string, unknown>>(dayKeyName(dayKey)),
      ]);
      monthCounts = parseHash(monthRaw);
      todayCounts = parseHash(dayRaw);
      // Count this dashboard read (~2 Redis commands).
      void recordUsage({ redis_commands: 2 });
    } catch {
      // Fall through with zeros.
    }
  }

  const circuitBreakers = {
    nearby_pages: {
      allowed: monthCounts.nearby_pages < blockAt.nearby_pages,
      used: monthCounts.nearby_pages,
      blockAt: blockAt.nearby_pages,
      freeCap: caps.nearby_pages,
    },
    text_search: {
      allowed: monthCounts.text_search < blockAt.text_search,
      used: monthCounts.text_search,
      blockAt: blockAt.text_search,
      freeCap: caps.text_search,
    },
    details: {
      allowed: monthCounts.details < blockAt.details,
      used: monthCounts.details,
      blockAt: blockAt.details,
      freeCap: caps.details,
    },
    photos: {
      allowed: monthCounts.photos < blockAt.photos,
      used: monthCounts.photos,
      blockAt: blockAt.photos,
      freeCap: caps.photos,
    },
  } as const;

  const warnMetrics: Array<{
    metric: BreakableMetric | "map_loads" | "redis_commands";
    used: number;
    cap: number;
    blocked: boolean;
    note?: string;
  }> = [
    {
      metric: "nearby_pages",
      used: monthCounts.nearby_pages,
      cap: caps.nearby_pages,
      blocked: !circuitBreakers.nearby_pages.allowed,
      note: "Legacy Places Nearby Search pages (each page ≤20 results).",
    },
    {
      metric: "text_search",
      used: monthCounts.text_search,
      cap: caps.text_search,
      blocked: !circuitBreakers.text_search.allowed,
      note: "Suburb lookups via Places Text Search.",
    },
    {
      metric: "details",
      used: monthCounts.details,
      cap: caps.details,
      blocked: !circuitBreakers.details.allowed,
      note: "Place Details; Contact/Atmosphere SKUs may also bill under Google pricing.",
    },
    {
      metric: "photos",
      used: monthCounts.photos,
      cap: caps.photos,
      blocked: !circuitBreakers.photos.allowed,
    },
    {
      metric: "map_loads",
      used: monthCounts.map_loads,
      cap: caps.map_loads,
      blocked: false,
      note: "Estimated Dynamic Maps loads (1 per browser session). Google Cloud is authoritative.",
    },
    {
      metric: "redis_commands",
      used: monthCounts.redis_commands,
      cap: caps.redis_commands,
      blocked: false,
      note: "Estimated opshop: commands only. Shared Upstash DB totals include your other project.",
    },
  ];

  const warnings = warnMetrics.map((item) => {
    const percent = item.cap > 0 ? (item.used / item.cap) * 100 : 0;
    return {
      metric: item.metric,
      used: item.used,
      cap: item.cap,
      percent,
      level: warningLevel(percent, item.blocked),
      projected: projectMonthEnd(item.used, dayOfMonth, daysInMonthCount),
      note: item.note,
    };
  });

  const lookups = monthCounts.cache_hits + monthCounts.cache_misses;
  const cacheHitRate = lookups > 0 ? monthCounts.cache_hits / lookups : null;

  return {
    monthKey,
    dayKey,
    dayOfMonth,
    daysInMonth: daysInMonthCount,
    month: monthCounts,
    today: todayCounts,
    caps: {
      nearby_pages: caps.nearby_pages,
      text_search: caps.text_search,
      details: caps.details,
      photos: caps.photos,
      map_loads: caps.map_loads,
      redis_commands: caps.redis_commands,
    },
    blockAt,
    warnings,
    cacheHitRate,
    circuitBreakers,
    notes: [
      "App counters track this project only (opshop: keys).",
      "Google Cloud Console remains authoritative for Maps SKUs and billing.",
      "Upstash Console remains authoritative for the shared Redis database total.",
      "Cached searches continue when circuit breakers trip; only new Google lookups pause.",
    ],
  };
}
