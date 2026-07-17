import { NextRequest, NextResponse } from "next/server";
import { geocodeSuburb } from "@/lib/places";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json(
      { error: "Query param q is required" },
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
    const result = await geocodeSuburb(q);
    if (!result) {
      return NextResponse.json(
        { error: "No results for that suburb" },
        { status: 404 },
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
