import { NextRequest, NextResponse } from "next/server";
import { detailsCacheKey } from "@/lib/cache-keys";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import { getRedis } from "@/lib/redis";
import { fetchPlaceDetails, hasGoogleMapsServerKey } from "@/lib/places";

const DETAILS_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

type PlaceDetailsPayload = {
  phone: string | null;
  website: string | null;
  hours: string[] | null;
  photoReference: string | null;
};

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("placeId")?.trim();

  if (!placeId) {
    return NextResponse.json(
      { error: "placeId is required" },
      { status: 400 },
    );
  }

  const cacheKey = detailsCacheKey(placeId);
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get<PlaceDetailsPayload>(cacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: { "X-Cache": "HIT" },
        });
      }
    } catch {
      // Cache read failures should not block Google fallback.
    }
  }

  const rate = await checkRateLimit("details", getClientIp(request));
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
    const details = await fetchPlaceDetails(placeId);

    if (redis) {
      try {
        await redis.set(cacheKey, details, { ex: DETAILS_CACHE_TTL_SECONDS });
      } catch {
        // Cache write failures should not fail the response.
      }
    }

    return NextResponse.json(details, {
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
