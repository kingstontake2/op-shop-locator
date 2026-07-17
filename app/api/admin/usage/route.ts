import { NextRequest, NextResponse } from "next/server";
import { getUsageSnapshot } from "@/lib/usage";

function authorized(request: NextRequest): boolean {
  const expected = process.env.USAGE_DASHBOARD_TOKEN?.trim();
  if (!expected) return false;

  const header =
    request.headers.get("x-usage-token")?.trim() ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  return Boolean(header && header === expected);
}

export async function GET(request: NextRequest) {
  if (!process.env.USAGE_DASHBOARD_TOKEN?.trim()) {
    return NextResponse.json(
      {
        error:
          "USAGE_DASHBOARD_TOKEN is not configured. Add it to .env.local and Vercel.",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const snapshot = await getUsageSnapshot();
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "no-store" },
  });
}
