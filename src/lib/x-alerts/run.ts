import { hasUpstash, hasXCredentials, xAlertsConfig } from "./config";
import { formatAlertText, type IndexedGmEvent } from "./format";
import { createArcClient, fetchGmEvents } from "./index-events";
import { displayNameForAddress } from "./resolve";
import {
  clearAlertsState,
  eventKey,
  loadAlertsState,
  saveAlertsState,
  type AlertsState,
} from "./state";
import { postTweet } from "./twitter";

export type RunSummary = {
  ok: boolean;
  skipped?: string;
  dryRun: boolean;
  fromBlock: number;
  toBlock: number;
  /** Chain tip at run start — may be ahead of toBlock when capped. */
  tipBlock: number;
  /** True when this run scanned less than tip (catch-up continues next cron). */
  cappedScan: boolean;
  cursorLastBlock: number | null;
  /** Total logs in range (GM + GM+). */
  found: number;
  /** Directed GM+ only — what we tweet. */
  foundGmPlus: number;
  /** Basic GM logs ignored (no tweet). */
  skippedBasicGm: number;
  posted: number;
  skippedDedupe: number;
  clearedState: boolean;
  startBlockOverride: boolean;
  tweets: Array<{
    key: string;
    text: string;
    tweetId?: string;
    dryRun?: boolean;
  }>;
  stateBackend: "upstash" | "local-or-memory";
  privyEnabled: boolean;
  errors: string[];
};

function emptySummary(
  partial: Partial<RunSummary> &
    Pick<RunSummary, "ok" | "dryRun" | "fromBlock" | "toBlock">,
): RunSummary {
  return {
    skipped: undefined,
    tipBlock: partial.toBlock,
    cappedScan: false,
    found: 0,
    foundGmPlus: 0,
    skippedBasicGm: 0,
    posted: 0,
    skippedDedupe: 0,
    clearedState: false,
    startBlockOverride: false,
    cursorLastBlock: null,
    tweets: [],
    stateBackend: hasUpstash() ? "upstash" : "local-or-memory",
    privyEnabled: Boolean(
      xAlertsConfig.privyAppId && xAlertsConfig.privyAppSecret,
    ),
    errors: [],
    ...partial,
  };
}

async function buildGmPlusTweetText(event: IndexedGmEvent): Promise<string> {
  if (event.kind !== "GMPlus" || !event.to) {
    throw new Error("buildGmPlusTweetText requires a GMPlus event with to");
  }
  const fromLabel = await displayNameForAddress(event.from);
  const toLabel = await displayNameForAddress(event.to);
  return formatAlertText({
    fromLabel,
    toLabel,
    txHash: event.txHash,
  });
}

