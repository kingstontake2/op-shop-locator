import { NextResponse } from "next/server";
import { recordUsage } from "@/lib/usage";

export async function POST() {
  void recordUsage({ map_loads: 1 });
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
