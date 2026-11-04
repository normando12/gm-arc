"use client";

import { useLoginWithOAuth, usePrivy } from "@privy-io/react-auth";
import { GM_ARC_X_MENTION } from "@/lib/privy";

function twitterUsername(
  user: { twitter?: { username?: string | null } | null } | null,
): string | null {
  const handle = user?.twitter?.username?.trim();
  return handle ? `@${handle.replace(/^@/, "")}` : null;
}

/** Loaded only when NEXT_PUBLIC_PRIVY_APP_ID is set. */
export function SignInWithXReady() {
  const { ready, authenticated, user, logout } = usePrivy();
  const { state, initOAuth } = useLoginWithOAuth();
  const handle = twitterUsername(user);
  const loading = !ready || state.status === "loading";

  if (authenticated) {
    return (
      <button
        type="button"
        className="btn-x btn-x--signed"
        onClick={() => logout()}
        disabled={loading}
        title="Sign out of X"
      >
        {handle ?? "Signed in with X"}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn-x"
      disabled={loading}
      onClick={() => {
        void initOAuth({ provider: "twitter" });
      }}
      title={`Sign in with X — follow ${GM_ARC_X_MENTION} for updates`}
    >
      {loading ? "…" : "Sign in with X"}
    </button>
  );
}
