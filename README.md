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
- Browser wallet via injected connector

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
| `RELAY_API_KEY` | for in-page bridge | **Server-only.** Relay Kit needs this via `/api/relay` proxy. Never expose as `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_RELAY_PROXY` | for in-page bridge | Set to `true` to mount Relay SwapWidget (destination locked to Arc). |

Mock mode activates when `NEXT_PUBLIC_MOCK_MODE=true`. With a contract address set (default in `.env.example`), the app talks to Arc mainnet.

### Bridge note

`https://portal.arc.io/deposit/crypto` sets `X-Frame-Options: DENY` / `frame-ancestors 'none'`, so it cannot be embedded. gm·arc uses an **in-page Relay SwapWidget** with destination **Arc (5042)** and keeps an “Open official Arc deposit portal” fallback link. Without `RELAY_API_KEY` + `NEXT_PUBLIC_RELAY_PROXY=true`, the page shows setup instructions instead of the widget (same class of “provide an api key” issue as a bare Relay embed).

## Deploy (Vercel)

1. Import this GitHub repo in [vercel.com/new](https://vercel.com/new)
2. Framework preset: **Next.js** (repo root — leave **Root Directory** empty)
3. Production Branch: **`main`**
4. Env (Production): `NEXT_PUBLIC_CONTRACT_ADDRESS=0x605A1Adc99796C5A1AB059386EBBE533Dc9d22e3`
5. Deploy

`vercel.json` pins framework/build to Next.js at the repo root.

### If `*.vercel.app` shows NOT_FOUND or login wall

- **Domains →** assign `gm-arc.vercel.app` to this project’s **Production** deployment (team projects often use a longer default host like `gm-arc-<team>.vercel.app`).
- **Deployment Protection / Vercel Authentication →** disable for Production (or allow public access) so visitors are not redirected to Vercel SSO.
- Confirm the latest **Production** deploy is from `main` and **Redeploy** if needed.

## Network

- RPC: `https://rpc.mainnet.arc.io`
- Explorer: `https://explorer.arc.io`
- Docs: [Connect to Arc](https://docs.arc.io/arc/references/connect-to-arc)
