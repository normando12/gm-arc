"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useAccount, useConnect, useWalletClient } from "wagmi";
import { adaptViemWallet } from "@relayprotocol/relay-sdk";
import type { AdaptedWallet } from "@relayprotocol/relay-sdk";
import type { Token } from "@relayprotocol/relay-kit-ui";
import { ARC_BRIDGE_URL } from "@/lib/config";

import "@relayprotocol/relay-kit-ui/styles.css";

const SwapWidget = dynamic(
  () => import("@relayprotocol/relay-kit-ui").then((m) => m.SwapWidget),
  {
    ssr: false,
    loading: () => <div className="bridge-skeleton">Loading bridge…</div>,
  },
);

const USDC_LOGO = "https://assets.relay.link/icons/currencies/usdc.png";

/** Base USDC — common source for bridging into Arc. */
const DEFAULT_FROM: Token = {
  chainId: 8453,
  address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  decimals: 6,
  name: "USDC",
  symbol: "USDC",
  logoURI: USDC_LOGO,
};

/** Arc native gas USDC (18 decimals, zero address). Destination locked to Arc. */
const ARC_TO: Token = {
  chainId: 5042,
  address: "0x0000000000000000000000000000000000000000",
  decimals: 18,
  name: "USDC",
  symbol: "USDC",
  logoURI: USDC_LOGO,
};

const hasRelayProxy = process.env.NEXT_PUBLIC_RELAY_PROXY === "true";

export function BridgePanel() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { data: walletClient } = useWalletClient();
  const [fromToken, setFromToken] = useState<Token | undefined>(DEFAULT_FROM);
  const [toToken, setToToken] = useState<Token | undefined>(ARC_TO);

  const wallet = useMemo<AdaptedWallet | undefined>(() => {
    if (!walletClient) return undefined;
    try {
      return adaptViemWallet(walletClient);
    } catch {
      return undefined;
    }
  }, [walletClient]);

  const onConnectWallet = useCallback(() => {
    const injected =
      connectors.find((c) => c.id === "injected") ?? connectors[0];
    if (injected) void connect({ connector: injected });
  }, [connect, connectors]);

  return (
    <section className="bridge-panel" aria-label="Bridge USDC to Arc">
      <div className="bridge-panel__head">
        <h2>Bridge</h2>
        <p>Move USDC onto Arc for gas and GM+.</p>
      </div>

      {hasRelayProxy ? (
        <div className="bridge-widget">
          <SwapWidget
            key={isConnected ? "connected" : "anon"}
            wallet={wallet}
            fromToken={fromToken}
            setFromToken={setFromToken}
            toToken={toToken}
            setToToken={setToToken}
            lockToToken
            supportedWalletVMs={["evm"]}
            onConnectWallet={onConnectWallet}
            disableInputAutoFocus
          />
        </div>
      ) : (
        <div className="bridge-fallback-card" role="status">
          <p className="bridge-fallback-card__title">In-page Relay bridge</p>
          <p>
            Official <code>portal.arc.io</code> cannot be iframed (
            <code>X-Frame-Options: DENY</code>). This page embeds Relay&apos;s
            SwapWidget with destination locked to <strong>Arc (5042)</strong>{" "}
            when a Relay API key is configured.
          </p>
          <p className="bridge-fallback-card__hint">
            Set server <code>RELAY_API_KEY</code> and{" "}
            <code>NEXT_PUBLIC_RELAY_PROXY=true</code> in Vercel, then Redeploy.
          </p>
        </div>
      )}

      <p className="bridge-cta">
        <a href={ARC_BRIDGE_URL} target="_blank" rel="noopener noreferrer">
          Open official Arc deposit portal
        </a>
      </p>
    </section>
  );
}
