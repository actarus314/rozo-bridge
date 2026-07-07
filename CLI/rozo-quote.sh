#!/usr/bin/env bash
# =============================================================================
# Quote + liquidity check BEFORE bridging EURC via Rozo (intents.rozo.ai),
# in both directions Base <-> Stellar. Cost known in advance, nothing moves.
#
# FEE MODEL (reverse-engineered, deterministic — same input => same fee):
#   fee% = fee%(amount, L)   where L = Available remaining in the hub (drops
#   with each stacked tranche) — surface measured by dryrun sweep (full drain),
#   NOT a closed-form formula in b+k*u^p (old model refuted).
#   -> fixed base spread per direction (B->S ~0.09% ; S->B ~0.12% at a full hub)
#      + escalation that rises as the hub drains, HARD cap at 0.50% (all
#      amounts, all directions) near depletion; ~0.30% at a full hub on
#      large amounts (contract's MAX_PROTOCOL_FEE_BPS). Beyond available
#      liquidity: request REJECTED.
#   The appId changes NEITHER the liquidity NOR the fee (rozoEURC, the only
#   appId used here and in the web app — the old name "rozoAgent" no longer applies).
#   Liquidity is a float that varies over time -> always re-check it.
#   This script computes nothing itself: the quote (dryrun) comes as-is from
#   the Rozo API, so it's always exact — only this comment describes the model.
#
# Usage:
#   ./rozo-quote.sh B2S 5000      # cost to RECEIVE 5000 EURC on Stellar
#   ./rozo-quote.sh S2B 5000      # cost to RECEIVE 5000 EURC on Base
#   ./rozo-quote.sh liq B2S       # max bridgeable liquidity right now (Base->Stellar)
#   ./rozo-quote.sh liq S2B       # max bridgeable liquidity right now (Stellar->Base)
#   ./rozo-quote.sh curve B2S     # fee% vs amount curve (several tiers)
#
# Destination wallets (overridable): ROZO_STELLAR=G...  ROZO_EVM=0x...
# Dependencies: curl, python3 (stdlib). Public API, no key.
#   - fee quote: endpoint ?dryrun=true  -> NO intent created, pure calculation.
#   - liquidity : endpoint create        -> returns the real available float.
# =============================================================================
set -euo pipefail

CREATE="https://intentapiv4.rozo.ai/functions/v1/payment-api/"
DRY="https://intentapiv4.rozo.ai/functions/v1/payment-api/payments?dryrun=true"
APPID="rozoEURC"
EURC_BASE="0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42"                          # EURC Base (chainId 8453)
EURC_STELLAR="EURC:GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2"     # EURC Stellar (chainId 1500)
DEST_STELLAR="${ROZO_STELLAR:-GC43VW7DGJREUMJWMHJZOAWWWQ374ZKCFS2GKGRMNAIXSNV53WIBY5AA}"
DEST_EVM="${ROZO_EVM:-0xA2d1034afa31a27A46fb40DF3bB4193aC7458115}"
# Relayer hubs (cap for one direction = hub's EURC balance on the receiving chain)
STELLAR_HUB="GB4CLV3UMXDPFP5OQJQKUCWPRJXPXPJSHTUKZEJLAIZFZR7UHYAQ6EB4"          # receives B->S
BASE_HUB="0x05c84533299625df3aCe2215742124c1644e2705"                          # receives S->B
BASE_RPC="https://mainnet.base.org"

route () {  # DIR -> "sc sa dc da ra"
  case "$1" in
    B2S) echo "8453 $EURC_BASE 1500 $EURC_STELLAR $DEST_STELLAR" ;;
    S2B) echo "1500 $EURC_STELLAR 8453 $EURC_BASE $DEST_EVM" ;;
    *) echo "Invalid direction: $1 (B2S or S2B)" >&2; exit 2 ;;
  esac
}
post () {  # URL DIR AMOUNT
  read -r sc sa dc da ra <<<"$(route "$2")"
  curl -s -X POST "$1" -H "Content-Type: application/json" -d "{
    \"appId\":\"$APPID\",\"type\":\"exactOut\",\"display\":{\"title\":\"q\",\"currency\":\"USD\"},
    \"source\":{\"chainId\":$sc,\"tokenSymbol\":\"EURC\",\"tokenAddress\":\"$sa\"},
    \"destination\":{\"chainId\":$dc,\"tokenSymbol\":\"EURC\",\"tokenAddress\":\"$da\",\"receiverAddress\":\"$ra\",\"amount\":\"$3\"}
  }"
}

