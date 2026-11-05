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
    transport: http(xAlertsConfig.rpcUrl),
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

/**
 * Index directed GM+ for tweets.
 * - Prefer v2 ABI `GMPlus` on the configured contract.
 * - Also accept legacy v1 topic0 (non-zero `to`) if still pointed at the old address.
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

    const [v2Logs, v1Logs] = await Promise.all([
      client.getLogs({
        address,
        event: gmPlusV2,
        fromBlock: start,
        toBlock: end,
      }),
      client.getLogs({
        address,
        fromBlock: start,
        toBlock: end,
        topics: [ARC_GM_V1_EVENT_TOPIC],
      } as Parameters<PublicClient["getLogs"]>[0]) as Promise<Log[]>,
    ]);

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
