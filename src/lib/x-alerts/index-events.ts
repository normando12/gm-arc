import {
  createPublicClient,
  http,
  parseAbiItem,
  type Log,
  type PublicClient,
} from "viem";
import { arc } from "@/lib/arc";
import { ARC_GM_V1_EVENT_TOPIC } from "@/lib/abi";
import { xAlertsConfig } from "./config";
import type { IndexedGmEvent } from "./format";

/** v2: `event GMPlus(address indexed from, address indexed to, uint256 friendTip, uint256 ownerFee, uint256 timestamp)` */
const gmPlusV2 = parseAbiItem(
  "event GMPlus(address indexed from, address indexed to, uint256 friendTip, uint256 ownerFee, uint256 timestamp)",
);

const ZERO = "0x0000000000000000000000000000000000000000";

export function createArcClient(): PublicClient {
  return createPublicClient({
    chain: arc,
    transport: http(xAlertsConfig.rpcUrl, {
      timeout: 20_000,
      retryCount: 1,
      retryDelay: 250,
    }),
  });
}

function topicAddress(topic: `0x${string}` | null | undefined): `0x${string}` | null {
  if (!topic || topic.length !== 66) return null;
  return `0x${topic.slice(26).toLowerCase()}` as `0x${string}`;
}

function asGmPlus(
  log: Log,
  from: `0x${string}`,
  to: `0x${string}`,
): IndexedGmEvent | null {
  if (!log.transactionHash || log.logIndex == null || log.blockNumber == null) {
    return null;
  }
  return {
    kind: "GMPlus",
    from,
    to,
    txHash: log.transactionHash,
    logIndex: Number(log.logIndex),
    blockNumber: log.blockNumber,
  };
}

function isLogsLimitError(err: unknown): boolean {
  const msg = String(
    err && typeof err === "object" && "message" in err
      ? (err as { message: unknown }).message
      : err,
  ).toLowerCase();
  const name = String(
    err && typeof err === "object" && "name" in err
      ? (err as { name: unknown }).name
      : "",
  ).toLowerCase();
  return (
    name.includes("limitexceeded") ||
    msg.includes("limit exceeded") ||
    msg.includes("query returned more than") ||
    msg.includes("block range") ||
    msg.includes("response size") ||
    msg.includes("log response size") ||
    msg.includes("-32005")
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch logs for a range; on Arc RPC LimitExceeded, bisect the block window and retry.
 */
async function getLogsAdaptive<TLog>(
  fetchRange: (fromBlock: bigint, toBlock: bigint) => Promise<TLog[]>,
  fromBlock: bigint,
  toBlock: bigint,
  depth = 0,
): Promise<TLog[]> {
  if (fromBlock > toBlock) return [];
  try {
    return await fetchRange(fromBlock, toBlock);
  } catch (err) {
    if (!isLogsLimitError(err) || fromBlock === toBlock) {
      throw err;
    }
    const mid = fromBlock + (toBlock - fromBlock) / 2n;
    if (depth > 0) await sleep(80 * Math.min(depth, 3));
    const left = await getLogsAdaptive(fetchRange, fromBlock, mid, depth + 1);
    const right = await getLogsAdaptive(
      fetchRange,
      mid + 1n,
      toBlock,
      depth + 1,
    );
    return left.concat(right);
  }
}

/**
 * Index directed GM+ for tweets (v2 ABI; optional legacy v1 topic).
 */
export async function fetchGmEvents(params: {
  client: PublicClient;
  fromBlock: bigint;
  toBlock: bigint;
}): Promise<IndexedGmEvent[]> {
  const { client, fromBlock, toBlock } = params;
  const address = xAlertsConfig.contractAddress;
  const chunk = BigInt(xAlertsConfig.logChunkBlocks);
  const out: IndexedGmEvent[] = [];
  const seen = new Set<string>();

  for (let start = fromBlock; start <= toBlock; start += chunk + 1n) {
    const end = start + chunk > toBlock ? toBlock : start + chunk;

    const v2Logs = await getLogsAdaptive(
      (a, b) =>
        client.getLogs({
          address,
          event: gmPlusV2,
          fromBlock: a,
          toBlock: b,
        }),
      start,
      end,
    );

    for (const log of v2Logs) {
      const from = log.args.from;
      const to = log.args.to;
      if (!from || !to || to.toLowerCase() === ZERO) continue;
      const item = asGmPlus(log, from, to);
      if (!item) continue;
      const key = `${item.txHash}:${item.logIndex}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }

    if (!xAlertsConfig.scanV1Topic) continue;

    const v1Logs = await getLogsAdaptive(
      (a, b) =>
        client.getLogs({
          address,
          fromBlock: a,
          toBlock: b,
          topics: [ARC_GM_V1_EVENT_TOPIC],
        } as Parameters<PublicClient["getLogs"]>[0]) as Promise<Log[]>,
      start,
      end,
    );

    for (const log of v1Logs) {
      const from = topicAddress(log.topics[1]);
      const to = topicAddress(log.topics[2]);
      if (!from || !to || to === ZERO) continue;
      const item = asGmPlus(log, from, to);
      if (!item) continue;
      const key = `${item.txHash}:${item.logIndex}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }

  out.sort((a, b) => {
    if (a.blockNumber === b.blockNumber) return a.logIndex - b.logIndex;
    return a.blockNumber < b.blockNumber ? -1 : 1;
  });

  return out;
}
