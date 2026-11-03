"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from "wagmi";
import { isAddress } from "viem";
import { arcGmAbi } from "@/lib/abi";
import {
  ARC_CHAIN_ID,
  ARC_DOCS_URL,
  CONTRACT_ADDRESS,
  GM_PLUS_FEE_USDC,
  GM_PLUS_FEE_WEI,
  IS_MOCK_MODE,
  explorerAddress,
  explorerTx,
  shortAddress,
} from "@/lib/config";
import { formatCountdown } from "@/lib/format";
import {
  MOCK_WALLET,
  loadMock,
  mockNextGM,
  mockTxHash,
  resetMock,
  saveMock,
  type MockState,
} from "@/lib/mock";

type Tab = "gm" | "gmPlus";

export function GmConsole() {
  const [tab, setTab] = useState<Tab>("gm");
  const [friend, setFriend] = useState("");
  const [mock, setMock] = useState<MockState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [status, setStatus] = useState<string | null>(null);
  const [statusHash, setStatusHash] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync, data: txHash, isPending: writing } =
    useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    setMounted(true);
    if (IS_MOCK_MODE) setMock(loadMock());
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (confirmed && txHash) {
      setStatus(
        tab === "gm" ? "GM recorded on Arc" : "GM+ sent on Arc",
      );
      setStatusHash(txHash);
    }
  }, [confirmed, txHash, tab]);

  const liveAccount = address;
  const mockReadyAt = mock ? mockNextGM(mock.lastGM, now) : 0;

  const { data: nextGmOnchain } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: arcGmAbi,
    functionName: "nextGM",
    args: liveAccount ? [liveAccount] : undefined,
    query: { enabled: !IS_MOCK_MODE && Boolean(liveAccount), refetchInterval: 12_000 },
  });

  const onchainReadyAt =
    typeof nextGmOnchain === "bigint" && nextGmOnchain > BigInt(0)
      ? Number(nextGmOnchain) * 1000
      : 0;

  const readyAt = IS_MOCK_MODE ? mockReadyAt : onchainReadyAt;
  const onCooldown = readyAt > now;
  const busy = writing || confirming || connecting;

  const onResetMock = useCallback(() => {
    setMock(resetMock());
    setStatus(null);
    setStatusHash(null);
  }, []);

  async function onConnect() {
    const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];
    if (!injected) {
      setStatus("No browser wallet found");
      return;
    }
    try {
      await connect({ connector: injected, chainId: ARC_CHAIN_ID });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Connect failed");
    }
  }

  async function ensureArc() {
    if (chainId !== ARC_CHAIN_ID && switchChain) {
      await switchChain({ chainId: ARC_CHAIN_ID });
    }
  }

  async function onGm() {
    setStatus(null);
    setStatusHash(null);

    if (IS_MOCK_MODE) {
      if (onCooldown) return;
      const next: MockState = {
        lastGM: Date.now(),
        lastGmPlusTo: mock?.lastGmPlusTo ?? null,
        lastTx: mockTxHash(`gm-${Date.now()}`),
        lastKind: "gm",
      };
      saveMock(next);
      setMock(next);
      setStatus("GM recorded on Arc (mock)");
      setStatusHash(next.lastTx);
      return;
    }

    if (!isConnected) {
      await onConnect();
      return;
    }
    try {
      await ensureArc();
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: arcGmAbi,
        functionName: "gm",
        chainId: ARC_CHAIN_ID,
      });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "GM failed");
    }
  }

  async function onGmPlus() {
    setStatus(null);
    setStatusHash(null);

    if (!isAddress(friend)) {
      setStatus("Enter a valid Arc address");
      return;
    }

    if (IS_MOCK_MODE) {
      const next: MockState = {
        lastGM: mock?.lastGM ?? null,
        lastGmPlusTo: friend,
        lastTx: mockTxHash(`gmplus-${friend}-${Date.now()}`),
        lastKind: "gmPlus",
      };
      saveMock(next);
      setMock(next);
      setStatus("GM+ sent on Arc (mock)");
      setStatusHash(next.lastTx);
      return;
    }

    if (!isConnected) {
      await onConnect();
      return;
    }
    try {
      await ensureArc();
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: arcGmAbi,
        functionName: "gmPlusTo",
        args: [friend as `0x${string}`],
        value: GM_PLUS_FEE_WEI,
        chainId: ARC_CHAIN_ID,
      });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "GM+ failed");
    }
  }

  const statusAddr = IS_MOCK_MODE
    ? shortAddress(MOCK_WALLET)
    : address
      ? shortAddress(address)
      : "—";

  const avatars = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="console-avatar console-avatar--left"
        src="/brand/avatar-left.png"
        alt=""
        width={72}
        height={90}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="console-avatar console-avatar--right"
        src="/brand/avatar-right.png"
        alt=""
        width={72}
        height={90}
      />
    </>
  );

  if (!mounted) {
    return (
      <div className="console-shell">
        {avatars}
        <div className="console-card console-card--skeleton" />
      </div>
    );
  }

  return (
    <section className="console-shell">
      {avatars}

      <div className="console-card">
      <div className="console-top">
        <div className="wallet-pill">
          {IS_MOCK_MODE ? (
            <span className="badge badge--mock">Mock</span>
          ) : (
            <>
              <span className="wallet-pill__net">Arc-{ARC_CHAIN_ID}</span>
              <span className="online-dot" aria-hidden />
            </>
          )}
          <span className="wallet-pill__addr">{statusAddr}</span>
        </div>
        {IS_MOCK_MODE ? (
          <button type="button" className="btn-connect" onClick={onConnect}>
            Connect wallet
          </button>
        ) : isConnected ? (
          <button type="button" className="btn-connect" onClick={() => disconnect()}>
            {shortAddress(address!)}
          </button>
        ) : (
          <button
            type="button"
            className="btn-connect"
            onClick={onConnect}
            disabled={connecting}
          >
            Connect wallet
          </button>
        )}
      </div>

      <div className="tab-row" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "gm"}
          className={`tab ${tab === "gm" ? "tab--active" : ""}`}
          onClick={() => setTab("gm")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="tab-icon" src="/brand/icon-gm.svg" alt="" />
          GM
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "gmPlus"}
          className={`tab ${tab === "gmPlus" ? "tab--active" : ""}`}
          onClick={() => setTab("gmPlus")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="tab-icon" src="/brand/icon-gmplus.svg" alt="" />
          GM+
        </button>
      </div>

      {tab === "gm" ? (
        <div className="tab-panel">
          <p className="panel-copy">
            Free daily check-in. One GM every 24 hours — gas only (USDC on Arc).
          </p>
          <button
            type="button"
            className="btn-primary btn-gm"
            disabled={busy || onCooldown}
            onClick={onGm}
          >
            {onCooldown
              ? `Next GM in ${formatCountdown(readyAt, now)}`
              : writing || confirming
                ? "Confirm in wallet…"
                : "Tap to GM"}
          </button>
        </div>
      ) : (
        <div className="tab-panel">
          <p className="panel-copy">
            Send a premium GM to a fren. Fee: {GM_PLUS_FEE_USDC} USDC + gas. No
            daily cooldown.
          </p>
          <label className="field">
            <span>Friend address</span>
            <input
              value={friend}
              onChange={(e) => setFriend(e.target.value.trim())}
              placeholder="0x…"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            className="btn-primary btn-gmplus"
            disabled={busy}
            onClick={onGmPlus}
          >
            {writing || confirming
              ? "Confirm in wallet…"
              : `Send GM+ · ${GM_PLUS_FEE_USDC} USDC`}
          </button>
        </div>
      )}

      {status ? (
        <div className="status-box" role="status">
          <span>{status}</span>
          {statusHash ? (
            IS_MOCK_MODE ? (
              <code>{shortAddress(statusHash, 4)}</code>
            ) : (
              <a href={explorerTx(statusHash)} target="_blank" rel="noreferrer">
                {shortAddress(statusHash, 4)}
              </a>
            )
          ) : null}
        </div>
      ) : null}

      <div className="console-foot">
        {IS_MOCK_MODE ? (
          <p>
            Demo uses local mock state. Deploy{" "}
            <code>contracts/ArcGM.sol</code> to go live.{" "}
            <button type="button" className="linkish" onClick={onResetMock}>
              Reset mock
            </button>
          </p>
        ) : (
          <p>
            Explorer{" "}
            <a href="https://explorer.arc.io" target="_blank" rel="noreferrer">
              explorer.arc.io
            </a>{" "}
            · contract{" "}
            <a
              href={explorerAddress(CONTRACT_ADDRESS)}
              target="_blank"
              rel="noreferrer"
            >
              {shortAddress(CONTRACT_ADDRESS, 4)}
            </a>
          </p>
        )}
      </div>

      <a className="sr-docs" href={ARC_DOCS_URL} hidden>
        Network docs
      </a>
      {IS_MOCK_MODE ? (
        <span className="sr-only">demo {MOCK_WALLET}</span>
      ) : null}
      </div>
    </section>
  );
}
