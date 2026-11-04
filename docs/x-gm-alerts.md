# gm·arc — X GM / GM+ alerts (@GMARCxlm)

Post public X notifications when someone GMs or GM+s on Arc mainnet contract
[`0x605A1Adc99796C5A1AB059386EBBE533Dc9d22e3`](https://explorer.arc.io/address/0x605A1Adc99796C5A1AB059386EBBE533Dc9d22e3),
same idea as gm.ink / `@gminkonchain`.

**Bot handle:** [@GMARCxlm](https://x.com/GMARCxlm)

## Copy

| Event | Tweet body |
| --- | --- |
| `GMPlus` | `GM sent from @A to @B. Have you GM’d today?` + `https://explorer.arc.io/tx/<hash>` |
| `GM` | `GM from @A. Have you GM’d today?` + `https://explorer.arc.io/tx/<hash>` |

`@A` / `@B` = Privy-linked X username when resolvable; otherwise shortened address (`0x605A…22e3`).

## Architecture (minimal)

1. **Indexer** — `viem` `getLogs` by live topic0 `0x9574f84f…` (from/to/fee/timestamp; `to=0` ⇒ basic GM) from last cursor → tip (chunked). Repo `event GM` / `GMPlus` names in `ArcGM.sol` do not match this bytecode — do not filter by those signatures.
2. **Resolver** — Privy server `POST /v1/users/wallet/address` → Twitter linked account username.
3. **Poster** — X API v2 `POST /2/tweets` as `@GMARCxlm` (OAuth 1.0a user context).
4. **State** — last processed block + tweeted `txHash:logIndex` keys (Upstash Redis on Vercel; local JSON file for the script).
5. **Triggers**
   - Vercel Cron → `GET/POST /api/cron/x-gm-alerts` (Bearer `CRON_SECRET`)
   - Local / external cron → `npm run x-gm-alerts`

No secrets in git. Worker no-ops (HTTP 200 + reason) when X keys or cron secret are missing.

## X developer setup (user)

1. [developer.x.com](https://developer.x.com) → Project → App attached to **@GMARCxlm**.
2. User auth settings → App permissions **Read and write** (OAuth 1.0a has no scope string; this is the write gate).
3. Regenerate **Access Token and Secret** after flipping to Read and write (old tokens stay read-only).
4. Prefer OAuth 1.0a keys for a single-account bot (no refresh rotation).

### If you use OAuth 2.0 instead

Request scopes: `tweet.read` · `tweet.write` · `users.read` · `offline.access`.  
This worker implements **OAuth 1.0a only**.

## Env vars (Vercel Production — never commit)

| Name | Required | Notes |
| --- | --- | --- |
| `CRON_SECRET` | yes (Vercel) | Bearer for `/api/cron/x-gm-alerts`. Vercel Cron sends it automatically when set. |
| `X_API_KEY` | yes to post | Consumer Key |
| `X_API_KEY_SECRET` | yes to post | Consumer Secret |
| `X_ACCESS_TOKEN` | yes to post | User access token for @GMARCxlm |
| `X_ACCESS_TOKEN_SECRET` | yes to post | User access token secret |
| `PRIVY_APP_ID` | for @handles | Same app as `NEXT_PUBLIC_PRIVY_APP_ID` (`cmw2ck7cw021d0fjt37otkkxs`) |
| `PRIVY_APP_SECRET` | for @handles | Server secret from Privy dashboard — **not** `NEXT_PUBLIC_*` |
| `UPSTASH_REDIS_REST_URL` | Vercel durable cursor | Free Upstash Redis REST |
| `UPSTASH_REDIS_REST_TOKEN` | Vercel durable cursor | Pair with URL |
| `ARC_RPC_URL` | optional | Default `https://rpc.mainnet.arc.io` |
| `X_ALERTS_START_BLOCK` | optional | Bootstrap block if no cursor (default: recent lookback) |
| `X_ALERTS_DRY_RUN` | optional | `true` = index + format, do not call X |
| `X_ALERTS_MAX_TWEETS` | optional | Cap per run (default `10`) |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | optional | Defaults to live ArcGM |

## ABI note

Live contract functions match `gm()` / `gmPlusTo(address)`, but the emitted log topic0 is **not** `GM(address,uint256)` or `GMPlus(address,address,uint256,uint256)` from `contracts/ArcGM.sol`. The worker indexes the observed topic and treats `to == 0x0` as undirected GM.

## Blockers (user action)

1. **X posting keys** — Create/attach an X app to @GMARCxlm, set Read and write, generate the four OAuth 1.0a secrets, paste into Vercel. Without these the worker stays dry / skipped.
2. **Privy server API** — Set `PRIVY_APP_SECRET` (+ `PRIVY_APP_ID`) so wallet→@handle works. Without it, tweets use shortened addresses only.
3. **Wallet↔X link quality** — Privy only returns a handle if that Arc wallet is linked on the user’s Privy account. Today Sign in with X and wagmi Connect are separate; users who never link the wallet in Privy will keep short-address mentions until linking is added in-app.
4. **Upstash Redis** — Required for durable cursor/dedupe on Vercel. Without it, the cron uses a short lookback and best-effort in-process dedupe (duplicate risk across cold starts). Local script uses `.data/x-gm-alerts.json` (gitignored).

## Ops checklist

1. Set env vars on Vercel → Redeploy.
2. Confirm cron in `vercel.json` (`0 12 * * *` UTC → `/api/cron/x-gm-alerts`).
   Vercel **Hobby** only allows **once-daily** crons (a `*/5` schedule fails the deploy).
   For near-realtime alerts: upgrade to Pro and raise the schedule, or hit the route
   from an external cron with `Authorization: Bearer $CRON_SECRET`.
3. Smoke: `X_ALERTS_DRY_RUN=true npm run x-gm-alerts` locally with RPC + optional Privy.
4. Live: send a GM+ on Arc, wait for cron, verify @GMARCxlm tweet + explorer link.
