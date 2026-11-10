import { isHex, parseAbiItem, parseEventLogs } from "viem";
import {
  hasUpstash,
  hasXCredentials,
  xAlertsConfig,
} from "./config";
import { formatAlertText } from "./format";
import { createArcClient } from "./index-events";
import { displayNameForAddress } from "./resolve";
import {
  claimEvent,
  eventKey,
  loadAlertsState,
  releaseEvent,
  saveAlertsState,
} from "./state";
import { postTweet } from "./twitter";

const gmPlusV2 = parseAbiItem(
  "event GMPlus(address indexed from, address indexed to, uint256 friendTip, uint256 ownerFee, uint256 timestamp)",
);

const ZERO = "0x0000000000000000000000000000000000000000";

export type InstantResult = {
  ok: boolean;
  /** Why nothing was posted (not an error). */
  skipped?: string;
  posted: Array<{ key: string; tweetId: string }>;
  error?: string;
};

function skip(reason: string): InstantResult {
  return { ok: true, skipped: reason, posted: [] };
}

/**
 * Post the X alert for a GM+ right after it confirms.
 * The tx is verified onchain (receipt + our contract's GMPlus log), so a
 * caller cannot make the account tweet anything that did not happen.
 */
export async function postGmPlusForTx(txHash: string): Promise<InstantResult> {
  if (!xAlertsConfig.instantEnabled) return skip("instant posting disabled");
  if (!isHex(txHash) || txHash.length !== 66) {
    return { ok: false, error: "Invalid tx hash", posted: [] };
  }
  if (xAlertsConfig.dryRun || !hasXCredentials()) {
    return skip("dry run or X credentials missing");
  }
  // Dedupe state must survive between serverless invocations.
  if (!hasUpstash()) return skip("Upstash not configured (needed for dedupe)");

  const client = createArcClient();
  // The RPC node may lag a moment behind the wallet's node: retry briefly.
  let receipt: Awaited<ReturnType<typeof client.getTransactionReceipt>> | null =
    null;
  for (let attempt = 0; attempt < 4 && !receipt; attempt += 1) {
    try {
      receipt = await client.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });
    } catch {
      await new Promise((r) => setTimeout(r, 1_500));
    }
  }
  if (!receipt) return skip("receipt not found yet");
  if (receipt.status !== "success") return skip("tx not successful");

  const block = await client.getBlock({ blockNumber: receipt.blockNumber });
  const ageSeconds = Math.floor(Date.now() / 1000) - Number(block.timestamp);
  if (ageSeconds > xAlertsConfig.instantMaxAgeSeconds) {
    return skip("tx too old for instant posting");
  }

  const contract = xAlertsConfig.contractAddress.toLowerCase();
  const logs = parseEventLogs({
    abi: [gmPlusV2],
    logs: receipt.logs.filter((l) => l.address.toLowerCase() === contract),
  });
  const events = logs.filter(
    (l) => l.args.to && l.args.to.toLowerCase() !== ZERO,
  );
  if (events.length === 0) return skip("no GM+ event in this tx");

  const posted: InstantResult["posted"] = [];
  for (const log of events) {
    const from = log.args.from;
    const to = log.args.to;
    if (!from || !to) continue;
    const key = eventKey(receipt.transactionHash, Number(log.logIndex));

    const before = await loadAlertsState();
    if (before?.tweeted.includes(key)) continue;
    if (!(await claimEvent(key))) continue;

    try {
      const fromLabel = await displayNameForAddress(from);
      const toLabel = await displayNameForAddress(to);
      const text = formatAlertText({
        fromLabel,
        toLabel,
        txHash: receipt.transactionHash,
      });
      const { id } = await postTweet(text);

      // Re-read right before writing to keep the dedupe list current.
      const latest = await loadAlertsState();
      await saveAlertsState({
        // Keep the daily cron's cursor untouched; it dedupes by key.
        lastBlock: latest?.lastBlock ?? 0,
        tweeted: [...(latest?.tweeted ?? []), key],
      });
      posted.push({ key, tweetId: id });
    } catch (err) {
      await releaseEvent(key).catch(() => undefined);
      const message = err instanceof Error ? err.message : String(err);
      // The daily cron will retry this event later.
      return { ok: false, error: message.slice(0, 200), posted };
    }
  }

  return { ok: true, posted };
}
