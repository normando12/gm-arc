"use client";

import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import {
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
} from "viem/chains";
import { arc } from "./arc";

export const wagmiConfig = createConfig({
  chains: [arc, mainnet, base, arbitrum, optimism, polygon],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [arc.id]: http(arc.rpcUrls.default.http[0]),
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
  },
  ssr: true,
});
