# Rozo bridge EURC Base ⇄ Stellar — quote & liquidity ahead of time

`rozo-quote.sh` queries the public Rozo API (`intentapiv4.rozo.ai`, no key) to
know **the cost and available liquidity BEFORE bridging**, in both directions. Nothing
moves (an intent is created, but no funds move until the deposit is made).

## Usage

```bash
./rozo-quote.sh B2S 5000      # cost to receive 5000 EURC on Stellar
./rozo-quote.sh S2B 5000      # cost to receive 5000 EURC on Base
./rozo-quote.sh liq B2S       # max bridgeable liquidity right now (Base->Stellar)
./rozo-quote.sh liq S2B       # max bridgeable liquidity right now (Stellar->Base)
./rozo-quote.sh curve B2S     # fee% vs amount curve
./rozo-quote.sh hub           # EURC balances of the relayer's 2 hubs, on-chain

# Standalone web page (quote + live liquidity + curve chart, light/dark modes):
open rozo-bridge.html         # or serve it: python3 -m http.server

# overridable destination wallets:
ROZO_STELLAR=G... ROZO_EVM=0x... ./rozo-quote.sh B2S 1000
```

## What we learned (2026-06-30)

- **Dynamic fees**, quote every time (no fixed schedule, no closed-form
  formula): `fee%(amount, L)` = surface measured by dryrun sweep, where `L` = Available
  remaining in the hub (drops with each stacked tranche). **Hard cap at 0.50%** (all amounts,
  near depletion); ~0.30% at a full hub on large amounts (protocol share
  bounded on-chain, `MAX_PROTOCOL_FEE_BPS=30`). B→S ~0.09% at a full hub; **S→B ~0.12%**
  (pricier, same dynamic). Details: `AUDIT-2-REPORT.md` / `fee-study/`.
- **Liquidity is a thin float per direction**, not one big pool:
  - **Base → Stellar**: cap = EURC balance of `GB4CLV3U…BY5AA` on Stellar
    (API `Available` = this balance to the cent, ~12.8k). Verifiable on-chain.
  - **Stellar → Base**: cap ≠ `0x90DA…` (which holds ~10M EURC but is NOT the source
    for this lane). It's a different relayer, float ~7.3k. **No reliable wallet to watch.**
- **So the only source of truth is the API quote** (`liq`), not a wallet balance.
- ⚠️ **appId**: the script (and the web app) use `rozoEURC` — it's the only
  documented and used appId; the old name `rozoAgent` was wrong and no longer applies.
  Available liquidity is specific to this lane. intents.rozo.ai may route through an
  other appId with deeper liquidity (which is why a 16.8k S→B bridge went
  through 0x90DA even though `rozoEURC` caps at ~7.3k). FEES stay
  representative; the CAP is a conservative lower bound.

## Reflex before a large bridge

1. `./rozo-quote.sh liq <DIR>` → check that the amount goes through.
2. `./rozo-quote.sh <DIR> <amount>` → know the exact fee.
3. If the cap is reached: split it, or wait ~10 min (relayer JIT refill).
