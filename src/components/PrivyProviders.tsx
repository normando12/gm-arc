"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";
import { IS_PRIVY_ENABLED, PRIVY_APP_ID, PRIVY_CLIENT_ID } from "@/lib/privy";

/**
 * Wraps children with Privy only when NEXT_PUBLIC_PRIVY_APP_ID is set.
 * Wallet (wagmi) stays independent — X login is optional like gm.ink.
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
        // X is primary; wallet remains available via wagmi Connect (gm.ink-style optional).
        loginMethods: ["twitter"],
        appearance: {
          theme: "dark",
          accentColor: "#ff8a3d",
        },
        embeddedWallets: {
          ethereum: {
            // Create an embedded EVM wallet when the user has none (X-only path).
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
