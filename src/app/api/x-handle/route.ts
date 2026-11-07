import { PrivyClient } from "@privy-io/server-auth";
import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { hasPrivyCredentials, xAlertsConfig } from "@/lib/x-alerts/config";
import { setRegisteredHandle } from "@/lib/x-alerts/handles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status: number): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

function twitterUsernameFromUser(user: {
  twitter?: { username?: string | null } | null;
  linkedAccounts?: Array<{ type?: string; username?: string | null }>;
}): string | null {
  const direct = user.twitter?.username?.trim().replace(/^@/, "");
  if (direct && /^[A-Za-z0-9_]{1,15}$/.test(direct)) return direct;

  for (const account of user.linkedAccounts ?? []) {
    if (account.type === "twitter_oauth" || account.type === "twitter") {
      const username = account.username?.trim().replace(/^@/, "");
      if (username && /^[A-Za-z0-9_]{1,15}$/.test(username)) return username;
    }
  }
  return null;
}

/**
 * Register wallet → X handle for GM+ tweet labels.
 *
 * Client: signed-in Privy access token + connected wagmi address.
 * Server: verify token, read twitter username from Privy user (never trust body username).
 */
export async function POST(req: Request) {
  if (!hasPrivyCredentials()) {
    return json(
      {
        ok: false,
        error:
          "PRIVY_APP_ID / PRIVY_APP_SECRET not set — cannot verify X session.",
      },
      503,
    );
  }

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return json({ ok: false, error: "Missing Bearer access token" }, 401);
  }

  let body: { address?: unknown };
  try {
    body = (await req.json()) as { address?: unknown };
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const address =
    typeof body.address === "string" ? body.address.trim() : "";
  if (!isAddress(address)) {
    return json({ ok: false, error: "Invalid wallet address" }, 400);
  }

  try {
    const privy = new PrivyClient(
      xAlertsConfig.privyAppId,
      xAlertsConfig.privyAppSecret,
    );
    const claims = await privy.verifyAuthToken(token);
    const user = await privy.getUser(claims.userId);
    const username = twitterUsernameFromUser(user);

    if (!username) {
      return json(
        {
          ok: false,
          error: "Privy user has no linked X/Twitter username",
        },
        422,
      );
    }

    const stored = await setRegisteredHandle(address, username);
    if (!stored) {
      return json({ ok: false, error: "Failed to store handle" }, 500);
    }

    console.info("[x-handle] registered", {
      address: address.toLowerCase(),
      username: stored,
      userId: claims.userId,
    });

    return json({ ok: true, address: address.toLowerCase(), username: stored }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[x-handle] verify/register failed:", message.slice(0, 200));
    return json({ ok: false, error: "Unauthorized or Privy error" }, 401);
  }
}
