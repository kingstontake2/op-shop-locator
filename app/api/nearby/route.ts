import { NextRequest, NextResponse } from "next/server";
import { nearbyCacheKey } from "@/lib/cache-keys";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import { getRedis } from "@/lib/redis";
import { hasGoogleMapsServerKey, searchNearbyOpShops } from "@/lib/places";
import {
  AUCKLAND_CENTER,
  DEFAULT_RADIUS_M,
  MAX_SEARCH_RADIUS_M,
  type NearbyResponse,
  type Shop,
} from "@/lib/types";

const NEARBY_CACHE_TTL_SECONDS = 14 * 24 * 60 * 60;

type CachedNearby = {
  shops: Shop[];
  status: string;
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const radiusParam = searchParams.get("radius");

  const lat = latParam != null ? Number(latParam) : AUCKLAND_CENTER.lat;
  const lng = lngParam != null ? Number(lngParam) : AUCKLAND_CENTER.lng;
  const radius =
    radiusParam != null ? Number(radiusParam) : DEFAULT_RADIUS_M;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "lat and lng must be valid numbers" },
      { status: 400 },
    );
  }

  if (
    !Number.isFinite(radius) ||
    radius <= 0 ||
    radius > MAX_SEARCH_RADIUS_M
  ) {
    return NextResponse.json(
      {
        error: `radius must be between 1 and ${MAX_SEARCH_RADIUS_M}`,
      },
      { status: 400 },
    );
  }

  const cacheKey = nearbyCacheKey(lat, lng, radius);
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get<CachedNearby>(cacheKey);
      if (cached?.shops) {
        const body: NearbyResponse = {
          shops: cached.shops,
          center: { lat, lng },
          radius,
          status: cached.status ?? "OK",
          source: "cache",
        };
        return NextResponse.json(body, {
          headers: {
            "X-Cache": "HIT",
          },
        });
      }
    } catch {
      // Cache read failures should not block Google fallback.
    }
  }

  const rate = await checkRateLimit("nearby", getClientIp(request));
  if (!rate.success) {
    return rateLimitedResponse(rate);
  }

  if (!hasGoogleMapsServerKey()) {
    return NextResponse.json(
      {
        error:
          "GOOGLE_MAPS_SERVER_KEY is not set. Copy .env.local.example to .env.local and add a server Places key.",
      },
      { status: 500, headers: rateLimitHeaders(rate) },
    );
  }

  try {
    const { shops, status, errorMessage } = await searchNearbyOpShops(
      lat,
      lng,
      radius,
    );

    if (status !== "OK" && status !== "ZERO_RESULTS") {
      return NextResponse.json(
        {
          error: errorMessage ?? `Places API status: ${status}`,
          status,
          shops: [],
          center: { lat, lng },
          radius,
          source: "google" as const,
        },
        { status: 502, headers: rateLimitHeaders(rate) },
      );
    }

    if (redis && (status === "OK" || status === "ZERO_RESULTS")) {
      try {
        await redis.set(
          cacheKey,
          { shops, status } satisfies CachedNearby,
          { ex: NEARBY_CACHE_TTL_SECONDS },
        );
      } catch {
        // Cache write failures should not fail the response.
      }
    }

    const body: NearbyResponse = {
      shops,
      center: { lat, lng },
      radius,
      status,
      source: "google",
    };

    return NextResponse.json(body, {
      headers: {
        ...rateLimitHeaders(rate),
        "X-Cache": "MISS",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: rateLimitHeaders(rate) },
    );
  }
}
