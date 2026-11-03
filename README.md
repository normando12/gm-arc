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

Mock mode activates when `NEXT_PUBLIC_MOCK_MODE=true`. With a contract address set (default in `.env.example`), the app talks to Arc mainnet.

## Deploy (Vercel)

1. Import this GitHub repo in [vercel.com/new](https://vercel.com/new)
2. Framework preset: **Next.js**
3. Set env vars from the table above (no private keys)
4. Deploy

## Network

- RPC: `https://rpc.mainnet.arc.io`
- Explorer: `https://explorer.arc.io`
- Docs: [Connect to Arc](https://docs.arc.io/arc/references/connect-to-arc)
