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
  /** Blocks to scan when no cursor exists (≈ few minutes depending on Arc block time). */
  lookbackBlocks: envInt("X_ALERTS_LOOKBACK_BLOCKS", 300),
  /** eth_getLogs chunk size (Arc RPC rejects oversized ranges). */
  logChunkBlocks: envInt("X_ALERTS_LOG_CHUNK", 1_000),
  maxTweetsPerRun: envInt("X_ALERTS_MAX_TWEETS", 10),
  dryRun: env("X_ALERTS_DRY_RUN") === "true",
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
