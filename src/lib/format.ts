export function formatCountdown(readyAtMs: number, now = Date.now()): string {
  const remaining = Math.max(0, readyAtMs - now);
  if (remaining <= 0) return "0s";
  const totalSec = Math.ceil(remaining / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
