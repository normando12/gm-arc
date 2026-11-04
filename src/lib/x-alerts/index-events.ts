import {
  createPublicClient,
  decodeAbiParameters,
  http,
  type Log,
  type PublicClient,
} from "viem";
import { arc } from "@/lib/arc";
import { xAlertsConfig } from "./config";
import type { IndexedGmEvent } from "./format";

/**
 * On-chain topic0 for ArcGM at 0x605A1Adc…22e3.
 * Shape: (address indexed from, address indexed to, uint256 fee, uint256 timestamp).
 * Basic `gm()` uses to = address(0). Directed GM+ sets `to` to the recipient.
 *
 * Note: this does **not** match `event GM` / `event GMPlus` in `contracts/ArcGM.sol`
 * (repo source drifted from the live bytecode). Index by topic0, not the Solidity names.
 */
export const ARC_GM_EVENT_TOPIC =
  "0x9574f84fd3965a2c798ebcac63712a3493e331fab16880d945c36602fac89c24" as const;

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

export async function fetchGmEvents(params: {
  client: PublicClient;
  fromBlock: bigint;
  toBlock: bigint;
}): Promise<IndexedGmEvent[]> {
  const { client, fromBlock, toBlock } = params;
  const address = xAlertsConfig.contractAddress;
  const chunk = BigInt(xAlertsConfig.logChunkBlocks);
  const out: IndexedGmEvent[] = [];

  for (let start = fromBlock; start <= toBlock; start += chunk + 1n) {
    const end = start + chunk > toBlock ? toBlock : start + chunk;

    // Raw topic0 filter (unknown Solidity event name on the live bytecode).
    const logs = (await client.getLogs({
      address,
      fromBlock: start,
      toBlock: end,
      topics: [ARC_GM_EVENT_TOPIC],
    } as Parameters<PublicClient["getLogs"]>[0])) as Log[];

    for (const log of logs) {
      if (
        !log.transactionHash ||
        log.logIndex == null ||
        log.blockNumber == null
      ) {
        continue;
      }

      const from = topicAddress(log.topics[1]);
      const to = topicAddress(log.topics[2]);
      if (!from) continue;

      // Decode fee/timestamp when present (informational; tweets only need parties + tx).
      if (log.data && log.data !== "0x" && log.data.length >= 130) {
        try {
          decodeAbiParameters(
            [{ type: "uint256" }, { type: "uint256" }],
            log.data,
          );
        } catch {
          /* ignore decode errors — still tweet from topics */
        }
      }

      const isPlus = Boolean(to && to !== ZERO);
      out.push({
        kind: isPlus ? "GMPlus" : "GM",
        from,
        to: isPlus ? (to as `0x${string}`) : undefined,
        txHash: log.transactionHash,
        logIndex: Number(log.logIndex),
        blockNumber: log.blockNumber,
      });
    }
  }

  out.sort((a, b) => {
    if (a.blockNumber === b.blockNumber) return a.logIndex - b.logIndex;
    return a.blockNumber < b.blockNumber ? -1 : 1;
  });

  return out;
}
