"use client";

import { useEffect, useState } from "react";
import { useLogin, usePrivy } from "@privy-io/react-auth";
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
  return "Sign in with X failed. Enable Twitter/X in Privy and allowlist https://gm-arc.vercel.app.";
}

/** Mount only under PrivyProvider when NEXT_PUBLIC_PRIVY_APP_ID is set. */
export function SignInWithXReady() {
  const { ready, authenticated, user, logout, error: privyError } = usePrivy();
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const handle = twitterUsername(user);

  const { login } = useLogin({
    onComplete: () => {
      setError(null);
    },
    onError: (err) => {
      setError(errorMessage(err));
    },
  });

  useEffect(() => {
    if (privyError) {
      setError(errorMessage(privyError));
    }
  }, [privyError]);

  if (authenticated) {
    return (
      <div className="x-auth">
        <button
          type="button"
          className="btn-x btn-x--signed"
          disabled={signingOut || !ready}
          title="Sign out of X"
          onClick={() => {
            setError(null);
            setSigningOut(true);
            void logout()
              .catch((err: unknown) => setError(errorMessage(err)))
              .finally(() => setSigningOut(false));
          }}
        >
          {signingOut ? "…" : (handle ?? "Signed in with X")}
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
        disabled={!ready}
        title={
          ready
            ? `Sign in with X — follow ${GM_ARC_X_MENTION} for updates`
            : "Privy is loading…"
        }
        onClick={() => {
          // login() is synchronous (void). Call it directly in the click
          // handler so Privy's modal keeps the user-gesture / isn't deferred.
          setError(null);
          if (!ready) {
            setError("Privy is still loading — wait a second and try again.");
            return;
          }
          if (privyError) {
            setError(errorMessage(privyError));
            return;
          }
          try {
            login({ loginMethods: ["twitter"] });
          } catch (err) {
            setError(errorMessage(err));
          }
        }}
      >
        {!ready ? "Privy…" : "Sign in with X"}
      </button>
      {!ready ? (
        <p className="x-auth-hint">Connecting to Privy…</p>
      ) : null}
      {error ? <p className="x-auth-error">{error}</p> : null}
    </div>
  );
}
