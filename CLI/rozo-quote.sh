#!/usr/bin/env bash
# =============================================================================
# Devis + check de liquidité AVANT de bridger de l'EURC via Rozo (intents.rozo.ai),
# dans les deux sens Base <-> Stellar. Coût connu à l'avance, rien ne bouge.
#
# MODÈLE DE FRAIS (reverse-engineeré, déterministe — même entrée => même frais) :
#   frais% = fee%(montant, L)   où L = Available restant du hub (baisse à
#   chaque tranche empilée) — surface mesurée par sweep dryrun (drain complet),
#   PAS une formule fermée en b+k*u^p (ancien modèle réfuté, cf. AUDIT-2-REPORT.md).
#   -> spread de base fixe par sens (B->S ~0,09 % ; S->B ~0,12 % à hub plein)
#      + escalade qui monte quand le hub se draine, cap DUR à 0,50 % (tous
#      montants, tous sens) près de la déplétion ; ~0,30 % à hub plein sur les
#      gros montants (MAX_PROTOCOL_FEE_BPS du contrat). Au-delà de la
#      liquidité dispo : demande REFUSÉE.
#   L'appId ne change NI la liquidité NI le frais (rozoEURC, seul appId utilisé
#   ici et dans l'app web — l'ancien nom "rozoAgent" ne s'applique plus).
#   La liquidité est un float qui varie dans le temps -> toujours la re-checker.
#   Ce script ne calcule rien lui-même : le devis (dryrun) vient tel quel de
#   l'API Rozo, donc toujours exact — seul ce commentaire décrit le modèle.
#
# Usage :
#   ./rozo-quote.sh B2S 5000      # coût pour RECEVOIR 5000 EURC sur Stellar
#   ./rozo-quote.sh S2B 5000      # coût pour RECEVOIR 5000 EURC sur Base
#   ./rozo-quote.sh liq B2S       # liquidité max bridgeable maintenant (Base->Stellar)
#   ./rozo-quote.sh liq S2B       # liquidité max bridgeable maintenant (Stellar->Base)
#   ./rozo-quote.sh curve B2S     # courbe frais% vs montant (plusieurs paliers)
#
# Wallets destinataires (surchargeables) : ROZO_STELLAR=G...  ROZO_EVM=0x...
# Dépendances : curl, python3 (stdlib). API publique, sans clé.
#   - devis frais : endpoint ?dryrun=true  -> AUCUN intent créé, calcul pur.
#   - liquidité   : endpoint create        -> renvoie le float réel dispo.
# =============================================================================
set -euo pipefail

CREATE="https://intentapiv4.rozo.ai/functions/v1/payment-api/"
DRY="https://intentapiv4.rozo.ai/functions/v1/payment-api/payments?dryrun=true"
APPID="rozoEURC"
EURC_BASE="0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42"                          # EURC Base (chainId 8453)
EURC_STELLAR="EURC:GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2"     # EURC Stellar (chainId 1500)
DEST_STELLAR="${ROZO_STELLAR:-GC43VW7DGJREUMJWMHJZOAWWWQ374ZKCFS2GKGRMNAIXSNV53WIBY5AA}"
DEST_EVM="${ROZO_EVM:-0xA2d1034afa31a27A46fb40DF3bB4193aC7458115}"
# Hubs du relayer (plafond d'un sens = solde EURC du hub sur la chaîne de réception)
STELLAR_HUB="GB4CLV3UMXDPFP5OQJQKUCWPRJXPXPJSHTUKZEJLAIZFZR7UHYAQ6EB4"          # reçoit B->S
BASE_HUB="0x05c84533299625df3aCe2215742124c1644e2705"                          # reçoit S->B
BASE_RPC="https://mainnet.base.org"

route () {  # DIR -> "sc sa dc da ra"
  case "$1" in
    B2S) echo "8453 $EURC_BASE 1500 $EURC_STELLAR $DEST_STELLAR" ;;
    S2B) echo "1500 $EURC_STELLAR 8453 $EURC_BASE $DEST_EVM" ;;
    *) echo "Sens invalide: $1 (B2S ou S2B)" >&2; exit 2 ;;
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
    [ -n "$arg" ] || { echo "Usage: $0 $cmd <montant_recu>" >&2; exit 2; }
    post "$DRY" "$cmd" "$arg" | DIR="$cmd" AMT="$arg" python3 -c '
import sys,json,os
d=json.load(sys.stdin); amt=float(os.environ["AMT"]); dirn=os.environ["DIR"]
e=d.get("error")
if e:
    msg=e.get("message",e)
    print(f"[{dirn}] reçu {amt:g} EURC -> {msg}"); sys.exit(0)
s=d["source"]; fee=float(s["fee"]); send=float(s["amount"])
print(f"[{dirn}] reçu {amt:g} EURC | tu envoies {send:.4f} | frais {fee:.4f} EURC ({fee/amt*100:.3f} %)")'
    ;;
  liq)
    [ -n "$arg" ] || { echo "Usage: $0 liq <B2S|S2B>" >&2; exit 2; }
    post "$CREATE" "$arg" "99999999" | DIR="$arg" python3 -c '
import sys,json,os,re
d=json.load(sys.stdin); dirn=os.environ["DIR"]
e=d.get("error"); msg=str(e.get("message","")) if e else ""
if e and "Available" in msg:
    m=re.search(r"Available:\s*([0-9.]+)", msg)
    print(f"[{dirn}] liquidité max bridgeable maintenant : {float(m.group(1)):,.2f} EURC")
elif e:
    print(f"[{dirn}] {msg}")
else:
    print(f"[{dirn}] >= 99 999 999 EURC (pas de plafond)")'
    ;;
  curve)
    [ -n "$arg" ] || { echo "Usage: $0 curve <B2S|S2B>" >&2; exit 2; }
    echo "[$arg] frais% par montant (dryrun, courbe pure) :"
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
    echo "Hubs du relayer Rozo — plafond = solde EURC du hub (contre-check on-chain) :"
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
    bb=$(python3 -c "print(f'{int(\"$hx\",16)/1e6:,.2f}')")
    echo "  S->B  hub Base    $BASE_HUB"
    echo "        EURC on-chain = $bb"
    ;;
  *)
    echo "Usage:" >&2
    echo "  $0 B2S <montant>    # devis Base->Stellar"   >&2
    echo "  $0 S2B <montant>    # devis Stellar->Base"   >&2
    echo "  $0 liq <B2S|S2B>    # liquidité dispo maintenant" >&2
    echo "  $0 curve <B2S|S2B>  # courbe frais% vs montant"   >&2
    echo "  $0 hub               # soldes EURC des 2 hubs on-chain" >&2
    exit 2 ;;
esac
