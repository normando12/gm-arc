"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { explorerAddress } from "@/lib/config";
import {
  POOL_ADDRESS,
  POOL_PER_GM_PLUS_USDC,
  type PoolStatsResponse,
} from "@/lib/pool/config";

export const POOL_REFRESH_EVENT = "gm-arc:pool-refresh";
const POLL_MS = 30_000;
const CATCH_UP_BLOCKS = 20_000;

/** Smoothly count a number up to its new value (instant for reduced motion). */
function useCountUp(target: number | null): number | null {
  const [shown, setShown] = useState<number | null>(target);
  const fromRef = useRef<number>(target ?? 0);

  useEffect(() => {
    if (target === null) {
      setShown(null);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    if (reduce || from === target) {
      fromRef.current = target;
      setShown(target);
      return;
    }
    const start = performance.now();
    const duration = 900;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      setShown(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return shown;
}

function formatUsdc(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Community counter: GM+ sent, estimated pool and, if set, the real pool wallet balance. */
export function PoolStats() {
  const [data, setData] = useState<PoolStatsResponse | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/pool", { cache: "no-store" });
      const json = (await res.json()) as PoolStatsResponse;
      if (!res.ok || !json.ok) throw new Error("pool unavailable");
      setData(json);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    const timers: number[] = [];
    const onRefresh = () => {
      // The scan needs a moment to see a fresh GM+, so check twice.
      timers.push(window.setTimeout(() => void load(), 3_000));
      timers.push(window.setTimeout(() => void load(), 9_000));
    };
    window.addEventListener(POOL_REFRESH_EVENT, onRefresh);
    return () => {
      window.clearInterval(id);
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener(POOL_REFRESH_EVENT, onRefresh);
    };
  }, [load]);

  const animatedCount = useCountUp(data?.count ?? null);

  if (failed && !data) return null;
  if (data && !data.enabled && data.balance === null) return null;

  const loading = !data;
  const count = data?.count ?? null;
  const estimate = count === null ? null : count * POOL_PER_GM_PLUS_USDC;
  const catchingUp =
    data?.behindBlocks !== null &&
    data?.behindBlocks !== undefined &&
    data.behindBlocks > CATCH_UP_BLOCKS;

  return (
    <section className="pool-card" aria-label="Community pool" aria-busy={loading}>
      <p className="pool-kicker">Community pool</p>
      <div className="pool-grid">
        <div className="pool-stat">
          <span className="pool-num">
            {loading || animatedCount === null
              ? "—"
              : animatedCount.toLocaleString("en-US")}
          </span>
          <span className="pool-label">GM+ sent</span>
        </div>
        <div className="pool-stat">
          <span className="pool-num">
            {estimate === null ? "—" : formatUsdc(estimate)}
            <small> USDC</small>
          </span>
          <span className="pool-label">
            Estimated pool ({POOL_PER_GM_PLUS_USDC} per GM+)
          </span>
        </div>
      </div>
      {POOL_ADDRESS ? (
        <p className="pool-wallet">
          In the pool wallet:{" "}
          <strong>
            {data?.balance == null ? "—" : formatUsdc(Number(data.balance))} USDC
          </strong>{" "}
          ·{" "}
          <a
            href={explorerAddress(POOL_ADDRESS)}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on explorer
          </a>
        </p>
      ) : null}
      <p className="pool-note">
        {catchingUp
          ? "Catching up with the latest blocks — the count may be a little behind."
          : "Counts GM+ sent since this counter started. The estimate is GM+ times the amount per GM+."}
      </p>
    </section>
  );
}
