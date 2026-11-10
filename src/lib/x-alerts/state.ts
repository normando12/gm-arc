import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasUpstash, xAlertsConfig } from "./config";

export type AlertsState = {
  /** Last fully processed block (inclusive). Next run starts at +1. */
  lastBlock: number;
  /** Recently tweeted event keys (`txHash:logIndex`) for dedupe. */
  tweeted: string[];
};

/** Upstash Redis key — clear this to re-scan from lookback / START_BLOCK. */
export const X_ALERTS_STATE_KEY = "gm-arc:x-alerts:state";

const MAX_TWEETED = 500;

const memoryFallback: { state: AlertsState | null } = { state: null };

function localStatePath(): string {
  return path.join(process.cwd(), ".data", "x-gm-alerts.json");
}

async function upstashCommand(command: unknown[]): Promise<unknown> {
  const res = await fetch(xAlertsConfig.upstashUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${xAlertsConfig.upstashToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upstash ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { result?: unknown };
  return json.result;
}

function normalize(raw: Partial<AlertsState> | null | undefined): AlertsState {
  return {
    lastBlock: typeof raw?.lastBlock === "number" ? raw.lastBlock : 0,
    tweeted: Array.isArray(raw?.tweeted)
      ? raw.tweeted.filter((k): k is string => typeof k === "string")
      : [],
  };
}

async function loadLocal(): Promise<AlertsState | null> {
  try {
    const text = await readFile(localStatePath(), "utf8");
    return normalize(JSON.parse(text) as Partial<AlertsState>);
  } catch {
    return null;
  }
}

async function saveLocal(state: AlertsState): Promise<void> {
  const file = localStatePath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function clearAlertsState(): Promise<void> {
  memoryFallback.state = null;
  if (hasUpstash()) {
    await upstashCommand(["DEL", X_ALERTS_STATE_KEY]);
    return;
  }
  try {
    const { unlink } = await import("node:fs/promises");
    await unlink(localStatePath());
  } catch {
    /* ignore */
  }
}

export async function loadAlertsState(): Promise<AlertsState | null> {
  if (hasUpstash()) {
    const result = await upstashCommand(["GET", X_ALERTS_STATE_KEY]);
    if (typeof result !== "string" || !result) return null;
    try {
      return normalize(JSON.parse(result) as Partial<AlertsState>);
    } catch {
      return null;
    }
  }

  const local = await loadLocal();
  if (local) return local;
  return memoryFallback.state;
}

export async function saveAlertsState(state: AlertsState): Promise<void> {
  const trimmed: AlertsState = {
    lastBlock: state.lastBlock,
    tweeted: state.tweeted.slice(-MAX_TWEETED),
  };

  memoryFallback.state = trimmed;

  if (hasUpstash()) {
    await upstashCommand(["SET", X_ALERTS_STATE_KEY, JSON.stringify(trimmed)]);
    return;
  }

  // Prefer durable local file when not on a read-only serverless FS.
  try {
    await saveLocal(trimmed);
  } catch {
    // Vercel /tmp may work; if not, memory-only for this invocation.
    try {
      const tmp = path.join("/tmp", "gm-arc-x-gm-alerts.json");
      await writeFile(tmp, `${JSON.stringify(trimmed, null, 2)}\n`, "utf8");
    } catch {
      /* memory only */
    }
  }
}

const CLAIM_PREFIX = "gm-arc:x-alerts:claim:";
const CLAIM_TTL_SECONDS = 600;
const memoryClaims = new Set<string>();

/**
 * Short-lived lock so two requests cannot tweet the same event at once.
 * Returns true when this caller owns the event. Needs Upstash for a real
 * cross-instance lock; otherwise falls back to a per-process set.
 */
export async function claimEvent(key: string): Promise<boolean> {
  if (hasUpstash()) {
    const result = await upstashCommand([
      "SET",
      `${CLAIM_PREFIX}${key}`,
      "1",
      "NX",
      "EX",
      CLAIM_TTL_SECONDS,
    ]);
    return result === "OK";
  }
  if (memoryClaims.has(key)) return false;
  memoryClaims.add(key);
  return true;
}

export async function releaseEvent(key: string): Promise<void> {
  memoryClaims.delete(key);
  if (hasUpstash()) {
    await upstashCommand(["DEL", `${CLAIM_PREFIX}${key}`]);
  }
}

export function eventKey(txHash: string, logIndex: number): string {
  return `${txHash.toLowerCase()}:${logIndex}`;
}
