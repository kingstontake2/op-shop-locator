import { NextRequest, NextResponse } from "next/server";
import { hasGoogleMapsServerKey, getGoogleMapsServerKey } from "@/lib/places";

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  const maxwidth = request.nextUrl.searchParams.get("maxwidth") ?? "400";

  if (!ref) {
    return new NextResponse("Missing ref", { status: 400 });
  }

  if (!hasGoogleMapsServerKey()) {
    return new NextResponse("GOOGLE_MAPS_SERVER_KEY is not set", {
      status: 500,
    });
  }

  const key = getGoogleMapsServerKey();
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/photo",
  );
  url.searchParams.set("maxwidth", maxwidth);
  url.searchParams.set("photo_reference", ref);
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { redirect: "follow" });
  if (!res.ok || !res.body) {
    return new NextResponse("Photo fetch failed", { status: 502 });
  }

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  return new NextResponse(res.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
