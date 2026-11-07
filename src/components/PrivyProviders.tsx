"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";
import { RegisterXHandle } from "@/components/RegisterXHandle";
import { IS_PRIVY_ENABLED, PRIVY_APP_ID, PRIVY_CLIENT_ID } from "@/lib/privy";

/**
 * Wraps children with Privy only when NEXT_PUBLIC_PRIVY_APP_ID is set.
 * Wallet (wagmi) stays independent — X login is optional like gm.ink.
 * RegisterXHandle maps connected wagmi wallet → X @handle for GM+ tweets.
 */
export function PrivyProviders({ children }: { children: ReactNode }) {
  if (!IS_PRIVY_ENABLED) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      {...(PRIVY_CLIENT_ID ? { clientId: PRIVY_CLIENT_ID } : {})}
      config={{
        // X identity only — Arc GM/GM+ uses wagmi external wallets, not Privy embedded.
        loginMethods: ["twitter"],
        appearance: {
          theme: "dark",
          accentColor: "#ff8a3d",
        },
        embeddedWallets: {
          ethereum: {
            // Must stay "off": createOnLogin with login() stuck the modal on
            // "Creating your wallet" after Sign in with X (no embedded wallet needed).
            createOnLogin: "off",
          },
          solana: {
            createOnLogin: "off",
          },
        },
      }}
    >
      <RegisterXHandle />
      {children}
    </PrivyProvider>
  );
}
