import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { xAlertsConfig } from "@/lib/x-alerts/config";
import { runXGmAlerts } from "@/lib/x-alerts/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
/** Allow enough time for getLogs + Privy + a few tweets. */
export const maxDuration = 60;

function json(data: unknown, status: number): NextResponse {
  // CDN-cached cron responses do not appear in Runtime Logs (Vercel docs).
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
    },
  });
}

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
  // Always log entry so Runtime Logs show an invocation even on 401.
  console.info("[x-gm-alerts] invoke", {
    method: req.method,
    ua: req.headers.get("user-agent"),
    hasAuth: Boolean(req.headers.get("authorization")),
    vercelCron: req.headers.get("x-vercel-cron") || null,
  });

  if (!xAlertsConfig.cronSecret) {
    return json(
      {
        ok: false,
        error:
          "CRON_SECRET is not set. Refusing to run the X alerts worker without auth.",
      },
      503,
    );
  }

  if (!authorized(req)) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  try {
    const summary = await runXGmAlerts();
    console.info("[x-gm-alerts] done", {
      ok: summary.ok,
      dryRun: summary.dryRun,
      fromBlock: summary.fromBlock,
      toBlock: summary.toBlock,
      cursorLastBlock: summary.cursorLastBlock,
      foundGmPlus: summary.foundGmPlus,
      posted: summary.posted,
      errorCount: summary.errors.length,
      // Full messages — Hobby Runtime Logs often truncate JSON bodies; this is the diagnosis.
      errors: summary.errors.slice(0, 3),
      stateBackend: summary.stateBackend,
    });
    return json(summary, summary.ok ? 200 : 207);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[x-gm-alerts] fatal", err);
    return json({ ok: false, error: message }, 500);
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
