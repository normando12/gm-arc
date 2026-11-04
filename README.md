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
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | yes for live | `0x605A1Adc99796C5A1AB059386EBBE533Dc9d22e3` |
| `NEXT_PUBLIC_GM_PLUS_FEE` | optional | default `0.01` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | optional | Reown / WalletConnect |
| `NEXT_PUBLIC_MOCK_MODE` | no | `true` forces local mock UI |
| `NEXT_PUBLIC_PRIVY_APP_ID` | for X login | Privy Dashboard app id. Without it, **Sign in with X** stays disabled |
| `NEXT_PUBLIC_PRIVY_CLIENT_ID` | optional | Privy app client id (multi-env) |
| `NEXT_PUBLIC_GM_ARC_X_HANDLE` | optional | Defaults to `GMARCxlm` (`@GMARCxlm`) |
| `PRIVY_APP_SECRET` | server-only later | Do **not** expose as `NEXT_PUBLIC_*`. Not required for client login scaffold |

Mock mode activates when `NEXT_PUBLIC_MOCK_MODE=true`. With a contract address set (default in `.env.example`), the app talks to Arc mainnet.

The app includes a **Bridge USDC to Arc** link to the official deposit portal: https://portal.arc.io/deposit/crypto

### Sign in with X (Privy) setup

1. Create a Privy app at [dashboard.privy.io](https://dashboard.privy.io).
2. Enable **Twitter / X** (and optionally **Wallet**) under Login methods.
3. Best practice: create an X developer app as a **Confidential client** and paste **Client ID** + **Client Secret** into Privy (not into this repo).
4. Set the X OAuth callback to Privy’s hosted URL: `https://auth.privy.io/api/v1/oauth/callback`.
5. Allowlist origins in Privy: `http://localhost:3000`, `https://gm-arc.vercel.app` (and any custom domain).
6. Set `NEXT_PUBLIC_PRIVY_APP_ID` in `.env.local` / Vercel Production env, then redeploy.

Until step 6, the UI shows a disabled **Sign in with X** button; **Connect wallet** keeps working.

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