export async function runXGmAlerts(): Promise<RunSummary> {
  const errors: string[] = [];
  const dryRun = xAlertsConfig.dryRun || !hasXCredentials();
  let clearedState = false;

  if (!hasXCredentials() && !xAlertsConfig.dryRun) {
    return emptySummary({
      ok: true,
      skipped:
        "X credentials missing (set X_API_KEY, X_API_KEY_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET). Use X_ALERTS_DRY_RUN=true to index without posting.",
      dryRun: true,
      fromBlock: 0,
      toBlock: 0,
    });
  }

  if (xAlertsConfig.clearState) {
    await clearAlertsState();
    clearedState = true;
    console.info("[x-gm-alerts] cleared state (X_ALERTS_CLEAR_STATE=true)");
  }

  const client = createArcClient();
  const tip = Number(await client.getBlockNumber());
  const existing = await loadAlertsState();
  const cursorLastBlock =
    existing && existing.lastBlock > 0 ? existing.lastBlock : null;

  /**
   * From-block resolution:
   * 1) If X_ALERTS_START_BLOCK is set, it wins (rewind past a bad Redis cursor).
   * 2) Else resume after cursor.
   * 3) Else tip − lookback.
   */
  let fromBlock: number;
  let startBlockOverride = false;
  if (xAlertsConfig.startBlock != null) {
    fromBlock = xAlertsConfig.startBlock;
    startBlockOverride = true;
  } else if (cursorLastBlock != null) {
    fromBlock = cursorLastBlock + 1;
  } else {
    fromBlock = Math.max(0, tip - xAlertsConfig.lookbackBlocks);
  }

  if (fromBlock > tip) {
    return emptySummary({
      ok: true,
      dryRun,
      fromBlock,
      toBlock: tip,
      tipBlock: tip,
      cappedScan: false,
      cursorLastBlock,
      clearedState,
      startBlockOverride,
    });
  }

  // Hobby ~60s: never scan tip−from if the gap is huge; advance in windows.
  const toBlock = Math.min(
    tip,
    fromBlock + Math.max(1, xAlertsConfig.maxScanBlocks) - 1,
  );
  const cappedScan = toBlock < tip;

  const allEvents = await fetchGmEvents({
    client,
    fromBlock: BigInt(fromBlock),
    toBlock: BigInt(toBlock),
  });

  // Tweet ONLY directed GM+ (to ≠ 0). Basic GM is indexed for cursor but never posted.
  const events = allEvents.filter(
    (e): e is IndexedGmEvent & { to: `0x${string}` } =>
      e.kind === "GMPlus" && Boolean(e.to),
  );
  const skippedBasicGm = allEvents.length - events.length;

  const tweeted = new Set(
    startBlockOverride || clearedState ? [] : (existing?.tweeted ?? []),
  );
  const tweets: RunSummary["tweets"] = [];
  let posted = 0;
  let skippedDedupe = 0;

  for (const event of events) {
    if (posted >= xAlertsConfig.maxTweetsPerRun) break;

    const key = eventKey(event.txHash, event.logIndex);
    if (tweeted.has(key)) {
      skippedDedupe += 1;
      continue;
    }

    try {
      const text = await buildGmPlusTweetText(event);

      if (dryRun) {
        tweets.push({ key, text, dryRun: true });
        // Do NOT mark tweeted / advance cursor on dry-run — allows a later live post.
        posted += 1;
        continue;
      }

      const { id } = await postTweet(text);
      tweets.push({ key, text, tweetId: id });
      tweeted.add(key);
      posted += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${key}: ${message}`);
      // Stop advancing cursor past a failed tweet so it can retry.
      break;
    }
  }

  // Dry-run: never persist cursor/dedupe (avoids locking out live posts).
  if (dryRun) {
    return {
      ok: errors.length === 0,
      dryRun: true,
      fromBlock,
      toBlock,
      tipBlock: tip,
      cappedScan,
      cursorLastBlock,
      found: allEvents.length,
      foundGmPlus: events.length,
      skippedBasicGm,
      posted,
      skippedDedupe,
      clearedState,
      startBlockOverride,
      tweets,
      stateBackend: hasUpstash() ? "upstash" : "local-or-memory",
      privyEnabled: Boolean(
        xAlertsConfig.privyAppId && xAlertsConfig.privyAppSecret,
      ),
      errors,
    };
  }

  // Advance cursor only through successfully handled events (or empty range).
  let lastBlock = toBlock;
  if (errors.length > 0 && tweets.length > 0) {
    const lastOk = events.find(
      (e) => eventKey(e.txHash, e.logIndex) === tweets[tweets.length - 1]?.key,
    );
    if (lastOk) lastBlock = Number(lastOk.blockNumber);
  } else if (errors.length > 0 && tweets.length === 0) {
    // Failed on first new event — do not advance past previous cursor.
    lastBlock = cursorLastBlock ?? fromBlock - 1;
  }

  // If we hit maxTweets mid-range, park cursor at last posted event block
  // so remaining events are picked up next run (dedupe covers already tweeted).
  if (
    errors.length === 0 &&
    posted >= xAlertsConfig.maxTweetsPerRun &&
    events.length > posted + skippedDedupe
  ) {
    const lastOk = events.find(
      (e) => eventKey(e.txHash, e.logIndex) === tweets[tweets.length - 1]?.key,
    );
    if (lastOk) lastBlock = Number(lastOk.blockNumber);
  }

  const nextState: AlertsState = {
    lastBlock: Math.max(lastBlock, cursorLastBlock ?? 0),
    tweeted: [...tweeted],
  };
  await saveAlertsState(nextState);

  return {
    ok: errors.length === 0,
    dryRun: false,
    fromBlock,
    toBlock,
    tipBlock: tip,
    cappedScan,
    cursorLastBlock,
    found: allEvents.length,
    foundGmPlus: events.length,
    skippedBasicGm,
    posted,
    skippedDedupe,
    clearedState,
    startBlockOverride,
    tweets,
    stateBackend: hasUpstash() ? "upstash" : "local-or-memory",
    privyEnabled: Boolean(
      xAlertsConfig.privyAppId && xAlertsConfig.privyAppSecret,
    ),
    errors,
  };
}
