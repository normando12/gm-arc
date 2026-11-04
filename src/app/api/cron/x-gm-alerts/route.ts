import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { xAlertsConfig } from "@/lib/x-alerts/config";
import { runXGmAlerts } from "@/lib/x-alerts/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Allow enough time for getLogs + Privy + a few tweets. */
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = xAlertsConfig.cronSecret;
  if (!secret) return false;

  const header = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function handle(req: Request): Promise<NextResponse> {
  if (!xAlertsConfig.cronSecret) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "CRON_SECRET is not set. Refusing to run the X alerts worker without auth.",
      },
      { status: 503 },
    );
  }

  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runXGmAlerts();
    return NextResponse.json(summary, { status: summary.ok ? 200 : 207 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[x-gm-alerts]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
