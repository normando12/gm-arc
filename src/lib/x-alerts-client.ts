const notified = new Set<string>();

/**
 * Tell the server a GM+ just confirmed so it can post the X alert right away.
 * Fire-and-forget: failures never affect the GM+ itself (the daily cron is
 * the fallback).
 */
export function notifyGmPlusConfirmed(txHash: string): void {
  if (typeof window === "undefined") return;
  const key = txHash.toLowerCase();
  if (notified.has(key)) return;
  notified.add(key);
  void fetch("/api/x-gm-alerts/instant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txHash }),
  }).catch(() => undefined);
}
