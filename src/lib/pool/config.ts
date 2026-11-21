import { isAddress } from "viem";

/**
 * Public pool settings (safe for the browser).
 *
 * - NEXT_PUBLIC_POOL_PER_GM_PLUS: USDC counted toward the pool per GM+ (default 0.8).
 * - NEXT_PUBLIC_POOL_ADDRESS: optional wallet that actually holds the pool. When set,
 *   the site also shows its real balance.
 */
const rawPerGm = Number.parseFloat(
  process.env.NEXT_PUBLIC_POOL_PER_GM_PLUS?.trim() || "",
);

export const POOL_PER_GM_PLUS_USDC =
  Number.isFinite(rawPerGm) && rawPerGm >= 0 ? rawPerGm : 0.8;

const rawAddress = process.env.NEXT_PUBLIC_POOL_ADDRESS?.trim() || "";

export const POOL_ADDRESS: `0x${string}` | null = isAddress(rawAddress)
  ? (rawAddress as `0x${string}`)
  : null;

export type PoolStatsResponse = {
  ok: boolean;
  /** False when counting is unavailable (for example no durable storage). */
  enabled: boolean;
  /** GM+ counted since the counter started; null when disabled. */
  count: number | null;
  /** How many blocks the counter still has to scan to reach the chain tip. */
  behindBlocks: number | null;
  /** Real balance of the pool wallet in USDC (decimal string), or null. */
  balance: string | null;
};
