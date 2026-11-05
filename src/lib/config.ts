import { parseEther } from "viem";

/** Legacy v1 (0.01 → treasury only). Prefer NEXT_PUBLIC_CONTRACT_ADDRESS after v2 deploy. */
const DEFAULT_CONTRACT =
  "0x605A1Adc99796C5A1AB059386EBBE533Dc9d22e3" as const;

/** Owner ops fee recipient (Option A). */
export const GM_PLUS_OWNER =
  (process.env.NEXT_PUBLIC_GM_PLUS_OWNER?.trim() as `0x${string}` | undefined) ||
  ("0xe8fE5893E7eeC69DF7B06787b8b25dd64CeC3773" as const);

const envAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim();
const envAlias = process.env.NEXT_PUBLIC_GM_CONTRACT?.trim();

export const CONTRACT_ADDRESS = (envAddress ||
  envAlias ||
  DEFAULT_CONTRACT) as `0x${string}`;

/** Friend tip in USDC (18 decimals on Arc). */
export const GM_PLUS_FRIEND_TIP_USDC =
  process.env.NEXT_PUBLIC_GM_PLUS_FRIEND_TIP?.trim() || "0.01";

/** Owner / X-ops fee in USDC. */
export const GM_PLUS_OWNER_FEE_USDC =
  process.env.NEXT_PUBLIC_GM_PLUS_OWNER_FEE?.trim() || "1";

/**
 * Total native value for `gmPlusTo` — friend tip + owner fee.
 * Override with NEXT_PUBLIC_GM_PLUS_FEE if set; else sum of tip + owner fee.
 */
const envTotal = process.env.NEXT_PUBLIC_GM_PLUS_FEE?.trim();
export const GM_PLUS_FEE_USDC =
  envTotal ||
  String(
    Number.parseFloat(GM_PLUS_FRIEND_TIP_USDC) +
      Number.parseFloat(GM_PLUS_OWNER_FEE_USDC),
  );

/** Native Arc USDC uses 18 decimals — same unit as wei/ether helpers. */
export const GM_PLUS_FEE_WEI = parseEther(GM_PLUS_FEE_USDC);
export const GM_PLUS_FRIEND_TIP_WEI = parseEther(GM_PLUS_FRIEND_TIP_USDC);
export const GM_PLUS_OWNER_FEE_WEI = parseEther(GM_PLUS_OWNER_FEE_USDC);

const forceMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";
const addressConfigured = Boolean(envAddress || envAlias || DEFAULT_CONTRACT);

/** Mock when forced, or when no contract address is available. */
export const IS_MOCK_MODE = forceMock || !addressConfigured;

export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() || "";

export const ARC_DOCS_URL = "https://docs.arc.io/arc/references/connect-to-arc";
export const ARC_EXPLORER_URL = "https://explorer.arc.io";
export const ARC_BRIDGE_URL = "https://portal.arc.io/deposit/crypto";
export const ARC_CHAIN_ID = 5042;

export function shortAddress(addr: string, size = 4): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 2 + size)}…${addr.slice(-size)}`;
}

export function explorerAddress(addr: string): string {
  return `${ARC_EXPLORER_URL}/address/${addr}`;
}

export function explorerTx(hash: string): string {
  return `${ARC_EXPLORER_URL}/tx/${hash}`;
}
