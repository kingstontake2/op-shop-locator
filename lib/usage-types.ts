export type UsageMetric =
  | "nearby_pages"
  | "text_search"
  | "details"
  | "photos"
  | "map_loads"
  | "cache_hits"
  | "cache_misses"
  | "redis_commands";

export type BreakableMetric =
  | "nearby_pages"
  | "text_search"
  | "details"
  | "photos";

export type UsageSnapshot = {
  monthKey: string;
  dayKey: string;
  dayOfMonth: number;
  daysInMonth: number;
  month: Record<UsageMetric, number>;
  today: Record<UsageMetric, number>;
  caps: Record<BreakableMetric | "map_loads" | "redis_commands", number>;
  blockAt: Record<BreakableMetric, number>;
  warnings: Array<{
    metric: BreakableMetric | "map_loads" | "redis_commands";
    used: number;
    cap: number;
    percent: number;
    level: "ok" | "warn" | "high" | "critical" | "blocked";
    projected: number;
    note?: string;
  }>;
  cacheHitRate: number | null;
  circuitBreakers: Record<
    BreakableMetric,
    { allowed: boolean; used: number; blockAt: number; freeCap: number }
  >;
  notes: string[];
};
