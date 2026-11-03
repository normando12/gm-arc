"use client";

import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { arc } from "./arc";

export const wagmiConfig = createConfig({
  chains: [arc],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [arc.id]: http(arc.rpcUrls.default.http[0]),
  },
  ssr: true,
});
