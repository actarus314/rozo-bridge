# rozo-bridge

Outil de devis de frais **côté client** pour le **Rozo Bridge** (EURC, Base ⇄ Stellar).
Page statique autonome : elle interroge l'API intents de Rozo (en dry-run, sans réservation)
et les soldes on-chain pour afficher le **coût exact** d'un transfert, le **meilleur découpage**
et la **liquidité live** des hubs. Aucune étape de build, aucune dépendance, aucune clé API.

## Lancer
```bash
cd web
python3 serve.py
```
Sert `assets/` et ouvre la page localement. Nécessite seulement Python 3.

## Devis en ligne de commande
```bash
CLI/rozo-quote.sh        # cf. CLI/README.md
```

## Structure
- `web/`  — l'app : `serve.py`, `rozo-bridge.html`, `assets/` (JS/CSS + kit wallet vendored)
- `CLI/`  — `rozo-quote.sh`, script de devis en ligne de commande
- `data/` — log d'intents runtime (ignoré par Git)
