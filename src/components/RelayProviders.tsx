"use client";

import { type ReactNode, useMemo } from "react";
import { RelayKitProvider } from "@relayprotocol/relay-kit-ui";
import { convertViemChainToRelayChain } from "@relayprotocol/relay-sdk";
import { mainnet, base, arbitrum, optimism, polygon } from "viem/chains";
import { arc } from "@/lib/arc";

const useProxy = process.env.NEXT_PUBLIC_RELAY_PROXY === "true";

export function RelayProviders({ children }: { children: ReactNode }) {
  const chains = useMemo(
    () =>
      [arc, mainnet, base, arbitrum, optimism, polygon].map((c) =>
        convertViemChainToRelayChain(c),
      ),
    [],
  );

  if (!useProxy) {
    return <>{children}</>;
  }

  const baseApiUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/relay`
      : "/api/relay";

  return (
    <RelayKitProvider
      options={{
        appName: "gm·arc",
        baseApiUrl,
        chains,
      }}
    >
      {children}
    </RelayKitProvider>
  );
}
