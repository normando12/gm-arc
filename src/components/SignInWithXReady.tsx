"use client";

import { useCallback, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { GM_ARC_X_MENTION } from "@/lib/privy";

function twitterUsername(
  user: { twitter?: { username?: string | null } | null } | null,
): string | null {
  const handle = user?.twitter?.username?.trim();
  return handle ? `@${handle.replace(/^@/, "")}` : null;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  return "Sign in with X failed. Check Privy Login methods (Twitter/X) and allowed domains.";
}

/** Mount only under PrivyProvider when NEXT_PUBLIC_PRIVY_APP_ID is set. */
export function SignInWithXReady() {
  const { ready, authenticated, user, logout, login } = usePrivy();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handle = twitterUsername(user);

  const onSignIn = useCallback(async () => {
    setError(null);
    if (!ready) {
      setError("Privy is still loading — wait a second and try again.");
      return;
    }
    setBusy(true);
    try {
      // Force the Privy modal / OAuth flow to X only (dashboard must have Twitter/X enabled).
      await login({ loginMethods: ["twitter"] });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [login, ready]);

  const onSignOut = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await logout();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [logout]);

  if (authenticated) {
    return (
      <div className="x-auth">
        <button
          type="button"
          className="btn-x btn-x--signed"
          onClick={() => {
            void onSignOut();
          }}
          disabled={busy || !ready}
          title="Sign out of X"
        >
          {busy ? "…" : (handle ?? "Signed in with X")}
        </button>
        {error ? <p className="x-auth-error">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="x-auth">
      <button
        type="button"
        className="btn-x"
        disabled={busy}
        onClick={() => {
          void onSignIn();
        }}
        title={
          ready
            ? `Sign in with X — follow ${GM_ARC_X_MENTION} for updates`
            : "Privy is loading…"
        }
      >
        {!ready ? "Privy…" : busy ? "Signing in…" : "Sign in with X"}
      </button>
      {!ready ? (
        <p className="x-auth-hint">Connecting to Privy…</p>
      ) : null}
      {error ? <p className="x-auth-error">{error}</p> : null}
    </div>
  );
}
