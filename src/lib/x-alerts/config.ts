import { CONTRACT_ADDRESS } from "@/lib/config";

const DEFAULT_RPC = "https://rpc.mainnet.arc.io";

function env(name: string): string {
  return process.env[name]?.trim() || "";
}

function envInt(name: string, fallback: number): number {
  const raw = env(name);
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export const xAlertsConfig = {
  contractAddress: CONTRACT_ADDRESS,
  rpcUrl: env("ARC_RPC_URL") || DEFAULT_RPC,

  cronSecret: env("CRON_SECRET"),

  xApiKey: env("X_API_KEY"),
  xApiKeySecret: env("X_API_KEY_SECRET"),
  xAccessToken: env("X_ACCESS_TOKEN"),
  xAccessTokenSecret: env("X_ACCESS_TOKEN_SECRET"),

  privyAppId: env("PRIVY_APP_ID") || env("NEXT_PUBLIC_PRIVY_APP_ID"),
  privyAppSecret: env("PRIVY_APP_SECRET"),

  upstashUrl: env("UPSTASH_REDIS_REST_URL"),
  upstashToken: env("UPSTASH_REDIS_REST_TOKEN"),

  startBlock: env("X_ALERTS_START_BLOCK")
    ? envInt("X_ALERTS_START_BLOCK", 0)
    : null,
  /**
   * Blocks to scan when no Redis/local cursor exists.
   * Kept modest for Vercel Hobby 60s — catch-up uses maxScanBlocks per run.
   */
  lookbackBlocks: envInt("X_ALERTS_LOOKBACK_BLOCKS", 800),
  /**
   * Cap blocks processed in a single cron invocation (Hobby ~60s).
   * Cursor advances through this window so later runs catch up.
   */
  maxScanBlocks: envInt("X_ALERTS_MAX_SCAN_BLOCKS", 1_000),
  /**
   * If tip − cursor lag exceeds this, jump to tip − maxScan (skip backlog).
   * Must be ≤ maxScanBlocks or a dead zone forms: cappedScan crawls empty
   * history while recent GM+ sit near tip (Hobby lag 2328 < old default 3000).
   * Default = maxScanBlocks (1000). Still scans ≤ maxScanBlocks/run.
   */
  autoJumpLagBlocks: envInt("X_ALERTS_AUTO_JUMP_LAG", 1_000),
  /**
   * eth_getLogs initial chunk. Bisects on Arc LimitExceededRpcError.
   */
  logChunkBlocks: envInt("X_ALERTS_LOG_CHUNK", 400),
  /**
   * Also scan legacy v1 topic0 (doubles RPC). Default off — v2 contract only.
   */
  scanV1Topic: env("X_ALERTS_SCAN_V1") === "true",
  maxTweetsPerRun: envInt("X_ALERTS_MAX_TWEETS", 10),
  /**
   * Post right after a GM+ confirms (app calls /api/x-gm-alerts/instant).
   * Set X_ALERTS_INSTANT=false to turn it off; the daily cron still runs.
   */
  instantEnabled: env("X_ALERTS_INSTANT") !== "false",
  /** Instant mode ignores txs older than this (stops replaying old GM+). */
  instantMaxAgeSeconds: envInt("X_ALERTS_INSTANT_MAX_AGE_SEC", 3_600),
  dryRun: env("X_ALERTS_DRY_RUN") === "true",
  /**
   * When true, delete Redis/local cursor+dedupe at the start of the run
   * (then honor START_BLOCK / lookback). One-shot recovery — unset after.
   */
  clearState: env("X_ALERTS_CLEAR_STATE") === "true",
} as const;

export function hasXCredentials(): boolean {
  const c = xAlertsConfig;
  return Boolean(
    c.xApiKey && c.xApiKeySecret && c.xAccessToken && c.xAccessTokenSecret,
  );
}

export function hasPrivyCredentials(): boolean {
  return Boolean(xAlertsConfig.privyAppId && xAlertsConfig.privyAppSecret);
}

export function hasUpstash(): boolean {
  return Boolean(xAlertsConfig.upstashUrl && xAlertsConfig.upstashToken);
}
