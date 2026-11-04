"use client";

import { IS_PRIVY_ENABLED } from "@/lib/privy";
import { SignInWithXReady } from "@/components/SignInWithXReady";

/**
 * Optional Sign in with X (Privy). External wallet connect stays separate.
 * Renders a disabled button when NEXT_PUBLIC_PRIVY_APP_ID is missing.
 */
export function SignInWithX() {
  if (!IS_PRIVY_ENABLED) {
    return (
      <button
        type="button"
        className="btn-x"
        disabled
        title="Set NEXT_PUBLIC_PRIVY_APP_ID after creating a Privy app"
      >
        Sign in with X
      </button>
    );
  }

  return <SignInWithXReady />;
}
