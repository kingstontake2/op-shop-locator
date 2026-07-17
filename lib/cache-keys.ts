const PREFIX = "opshop";
const RADIUS_BUCKETS = [5_000, 10_000, 20_000, 35_000, 50_000] as const;

function roundedCoordinate(value: number): string {
  return value.toFixed(2);
}

function radiusBucket(radius: number): number {
  return (
    RADIUS_BUCKETS.find((bucket) => radius <= bucket) ??
    RADIUS_BUCKETS[RADIUS_BUCKETS.length - 1]
  );
}

export function nearbyCacheKey(
  lat: number,
  lng: number,
  radius: number,
): string {
  return [
    PREFIX,
    "nearby",
    roundedCoordinate(lat),
    roundedCoordinate(lng),
    radiusBucket(radius),
  ].join(":");
}

export function detailsCacheKey(placeId: string): string {
  return `${PREFIX}:details:${placeId}`;
}

export function rateLimitKey(
  operation: "nearby" | "details" | "geocode",
  identifier: string,
): string {
  return `${PREFIX}:rl:${operation}:${identifier}`;
}
