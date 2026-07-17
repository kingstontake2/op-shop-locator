import { NextRequest, NextResponse } from "next/server";
import { searchNearbyOpShops } from "@/lib/places";
import { AUCKLAND_CENTER, DEFAULT_RADIUS_M } from "@/lib/types";

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

  if (!Number.isFinite(radius) || radius <= 0 || radius > 50000) {
    return NextResponse.json(
      { error: "radius must be between 1 and 50000" },
      { status: 400 },
    );
  }

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return NextResponse.json(
      {
        error:
          "GOOGLE_MAPS_API_KEY is not set. Copy .env.local.example to .env.local and add your key.",
      },
      { status: 500 },
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
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      shops,
      center: { lat, lng },
      status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
