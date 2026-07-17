import { NextRequest, NextResponse } from "next/server";
import { fetchPlaceDetails } from "@/lib/places";

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("placeId")?.trim();

  if (!placeId) {
    return NextResponse.json(
      { error: "placeId is required" },
      { status: 400 },
    );
  }

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY is not set" },
      { status: 500 },
    );
  }

  try {
    const details = await fetchPlaceDetails(placeId);
    return NextResponse.json(details);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
