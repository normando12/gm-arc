"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ARC_CHAIN_ID, IS_MOCK_MODE, shortAddress } from "@/lib/config";
import { requestXHandleRegistration } from "@/lib/x-handle-client";
import { IS_PRIVY_ENABLED } from "@/lib/privy";
import { useCallback, useEffect, useState } from "react";

type Props = {
  className?: string;
};

/** Shared Connect / disconnect control for header or console. */
export function ConnectWalletButton({ className = "btn-connect" }: Props) {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    setMounted(true);
  }, []);

  const onConnect = useCallback(async () => {
    const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];
    if (!injected) return;
    try {
      await connect({ connector: injected, chainId: ARC_CHAIN_ID });
      if (IS_PRIVY_ENABLED) requestXHandleRegistration();
      if (chainId !== ARC_CHAIN_ID && switchChain) {
        await switchChain({ chainId: ARC_CHAIN_ID });
      }
    } catch {
      /* GmConsole surfaces connect errors on actions; header stays quiet */
    }
  }, [chainId, connect, connectors, switchChain]);

  if (!mounted) {
    return (
      <button type="button" className={className} disabled>
        Connect wallet
      </button>
    );
  }

  if (IS_MOCK_MODE) {
    return (
      <button type="button" className={className} onClick={onConnect}>
        Connect wallet
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button type="button" className={className} onClick={() => disconnect()}>
        {shortAddress(address)}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onConnect}
      disabled={connecting}
    >
      Connect wallet
    </button>
  );
}
