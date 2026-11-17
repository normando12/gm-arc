# Deploy ArcGM v3 (0.50 USDC fees)

**Fees:** `0.50 USDC` total per GM+ → **0.10** to friend + **0.40** to owner  
(v2 was `1.01` total: 0.01 + 1.0 — the fee constants are immutable, so a fee change = a new contract.)  
**Owner (default):** `0xe8fE5893E7eeC69DF7B06787b8b25dd64CeC3773`

Do **not** put `PRIVATE_KEY` in git or Vercel.

## 1) Deploy (local)

```bash
cd /path/to/gm-arc
npm install --legacy-peer-deps

# Fund this key with Arc USDC for gas first
export PRIVATE_KEY='0x…'          # deployer — local shell only
export OWNER='0xe8fE5893E7eeC69DF7B06787b8b25dd64CeC3773'  # optional; this is the default

npm run deploy:arcgm
```

Script compiles `contracts/ArcGM.sol` with `solc` and sends a create tx on Arc mainnet (`5042`).  
It prints **Contract** address + explorer link.

### Manual alternative (Foundry)

```bash
forge create contracts/ArcGM.sol:ArcGM \
  --rpc-url https://rpc.mainnet.arc.io \
  --private-key $PRIVATE_KEY \
  --constructor-args 0xe8fE5893E7eeC69DF7B06787b8b25dd64CeC3773
```

## 2) Smoke

1. Call `gmPlusFee()` → expect `500000000000000000` (0.5e18).  
   `FRIEND_TIP()` → `100000000000000000` (0.1e18), `OWNER_FEE()` → `400000000000000000` (0.4e18).  
2. Call `owner()` → `0xe8fE…3773`.  
3. From a funded wallet, `gmPlusTo(friend)` with value `0.50` USDC; confirm friend +0.10 and owner +0.40.  
   (Real funds on mainnet — use a friend address you control.)

## 3) Point the app + cron

Vercel Production env — set **all of these together**, then Redeploy. The app's
defaults in `src/lib/config.ts` are still the v2 split (0.01 + 1), so the split
**must** be set explicitly or GM+ will send the wrong value and revert:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=<new address>
NEXT_PUBLIC_GM_PLUS_FRIEND_TIP=0.1
NEXT_PUBLIC_GM_PLUS_OWNER_FEE=0.4
# NEXT_PUBLIC_GM_PLUS_OWNER=0xe8fE5893E7eeC69DF7B06787b8b25dd64CeC3773
# If NEXT_PUBLIC_GM_PLUS_FEE exists, set it to 0.5 or delete it (it overrides the sum).
```

Do not set these before the new contract is deployed: the old contract only accepts
exactly 1.01 USDC, and a mismatched value makes every GM+ revert.

Redeploy. X-alerts cron uses the same `NEXT_PUBLIC_CONTRACT_ADDRESS` / config default.  
After cutover, optionally `DEL gm-arc:x-alerts:state` or set `X_ALERTS_START_BLOCK` to the deploy block so the worker does not rely on the old cursor alone.

## 4) Legacy

Old contracts (v1 `0x605A1Adc…22e3` and the v2 with 1.01 USDC) stay onchain (immutable) and keep working
at their own prices. The app stops using them once env points at v3. Per-address GM cooldown starts fresh on the new contract.
