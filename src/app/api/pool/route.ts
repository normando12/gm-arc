import { NextResponse } from "next/server";
import { getPoolStats, refreshPool } from "@/lib/pool/pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Public, read-only counter of GM+ sent (since the counter started) and the
 * pool wallet balance. Refreshes the scan at most every few seconds.
 */
export async function GET() {
  try {
    await refreshPool().catch((err) => {
      console.warn("[pool] refresh failed", err instanceof Error ? err.message : err);
    });
    const stats = await getPoolStats();
    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    });
  } catch (err) {
    console.error("[pool] stats failed", err);
    return NextResponse.json(
      { ok: false, enabled: false, count: null, behindBlocks: null, balance: null },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