cmd="${1:-}"; arg="${2:-}"

case "$cmd" in
  B2S|S2B)
    [ -n "$arg" ] || { echo "Usage: $0 $cmd <amount_received>" >&2; exit 2; }
    post "$DRY" "$cmd" "$arg" | DIR="$cmd" AMT="$arg" python3 -c '
import sys,json,os
d=json.load(sys.stdin); amt=float(os.environ["AMT"]); dirn=os.environ["DIR"]
e=d.get("error")
if e:
    msg=e.get("message",e)
    print(f"[{dirn}] received {amt:g} EURC -> {msg}"); sys.exit(0)
s=d["source"]; fee=float(s["fee"]); send=float(s["amount"])
print(f"[{dirn}] received {amt:g} EURC | you send {send:.4f} | fee {fee:.4f} EURC ({fee/amt*100:.3f} %)")'
    ;;
  liq)
    [ -n "$arg" ] || { echo "Usage: $0 liq <B2S|S2B>" >&2; exit 2; }
    post "$CREATE" "$arg" "99999999" | DIR="$arg" python3 -c '
import sys,json,os,re
d=json.load(sys.stdin); dirn=os.environ["DIR"]
e=d.get("error"); msg=str(e.get("message","")) if e else ""
if e and "Available" in msg:
    m=re.search(r"Available:\s*([0-9.]+)", msg)
    print(f"[{dirn}] max bridgeable liquidity right now: {float(m.group(1)):,.2f} EURC")
elif e:
    print(f"[{dirn}] {msg}")
else:
    print(f"[{dirn}] >= 99,999,999 EURC (no cap)")'
    ;;
  curve)
    [ -n "$arg" ] || { echo "Usage: $0 curve <B2S|S2B>" >&2; exit 2; }
    echo "[$arg] fee% by amount (dryrun, pure curve):"
    for x in 100 1000 5000 10000 20000 50000; do
      post "$DRY" "$arg" "$x" | X="$x" python3 -c '
import sys,json,os
d=json.load(sys.stdin); x=float(os.environ["X"]); e=d.get("error")
if e:
    print(f"  {x:>7.0f}  ->  ERR")
else:
    fee=float(d["source"]["fee"]); print(f"  {x:>7.0f}  ->  {fee:>9.2f} EURC  ({fee/x*100:.3f} %)")'
    done
    ;;
  hub)
    echo "Rozo relayer hubs — cap = hub's EURC balance (on-chain cross-check):"
    sb=$(curl -s "https://horizon.stellar.org/accounts/$STELLAR_HUB" | python3 -c '
import sys,json
b=[x["balance"] for x in json.load(sys.stdin).get("balances",[]) if x.get("asset_code")=="EURC"]
print(b[0] if b else "?")')
    echo "  B->S  hub Stellar $STELLAR_HUB"
    echo "        EURC on-chain = $sb"
    pad="000000000000000000000000$(echo "${BASE_HUB#0x}" | tr A-F a-f)"
    hx=$(curl -s -X POST "$BASE_RPC" -H "Content-Type: application/json" \
      -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_call\",\"params\":[{\"to\":\"$EURC_BASE\",\"data\":\"0x70a08231$pad\"},\"latest\"]}" \
      | python3 -c 'import sys,json;print(json.load(sys.stdin).get("result","0x0"))')
    bb=$(HX="$hx" python3 -c 'import os;h=os.environ["HX"];print(f"{int(h,16)/1e6:,.2f}")')
    echo "  S->B  hub Base    $BASE_HUB"
    echo "        EURC on-chain = $bb"
    ;;
  *)
    echo "Usage:" >&2
    echo "  $0 B2S <amount>     # quote Base->Stellar"   >&2
    echo "  $0 S2B <amount>     # quote Stellar->Base"   >&2
    echo "  $0 liq <B2S|S2B>    # liquidity available right now" >&2
    echo "  $0 curve <B2S|S2B>  # fee% vs amount curve"   >&2
    echo "  $0 hub               # EURC balances of the 2 hubs on-chain" >&2
    exit 2 ;;
esac
