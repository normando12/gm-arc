import { NextResponse } from "next/server";
import { postGmPlusForTx } from "@/lib/x-alerts/post-tx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function json(data: unknown, status: number): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Called by the app right after a GM+ confirms. Public on purpose: the tx is
 * verified onchain before anything is posted, and each event posts once.
 */
export async function POST(req: Request) {
  let txHash = "";
  try {
    const body = (await req.json()) as { txHash?: unknown };
    txHash = typeof body.txHash === "string" ? body.txHash.trim() : "";
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  try {
    const result = await postGmPlusForTx(txHash);
    if (!result.ok && result.error === "Invalid tx hash") {
      return json(result, 400);
    }
    if (!result.ok) console.error("[x-gm-alerts] instant failed", result.error);
    return json(
      { ok: result.ok, skipped: result.skipped, posted: result.posted.length },
      result.ok ? 200 : 502,
    );
  } catch (err) {
    console.error("[x-gm-alerts] instant fatal", err);
    return json({ ok: false, error: "Internal error" }, 500);
  }
}
