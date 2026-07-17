import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import { getRedis } from "@/lib/redis";
import { geocodeSuburb, hasGoogleMapsServerKey } from "@/lib/places";
import type { GeocodeResponse } from "@/lib/types";

const GEOCODE_CACHE_TTL_SECONDS = 60 * 60; // 1 hour

function geocodeCacheKey(query: string): string {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  return `opshop:geocode:${encodeURIComponent(normalized)}`;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json(
      { error: "Query param q is required" },
      { status: 400 },
    );
  }

  const redis = getRedis();
  const cacheKey = geocodeCacheKey(q);

  if (redis) {
    try {
      const cached = await redis.get<GeocodeResponse>(cacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: { "X-Cache": "HIT" },
        });
      }
    } catch {
      // Cache read failures should not block Google fallback.
    }
  }

  const rate = await checkRateLimit("geocode", getClientIp(request));
  if (!rate.success) {
    return rateLimitedResponse(rate);
  }

  if (!hasGoogleMapsServerKey()) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_SERVER_KEY is not set" },
      { status: 500, headers: rateLimitHeaders(rate) },
    );
  }

  try {
    const result = await geocodeSuburb(q);
    if (!result) {
      return NextResponse.json(
        { error: "No results for that suburb" },
        { status: 404, headers: rateLimitHeaders(rate) },
      );
    }

    if (redis) {
      try {
        await redis.set(cacheKey, result, { ex: GEOCODE_CACHE_TTL_SECONDS });
      } catch {
        // Cache write failures should not fail the response.
      }
    }

    return NextResponse.json(result, {
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
