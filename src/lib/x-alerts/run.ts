import { hasUpstash, hasXCredentials, xAlertsConfig } from "./config";
import { formatAlertText, type IndexedGmEvent } from "./format";
import { createArcClient, fetchGmEvents } from "./index-events";
import { displayNameForAddress } from "./resolve";
import {
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
  found: number;
  posted: number;
  skippedDedupe: number;
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

async function buildTweetText(event: IndexedGmEvent): Promise<string> {
  const fromLabel = await displayNameForAddress(event.from);
  if (event.kind === "GMPlus" && event.to) {
    const toLabel = await displayNameForAddress(event.to);
    return formatAlertText({
      kind: "GMPlus",
      fromLabel,
      toLabel,
      txHash: event.txHash,
    });
  }
  return formatAlertText({
    kind: "GM",
    fromLabel,
    txHash: event.txHash,
  });
}

export async function runXGmAlerts(): Promise<RunSummary> {
  const errors: string[] = [];
  const dryRun = xAlertsConfig.dryRun || !hasXCredentials();

  if (!hasXCredentials() && !xAlertsConfig.dryRun) {
    return {
      ok: true,
      skipped:
        "X credentials missing (set X_API_KEY, X_API_KEY_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET). Use X_ALERTS_DRY_RUN=true to index without posting.",
      dryRun: true,
      fromBlock: 0,
      toBlock: 0,
      found: 0,
      posted: 0,
      skippedDedupe: 0,
      tweets: [],
      stateBackend: hasUpstash() ? "upstash" : "local-or-memory",
      privyEnabled: Boolean(
        xAlertsConfig.privyAppId && xAlertsConfig.privyAppSecret,
      ),
      errors: [],
    };
  }

  const client = createArcClient();
  const tip = Number(await client.getBlockNumber());
  const existing = await loadAlertsState();

  let fromBlock: number;
  if (existing && existing.lastBlock > 0) {
    fromBlock = existing.lastBlock + 1;
  } else if (xAlertsConfig.startBlock != null) {
    fromBlock = xAlertsConfig.startBlock;
  } else {
    fromBlock = Math.max(0, tip - xAlertsConfig.lookbackBlocks);
  }

  if (fromBlock > tip) {
    return {
      ok: true,
      dryRun,
      fromBlock,
      toBlock: tip,
      found: 0,
      posted: 0,
      skippedDedupe: 0,
      tweets: [],
      stateBackend: hasUpstash() ? "upstash" : "local-or-memory",
      privyEnabled: Boolean(
        xAlertsConfig.privyAppId && xAlertsConfig.privyAppSecret,
      ),
      errors: [],
    };
  }

  const events = await fetchGmEvents({
    client,
    fromBlock: BigInt(fromBlock),
    toBlock: BigInt(tip),
  });

  const tweeted = new Set(existing?.tweeted ?? []);
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
      const text = await buildTweetText(event);

      if (dryRun) {
        tweets.push({ key, text, dryRun: true });
        tweeted.add(key);
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

  // Advance cursor only through successfully handled events (or empty range).
  let lastBlock = tip;
  if (errors.length > 0 && tweets.length > 0) {
    const lastOk = events.find(
      (e) => eventKey(e.txHash, e.logIndex) === tweets[tweets.length - 1]?.key,
    );
    if (lastOk) lastBlock = Number(lastOk.blockNumber);
  } else if (errors.length > 0 && tweets.length === 0) {
    // Failed on first new event — do not advance past previous cursor.
    lastBlock = existing?.lastBlock ?? fromBlock - 1;
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
    lastBlock: Math.max(lastBlock, existing?.lastBlock ?? 0),
    tweeted: [...tweeted],
  };
  await saveAlertsState(nextState);

  return {
    ok: errors.length === 0,
    dryRun,
    fromBlock,
    toBlock: tip,
    found: events.length,
    posted,
    skippedDedupe,
    tweets,
    stateBackend: hasUpstash() ? "upstash" : "local-or-memory",
    privyEnabled: Boolean(
      xAlertsConfig.privyAppId && xAlertsConfig.privyAppSecret,
    ),
    errors,
  };
}
