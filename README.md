# gm·arc

Tap-to-GM style daily check-in on **Arc mainnet**. v1 supports two actions only:

- **GM** — free daily onchain check-in (`gm()`), one per address every 24h (gas only, USDC on Arc)
- **GM+** — directed send to a friend (`gmPlusTo(address)`), exact **0.01 USDC** fee + gas, no cooldown

## Live contract (Arc · 5042)

| Field | Value |
| --- | --- |
| Contract | [`0x605A1Adc99796C5A1AB059386EBBE533Dc9d22e3`](https://explorer.arc.io/address/0x605A1Adc99796C5A1AB059386EBBE533Dc9d22e3) |
| Deploy tx | [`0xc1123c9212249266b6c68df66a85a2d12fe5ab88e99bce004bed5c43b19c6f9e`](https://explorer.arc.io/tx/0xc1123c9212249266b6c68df66a85a2d12fe5ab88e99bce004bed5c43b19c6f9e) |
| Source | [`contracts/ArcGM.sol`](./contracts/ArcGM.sol) |

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- wagmi / viem (`arc` chain, id `5042`)
- Browser wallet via injected connector (always available)
- Optional **Sign in with X** via [Privy](https://docs.privy.io/) (`@privy-io/react-auth`) — same pattern as gm.ink: X is optional; wallet GM still works without Privy

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Env vars

| Name | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | yes for live | v1 `0x605A1Adc…22e3` until v2 deploy; then new address from `npm run deploy:arcgm` |
| `NEXT_PUBLIC_GM_PLUS_FEE` | optional | total GM+ value; default **1.01** (0.01 tip + 1 ops) |
| `NEXT_PUBLIC_GM_PLUS_FRIEND_TIP` / `OWNER_FEE` / `OWNER` | optional | Option A defaults `0.01` / `1` / `0xe8fE…3773` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | optional | Reown / WalletConnect |
| `NEXT_PUBLIC_MOCK_MODE` | no | `true` forces local mock UI |
| `NEXT_PUBLIC_PRIVY_APP_ID` | for X login | Public id `cmw2ck7cw021d0fjt37otkkxs` — set on Vercel Production yourself, then redeploy. Also **enable Twitter/X** in Privy Login methods |
| `NEXT_PUBLIC_PRIVY_CLIENT_ID` | optional | Privy app client id (multi-env) |
| `NEXT_PUBLIC_GM_ARC_X_HANDLE` | optional | Defaults to `GMARCxlm` (`@GMARCxlm`) |
| `PRIVY_APP_SECRET` | server-only | Do **not** expose as `NEXT_PUBLIC_*`. Needed for `/api/x-handle` + Privy wallet→@handle lookup |
| `CRON_SECRET` | X alerts | Bearer auth for `/api/cron/x-gm-alerts` |
| `X_API_KEY` / `X_API_KEY_SECRET` / `X_ACCESS_TOKEN` / `X_ACCESS_TOKEN_SECRET` | X alerts | OAuth 1.0a for **@GMARCxlm** (app permission **Read and write**) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | X alerts on Vercel | Durable cursor + dedupe |

Mock mode activates when `NEXT_PUBLIC_MOCK_MODE=true`. With a contract address set (default in `.env.example`), the app talks to Arc mainnet.

### X GM+ alerts (@GMARCxlm)

Minimal worker indexes ArcGM logs and posts from **@GMARCxlm** **only for GM+** (directed), e.g.
`GM sent from @A to @B. Have you GM’d today?` + [explorer.arc.io](https://explorer.arc.io) tx link.
Basic `gm()` is not tweeted. Wallet→X via app registry (Sign in with X + Connect wallet → `POST /api/x-handle`) or Privy wallet link; otherwise shortened address (both parties).

- Docs + env / scopes / blockers: [`docs/x-gm-alerts.md`](./docs/x-gm-alerts.md)
- Vercel Cron: daily `0 12 * * *` UTC → `/api/cron/x-gm-alerts` (Hobby limit; set `CRON_SECRET`)
- Local dry run: `X_ALERTS_DRY_RUN=true npm run x-gm-alerts`

The app includes a **Bridge USDC to Arc** link to the official deposit portal: https://portal.arc.io/deposit/crypto

### Sign in with X (Privy) setup

1. Privy app id (public): `cmw2ck7cw021d0fjt37otkkxs`
2. In [dashboard.privy.io](https://dashboard.privy.io) → **Login methods** → enable **Twitter / X** → **Save**.
3. If Privy shows **“Not allowed / Login with Twitter not allowed”**: create an X app at [developer.x.com](https://developer.x.com) as a **Confidential client**, paste **Client ID** + **Client Secret** into Privy’s Twitter/X settings (never commit them). Empty OAuth fields are not enough for that error.
4. X OAuth callback / redirect (in the X app): `https://auth.privy.io/api/v1/oauth/callback`
5. **Allowed domains** in Privy Settings must include `https://gm-arc.vercel.app` and `http://localhost:3000`.
6. On **Vercel → Environment Variables (Production)** set `NEXT_PUBLIC_PRIVY_APP_ID=cmw2ck7cw021d0fjt37otkkxs`, then **Redeploy**.
7. **Embedded wallets:** leave automatic create **off** (client sets `createOnLogin: "off"`). gm·arc only needs the X handle from Privy; Arc GM uses wagmi **Connect wallet**. In the Privy Dashboard, if **Embedded wallets → Automatically create … on login** is enabled for EVM/Solana, turn it **off** — otherwise the modal can stick on **Creating your wallet** after Sign in with X.

See agent-store checklist: `/cursor/stores/self/docs/privy-x-setup.md`.

## Deploy (Vercel)

1. Import this GitHub repo in [vercel.com/new](https://vercel.com/new)
2. Framework preset: **Next.js** (repo root — leave **Root Directory** empty)
3. Production Branch: **`main`**
4. Env (Production): `NEXT_PUBLIC_CONTRACT_ADDRESS=0x605A1Adc99796C5A1AB059386EBBE533Dc9d22e3`
5. When ready for X login, also set `NEXT_PUBLIC_PRIVY_APP_ID` (and optional `NEXT_PUBLIC_GM_ARC_X_HANDLE`)
6. Deploy

`vercel.json` pins framework/build to Next.js at the repo root.

### If `*.vercel.app` shows NOT_FOUND or login wall

- **Domains →** assign `gm-arc.vercel.app` to this project’s **Production** deployment (team projects often use a longer default host like `gm-arc-<team>.vercel.app`).
- **Deployment Protection / Vercel Authentication →** disable for Production (or allow public access) so visitors are not redirected to Vercel SSO.
- Confirm the latest **Production** deploy is from `main` and **Redeploy** if needed.

## Network

- RPC: `https://rpc.mainnet.arc.io`
- Explorer: `https://explorer.arc.io`
- Docs: [Connect to Arc](https://docs.arc.io/arc/references/connect-to-arc)
