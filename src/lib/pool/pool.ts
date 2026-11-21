import { formatEther } from "viem";
import { hasUpstash, xAlertsConfig } from "@/lib/x-alerts/config";
import { createArcClient, fetchGmEvents } from "@/lib/x-alerts/index-events";
import { eventKey, upstashCommand } from "@/lib/x-alerts/state";
import { POOL_ADDRESS, type PoolStatsResponse } from "./config";

/**
 * Counts GM+ sent on the current contract, starting from the moment the counter
 * first runs (older GM+ are not counted). Each GM+ event is stored once in a
 * Redis set, so re-scanning a block range can never double count.
 */
const CONTRACT = xAlertsConfig.contractAddress.toLowerCase();
const PREFIX = `gm-arc:pool:${CONTRACT}:`;

/** Blocks per eth_getLogs sweep, and how much one refresh may scan in total. */
const SUBRANGE_BLOCKS = 2_000;
const MAX_BLOCKS_PER_REFRESH = 40_000;
const BUDGET_MS = 15_000;
const LOCK_SECONDS = 20;

// Durable storage is required on serverless hosts; local runs fall back to memory.
const durable = hasUpstash();
const enabled = durable || !process.env.VERCEL;

const BALANCE_TTL_MS = 20_000;
let lastBalance: { value: string; at: number } | null = null;

const mem = {
  start: null as number | null,
  cursor: null as number | null,
  events: new Set<string>(),
  lockUntil: 0,
};

async function getNum(name: "start" | "cursor"): Promise<number | null> {
  if (!durable) return mem[name];
  const raw = await upstashCommand(["GET", PREFIX + name]);
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function setNum(name: "start" | "cursor", value: number): Promise<void> {
  if (!durable) {
    mem[name] = value;
    return;
  }
  await upstashCommand(["SET", PREFIX + name, String(value)]);
}

async function setStartIfMissing(value: number): Promise<void> {
  if (!durable) {
    if (mem.start === null) mem.start = value;
    return;
  }
  await upstashCommand(["SET", PREFIX + "start", String(value), "NX"]);
}

async function addEvents(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  if (!durable) {
    for (const k of keys) mem.events.add(k);
    return;
  }
  await upstashCommand(["SADD", PREFIX + "events", ...keys]);
}

async function countEvents(): Promise<number> {
  if (!durable) return mem.events.size;
  const n = await upstashCommand(["SCARD", PREFIX + "events"]);
  return typeof n === "number" ? n : Number(n) || 0;
}

async function tryLock(): Promise<boolean> {
  if (!durable) {
    if (Date.now() < mem.lockUntil) return false;
    mem.lockUntil = Date.now() + LOCK_SECONDS * 1000;
    return true;
  }
  const res = await upstashCommand([
    "SET",
    PREFIX + "lock",
    "1",
    "NX",
    "EX",
    LOCK_SECONDS,
  ]);
  return res === "OK";
}

/** First block to count: POOL_START_BLOCK if set, else the first block seen. */
async function ensureStart(tip: number): Promise<number> {
  const fromEnv = Number.parseInt(process.env.POOL_START_BLOCK?.trim() || "", 10);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  const existing = await getNum("start");
  if (existing !== null) return existing;
  await setStartIfMissing(tip);
  return (await getNum("start")) ?? tip;
}

/** Scan new blocks for GM+ events and record them. Safe to call often. */
export async function refreshPool(): Promise<void> {
  if (!enabled) return;
  if (!(await tryLock())) return;

  const client = createArcClient();
  const tip = Number(await client.getBlockNumber());
  const start = await ensureStart(tip);
  let cursor = Math.max((await getNum("cursor")) ?? start - 1, start - 1);

  const t0 = Date.now();
  let scanned = 0;
  while (
    cursor < tip &&
    scanned < MAX_BLOCKS_PER_REFRESH &&
    Date.now() - t0 < BUDGET_MS
  ) {
    const from = cursor + 1;
    const to = Math.min(tip, cursor + SUBRANGE_BLOCKS);
    const events = await fetchGmEvents({
      client,
      fromBlock: BigInt(from),
      toBlock: BigInt(to),
    });
    await addEvents(events.map((e) => eventKey(e.txHash, e.logIndex)));
    cursor = to;
    scanned += to - from + 1;
    await setNum("cursor", cursor);
  }
}

/** Current counter plus the pool wallet balance, when one is configured. */
export async function getPoolStats(): Promise<PoolStatsResponse> {
  const client = createArcClient();

  let balance: string | null = null;
  if (POOL_ADDRESS) {
    if (lastBalance && Date.now() - lastBalance.at < BALANCE_TTL_MS) {
      balance = lastBalance.value;
    } else {
      try {
        // Native USDC on Arc is 18 decimals; this is the single USDC balance.
        balance = formatEther(await client.getBalance({ address: POOL_ADDRESS }));
        lastBalance = { value: balance, at: Date.now() };
      } catch {
        // Keep showing the last good value if the RPC is busy.
        balance = lastBalance?.value ?? null;
      }
    }
  }

  if (!enabled) {
    return { ok: true, enabled: false, count: null, behindBlocks: null, balance };
  }

  const [count, cursor, start, tip] = await Promise.all([
    countEvents(),
    getNum("cursor"),
    getNum("start"),
    client.getBlockNumber().then(Number),
  ]);
  const scannedTo = cursor ?? (start !== null ? start - 1 : null);
  const behindBlocks = scannedTo === null ? null : Math.max(0, tip - scannedTo);

  return { ok: true, enabled: true, count, behindBlocks, balance };
}
