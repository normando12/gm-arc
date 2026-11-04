/**
 * Local / external cron entrypoint for X GM alerts.
 *
 *   X_ALERTS_DRY_RUN=true npx tsx scripts/x-gm-alerts.ts
 *   npm run x-gm-alerts
 */
import { runXGmAlerts } from "../src/lib/x-alerts/run";

async function main() {
  const summary = await runXGmAlerts();
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
