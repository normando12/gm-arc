"use client";

import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { useState, type ReactNode } from "react";
import { IS_PRIVY_ENABLED } from "@/lib/privy";
import { wagmiConfig } from "@/lib/wagmi";

const PrivyProviders = dynamic(
  () =>
    import("@/components/PrivyProviders").then((m) => m.PrivyProviders),
  { ssr: false },
);

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  const tree = IS_PRIVY_ENABLED ? (
    <PrivyProviders>{children}</PrivyProviders>
  ) : (
    children
  );

  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount>
      <QueryClientProvider client={queryClient}>{tree}</QueryClientProvider>
    </WagmiProvider>
  );
}
