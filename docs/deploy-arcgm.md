# Deploy ArcGM v2 (Option A fees)

**Fees:** `1.01 USDC` total per GM+ → **0.01** to friend + **1.0** to owner  
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

1. Call `gmPlusFee()` → expect `1010000000000000000` (1.01e18).  
2. Call `owner()` → `0xe8fE…3773`.  
3. From a funded wallet, `gmPlusTo(friend)` with value `1.01` USDC; confirm friend +0.01 and owner +1.0.

## 3) Point the app + cron

Vercel Production env:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=<new address>
# optional explicit split (defaults already match Option A)
# NEXT_PUBLIC_GM_PLUS_FRIEND_TIP=0.01
# NEXT_PUBLIC_GM_PLUS_OWNER_FEE=1
# NEXT_PUBLIC_GM_PLUS_OWNER=0xe8fE5893E7eeC69DF7B06787b8b25dd64CeC3773
```

Redeploy. X-alerts cron uses the same `NEXT_PUBLIC_CONTRACT_ADDRESS` / config default.  
After cutover, optionally `DEL gm-arc:x-alerts:state` or set `X_ALERTS_START_BLOCK` to the deploy block so the worker does not rely on the old cursor alone.

## 4) Legacy

Old contract `0x605A1Adc…22e3` stays onchain (immutable). App stops using it once env points at v2.
