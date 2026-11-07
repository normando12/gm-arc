# gm·arc — X GM+ alerts (@GMARCxlm)

Post public X notifications when someone sends **GM+** (directed) on Arc mainnet contract
[`0x605A1Adc99796C5A1AB059386EBBE533Dc9d22e3`](https://explorer.arc.io/address/0x605A1Adc99796C5A1AB059386EBBE533Dc9d22e3),
same idea as gm.ink / `@gminkonchain`. **Basic `gm()` is not tweeted.**

**Bot handle:** [@GMARCxlm](https://x.com/GMARCxlm)

## Copy

| Event | Tweet? | Body |
| --- | --- | --- |
| **GM+** (`to ≠ 0`) | yes | `GM sent from @A to @B. Have you GM’d today?` + `https://explorer.arc.io/tx/<hash>` |
| Basic GM (`to = 0`) | no | — |

`@A` / `@B` = X username when resolvable; otherwise shortened address (`0x605A…22e3`). Both sender and recipient are always mentioned.

**Handle resolution order** (per wallet):

1. App registry — `POST /api/x-handle` on **Connect wallet**, **Sign in with X**, and before **GM+** (Upstash `gm-arc:x-handle:<addr>` / local `.data/x-handles.json`). `RegisterXHandle` under PrivyProviders listens for those paths.
2. Privy wallet link — SDK `getUserByWalletAddress` then REST `api.privy.io` / `auth.privy.io`
3. Truncated address fallback

## Architecture (minimal)

1. **Indexer** — `viem` `getLogs` by live topic0 `0x9574f84f…` (from/to/fee/timestamp; `to=0` ⇒ basic GM) from last cursor → tip (chunked). Repo `event GM` / `GMPlus` names in `ArcGM.sol` do not match this bytecode — do not filter by those signatures.
2. **Filter** — tweet only logs with a non-zero `to` (directed GM+).
3. **Resolver** — registry + Privy wallet→Twitter username (both parties).
4. **Poster** — X API v2 `POST /2/tweets` as `@GMARCxlm` (OAuth 1.0a user context).
5. **State** — last processed block + tweeted `txHash:logIndex` keys (Upstash Redis on Vercel; local JSON file for the script).
6. **Triggers**
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
| `X_ALERTS_LOOKBACK_BLOCKS` | optional | No-cursor / auto-jump lookback (default **800**, Hobby-safe) |
| `X_ALERTS_MAX_SCAN_BLOCKS` | optional | Max blocks per cron run (default **1000**) — catch-up across runs under 60s |
| `X_ALERTS_AUTO_JUMP_LAG` | optional | If tip−cursor lag exceeds this (default **3000**), jump to tip−lookback instead of crawling 1k/run |
| `X_ALERTS_LOG_CHUNK` | optional | Initial `eth_getLogs` window (default **400**). Bisects on Arc `LimitExceededRpcError`. |
| `X_ALERTS_SCAN_V1` | optional | `true` to also scan legacy v1 topic0 (slower; default off) |
| `X_ALERTS_DRY_RUN` | optional | `true` = index + format, do not call X |
| `X_ALERTS_MAX_TWEETS` | optional | Cap per run (default `10`) |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | optional | Defaults to live ArcGM |

## ABI note

Live contract functions match `gm()` / `gmPlusTo(address)`, but the emitted log topic0 is **not** `GM(address,uint256)` or `GMPlus(address,address,uint256,uint256)` from `contracts/ArcGM.sol`. The worker indexes the observed topic and treats `to == 0x0` as undirected GM.

## Blockers (user action)

1. **X posting keys** — Create/attach an X app to @GMARCxlm, set Read and write, generate the four OAuth 1.0a secrets, paste into Vercel. Without these the worker stays dry / skipped.
2. **Privy server API** — Set `PRIVY_APP_SECRET` (+ `PRIVY_APP_ID`) so `/api/x-handle` can verify sessions and Privy wallet lookup works. Without it, tweets use shortened addresses only (unless a prior registry write exists).
3. **Wallet↔X registration** — Sign in with X **and** Connect wallet once; the client calls `POST /api/x-handle` so cron can `@mention` that wallet. Users who only connect a wallet (no X session) stay on short-address mentions unless the wallet is also linked inside Privy.
4. **Upstash Redis** — Required for durable cursor/dedupe **and** handle registry on Vercel. Without it, the cron uses a short lookback and best-effort in-process dedupe (duplicate risk across cold starts). Local script uses `.data/x-gm-alerts.json` / `.data/x-handles.json` (gitignored).

## Ops checklist

1. Set env vars on Vercel → Redeploy.
2. Confirm cron in `vercel.json` (`0 12 * * *` UTC → `/api/cron/x-gm-alerts`).
   Vercel **Hobby** only allows **once-daily** crons (a `*/5` schedule fails the deploy).
   For near-realtime alerts: upgrade to Pro and raise the schedule, or hit the route
   from an external cron with `Authorization: Bearer $CRON_SECRET`.
3. Smoke: `X_ALERTS_DRY_RUN=true npm run x-gm-alerts` locally with RPC + optional Privy.
4. Live trigger on Hobby: **prefer `curl`** with `Authorization: Bearer $CRON_SECRET` (do not expand Runtime Logs to 24h — stay **Last 30m**, open Request Logs, invoke immediately). Dashboard Cron **Run** may leave empty logs (cached/redirect omitted).
5. If cursor skipped GM+: Upstash `DEL gm-arc:x-alerts:state`, set `X_ALERTS_START_BLOCK=29570000`, Redeploy, `curl` again.
