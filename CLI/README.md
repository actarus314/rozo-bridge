# Rozo bridge EURC Base ⇄ Stellar — devis & liquidité à l'avance

`rozo-quote.sh` interroge l'API publique Rozo (`intentapiv4.rozo.ai`, sans clé) pour
connaître **le coût et la liquidité dispo AVANT de bridger**, dans les deux sens. Rien
ne bouge (un intent est créé, mais aucun fonds n'est déplacé tant qu'on ne dépose pas).

## Usage

```bash
./rozo-quote.sh B2S 5000      # coût pour recevoir 5000 EURC sur Stellar
./rozo-quote.sh S2B 5000      # coût pour recevoir 5000 EURC sur Base
./rozo-quote.sh liq B2S       # liquidité max bridgeable maintenant (Base->Stellar)
./rozo-quote.sh liq S2B       # liquidité max bridgeable maintenant (Stellar->Base)
./rozo-quote.sh curve B2S     # courbe frais% vs montant
./rozo-quote.sh hub           # soldes EURC des 2 hubs du relayer, on-chain

# Page web autonome (devis + liquidité live + graphique de la courbe, modes clair/sombre) :
open rozo-bridge.html         # ou la servir : python3 -m http.server

# wallets destinataires surchargeables :
ROZO_STELLAR=G... ROZO_EVM=0x... ./rozo-quote.sh B2S 1000
```

## Ce qu'on a appris (30/06/2026)

- **Frais dynamiques**, à quoter à chaque fois (pas de barème fixe, pas de formule
  fermée) : `fee%(montant, L)` = surface mesurée par sweep dryrun, où `L` = Available
  restant du hub (baisse à chaque tranche empilée). Cap **dur à 0,50 %** (tous montants,
  près de la déplétion) ; ~0,30 % à hub plein sur les gros montants (part protocole
  bornée on-chain, `MAX_PROTOCOL_FEE_BPS=30`). B→S ~0,09 % à hub plein ; **S→B ~0,12 %**
  (plus cher, même dynamique). Détail : `AUDIT-2-REPORT.md` / `fee-study/`.
- **La liquidité est un float mince par sens**, pas un gros pool :
  - **Base → Stellar** : plafond = solde EURC de `GB4CLV3U…BY5AA` sur Stellar
    (API `Available` = ce solde au centime près, ~12,8k). Vérifiable on-chain.
  - **Stellar → Base** : plafond ≠ `0x90DA…` (qui a ~10M EURC mais n'est PAS la source
    de ce lane). C'est un autre relayer, float ~7,3k. **Pas de wallet fiable à watcher.**
- **Donc la seule source de vérité = le quote API** (`liq`), pas un solde de wallet.
- ⚠️ **appId** : le script (et l'app web) utilisent `rozoEURC` — c'est le seul appId
  documenté et utilisé ; l'ancien nom `rozoAgent` était erroné et ne s'applique plus.
  La liquidité dispo est propre à ce lane. Le site intents.rozo.ai peut router via un
  autre appId à liquidité plus profonde (c'est pourquoi un bridge S→B de 16,8k a pu
  passer via 0x90DA alors que `rozoEURC` cape à ~7,3k). Les FRAIS restent
  représentatifs ; le PLAFOND est un minorant prudent.

## Réflexe avant un gros bridge

1. `./rozo-quote.sh liq <SENS>` → vérifier que le montant passe.
2. `./rozo-quote.sh <SENS> <montant>` → connaître le frais exact.
3. Si plafond atteint : fractionner, ou attendre ~10 min (recharge JIT du relayer).
