const API="https://intentapiv4.rozo.ai/functions/v1/payment-api";
const EURC_B="0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42";
const EURC_S="EURC:GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2";
// comptes appairés (Base Safe ⇄ Stellar). Le destinataire d'un bridge = le wallet du même compte sur l'autre chaîne.
// Adressage = wallets CONNECTÉS (plus de comptes codés en dur).
// destination = wallet sur la chaîne de RÉCEPTION · source = wallet sur la chaîne de départ (= signataire).
const destWallet=dk=>dk==="B2S"?window.stellarAddr:window.evmAddr;
const srcWallet=dk=>dk==="B2S"?window.evmAddr:window.stellarAddr;
// DEVIS (dryrun, ne bouge rien) : si le wallet destination n'est pas connecté, placeholder VALIDE — le fee ne dépend pas du destinataire. La CRÉATION exige le vrai wallet (garde-fou genBatch).
const PH={stellar:"GC43VW7DGJREUMJWMHJZOAWWWQ374ZKCFS2GKGRMNAIXSNV53WIBY5AA",base:"0xA2d1034afa31a27A46fb40DF3bB4193aC7458115"};
const receiver=dk=>destWallet(dk)||(dk==="B2S"?PH.stellar:PH.base);
const shortAddr=a=>a?a.slice(0,a.startsWith("0x")?6:4)+"…"+a.slice(-4):"—";
// RC-9 : défense en profondeur — toute chaîne d'origine API (error.message, status, memo, id…) passe par ici avant innerHTML
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
window.escapeHtml=escapeHtml;   // exposé : wallet.js insère aussi des messages d'erreur bruts (Horizon) en innerHTML
const STELLAR_HUB="GB4CLV3UMXDPFP5OQJQKUCWPRJXPXPJSHTUKZEJLAIZFZR7UHYAQ6EB4";
const BASE_HUB="0x05c84533299625df3aCe2215742124c1644e2705";
// paramètres du sens : src/dst pour la requête + modèle (fallback)
const DIR={
  B2S:{sc:8453,sa:EURC_B,dc:1500,da:EURC_S,L:12781.48,col:"#4cc9f0"},   // L = repli du plafond si l'API échoue (sinon LIVE.L)
  S2B:{sc:1500,sa:EURC_S,dc:8453,da:EURC_B,L:7318.84,col:"#f0a04c"}
};
// données mesurées (live dryrun) — courbe toujours affichable hors-ligne
const MEAS={
  B2S:[[100,.060],[400,.0575],[1000,.062],[2500,.0748],[4000,.0887],[6000,.111],[8000,.1369],[10000,.1754],[11500,.2150],[12000,.2269]],
  S2B:[[100,.170],[400,.1725],[1000,.180],[2500,.2056],[4000,.2425],[5500,.2969],[7000,.3404],[7300,.3470]]
};
// langue = auto (OS/navigateur), fallback anglais si pas de fr détecté
let _langPref=null; try{_langPref=localStorage.getItem("rozoLang")}catch(e){}   // choix manuel mémorisé prime sur l'auto-détection
let LANG=(_langPref||navigator.language||"en").toLowerCase().startsWith("fr")?"fr":"en";
let LOCALE=LANG==="fr"?"fr-FR":"en-US";
document.documentElement.lang=LANG;
const I18N={
  fr:{
    pageTitle:"Rozo Bridge EURC Base ⇄ Stellar — coût, liquidité, modèle",
    themeLight:"☀︎ clair", themeDark:"☾ sombre",
    subtext:"Coût à l'avance, liquidité, modèle de frais reverse-engineeré. Page autonome — données live via API Rozo + on-chain.",
    navTool:"Bridge", navDoc:"Documentation", navDisp:"Dispersion", refreshTitle:"Rafraîchir",
    brandTitle:"Retour à l'accueil", hubBaseTitle:"Hub Base sur BaseScan", hubStellarTitle:"Hub Stellar sur stellar.expert",
    maxbtnTitle:"Remplir avec le solde du wallet d'envoi", dirbtnTitle:"Inverser le sens",
    chartAriaLabel:"Courbe du frais % en fonction du montant, par sens",
    h2Quote:"Montant & recommandation",
    optRecv:"Je veux recevoir…", optSend:"Je veux envoyer…",
    amtSent:"EURC envoyés", amtRecv:"EURC reçus", btnCalc:"Calculer", amtPlaceholder:"montant",
    h2Liq:"Liquidité disponible",
    tsUpdating:"· mise à jour…", tsUpdated:t=>"· mis à jour "+t, tsOffline:"· données live indisponibles (réseau bloqué)",
    loadCurve:"Mesure de la courbe de frais — un devis (dryrun) par palier de montant, sur les deux sens. L'API Rozo répond ~1,5 s par appel.",
    loadLiq:"Lecture de la liquidité des hubs — Available côté Rozo + soldes on-chain (RPC Base, Horizon Stellar).",
    pLiqExplain:"Le plafond d'un sens = solde EURC du hub sur la chaîne de réception. Vérifiable on-chain au centime.",
    thDir:"Sens", thHub:"Hub (chaîne reçue)", thLiqAvail:"Liquidité disponible API Rozo", thOnchain:"Vérification on-chain",
    pDecoyWarn:'<span class="warn">⚠</span> <code>0x90DA…</code> (10,4M EURC) est un leurre : ancien filler, PAS le hub actuel. Float rechargé en just-in-time → re-checker avant un gros transfert.',
    lblWallets:"Wallets :", notConnected:"non connecté",
    h2Curve:"Courbe des frais (frais % vs montant)",
    pCurveExplain:'<ul style="margin:0 0 0 -2px"><li>Points = mesures live (dryrun, identiques pour tous les appId).</li><li><b>Balayage paresseux</b> : lancé à l\'<b>ouverture de la page Doc</b>, seulement pour les montants <b>≤ plafond de liquidité</b> (+ un point exact au plafond) — sert uniquement à <b>ce graphe</b>, pas au devis.</li><li>Lignes verticales = plafond de liquidité <b>live</b> (= solde du hub) ; chaque courbe s\'<b>arrête à son plafond</b>.</li><li>Au-delà du plafond, un envoi unique est refusé (fractionne).</li><li>Les petits montants montent vers ~0,50 % (plancher 0,01 € + arrondi cent).</li><li>La génération donne le chiffre engageant.</li></ul>',
    pOfficialBridge:'Bridge officiel : <a href="https://intents.rozo.ai/bridge" target="_blank" rel="noopener">intents.rozo.ai/bridge ↗</a> · Documentation : <a href="https://docs.rozo.ai/" target="_blank" rel="noopener">docs.rozo.ai ↗</a> · GitHub : <a href="https://github.com/RozoAI" target="_blank" rel="noopener">github.com/RozoAI ↗</a> (contrat <a href="https://github.com/RozoAI/rozo-intents-contracts/blob/main/evm/src/RozoIntents.sol" target="_blank" rel="noopener">RozoIntents.sol ↗</a>)',
    pRefContact:'Contact Rozo : <a href="https://discord.gg/rozoai" target="_blank" rel="noopener">discord.gg/rozoai ↗</a> ou <a href="mailto:hi@rozo.ai">hi@rozo.ai</a>.',
    docGrpFees:"Le bridge Rozo & ses frais", docGrpCalc:"Comment l'outil calcule ce devis", docGrpExec:"Exécution", docGrpRef:"Références",
    h2Model:"Le modèle de frais Rozo",
    thBaseFull:"base % (plein)",
    h2WhyRange:"Pourquoi une fourchette min/max",
    pWhyRange:"Une fourchette n'apparaît que sur le sens <b>Stellar→Base</b>, où créer un intent <b>réserve l'Available</b> du hub → empiler des tranches le draine → chaque tranche suivante est plus chère. Le découpage s'y lit en <b>trois valeurs</b> : <b>min</b> (N devis <b>dryrun réels</b> — un par taille de tranche T/n, sommés : le frais exact si chaque tranche part à hub plein, aucun drainage — meilleur cas, <b>exact</b>), <b>max</b> (tranches en série, chaque intent draine le hub → la suivante plus chère, cap 0,50 % — pire cas <b>estimé</b> depuis la surface mesurée, <b>collé au réel ≤0,03 €</b>), et le <b>coût probable</b> affiché entre les deux (même surface, ancrée sur le min exact). En pratique les N créations partent en <b>parallèle</b> → le serveur partage le snapshot par <b>vagues</b> → le réalisé est une <b>variable aléatoire</b> entre min et max (proche du min à peu de tranches). Sur <b>Base→Stellar</b>, créer un intent <b>fige le frais mais ne réserve plus l'Available</b> → aucun drainage → <b>chaque tranche affiche une valeur unique</b> (min = max, ni fourchette ni coût probable). La <b>génération donne le chiffre engageant</b>.",
    h2NoAtomic:"Pas de batch atomique",
    pNoAtomic:"Sur Stellar le mémo est <b>par transaction</b> ; sur Base un batch = 1 tx source dont Rozo ne règle qu'un paiement. Donc <b>N tranches = N signatures</b> dans les 2 sens. Mémo <b>TEXT</b> obligatoire (sinon fonds perdus). En cas de batch mal formé, <b>pas de refund automatique</b> → support Rozo (<code>discord.gg/rozoai</code> ou <code>hi@rozo.ai</code>).",
    h2SignTrack:"Signer & suivre les intents",
    pSignTrack:`<p>Chaque tranche = <b>une signature</b>. Selon le sens, trois façons&nbsp;:</p>
      <div class="grid2">
        <div class="card pad">
          <div class="eyebrow" style="color:var(--b2s)">Base → Stellar</div>
          <ul>
            <li><b>Signer</b> — wallet EVM connecté → 1&nbsp;transaction <code>EURC.transfer(dépôt, montant)</code>.</li>
            <li><b>JSON</b> — Safe{Wallet} › <b>Transaction Builder</b> › importer (1&nbsp;tx, 1&nbsp;signature, simulation Tenderly).</li>
            <li><b>Manuel</b> — envoi EURC vers l'adresse de dépôt indiquée.</li>
          </ul>
        </div>
        <div class="card pad">
          <div class="eyebrow" style="color:var(--s2b)">Stellar → Base</div>
          <ul>
            <li><b>Signer</b> — wallet Stellar connecté → paiement avec mémo <b>TEXT</b>.</li>
            <li><b>Copier</b> — le lien SEP-7 pour Lobstr / Freighter.</li>
            <li><b>Manuel</b> — paiement vers le hub, asset EURC, <b>mémo TEXT</b> = la valeur indiquée.</li>
          </ul>
          <p class="warn" style="font-size:12px;margin:4px 0 0">⚠ Mémo <b>TEXT</b> obligatoire — un mémo absent ou de mauvais type = dépôt mal attribué, <b>fonds perdus</b>.</p>
        </div>
      </div>
      <p><b>Non signé = rien ne bouge.</b> Créer des intents réserve l'Available, mais les fonds restent dans ton wallet ; la réservation se libère seule en ~10&nbsp;min.</p>
      <p><b>Réduire les frais.</b> Le <b>découpage</b> baisse déjà le coût (convexité : tranches plus petites = % plus bas). Frais élevés = hub bas : il se recharge <b>par seuil</b> (empressé côté Stellar, paresseux côté Base), pas à heure fixe — régénère une fois la liquidité revenue. Le tarif est <b>figé à la création</b>.</p>
      <p><b>Suivre.</b> Le bouton « Suivre le bridge » sous chaque lot interroge le statut de chaque tranche (dépôt → livraison) toutes les 5&nbsp;s. Les intents expirent <b>~10&nbsp;min</b> après leur création.</p>`,
    h2Addresses:"Adresses",
    hubStellarLabel:"Hub Stellar (reçoit Base→Stellar)", hubBaseLabel:"Hub Base (reçoit Stellar→Base)",
    formulaText:'frais/tranche = ⌈ montant · fee%(montant, L) ⌉ au cent · plancher 0,01 €<ul><li><b>L</b> = Available restant du hub (baisse à chaque tranche empilée)</li><li><b>fee%(montant, L)</b> = surface mesurée (mesures historiques en drainage réel) — dépend du montant <b>et</b> du restant</li><li>monte en continu vers le <b>cap dur 0,50 %</b>, d\'autant plus vite que le hub se draine (au-dessus du plafond, l\'API renvoie un forfait fixe = artefact)</li><li>sert à <b>projeter</b> le max et le coût probable des tranches suivantes ; le frais <b>réellement facturé</b> reste toujours un devis <b>dryrun exact</b>, jamais une valeur de formule seule</li></ul>',
    pModelDisclaimer:'<span class="ico">ⓘ</span><span><b>Modèle non officiel :</b> inféré d\'observations (dryrun + créations réelles), pas de la doc Rozo. Le frais % d\'un montant <b>livrable</b> monte en continu vers le <b>cap dur 0,50 %</b>, d\'autant plus vite que le hub se <b>draine</b>. Au-dessus de la liquidité disponible (montant non livrable en un envoi), l\'API renvoie un <b>forfait fixe</b> (cap protocole <a href="https://github.com/RozoAI/rozo-intents-contracts/blob/main/evm/src/RozoIntents.sol" target="_blank" rel="noopener"><code>MAX_PROTOCOL_FEE_BPS</code> ↗</a>) — un artefact d\'affichage, pas le vrai barème.</span>',
    modelLi1:"Déterministe (même entrée → même frais), <b>indépendant de l'appId</b>.",
    modelLi2:"Driver dominant = <b>remplissage du hub</b> (Available), <b>pas</b> le ratio montant/liquidité.",
    modelLi3:"<b>Sur Stellar→Base, créer un intent réserve l'Available</b> → empiler les tranches fait <b>baisser le L restant</b> → le frais % monte le long d'une <b>surface mesurée</b> <code>fee%(montant, L)</code> (mesures historiques en drainage réel — distinctes du balayage de la page Doc, qui ne sert qu'au graphe), <b>plafonnée à 0,50 %</b>. En <b>Base→Stellar</b>, créer un intent ne réserve plus l'Available → pas d'escalade (valeur unique par tranche).",
    modelLi4:"Routes : le niveau base% <b>et</b> la montée diffèrent (B→S ~0,09 &lt; S→B ~0,12 %) → <b>une surface par route</b>, mesurée séparément pour projeter max et coût probable. Validé : <b>max ≤0,03 €</b> / 16 séries réelles — jamais optimiste ; le <b>min</b> est un devis <b>dryrun réel</b> (exact, pas une projection).",
    modelLi5:"<b>Frais figés à la création</b> et honorés à la livraison — vérifié dans les 2 sens (03/07/2026).",
    h3Bridge:"Le bridge en bref",
    pBridge:`Rozo transfère de l'<b>EURC entre Base et Stellar</b> via des <b>intents</b>. Chaque sens a un <b>hub</b> (compte à liquidité) sur la <b>chaîne de réception</b> : il avance les fonds et se fait rembourser côté départ. <b>Créer un intent réserve</b> la liquidité du hub ~10&nbsp;min (elle se libère seule si tu ne signes pas). Le <b>frais est figé à la création</b> et honoré à la livraison, dans les deux sens. Pas de bridge « atomique » : <b>N tranches = N transactions</b> à signer.`,
    h3Calc:"Ce que l'outil affiche",
    pCalc:`Tu saisis un montant (<b>reçu</b> ou <b>envoyé</b>) ; l'outil interroge l'API en <b>dryrun</b> (aucune réservation) et affiche :<ul><li>pour un <b>envoi unique</b>, une tuile <b>COÛT</b> — chiffre <b>exact</b>, un devis dryrun réel, au centime ;</li><li>pour un <b>découpage</b> en n tranches, une tuile <b>COÛT PROBABLE</b> (≈) + une <b>FOURCHETTE min – max</b> : le <b>min est exact</b> (n devis dryrun sommés = le frais réel facturé), le <b>max</b> reste une estimation (surface mesurée, cap 0,50 %) — le réel se situe entre les deux, proche du min à peu de tranches ;</li><li>un <b>tableau des découpages</b> qui se remplit <b>tranche par tranche</b> : chaque ligne affiche <b>« … »</b> puis son frais exact dès que son dryrun répond, tranches infaisables grisées.</li></ul>La <b>reco</b> = le plus petit découpage qui capte <b>≥90 %</b> de l'économie possible (au-delà, on gagne des centimes contre des signatures en plus). Le devis n'engage à rien (aucune réservation) ; <b>« Générer »</b> crée les intents et fige les <b>mêmes chiffres exacts</b>.`,
    h3Src:"D'où viennent les chiffres",
    pSrc:`Rien n'est codé en dur — le frais suit la liquidité, qui bouge :<ul><li><b>Devis (min, max, coût probable)</b> : le <b>min</b> vient de <b>n devis dryrun réels</b> (un par taille de tranche T/n), <b>mis en cache</b> par (sens, mode, montant) et invalidés si l'Available bouge de <b>&gt;1 EURC</b> — à liquidité inchangée, un re-devis ne relance aucun dryrun. Le <b>tableau de découpage</b> se remplit <b>tranche par tranche</b>, chaque ligne passant de « … » à son frais exact dès que son dryrun répond.</li><li><b>Courbe de frais</b> (page Doc uniquement) : balayage <b>dryrun paresseux</b>, lancé à l'ouverture de la Doc, limité aux montants <b>≤ plafond de liquidité</b> (+ un point exact au plafond) — sert au <b>graphe</b>, pas au devis.</li><li><b>Liquidité (Available)</b> : un intent volontairement trop gros → le refus renvoie « Available:&nbsp;X ».</li><li><b>Vérification on-chain</b> : solde EURC des hubs (Horizon côté Stellar, RPC côté Base), comparé à l'API — alerte si écart.</li></ul>Pas de rafraîchissement automatique : au chargement de la page, puis via le bouton ↻.`,
    h3Math:"Les formules & la précision",
    pMath:`Notations : <b>c = T/n</b> (montant d'une tranche), <b>dryrun(c)</b> = devis réel de l'API pour une tranche de taille c (exact, déjà arrondi au cent), <b>p₁ = dryrun(c)/c</b> (taux exact mesuré sur la 1ʳᵉ tranche), <b>Lᵢ = L0 − i·c</b> (Available restant avant la tranche i), <b>fee%(c, L)</b> = surface mesurée (interp bilinéaire, cap 0,50 %), escalade <b>R(c,i) = fee%(c, Lᵢ) / fee%(c, L0)</b>, <b>⌈·⌉¢</b> = arrondi au centime supérieur (plancher 0,01 €).<div class="formula">min = n · dryrun(c) — exact, aucune interpolation<br>max = Σᵢ ⌈ min( 0,5%·c , c · p₁ · R(c,i) ) ⌉¢<br>coût probable = Σᵢ ⌈ max( c·p₁ , 0,70 · c·p₁·R(c,i) ) ⌉¢</div>Les formules <b>max</b> et <b>coût probable</b> décrivent le sens <b>Stellar→Base</b> (créer un intent réserve l'Available → l'escalade R(c,i) monte). Sur <b>Base→Stellar</b>, aucune réservation → <b>R(c,i)=1</b> pour tout i → max et coût probable retombent sur le min : la <b>valeur affichée = n·dryrun(c)</b>, unique. <b>Précision mesurée</b> : le <b>min</b> est <b>exact</b> — c'est la somme de n devis dryrun réels, pas une borne. Le <b>max</b> colle au réel à <b>≤0,03 €</b> (16 séries réelles en série stricte). Surface <b>stable</b> (pas de dérive), re-mesurable par dryrun si Rozo change son algo.`,
    pSources:'Données : API <code>intentapiv4.rozo.ai</code> (sans clé), Horizon, RPC Base. Généré le <span id="ts2"></span>.',
    errFallback:"erreur",
    quoteWarnOverLiq:(recv,avail)=>`<div class="alert"><span class="ico">ⓘ</span><span><b>${eur(recv)} EURC</b> en un seul envoi &gt; liquidité dispo <b>${eur(avail)}</b> : un bridge 1-shot échouerait. <b>Fractionne</b> ci-dessous ou attends que le hub soit rechargé.</span></div>`,
    infeasibleRow:`✗ tranche &gt; liquidité dispo`,
    sendLabel:n=>n===1?"1 envoi":n+" × ",
    feeHighAdvice:p=>`Frais élevés (<b>${p} %</b>) Attendre une recharge (~10 min) ou réduire/fractionner le montant.`,
    updBatchLabelText:(n,sel)=>`⚙ Générer les transactions (${n}×${sel?" sélectionné":" reco"})`,
    copied:"✓ copié",
    genBatchNeedAmount:`<span class="mut">Renseigne d'abord un montant dans le devis.</span>`,
    genBatchNeedDestWallet:dk=>`<span class="warn">Connecte ton wallet ${dk==="B2S"?"Stellar":"Base"} (destination) avant de générer.</span>`,
    genBatchInfeasible:(n)=>`<span class="warn">Découpage ${n}× infaisable (une tranche &gt; liquidité). Clique une ligne verte du tableau.</span>`,
    genBatchCreating:n=>`<span class="mut">Création de ${n} intent(s) chez Rozo…</span>`,
    genBatchNetFail:msg=>`<span class="warn">Échec réseau: ${msg}</span>`,
    genBatchRozoFail:msg=>`<span class="warn">Rozo: ${msg||"échec création intent"}</span>`,
    genBatchBadMemo:`<span class="warn">Réponse S→B sans mémo de routage valide — génération annulée pour éviter un dépôt perdu. Réessaie.</span>`,
    b2sFloatWarn:(t,l)=>`<div class="alert"><span class="ico">⚠</span><span>Total livré <b>${eur(t)}</b> &gt; float <b>${eur(l)}</b> : les derniers fills peuvent être remboursés (frais restent bas, livraison plafonnée). <b>Attends la recharge</b> du hub ou réduis le montant.</span></div>`,
    b2sTableHead:["#","envoie (EURC)","→ dépôt Base","reçu Stellar","frais","expire","signer / Safe"],
    totalRowLabel:"Total",
    b2sSignBtn:"signer", b2sJsonBtn:"JSON",
    trackBtn:"🔎 Suivre le bridge",
    trackHide:"🔎 Masquer le suivi",
    splitEstimateNote:"Estimations — seule la <b>génération d'intents</b> donne les valeurs réelles et réserve la liquidité.",
    s2bFloatWarn:(t,l)=>`<div class="alert"><span class="ico">⚠</span><span>Total livré <b>${eur(t)}</b> &gt; float Base <b>${eur(l)}</b> : les derniers fills peuvent être remboursés. <b>Attends la recharge</b> du hub ou réduis le montant.</span></div>`,
    s2bTableHead:["#","envoie (EURC)","mémo (TEXT)","reçu Base","frais","expire","signer / copier"],
    s2bSignBtn:"signer", s2bCopyBtn:"copier",
    trackNeedGen:`<span class="mut">Génère d'abord les transactions.</span>`,
    trackUnreachable:"injoignable",
    trackQuerying:`<span class="mut">Interrogation…</span>`,
    chartAmountAxis:"montant (EURC reçus)", chartCap:"plafond ",
    dispTitle:"Dispersion de θ (Stellar→Base)",
    dispIntro:'θ = (réalisé − min) / (max − min) — position du coût réel dans la fourchette, mesurée sur les batchs S→B réellement générés. Le point (coût probable) devrait viser le <b>θ médian empirique</b>, pas un poids arbitraire.',
    dispEmpty:"Aucun batch S→B enregistré pour l'instant. Génère un découpage S→B (n≥2) et il apparaîtra ici.",
    dispOffline:"Log indisponible (page non servie par serve.py). Lance <code>cd web &amp;&amp; python3 serve.py</code> pour l'accumulation passive.",
    dispAxisN:"tranches (n)",
    dispStatsFmt:(N,med,p90)=>`<b>N = ${N}</b> batch(s) S→B · θ médian <b>${med}</b> · θ p90 <b>${p90}</b>`,
    fileWarnHtml:path=>`⚠ <b>Ouvre cette page via http</b>, pas en <code>file://</code> — sinon les wallets (Ambire/Rabby/Freighter) et la signature ne fonctionnent pas. Dans un terminal :<br><code>cd ${path} &amp;&amp; python3 -m http.server 8787</code><br>puis ouvre <code>http://localhost:8787/rozo-bridge.html</code>`,
    moduleNoEvm:"aucun wallet EVM injecté — active Ambire/Rabby (et sers la page en http)",
    moduleRejected:m=>`refusé: ${m}`,
    moduleDisconnected:"déconnecté",
    evmSignUnsupported:"ce wallet ne supporte pas l'envoi atomique (EIP-5792) → utilise l'import JSON dans Safe{Wallet} (atomicité préservée).",
    evmSignFail:m=>`échec: ${m}`,
    evmSignExpired:"intent expiré — regénère les transactions",
    evmWrongChain:"mauvaise chaîne — passe ton wallet sur Base (8453) puis re-signe",
    evmTxReverted:"transaction rejetée (revert) — non déposée, re-tente",
    evmUnconfirmed:"diffusée, confirmation on-chain non vérifiée",
    s2bExpired:"intent expiré — regénère les transactions",
    s2bVerifyExplorer:"soumission incertaine — vérifie l'explorer avant de re-signer (double dépôt évité)",
    stellarNoSdk:"SDK Stellar non chargé — sers la page en http (pas file://)",
    stellarKitUnavailable:m=>`kit indisponible: ${m} — utilise « copier »/manuel`,
    stellarWalletMismatch:(w,e)=>`wallet ${w} ≠ compte ${e}`,
  },
  en:{
    pageTitle:"Rozo Bridge EURC Base ⇄ Stellar — cost, liquidity, model",
    themeLight:"☀︎ light", themeDark:"☾ dark",
    subtext:"Upfront cost, liquidity, reverse-engineered fee model. Standalone page — live data via Rozo API + on-chain.",
    navTool:"Bridge", navDoc:"Documentation", navDisp:"Dispersion", refreshTitle:"Refresh",
    brandTitle:"Back to home", hubBaseTitle:"Base hub on BaseScan", hubStellarTitle:"Stellar hub on stellar.expert",
    maxbtnTitle:"Fill with the sending wallet's balance", dirbtnTitle:"Reverse direction",
    chartAriaLabel:"Fee % versus amount curve, per direction",
    h2Quote:"Amount & recommendation",
    optRecv:"I want to receive…", optSend:"I want to send…",
    amtSent:"EURC sent", amtRecv:"EURC received", btnCalc:"Calculate", amtPlaceholder:"amount",
    h2Liq:"Available liquidity",
    tsUpdating:"· updating…", tsUpdated:t=>"· updated "+t, tsOffline:"· live data unavailable (network blocked)",
    loadCurve:"Measuring the fee curve — one quote (dryrun) per amount step, on both directions. The Rozo API answers in ~1.5s per call.",
    loadLiq:"Reading hub liquidity — Rozo Available + on-chain balances (Base RPC, Stellar Horizon).",
    pLiqExplain:"The cap for a direction = the hub's EURC balance on the receiving chain. Verifiable on-chain to the cent.",
    thDir:"Direction", thHub:"Hub (receiving chain)", thLiqAvail:"Available liquidity (Rozo API)", thOnchain:"On-chain check",
    pDecoyWarn:'<span class="warn">⚠</span> <code>0x90DA…</code> (10.4M EURC) is a decoy: old filler, NOT the current hub. Float reloaded just-in-time → re-check before a large transfer.',
    lblWallets:"Wallets:", notConnected:"not connected",
    h2Curve:"Fee curve (fee % vs amount)",
    pCurveExplain:'<ul style="margin:0 0 0 -2px"><li>Points = live measurements (dryrun, identical for every appId).</li><li><b>Lazy sweep</b>: launched when the <b>Doc page opens</b>, only for amounts <b>≤ the liquidity cap</b> (+ one exact point at the cap) — feeds <b>this chart only</b>, not the quote.</li><li>Vertical lines = <b>live</b> liquidity cap (= hub balance); each curve <b>stops at its cap</b>.</li><li>Beyond the cap, a single send is rejected (split it).</li><li>Small amounts read toward ~0.50% (0.01€ floor + cent rounding).</li><li>Generating gives the binding figure.</li></ul>',
    pOfficialBridge:'Official bridge: <a href="https://intents.rozo.ai/bridge" target="_blank" rel="noopener">intents.rozo.ai/bridge ↗</a> · Documentation: <a href="https://docs.rozo.ai/" target="_blank" rel="noopener">docs.rozo.ai ↗</a> · GitHub: <a href="https://github.com/RozoAI" target="_blank" rel="noopener">github.com/RozoAI ↗</a> (contract <a href="https://github.com/RozoAI/rozo-intents-contracts/blob/main/evm/src/RozoIntents.sol" target="_blank" rel="noopener">RozoIntents.sol ↗</a>)',
    pRefContact:'Rozo contact: <a href="https://discord.gg/rozoai" target="_blank" rel="noopener">discord.gg/rozoai ↗</a> or <a href="mailto:hi@rozo.ai">hi@rozo.ai</a>.',
    docGrpFees:"The Rozo bridge & its fees", docGrpCalc:"How the tool computes this quote", docGrpExec:"Execution", docGrpRef:"References",
    h2Model:"Rozo's fee model",
    thBaseFull:"base % (full)",
    h2WhyRange:"Why a min/max range",
    pWhyRange:"A range only appears on the <b>Stellar→Base</b> direction, where creating an intent <b>reserves the hub's Available</b> → stacking chunks drains it → each next chunk is dearer. There the split reads as <b>three values</b>: <b>min</b> (N real <b>dryrun quotes</b> — one per chunk size T/n, summed: the exact fee if every chunk goes out at a full hub, no drain — best case, <b>exact</b>), <b>max</b> (chunks in series, each intent drains the hub → the next is dearer, 0.50% cap — worst case <b>estimated</b> from the measured surface, <b>within ≤0.03€ of reality</b>), and the <b>likely cost</b> shown between them (same surface, anchored on the exact min). In practice the N creations fire in <b>parallel</b> → the server shares the snapshot in <b>waves</b> → the realized cost is a <b>random variable</b> between min and max (close to min with few chunks). On <b>Base→Stellar</b>, creating an intent <b>freezes the fee but no longer reserves the Available</b> → no drain → <b>each chunk shows a single value</b> (min = max, no range, no likely cost). <b>Generating gives the binding figure</b>.",
    h2NoAtomic:"No atomic batch",
    pNoAtomic:"On Stellar the memo is <b>per transaction</b>; on Base a batch = 1 source tx of which Rozo only settles one payment. So <b>N chunks = N signatures</b> in both directions. <b>TEXT</b> memo mandatory (otherwise funds are lost). If a batch is malformed there is <b>no automatic refund</b> → Rozo support (<code>discord.gg/rozoai</code> or <code>hi@rozo.ai</code>).",
    h2SignTrack:"Sign & track the intents",
    pSignTrack:`<p>Each chunk = <b>one signature</b>. Depending on the direction, three ways:</p>
      <div class="grid2">
        <div class="card pad">
          <div class="eyebrow" style="color:var(--b2s)">Base → Stellar</div>
          <ul>
            <li><b>Sign</b> — connected EVM wallet → 1&nbsp;<code>EURC.transfer(deposit, amount)</code> transaction.</li>
            <li><b>JSON</b> — Safe{Wallet} › <b>Transaction Builder</b> › import (1&nbsp;tx, 1&nbsp;signature, Tenderly simulation).</li>
            <li><b>Manual</b> — send EURC to the deposit address shown.</li>
          </ul>
        </div>
        <div class="card pad">
          <div class="eyebrow" style="color:var(--s2b)">Stellar → Base</div>
          <ul>
            <li><b>Sign</b> — connected Stellar wallet → payment with a <b>TEXT</b> memo.</li>
            <li><b>Copy</b> — the SEP-7 link for Lobstr / Freighter.</li>
            <li><b>Manual</b> — payment to the hub, asset EURC, <b>TEXT memo</b> = the value shown.</li>
          </ul>
          <p class="warn" style="font-size:12px;margin:4px 0 0">⚠ <b>TEXT</b> memo mandatory — a missing or wrong-type memo means the deposit is misattributed and <b>funds are lost</b>.</p>
        </div>
      </div>
      <p><b>Unsigned = nothing moves.</b> Creating intents reserves the Available, but funds stay in your wallet; the reservation releases itself in ~10&nbsp;min.</p>
      <p><b>Lowering fees.</b> <b>Splitting</b> already lowers the cost (convexity: smaller chunks = lower %). High fees = low hub: it refills <b>by threshold</b> (eager on Stellar, lazy on Base), not on a clock — regenerate once liquidity is back. The rate is <b>frozen at creation</b>.</p>
      <p><b>Track.</b> The "Track the bridge" button under each batch polls the status of every chunk (deposit → delivery) every 5&nbsp;s. Intents expire <b>~10&nbsp;min</b> after creation.</p>`,
    h2Addresses:"Addresses",
    hubStellarLabel:"Stellar hub (receives Base→Stellar)", hubBaseLabel:"Base hub (receives Stellar→Base)",
    formulaText:'fee/chunk = ⌈ amount · fee%(amount, L) ⌉ to the cent · €0.01 floor<ul><li><b>L</b> = hub Available remaining (drops with each stacked chunk)</li><li><b>fee%(amount, L)</b> = measured surface (historical real-drain measurements) — depends on amount <b>and</b> remaining</li><li>rises continuously toward the <b>hard 0.50% cap</b>, faster the more the hub drains (above the cap, the API returns a fixed flat quote = artifact)</li><li>projects the <b>max</b> and <b>likely cost</b> of later chunks; the fee <b>actually charged</b> is always a real <b>exact dryrun</b> quote, never a formula-only value</li></ul>',
    pModelDisclaimer:'<span class="ico">ⓘ</span><span><b>Unofficial model:</b> inferred from observations (dryrun + real creations), not from Rozo docs. The fee% of a <b>deliverable</b> amount rises continuously toward the <b>hard 0.50% cap</b>, faster the more the hub <b>drains</b>. Above the available liquidity (amount not deliverable in one send), the API returns a <b>fixed flat quote</b> (protocol cap <a href="https://github.com/RozoAI/rozo-intents-contracts/blob/main/evm/src/RozoIntents.sol" target="_blank" rel="noopener"><code>MAX_PROTOCOL_FEE_BPS</code> ↗</a>) — a display artifact, not the real schedule.</span>',
    modelLi1:"Deterministic (same input → same fee), <b>independent of appId</b>.",
    modelLi2:"Dominant driver = <b>hub fill</b> (Available), <b>not</b> the amount/liquidity ratio.",
    modelLi3:"<b>On Stellar→Base, creating an intent reserves the Available</b> → stacking chunks <b>lowers remaining L</b> → the fee% climbs along a <b>measured surface</b> <code>fee%(amount, L)</code> (historical real-drain measurements — distinct from the Doc page's sweep, which only feeds the chart), <b>capped at 0.50%</b>. On <b>Base→Stellar</b>, creating an intent no longer reserves the Available → no escalation (single value per chunk).",
    modelLi4:"Routes: the base% level <b>and</b> the climb differ (B→S ~0.09 &lt; S→B ~0.12%) → <b>one surface per route</b>, measured separately to project max and likely cost. Validated: <b>max ≤0.03€</b> / 16 real series — never optimistic; the <b>min</b> is a real <b>dryrun quote</b> (exact, not a projection).",
    modelLi5:"<b>Fees frozen at creation</b> and honored at delivery — verified in both directions (2026-07-03).",
    h3Bridge:"The bridge in brief",
    pBridge:`Rozo moves <b>EURC between Base and Stellar</b> through <b>intents</b>. Each direction has a <b>hub</b> (a liquidity account) on the <b>receiving chain</b>: it fronts the funds and is reimbursed on the source side. <b>Creating an intent reserves</b> the hub's liquidity for ~10&nbsp;min (it releases itself if you don't sign). The <b>fee is frozen at creation</b> and honored at delivery, both ways. No “atomic” bridge: <b>N chunks = N transactions</b> to sign.`,
    h3Calc:"What the tool shows",
    pCalc:`You enter an amount (<b>received</b> or <b>sent</b>); the tool queries the API in <b>dryrun</b> (no reservation) and shows:<ul><li>for a <b>single send</b>, a <b>COST</b> tile — an <b>exact</b>, real dryrun quote, to the cent;</li><li>for a <b>split</b> into n chunks, a <b>LIKELY COST</b> tile (≈) + a <b>min – max RANGE</b>: the <b>min is exact</b> (n dryrun quotes summed = the real fee charged), the <b>max</b> stays an estimate (measured surface, 0.50% cap) — the real value lands between the two, close to the min with few chunks;</li><li>a <b>split table</b> that fills in <b>chunk by chunk</b>: each row shows <b>"…"</b> then its exact fee as soon as its dryrun answers, infeasible chunks greyed out.</li></ul>The <b>recommendation</b> = the smallest split that captures <b>≥90%</b> of the possible saving (beyond that, you gain cents against extra signatures). The quote is non-binding (no reservation); <b>“Generate”</b> creates the intents and locks in the <b>same exact figures</b>.`,
    h3Src:"Where the numbers come from",
    pSrc:`Nothing is hard-coded — the fee follows liquidity, which moves:<ul><li><b>Quote (min, max, likely cost)</b>: the <b>min</b> comes from <b>n real dryrun quotes</b> (one per chunk size T/n), <b>cached</b> by (direction, mode, amount) and invalidated if the Available moves by <b>&gt;1 EURC</b> — at unchanged liquidity, re-quoting fires zero new dryrun calls. The <b>split table</b> fills in <b>chunk by chunk</b>, each row moving from “…” to its exact fee as soon as its dryrun answers.</li><li><b>Fee curve</b> (Doc page only): a <b>lazy dryrun</b> sweep, launched when the Doc opens, limited to amounts <b>≤ the liquidity cap</b> (+ one exact point at the cap) — feeds the <b>chart</b>, not the quote.</li><li><b>Liquidity (Available)</b>: a deliberately oversized intent → the rejection returns “Available:&nbsp;X”.</li><li><b>On-chain check</b>: the hubs' EURC balance (Horizon on Stellar, RPC on Base), compared to the API — flagged on mismatch.</li></ul>No automatic refresh: on page load, then via the ↻ button.`,
    h3Math:"The formulas & the accuracy",
    pMath:`Notation: <b>c = T/n</b> (one chunk), <b>dryrun(c)</b> = the API's real quote for a chunk of size c (exact, already rounded to the cent), <b>p₁ = dryrun(c)/c</b> (exact rate measured on the 1st chunk), <b>Lᵢ = L0 − i·c</b> (Available remaining before chunk i), <b>fee%(c, L)</b> = measured surface (bilinear interp, 0.50% cap), escalation <b>R(c,i) = fee%(c, Lᵢ) / fee%(c, L0)</b>, <b>⌈·⌉¢</b> = round up to the cent (€0.01 floor).<div class="formula">min = n · dryrun(c) — exact, no interpolation<br>max = Σᵢ ⌈ min( 0.5%·c , c · p₁ · R(c,i) ) ⌉¢<br>likely cost = Σᵢ ⌈ max( c·p₁ , 0.70 · c·p₁·R(c,i) ) ⌉¢</div>The <b>max</b> and <b>likely cost</b> formulas describe the <b>Stellar→Base</b> direction (creating an intent reserves the Available → the escalation R(c,i) climbs). On <b>Base→Stellar</b>, no reservation → <b>R(c,i)=1</b> for every i → max and likely cost collapse onto the min: the <b>displayed value = n·dryrun(c)</b>, single. <b>Measured accuracy</b>: the <b>min</b> is <b>exact</b> — it's the sum of n real dryrun quotes, not a bound. The <b>max</b> tracks reality within <b>≤0.03€</b> (16 real strict-serial series). The surface is <b>stable</b> (no drift), re-measurable by dryrun if Rozo changes its algorithm.`,
    pSources:'Data: API <code>intentapiv4.rozo.ai</code> (no key), Horizon, Base RPC. Generated on <span id="ts2"></span>.',
    errFallback:"error",
    quoteWarnOverLiq:(recv,avail)=>`<div class="alert"><span class="ico">ⓘ</span><span><b>${eur(recv)} EURC</b> in a single send &gt; available liquidity <b>${eur(avail)}</b>: a one-shot bridge would fail. <b>Split it</b> below or wait for the hub to refill.</span></div>`,
    infeasibleRow:`✗ chunk &gt; available liquidity`,
    sendLabel:n=>n===1?"1 send":n+" × ",
    feeHighAdvice:p=>`High fees (<b>${p} %</b>) Wait for a refill (~10 min) or reduce/split the amount.`,
    updBatchLabelText:(n,sel)=>`⚙ Generate the transactions (${n}×${sel?" selected":" reco"})`,
    copied:"✓ copied",
    genBatchNeedAmount:`<span class="mut">Enter an amount in the quote first.</span>`,
    genBatchNeedDestWallet:dk=>`<span class="warn">Connect your ${dk==="B2S"?"Stellar":"Base"} (destination) wallet before generating.</span>`,
    genBatchInfeasible:(n)=>`<span class="warn">${n}× split infeasible (a chunk &gt; liquidity). Click a green row in the table.</span>`,
    genBatchCreating:n=>`<span class="mut">Creating ${n} intent(s) with Rozo…</span>`,
    genBatchNetFail:msg=>`<span class="warn">Network failure: ${msg}</span>`,
    genBatchRozoFail:msg=>`<span class="warn">Rozo: ${msg||"intent creation failed"}</span>`,
    genBatchBadMemo:`<span class="warn">S→B response missing a valid routing memo — generation cancelled to avoid a lost deposit. Retry.</span>`,
    b2sFloatWarn:(t,l)=>`<div class="alert"><span class="ico">⚠</span><span>Total delivered <b>${eur(t)}</b> &gt; float <b>${eur(l)}</b>: the last fills may get refunded (fees stay low, delivery capped). <b>Wait for the hub to refill</b> or reduce the amount.</span></div>`,
    b2sTableHead:["#","send (EURC)","→ Base deposit","received Stellar","fee","expires","sign / Safe"],
    totalRowLabel:"Total",
    b2sSignBtn:"sign", b2sJsonBtn:"JSON",
    trackBtn:"🔎 Track the bridge",
    trackHide:"🔎 Hide tracking",
    splitEstimateNote:"Estimates — only <b>generating intents</b> gives the real values and reserves liquidity.",
    s2bFloatWarn:(t,l)=>`<div class="alert"><span class="ico">⚠</span><span>Total delivered <b>${eur(t)}</b> &gt; Base float <b>${eur(l)}</b>: the last fills may get refunded. <b>Wait for the hub to refill</b> or reduce the amount.</span></div>`,
    s2bTableHead:["#","send (EURC)","memo (TEXT)","received Base","fee","expires","sign / copy"],
    s2bSignBtn:"sign", s2bCopyBtn:"copy",
    trackNeedGen:`<span class="mut">Generate the transactions first.</span>`,
    trackUnreachable:"unreachable",
    trackQuerying:`<span class="mut">Querying…</span>`,
    chartAmountAxis:"amount (EURC received)", chartCap:"cap ",
    dispTitle:"θ dispersion (Stellar→Base)",
    dispIntro:'θ = (realized − min) / (max − min) — where the real cost lands in the range, measured on the S→B batches actually generated. The dot (likely cost) should aim at the <b>empirical median θ</b>, not an arbitrary weight.',
    dispEmpty:"No S→B batch recorded yet. Generate an S→B split (n≥2) and it will show up here.",
    dispOffline:"Log unavailable (page not served by serve.py). Run <code>cd web &amp;&amp; python3 serve.py</code> for passive accumulation.",
    dispAxisN:"chunks (n)",
    dispStatsFmt:(N,med,p90)=>`<b>N = ${N}</b> S→B batch(es) · median θ <b>${med}</b> · p90 θ <b>${p90}</b>`,
    fileWarnHtml:path=>`⚠ <b>Open this page via http</b>, not <code>file://</code> — otherwise wallets (Ambire/Rabby/Freighter) and signing won't work. In a terminal:<br><code>cd ${path} &amp;&amp; python3 -m http.server 8787</code><br>then open <code>http://localhost:8787/rozo-bridge.html</code>`,
    moduleNoEvm:"no EVM wallet injected — enable Ambire/Rabby (and serve the page over http)",
    moduleRejected:m=>`rejected: ${m}`,
    moduleDisconnected:"disconnected",
    evmSignUnsupported:"this wallet doesn't support atomic sending (EIP-5792) → use the JSON import in Safe{Wallet} instead (atomicity preserved).",
    evmSignFail:m=>`failed: ${m}`,
    evmSignExpired:"intent expired — regenerate the transactions",
    evmWrongChain:"wrong chain — switch your wallet to Base (8453) then re-sign",
    evmTxReverted:"transaction reverted — not deposited, retry",
    evmUnconfirmed:"broadcast, on-chain confirmation not verified",
    s2bExpired:"intent expired — regenerate the transactions",
    s2bVerifyExplorer:"submission uncertain — check the explorer before re-signing (double deposit avoided)",
    stellarNoSdk:"Stellar SDK not loaded — serve the page over http (not file://)",
    stellarKitUnavailable:m=>`kit unavailable: ${m} — use "copy"/manual`,
    stellarWalletMismatch:(w,e)=>`wallet ${w} ≠ account ${e}`,
  }
};
window.I18N=I18N; window.LANG=LANG;   // exposé au module wallet (même pattern que window.ACCT) — pas de raccourci "T" : collision avec la var locale T (montant) de simul()/genBatch()
const eur=n=>Number(n).toLocaleString(LOCALE,{maximumFractionDigits:2});
const eur3=n=>Number(n).toLocaleString(LOCALE,{minimumFractionDigits:2,maximumFractionDigits:3});   // montants découpage/inputs : 3e décimale (T/n non rond, ex. 115,385)

async function postQuote(dirKey,amt,dryrun,type="exactOut"){
  const d=DIR[dirKey];
  const src={chainId:d.sc,tokenSymbol:"EURC",tokenAddress:d.sa};
  const dst={chainId:d.dc,tokenSymbol:"EURC",tokenAddress:d.da,receiverAddress:receiver(dirKey)};
  if(type==="exactIn") src.amount=String(amt); else dst.amount=String(amt);
  const body={appId:"rozoEURC",type,display:{title:"q",currency:"USD"},source:src,destination:dst};
  const url=API+(dryrun?"/payments?dryrun=true":"/");
  const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  return r.json();
}
// frais% d'un montant c, interpolé depuis la courbe mesurée (LIVE balayée à la liquidité courante ; repli sur MEAS hors-ligne)
function livePct(dk,c){
  const pts=(LIVE[dk]&&LIVE[dk].pts)||MEAS[dk]; if(!pts||pts.length<2) return null;
  if(c<=pts[0][0]) return pts[0][1];
  for(let i=1;i<pts.length;i++){ if(c<=pts[i][0]){ const a=pts[i-1],b=pts[i]; return a[1]+(b[1]-a[1])*(c-a[0])/(b[0]-a[0]); } }
  return pts[pts.length-1][1];
}
function hideSplitcard(){const sc=document.getElementById("splitcard");if(sc)sc.style.display="none";}
// #7 — solde EURC d'un wallet (chaîne d'envoi) pour le bouton « max »
async function evmEurcBal(addr){
  const data="0x70a08231"+"000000000000000000000000"+addr.slice(2).toLowerCase();
  for(const rpc of ["https://mainnet.base.org","https://base-rpc.publicnode.com"]){
    try{const r=await fetch(rpc,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"eth_call",params:[{to:EURC_B,data},"latest"]})});const j=await r.json();if(j.result)return parseInt(j.result,16)/1e6;}catch(e){}
  }
  return null;
}
async function stellarEurcBal(addr){
  try{const r=await fetch("https://horizon.stellar.org/accounts/"+addr);const j=await r.json();const b=(j.balances||[]).find(x=>x.asset_code==="EURC");return b?+b.balance:null;}catch(e){return null;}
}
// remplit le bloc ENVOI avec le solde du wallet d'envoi (Base si B2S, Stellar si S2B) ; connecte le wallet au besoin
async function fillMax(){
  const dk=document.getElementById("dir").value, fr=LANG==="fr", btn=document.getElementById("maxbtn"); if(!btn) return; const old=btn.textContent;
  let w=srcWallet(dk);
  if(!w){ btn.textContent="…"; try{ if(dk==="B2S"){window.evmConnect&&await window.evmConnect();} else {window.stellarConnect&&await window.stellarConnect();} }catch(e){} w=srcWallet(dk); }
  if(!w){ btn.textContent=fr?"wallet ?":"wallet?"; setTimeout(()=>btn.textContent=old,1600); return; }
  btn.textContent="…";
  const bal=dk==="B2S"?await evmEurcBal(w):await stellarEurcBal(w);
  const v=bal==null?null:Math.floor(bal*100)/100;
  if(!(v>0)){ btn.textContent=bal==null?"n/a":(fr?"solde 0":"bal 0"); setTimeout(()=>btn.textContent=old,1600); return; }
  btn.textContent=old;
  const sb=document.getElementById("amtSend"); sb.value=String(v); onAmt("exactIn",String(v));   // envoi = exactIn
}
// Surface fee%(montant, L) mesurée par sweep dryrun (Campaign E, 05/07 ; le dryrun lit l'Available LIVE, prouvé).
// Le frais dépend du montant ET du L RESTANT (= available0 − réservé), cap dur à 0,5 %. Interp bilinéaire (montant, L).
// Sert à l'ESCALADE (forme), ancrée au niveau LIVE : R(c,réservé)=surf(c,L0−réservé)/surf(c,L0). Cf. fee-study/surface.json.
const SURF={cap:0.5,amounts:[100,250,500,600,750,1000,1250,1500,2000,3000],
  B2S:[[1107.92,0.5,1.25,2.5,3,3.75,5,null,null,null,null],[1357.92,0.5,1.25,1.5,3,3.75,5,6.25,null,null,null],[1607.92,0.5,1.25,2.5,3,3.75,5,6.25,7.5,null,null],[1857.92,0.5,1.25,2.5,3,3.75,5,6.25,7.5,null,null],[2107.92,0.5,1.25,2.5,3,3.75,5,6.25,7.5,10,null],[2357.92,0.47,1.2,2.44,2.94,3.69,4.94,6.19,7.44,9.94,null],[2607.92,0.45,1.13,2.33,2.82,3.57,4.82,6.07,7.32,9.82,null],[2857.92,0.42,1.07,2.2,2.67,3.39,4.64,5.89,7.14,9.64,null],[3107.92,0.4,1.01,2.08,2.52,3.21,4.4,5.64,6.89,9.39,14.39],[3357.92,0.37,0.95,1.95,2.37,3.02,4.15,5.34,6.58,9.08,14.08],[3607.92,0.35,0.88,1.83,2.22,2.83,3.9,5.03,6.22,8.71,13.71],[3857.92,0.32,0.82,1.7,2.07,2.64,3.65,4.71,5.84,8.28,13.28],[4107.92,0.3,0.76,1.58,1.92,2.46,3.4,4.4,5.47,7.79,12.79],[4357.92,0.29,0.73,1.48,1.8,2.3,3.18,4.12,5.13,7.32,12.26],[4607.92,0.28,0.69,1.42,1.71,2.17,2.99,3.87,4.81,6.88,11.7],[4857.92,0.26,0.66,1.35,1.64,2.07,2.83,3.65,4.53,6.47,11.11],[5107.92,0.25,0.63,1.29,1.56,1.98,2.7,3.46,4.27,6.1,10.49],[5357.92,0.24,0.6,1.23,1.49,1.89,2.58,3.3,4.05,5.75,9.89],[5607.92,0.23,0.57,1.17,1.41,1.79,2.45,3.14,3.86,5.44,9.33],[5857.92,0.21,0.54,1.1,1.34,1.7,2.33,2.98,3.67,5.15,8.79],[6107.92,0.2,0.51,1.04,1.26,1.61,2.2,2.83,3.49,4.9,8.29],[6357.92,0.2,0.49,0.99,1.2,1.53,2.09,2.69,3.32,4.66,7.84],[6607.92,0.19,0.47,0.96,1.16,1.46,2,2.56,3.16,4.44,7.43],[6857.92,0.18,0.46,0.93,1.12,1.41,1.92,2.45,3.02,4.24,7.07],[7107.92,0.18,0.44,0.9,1.08,1.37,1.85,2.36,2.89,4.05,6.75],[7357.92,0.17,0.43,0.87,1.05,1.32,1.79,2.28,2.78,3.88,6.45],[7607.92,0.17,0.41,0.84,1.01,1.27,1.73,2.2,2.68,3.72,6.17],[7857.92,0.16,0.4,0.8,0.97,1.23,1.67,2.12,2.59,3.58,5.9],[8107.92,0.15,0.38,0.77,0.93,1.18,1.6,2.04,2.5,3.45,5.65],[8357.92,0.15,0.37,0.74,0.9,1.13,1.54,1.96,2.4,3.33,5.41],[8607.92,0.14,0.35,0.71,0.86,1.09,1.48,1.89,2.31,3.2,5.19],[8857.92,0.13,0.33,0.68,0.82,1.04,1.42,1.81,2.21,3.08,4.99],[9107.92,0.13,0.32,0.65,0.78,0.99,1.35,1.73,2.12,2.95,4.8],[9357.92,0.12,0.3,0.62,0.75,0.95,1.29,1.65,2.03,2.83,4.61],[9607.92,0.12,0.29,0.59,0.71,0.9,1.23,1.57,1.93,2.7,4.42],[9857.92,0.11,0.27,0.55,0.67,0.85,1.17,1.49,1.84,2.58,4.24],[10107.92,0.1,0.26,0.52,0.63,0.81,1.1,1.42,1.75,2.45,4.05],[10357.92,0.1,0.25,0.5,0.6,0.76,1.05,1.34,1.66,2.33,3.87],[10607.92,0.1,0.23,0.48,0.57,0.73,0.99,1.28,1.57,2.22,3.69]],
  S2B:[[991.37,0.5,1.25,2.5,3,3.75,null,null,null,null,null],[1241.37,0.5,1.25,2.5,3,3.75,5,null,null,null,null],[1491.37,0.5,1.25,2.5,3,3.75,5,6.25,null,null,null],[1741.37,0.5,1.25,2.5,3,3.75,5,6.25,7.5,null,null],[1991.37,0.5,1.25,2.5,3,3.75,5,6.25,7.5,null,null],[2241.37,0.49,1.23,2.48,2.98,3.73,4.98,6.23,7.48,9.98,null],[2491.37,0.46,1.16,2.38,2.88,3.63,4.88,6.13,7.38,9.88,null],[2741.37,0.44,1.1,2.26,2.74,3.48,4.73,5.98,7.23,9.73,null],[2991.37,0.41,1.04,2.13,2.59,3.29,4.51,5.76,7.01,9.51,null],[3241.37,0.39,0.98,2.01,2.44,3.11,4.26,5.48,6.73,9.23,14.23],[3491.37,0.36,0.91,1.88,2.29,2.92,4.01,5.17,6.39,8.89,13.89],[3741.37,0.34,0.85,1.76,2.14,2.73,3.76,4.86,6.02,8.49,13.49],[3991.37,0.31,0.79,1.63,1.99,2.54,3.51,4.55,5.64,8.02,13.02],[4241.37,0.3,0.74,1.52,1.85,2.37,3.28,4.25,5.28,7.54,12.51],[4491.37,0.28,0.71,1.44,1.75,2.23,3.07,3.98,4.95,7.08,11.96],[4741.37,0.27,0.68,1.38,1.67,2.12,2.9,3.75,4.66,6.66,11.38],[4991.37,0.26,0.65,1.32,1.6,2.02,2.76,3.54,4.39,6.27,10.78],[5241.37,0.25,0.62,1.26,1.52,1.93,2.63,3.37,4.15,5.91,10.17],[5491.37,0.23,0.58,1.19,1.45,1.84,2.51,3.21,3.95,5.58,9.59],[5741.37,0.22,0.55,1.13,1.37,1.74,2.38,3.06,3.76,5.28,9.04],[5991.37,0.21,0.52,1.07,1.3,1.65,2.26,2.9,3.57,5.01,8.52],[6241.37,0.2,0.5,1.01,1.23,1.56,2.14,2.75,3.39,4.77,8.04],[6491.37,0.19,0.48,0.97,1.18,1.49,2.04,2.62,3.23,4.54,7.61],[6741.37,0.19,0.47,0.94,1.14,1.44,1.95,2.5,3.08,4.33,7.23],[6991.37,0.18,0.45,0.91,1.1,1.39,1.88,2.4,2.95,4.14,6.89],[7241.37,0.18,0.44,0.88,1.06,1.34,1.82,2.31,2.83,3.96,6.59],[7491.37,0.17,0.42,0.85,1.03,1.3,1.76,2.23,2.73,3.79,6.3],[7741.37,0.16,0.4,0.82,0.99,1.25,1.69,2.16,2.63,3.64,6.02],[7991.37,0.16,0.39,0.79,0.95,1.2,1.63,2.08,2.54,3.51,5.76],[8241.37,0.15,0.37,0.76,0.91,1.16,1.57,2,2.45,3.38,5.52],[8491.37,0.14,0.36,0.72,0.88,1.11,1.51,1.92,2.35,3.26,5.29],[8741.37,0.14,0.34,0.69,0.84,1.06,1.44,1.84,2.26,3.13,5.08],[8991.37,0.13,0.33,0.66,0.8,1.01,1.38,1.77,2.16,3.01,4.89],[9241.37,0.13,0.31,0.63,0.76,0.97,1.32,1.69,2.07,2.88,4.7],[9491.37,0.12,0.29,0.6,0.73,0.92,1.26,1.61,1.98,2.76,4.51]]};
const _si=(xs,ys,x)=>{ const n=xs.length; if(x<=xs[0])return ys[0]; if(x>=xs[n-1])return ys[n-1];
  for(let i=1;i<n;i++){ if(x<=xs[i]) return ys[i-1]+(ys[i]-ys[i-1])*(x-xs[i-1])/(xs[i]-xs[i-1]); } return ys[n-1]; };
function surfPct(dk,c,L){ const rows=SURF[dk],AM=SURF.amounts,av=[],pv=[];   // fee%(montant,L) : frais brut stocké → %=frais/montant·100, interp en L puis en montant, cap 0,5
  for(let j=0;j<AM.length;j++){ const xs=[],ys=[];
    for(const row of rows){ const v=row[j+1]; if(v!=null){ xs.push(row[0]); ys.push(v/AM[j]*100); } }
    if(xs.length){ av.push(AM[j]); pv.push(Math.min(SURF.cap,_si(xs,ys,L))); } }
  return pv.length?Math.min(SURF.cap,_si(av,pv,c)):SURF.cap; }
// ============ FRAIS EXACTS PAR TRANCHE (remplace l'interpolation courbe pour le MIN) ============
// min(n)=Σ dryrun(T/n) : le vrai frais par intent que Rozo facture (arrondi au cent inclus) → zéro dérive d'interpolation.
// Cache par (mode, montant) ; invalidé si l'Available L a bougé de >SWEEP_EPS → un re-devis à L inchangé coûte 0 dryrun.
const dryCache={B2S:{},S2B:{}};
const eurCeil=v=>Math.max(0.01,Math.ceil(v*100-1e-6)/100);   // arrondi cent SUP en euros (plancher 0,01) — Rozo facture au cent
const ckey=(mode,T)=>mode+":"+T;
// peuple le cache : dryrun {T/n} pour n=1..maxN (≤6 concurrents), réutilise le devis en cours pour n=1.
// onFee() appelé à CHAQUE frais qui arrive → remplissage progressif du tableau (pas d'attente du lot complet).
async function ensureChunkFees(dk,T,mode,L,maxN,onFee){
  const k=ckey(mode,T); let e=dryCache[dk][k];
  if(e && L!=null && e.L!=null && Math.abs(e.L-L)>SWEEP_EPS){ delete dryCache[dk][k]; e=null; }   // L a bougé → cache périmé
  if(!e){ e={fees:{},L}; dryCache[dk][k]=e; } else if(L!=null) e.L=L;
  if(e.fees[1]==null && lastDevis && lastDevis.dk===dk && lastDevis.mode===mode && Math.abs(lastDevis.T-T)<0.5){ e.fees[1]=lastDevis.fee; onFee&&onFee(); }   // n=1 = le devis déjà fait (0 appel), rendu tout de suite
  const todo=[]; for(let n=1;n<=maxN;n++) if(e.fees[n]==null) todo.push(n);
  let i=0; await Promise.all(Array.from({length:Math.min(6,todo.length)},async()=>{
    while(i<todo.length){ const n=todo[i++]; const j=await postQuote(dk,T/n,true,mode).catch(()=>null);
      if(j&&j.source&&!j.error){ e.fees[n]=+j.source.fee; onFee&&onFee(); } } }));
  return e;
}
// RÉSERVATION par sens : créer un intent S→B réserve l'Available (drainage → escalade) ; B→S fige le frais mais NE réserve PLUS (vérifié 06/07/2026) → aucun drainage → valeur unique par tranche.
// REVERT (logique d'origine où B→S escaladait comme S→B) : remettre RESERVES.B2S = true (1 ligne) — ET rétablir le texte pMath/pWhyRange (B2S retrouve une fourchette). Ne PAS retirer la surface B2S de SURF (référence pour ce revert).
const RESERVES = {S2B:true, B2S:false};
function simul(){
  const dk=document.getElementById("dir").value, T=+document.getElementById("amt").value;   // repris du devis
  const L0=(LIVE[dk]&&LIVE[dk].L)||DIR[dk].L;
  const out=document.getElementById("splitout"); if(!out) return; if(!(T>0)){out.innerHTML="";hideSplitcard();return;} const _sc=document.getElementById("splitcard"); if(_sc)_sc.style.display="";
  const mode=document.getElementById("mode").value;   // exactOut : T=reçu fixe · exactIn : T=envoyé fixe
  const rows=[];
  // Modèle empirique (courbe + escalade mesurées sur 2 routes, Campaign C 05/07) : frais figés à la CRÉATION ; créer un intent RÉSERVE l'Available →
  // fee(tranche) = c·livePct(c)·R(c,réservé). Niveau = livePct (courbe live au devis, ancrage) ; forme = surface mesurée :
  //   R(c,réservé) = surfPct(c, L0−réservé) / surfPct(c, L0).  Le frais dépend du L RESTANT (prouvé) et du montant (c-aware), cap 0,5 %.
  // Espacé : on crée+signe une tranche à la fois, L se soigne (~10 min) entre → chaque tranche à L0 plein, R=1 (économie réelle).
  // Rapide (batch = ce que genBatch fait) : réservations empilées → L baisse → tranches suivantes plus chères (pire cas série).
  // Surface Campaign E (sweep dryrun, 2 routes, drain complet) : écart agrégé ≤0,04 €/série sur 16 séries mesurées. Cf. fee-study/METHODOLOGIE §6.
  const KRAP = dk==="S2B" ? 0.70 : 0.85;   // headline rapide = KRAP × worst-case série, ROUTE-SPÉCIFIQUE. S2B=0,70 (décision Romain : le réalisé colle au min, 0,85 était trop haut). B2S=0,85 conservé pour le revert RESERVES.B2S=true, mais SANS EFFET tant que B2S ne réserve pas (ratio=1 → feeWorst≤feeFlat → fee=feeFlat, pas de coût probable). Réalisé = variable ALÉATOIRE (0 à ~0,9 selon le tirage, prouvé 2 routes) : 0,70 couvre moins de tirages que 0,85 — assumé. Seul k=1 serait jamais-optimiste en toutes circonstances.
  // NB : une pondération par N (« petit N moins cher ») a été tentée 2× puis DÉFINITIVEMENT retirée — le sweep S2B (03/07) a montré que le « seuil » N vu sur B2S était un échantillon chanceux ; réalisé(N) est non-monotone/aléatoire (N=3→0,90 mais N=5→0). Aucun seuil déterministe. NE PAS re-tenter.
  const cache=(dryCache[dk]||{})[ckey(mode,T)]||{fees:{}};   // frais exacts déjà arrivés (remplissage progressif)
  for(let n=1;n<=splitMax;n++){
    const c=T/n;
    if(c>L0+1e-6){ rows.push({n,c,ok:false}); continue; }        // tranche > liquidité = infaisable (indépendant du frais)
    const ef=cache.fees[n];                                       // frais EXACT en cache, ou undefined (dryrun {T/n} pas encore arrivé)
    if(ef==null){ rows.push({n,c,ok:true,loading:true}); continue; }   // en attente → ligne « … » (pas d'approximation)
    const s0=surfPct(dk,c,L0);                           // niveau surface à L0 (dénominateur de l'escalade)
    let fee=0,feeWorst=0,feeFlat=0,recvT=0,sentT=0,ok=true,reserved=0; const chunks=[];
    for(let i=0;i<n;i++){
      const raw=ef;                                                  // base EXACTE (euros), identique pour chaque tranche à L0 plein
      const ratio=RESERVES[dk]?((s0>0)?surfPct(dk,c,L0-reserved)/s0:1):1;   // forme d'escalade (surface mesurée), sans dimension — forcée à 1 sur un sens qui NE réserve PAS (B→S) : pas de drainage → feeWorst≤feeFlat → valeur unique affichée
      const rawW=Math.min(c*SURF.cap/100, raw*ratio);                // pire cas série (euros) ; cap 0,5 % = c·0,005
      const ff=eurCeil(raw), fw=eurCeil(rawW), f=eurCeil(Math.max(raw,KRAP*rawW));   // min = frais exact (Rozo l'arrondit déjà) ; max/probable arrondis cent SUP
      const recv=mode==="exactIn"?c-f:c, sent=mode==="exactIn"?c:c+f;
      const cap=L0;                                                  // faisabilité PAR TRANCHE : chaque livraison doit tenir dans le hub
      if(recv>cap+1e-6){ok=false;break;}
      chunks.push({i:i+1,recv,sent,fee:f,L:cap});
      fee+=f; feeWorst+=fw; feeFlat+=ff; recvT+=recv; sentT+=sent; reserved+=recv;
    }
    rows.push({n,c,ok,fee,feeWorst,feeFlat,recv:recvT,sent:sentT,pct:ok?fee/sentT*100:null,chunks});   // % = frais/ENVOYÉ (AUDIT R2)
  }
  if(lastDevis&&lastDevis.dk===dk&&lastDevis.mode===mode&&Math.abs(lastDevis.T-T)<0.5){const r1=rows.find(r=>r.n===1);if(r1&&r1.ok&&!r1.loading){r1.fee=r1.feeFlat=r1.feeWorst=lastDevis.fee;r1.recv=lastDevis.recv;r1.sent=lastDevis.send;r1.pct=r1.fee/lastDevis.send*100;if(r1.chunks[0]){r1.chunks[0].recv=lastDevis.recv;r1.chunks[0].sent=lastDevis.send;r1.chunks[0].fee=lastDevis.fee;}}}   // caler AUSSI feeFlat/feeWorst sinon renderReco (min=feeFlat) diverge du tableau à n=1 (AUDIT R1)
  const feas=rows.filter(r=>r.ok&&!r.loading);   // les lignes en chargement n'ont pas de frais → hors calcul reco
  let best=null;
  if(feas.length){ const c1=feas[0].fee, minFee=Math.min(...feas.map(r=>r.fee)), maxSav=c1-minFee; best=feas[0];   // référence = min réel (fee(n) non-monotone : plancher+pénalité, cf. AUDIT R10) ; la boucle ci-dessous réassigne toujours best
    for(const r of feas){ if(maxSav<=0||(c1-r.fee)>=0.9*maxSav){best=r;break;} } }   // knee : ≥90 % de l'économie
  splitRows=rows; splitMeta={dk,mode}; bestN=best?best.n:1;
  if(selN!=null){const sr=rows.find(r=>r.n===selN); if(!sr||!sr.ok) selN=null;}   // revalide la sélection si elle est devenue infaisable (AUDIT R3)
  const D=I18N[LANG], fr=LANG==="fr";
  const active=(selN&&rows.find(r=>r.n===selN&&r.ok))||best;   // ligne cliquée = active (renvoyée au bloc 2), sinon reco
  const feePct=(f,r)=>r&&r.sent>0?f/r.sent*100:0;   // % = frais/ENVOYÉ par ligne (AUDIT R2)
  const rng=r=>r.n>1&&r.feeWorst!=null&&r.feeFlat!=null&&r.feeWorst>r.feeFlat+0.005;   // fourchette visible seulement si min≠max
  const feeCell=r=>rng(r)?`<b>${eur(r.feeFlat)}</b> – ${eur(r.feeWorst)}`:`<b>${eur(r.fee)}</b>`;
  const pctCell=r=>rng(r)?`${feePct(r.feeFlat,r).toFixed(2)} – ${feePct(r.feeWorst,r).toFixed(2)} %`:`${feePct(r.fee,r).toFixed(3)} %`;
  const exIn=mode==="exactIn";   // B1 : la valeur FIXE par tranche est l'envoi (exactIn) ou le reçu (exactOut) ; le total va sur l'autre côté
  const HEAD=fr?["Découpage",exIn?"envoi/tranche":"reçu/tranche",exIn?"reçu total":"envoi total","frais (min–max)","frais %"]:["Split",exIn?"send/chunk":"received/chunk",exIn?"total received":"total sent","fee (min–max)","fee %"];
  let h=`<table><tr><th>${HEAD[0]}</th><th>${HEAD[1]}</th><th>${HEAD[2]}</th><th>${HEAD[3]}</th><th>${HEAD[4]}</th></tr>`;
  for(const r of rows){
    if(r.loading){h+=`<tr class="loadrow"><td>${D.sendLabel(r.n)}</td><td>${eur3(r.c)}</td><td colspan="3" class="mut"><span class="minispin"></span></td></tr>`;continue;}   // frais {T/n} pas encore arrivé
    if(!r.ok){h+=`<tr class="mut"><td>${r.n}×</td><td>${eur3(r.c)}</td><td colspan="3">${D.infeasibleRow}</td></tr>`;continue;}
    // recommandé = vert (persiste toujours) · sélectionné au clic (si ≠ reco) = teal — via CLASSE (le survol garde la teinte, cf. CSS)
    let cls='';
    if(best&&r.n===best.n) cls='recorow';
    if(selN&&r.n===selN&&(!best||r.n!==best.n)) cls='selrow';
    h+=`<tr onclick="selRow(${r.n})" onkeydown="rowKey(event,${r.n})" role="button" tabindex="0" class="${cls}"><td>${D.sendLabel(r.n)}</td><td>${eur3(r.c)}</td><td>${eur3(exIn?r.recv:r.sent)}</td><td>${feeCell(r)}</td><td>${pctCell(r)}</td></tr>`;
  }
  h+=`</table>`;
  h+=`<div class="morebtn"><button onclick="moreSplits()">${fr?"▾ plus de découpages (+5)":"▾ more splits (+5)"}</button></div>`;
  out.innerHTML='<div class="tblwrap">'+h+'</div>'; updBatchLabel();   // RC-6 : le tableau de découpage débordait horizontalement sur mobile (seul tableau généré non enveloppé)
  if(rows.some(r=>r.loading)){ const _d=feas.length, _t=rows.filter(r=>r.ok).length; const el=document.getElementById("reco"); if(el) el.innerHTML=`<div class="mut" style="padding:6px 0;display:flex;align-items:center;gap:8px"><span class="minispin"></span> ${fr?`chiffrage des tranches (un devis dryrun par découpage)… <b>${_d} / ${_t}</b>`:`pricing chunks (one dryrun quote per split)… <b>${_d} / ${_t}</b>`}</div>`; }   // reco en attente tant que des tranches chargent (explication + progression, évite le jitter)
  else renderReco(active,dk,T,!!(selN&&active&&active.n===selN));
}
// ---- bloc recommandation (fusion montant+reco) : plan + tuiles + fourchette ----
function renderReco(best,dk,T,sel){
  const el=document.getElementById("reco"); if(!el) return;
  const fr=LANG==="fr", L0=(LIVE[dk]&&LIVE[dk].L)||DIR[dk].L;
  if(!best){ el.innerHTML=""; return; }   // aucun découpage faisable → on ne bloque pas : seule l'alerte liquidité non bloquante (#out) subsiste, + le tableau (tranches à choisir)
  const pct=f=>best.sent>0?f/best.sent*100:0;   // % = frais/ENVOYÉ (AUDIT R2)
  const min=best.feeFlat!=null?best.feeFlat:best.fee, max=best.feeWorst!=null?best.feeWorst:best.fee;
  const head=best.fee!=null?best.fee:min;   // estimation prudente (headline ≈ KRAP×pire cas : 0,70 sur S2B — seul sens à afficher un coût probable), AUDIT R8
  const uncertain=best.n>1&&max>min+0.005;  // frais INCERTAIN (rapide, fourchette réelle) → barre + « ≈/probable » ; sinon frais CERTAIN → on éteint tout ça (#2/#8)
  const recvChain=dk==="B2S"?"Stellar":"Base";
  const plan=best.n===1?(fr?"1 envoi":"1 send"):`${best.n} ${fr?"envois de":"sends of"} ${eur(best.c)} €`;
  // #3 — pourquoi CETTE ligne : plus petit découpage captant ≥90 % de l'économie (le « knee »)
  const why=best.n===1
    ?(fr?"un seul envoi suffit à ce montant":"a single send is enough here")
    :(fr?"plus petit découpage captant ≥90 % de l'économie · moins de signatures":"smallest split capturing ≥90% of the saving · fewer signatures");
  const tipProb=fr?"Estimation prudente = 0,70 × le pire cas (réservations empilées en série). En parallèle le réel tombe en général plus bas ; « Générer » donne le chiffre exact.":"Cautious estimate = 0.70 × the worst case (reservations stacked serially). In parallel the real value usually lands lower; generating gives the exact figure.";
  const tipCertain=fr?"Frais figé, connu au centime : un seul envoi, sans empilement de réservations.":"Fixed fee, known to the cent: a single send, with no stacked reservations.";
  const help=t=>`<span class="tip-wrap" tabindex="0"><span class="tip-icon">ⓘ</span><span class="tip-box">${t}</span></span>`;   // tooltip au survol + focus clavier (portal thémé/localisé), remplace title=
  const costTile=uncertain
    ?`<div><span class="k">${fr?"COÛT PROBABLE":"LIKELY COST"} ${help(tipProb)}</span><span class="big num">≈ ${eur(head)} €</span><span class="sub2 num">${pct(head).toFixed(2)} %</span></div>`
    :`<div><span class="k">${fr?"COÛT":"COST"} ${help(tipCertain)}</span><span class="big num">${eur(head)} €</span><span class="sub2 num">${pct(head).toFixed(2)} % · ${fr?"figé":"fixed"}</span></div>`;
  const rangeTile=uncertain
    ?`<div><span class="k">${fr?"FOURCHETTE FRAIS":"FEE RANGE"}</span><span class="big num">${eur(min)} – ${eur(max)} €</span><span class="sub2 num">${pct(min).toFixed(2)} – ${pct(max).toFixed(2)} % · ${fr?"parallèle → série":"parallel → serial"}</span></div>`
    :"";
  const recvTile=`<div><span class="k">${fr?"TU REÇOIS":"YOU RECEIVE"} (${recvChain})</span><span class="big num">${uncertain?"≈ ":""}${eur(best.recv)} €</span><span class="sub2">${fr?"livraison quasi immédiate":"near-instant delivery"}</span></div>`;
  // tooltips au survol (portal) — texte de légende retiré au profit d'explications au survol de chaque repère
  const tipMin=fr?"Coût si toutes les tranches étaient cotées en parallèle, contre la même liquidité initiale — le cas le plus bas.":"Cost if all chunks were quoted in parallel, against the same initial liquidity — the lowest case.";
  const tipMax=fr?"Coût si les tranches étaient cotées en série, réservations empilées — le cas le plus haut.":"Cost if chunks were quoted serially, reservations stacked — the highest case.";
  const tipZone=fr?"Fourchette la plus probable du coût réel, entre le tout-parallèle (min) et le tout-série (max). « Générer » réserve la liquidité et donne l'exact.":"Most likely range of the real cost, between all-parallel (min) and all-serial (max). Generating reserves liquidity and gives the exact value.";
  let bar="";
  if(uncertain){
    const pmax=Math.min(100,Math.max(0,(head-min)/(max-min)*100));   // position du « coût probable » (headline) sur la barre
    const tb=t=>`<span class="tip-box">${t}</span>`;   // tooltip au survol de l'élément lui-même (portal), sans icône ⓘ
    bar=`<div class="range" style="--lo:0%;--hi:100%;--pmax:${pmax.toFixed(1)}%"><div class="track"></div><div class="band"></div><div class="prob tip-wrap" tabindex="0">${tb(tipZone)}</div><div class="cap lo"></div><div class="cap hi"></div><div class="dot tip-wrap" tabindex="0">${tb(tipProb)}</div><span class="lbl mid tip-wrap" tabindex="0">≈ <b class="num">${eur(head)} €</b>${tb(tipProb)}</span><span class="lbl lo tip-wrap" tabindex="0">min <b class="num">${eur(min)} €</b> · ${pct(min).toFixed(2)} %${tb(tipMin)}</span><span class="lbl hi tip-wrap" tabindex="0">max <b class="num">${eur(max)} €</b> · ${pct(max).toFixed(2)} %${tb(tipMax)}</span></div>`;   // A1 : point marqué sur la barre · tooltips bornes(min/max)/zone/point (texte zoneval retiré) ; tabindex=0 = focus clavier (portal show/hide sur focusin/focusout, cf. IIFE)
  }
  const isReco=best.n===bestN;   // #3 : active = la bande recommandée (le knee) ? → phrase "why" + eyebrow "recommandé" SEULEMENT dans ce cas (sur une bande choisie à la main, la phrase "plus petit découpage captant ≥90 %" mentirait)
  // conseil recharge : frais de la bande sélectionnée > 0,25 % = hub bas → attendre la recharge fait baisser. Garde recv≥100 : sous ce montant le % élevé vient du plancher 0,01 €, pas du drainage (attendre n'aiderait pas). // ponytail: seuil 0,25 % choisi par l'utilisateur
  const advice=(T<=L0 && +pct(head).toFixed(2)>=0.25 && best.recv>=100)?`<div class="alert"><span class="ico">⚠</span><span>${I18N[LANG].feeHighAdvice(pct(head).toFixed(2))}</span></div>`:"";   // seuil sur la valeur AFFICHÉE (arrondie) ≥0,25 % ; supprimé en over-liq (T>L0) où l'alerte liquidité s'affiche déjà (pas de double alerte)
  el.innerHTML=`<div class="eyebrow">${isReco?(fr?"Plan recommandé":"Recommended plan"):(fr?"Plan choisi":"Chosen plan")}</div><div class="plan">${plan}</div>${isReco?`<div class="sub">${why}</div>`:""}<div class="grid${uncertain?"":" two"}">${costTile}${rangeTile}${recvTile}</div>${bar}${advice}`;
}
// clic sur une ligne = ce découpage devient actif → re-rend le bloc 2 (reco) + surligne la ligne
function selRow(n){ selN=n; simul(); }
// a11y : <tr onclick> activable au clavier (Enter/Espace = même action que le clic ; Espace ne scrolle pas la page)
function rowKey(e,n){ if(e.key==="Enter"||e.key===" "||e.key==="Spacebar"){ e.preventDefault(); selRow(n); } }
async function moreSplits(){ splitMax+=5;
  const dk=document.getElementById("dir").value, mode=document.getElementById("mode").value, T=+document.getElementById("amt").value;
  simul();   // affiche les nouvelles lignes en chargement tout de suite
  if(T>0) await ensureChunkFees(dk,T,mode,LIVE[dk]&&LIVE[dk].L,splitMax,()=>simul());
  simul(); }
// sélection du sens : clic sur une cellule de liquidité ou sur le cartouche
// a11y : <div class="cell" onclick> activable au clavier (Enter/Espace = même action que le clic ; Espace ne scrolle pas la page)
function cellKey(e,dir){ if(e.key==="Enter"||e.key===" "||e.key==="Spacebar"){ e.preventDefault(); setDir(dir); } }
function setDir(v){ const d=document.getElementById("dir"); if(!d) return; if(d.value===v){updateDirUI();return;} d.value=v; updateDirUI(); quote(); }
function toggleDir(){ const d=document.getElementById("dir"); if(d) setDir(d.value==="B2S"?"S2B":"B2S"); }
function updateDirUI(){
  const d=document.getElementById("dir"); if(!d) return; const v=d.value, fr=LANG==="fr";
  document.querySelectorAll(".liq .cell").forEach(c=>{const on=c.getAttribute("data-dir")===v;c.classList.toggle("active",on);const p=c.querySelector(".pick");if(p)p.textContent=on?(fr?"● sélectionné":"● selected"):(fr?"choisir":"select");});
  const S=`<span class="chip s"><svg class="logo"><use href="#stellar-mark"/></svg>Stellar</span>`,B=`<span class="chip b"><span class="sq"></span>Base</span>`;
  const src=v==="B2S"?B:S, dst=v==="B2S"?S:B;   // gauche = source (envoyé) · droite = destination (reçu)
  const btn=document.getElementById("dirbtn");
  if(btn) btn.innerHTML=src+`<span class="arw">→</span>`+dst;   // cartouches côte à côte + flèche à sens unique (flip au clic)
}
// onglets Bridge / Documentation
function showPage(p,btn){ document.querySelectorAll(".page").forEach(x=>x.classList.toggle("on",x.id===p)); document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("on",b===btn)); if(p==="doc"){ drawChart(); ensureChartCurve().then(drawChart); } if(p==="disp"){ renderDisp(); } window.scrollTo({top:0,behavior:"instant"}); }
// clic sur le titre = retour accueil (onglet Bridge) + rechargement des données live
function goHome(){ showPage("tool",document.querySelector(".nav button")); refresh(); }
// (showTx() + drawer supprimés — feature morte : aucun #drawer dans le HTML, aucun appelant ; les lignes du tableau appellent selRow(). AUDIT R9)

function updLbl(){document.getElementById("amtlbl").textContent=document.getElementById("mode").value==="exactIn"?I18N[LANG].amtSent:I18N[LANG].amtRecv;}
// saisie dans un des deux blocs : exactIn (bloc envoyé/gauche) ou exactOut (bloc reçu/droite).
// #amt/#mode restent la source canonique ; quote() calcule et remplit le bloc OPPOSÉ.
let _amtTimer=null;
function onAmt(mode,val){
  document.getElementById("mode").value=mode; document.getElementById("amt").value=val;
  ++quoteSeq;   // invalide TOUTE requête en vol dès la frappe (sinon une réponse périmée peut fillOpp() le champ en cours de saisie, AUDIT R5)
  clearTimeout(_amtTimer); _amtTimer=setTimeout(quote,450);   // anti-rebond : attend la fin de saisie (sinon "2000" calcule à "200")
}
// remplit le bloc NON saisi (jamais celui que l'utilisateur tape) — appelé dans les 4 branches de quote()
function fillOpp(mode,send,recv){
  const s=document.getElementById("amtSend"), r=document.getElementById("amtRecv");
  if(mode==="exactIn"){ if(r) r.value=(recv==null?"":(+recv).toFixed(3)); }   // 3e décimale : le bloc opposé n'est jamais rond (frais)
  else{ if(s) s.value=(send==null?"":(+send).toFixed(3)); }
}
let quoteSeq=0;   // garde anti-réponse-périmée : une saisie plus récente invalide une réponse async plus lente
async function quote(){
  const seq=++quoteSeq;
  selN=null;   // changer sens/montant réinitialise le découpage sélectionné
  const dk=document.getElementById("dir").value, x=+document.getElementById("amt").value;
  const mode=document.getElementById("mode").value;
  const o=document.getElementById("out");
  const D=I18N[LANG];
  if(!(x>0)){ o.innerHTML=""; fillOpp(mode,null,null); const rc=document.getElementById("reco"); if(rc)rc.innerHTML=""; const sp=document.getElementById("splitout"); if(sp)sp.innerHTML=""; hideSplitcard(); return; }   // rien sous les montants quand vide (AUDIT vague1 #4)
  try{
    const j=await postQuote(dk,x,true,mode);
    if(seq!==quoteSeq) return;   // une saisie plus récente a pris le relais → on jette ce résultat périmé
    if(j.error){o.innerHTML="<span class='warn'>"+escapeHtml(j.error.message||D.errFallback)+"</span>";fillOpp(mode,null,null);const rc=document.getElementById("reco");if(rc)rc.innerHTML="";const sp=document.getElementById("splitout");if(sp)sp.innerHTML="";hideSplitcard();return;}   // vider aussi aperçu+tableau (sinon ils gardent l'ancien devis, AUDIT R4)
    const fee=+j.source.fee, send=+j.source.amount, recv=+j.destination.amount;
    lastDevis={dk,T:x,mode,fee,recv,send};   // mémorise pour le tableau de découpage
    fillOpp(mode,send,recv);                 // remplit le bloc opposé (envoyé↔reçu)
    const Ldest=LIVE[dk]&&LIVE[dk].L;   // solde live du hub de destination = liquidité bindable
    o.innerHTML=(Ldest&&recv>Ldest) ? D.quoteWarnOverLiq(recv,Ldest) : "";   // phrase "Tu envoies…" retirée ; on ne garde que l'avertissement liquidité
    simul();   // squelette immédiat : lignes « … » en chargement, n=1 se remplit dès réception (progressif, pas d'écran de chargement sur le tableau)
    await ensureChunkFees(dk,x,mode,Ldest,splitMax,()=>{ if(seq===quoteSeq) simul(); });   // dryrun {T/n} → min EXACT, remplissage progressif à chaque frais (sweep générique retiré)
    if(seq!==quoteSeq) return;   // une saisie plus récente a pris le relais pendant les dryrun → jeter (le devis courant rendra)
  }catch(e){
    if(seq!==quoteSeq) return;
    const pct=livePct(dk,x)||0, fee=x*pct/100, send=mode==="exactIn"?x:x+fee, recv=mode==="exactIn"?x-fee:x;   // repli hors-ligne : courbe mesurée (MEAS)
    fillOpp(mode,send,recv);
    o.innerHTML="";
  }
  simul();
}

async function liq(dirKey){ // plafond via endpoint create (huge amount)
  const j=await postQuote(dirKey,99999999,false);
  const m=String(j?.error?.message||"").match(/Available:\s*([0-9.]+)/);
  return m?+m[1]:null;
}
async function stellarBal(){
  const r=await fetch("https://horizon.stellar.org/accounts/"+STELLAR_HUB); const j=await r.json();
  const b=(j.balances||[]).find(x=>x.asset_code==="EURC"); return b?+b.balance:null;
}
async function baseBal(){
  const data="0x70a08231"+"000000000000000000000000"+BASE_HUB.slice(2).toLowerCase();
  // mainnet.base.org & publicnode sont CORS-OK en navigateur ; llamarpc bloque le CORS (retiré) → plus d'erreur console
  for(const rpc of ["https://mainnet.base.org","https://base-rpc.publicnode.com"]){
    try{const r=await fetch(rpc,{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({jsonrpc:"2.0",id:1,method:"eth_call",params:[{to:EURC_B,data},"latest"]})});
      const j=await r.json(); if(j.result) return parseInt(j.result,16)/1e6;
    }catch(e){}
  }
  return null;
}
// Liquidité = solde EURC du hub sur la chaîne de réception (= Available API, prouvé au centime)
let LIVE={B2S:{L:null,pts:null,sweptAt:null},S2B:{L:null,pts:null,sweptAt:null}};   // sweptAt = Available lors du dernier balayage de la courbe (pour le cache)
let lastDevis=null;   // dernier devis live (pour caler la ligne "1 envoi" du tableau)
let splitRows=[], splitMeta={}, bestN=1, selN=null, splitMax=10;   // reco + découpage sélectionné + nb de lignes affichées (flèche +5)
let hoverAmt=null, chartGeo=null;   // survol du graphe : montant pointé + géométrie px↔valeur

// décimal string -> unités entières (6 déc EURC), sans erreur flottante
function toUnits(s,dec=6){let[i,f=""]=String(s).trim().split(".");f=(f+"0".repeat(dec)).slice(0,dec);return(BigInt(i||"0")*10n**BigInt(dec)+BigInt(f||"0")).toString();}
console.assert(toUnits("100.09")==="100090000"&&toUnits("5")==="5000000"&&toUnits("0.5")==="500000","toUnits KO");

// (updAcct supprimé — plus de sélecteur de compte codé en dur ; l'adressage vient des wallets connectés)
// libellé du bouton = découpage actif (sélectionné au clic, sinon reco)
function updBatchLabel(){ const b=document.getElementById("genbtn"); if(!b) return; const n=selN||bestN||1;
  b.textContent=I18N[LANG].updBatchLabelText(n,!!selN); }
// copie presse-papier avec retour visuel
function cp(t,btn){ navigator.clipboard.writeText(t).then(()=>{const o=btn.textContent;btn.textContent=I18N[LANG].copied;setTimeout(()=>btn.textContent=o,1200);}).catch(()=>{}); }

// ============ LOTS : store keyé window._batches, empilement, repli (<details>), persistance localStorage ============
window._batches = window._batches || {};   // { bid: batch } · bid = id du 1er intent du lot
const BSTORE="rozoBatches";
function saveBatches(){ try{ localStorage.setItem(BSTORE, JSON.stringify(window._batches)); }catch(e){} }
window.saveBatches=saveBatches;   // wallet.js écrit rows[i].srcTx puis appelle saveBatches → l'état signé vit dans le STORE (pas le DOM) : survit au re-rendu (langue) et au restore, empêche le double-envoi
// construit l'objet lot depuis les réponses API (non-dryrun). srcTx = tx source (dépôt) une fois signé → verrouille la tranche.
function buildBatch(dk,js){
  const rows=js.map(j=>({ id:j.id, dep:j.source.receiverAddress, memo:j.source.receiverMemo||null,
    send:+j.source.amount, rec:+j.destination.amount,
    units:dk==="B2S"?toUnits(j.source.amount):null, to:dk==="B2S"?EURC_B:null,
    exp:j.expiresAt||null, srcTx:null }));
  const expMs=rows.map(r=>r.exp?new Date(r.exp).getTime():0).filter(Boolean);
  return { id:js[0].id, dk, createdAt:Date.now(),
    expiresAt: expMs.length?Math.max(...expMs):Date.now()+600000,
    evmAddr: window.evmAddr||"", stellarAddr: window.stellarAddr||"",   // evm = côté Base · stellar = côté Stellar (rôles src/dst dérivés du sens ; stellarAddr = expéditeur attendu en S2B)
    restored:false, rows };
}

// vert si API≈on-chain, orange si écart >1 EURC (api==null → neutre). Partagé refresh() + refreshLiqDir().
function markLiq(vid,api,chain){const e=document.getElementById(vid);if(!e)return;e.classList.remove("match","diff");if(api==null)return;e.classList.add(chain!=null&&Math.abs(api-chain)>1?"diff":"match");}
// Après une création réelle d'intents : re-lit l'Available du SENS visé (la réservation l'a fait baisser) ET le solde on-chain, met à jour les 2 cartouches + LIVE.L, ré-évalue le décalage API/on-chain, et invalide le cache de devis de ce sens (frais périmés).
async function refreshLiqDir(dk){
  const vid=dk==="B2S"?"liqB":"liqS", chid=dk==="B2S"?"chB":"chS", el=document.getElementById(vid), ce=document.getElementById(chid);
  if(el) el.textContent="…";                       // feedback immédiat : lecture en cours
  const [nl,ch]=await Promise.all([liq(dk).catch(()=>null),(dk==="B2S"?stellarBal():baseBal()).catch(()=>null)]);   // Available (API) + solde hub on-chain du sens
  if(nl!=null){ LIVE[dk].L=nl; if(el) el.textContent=eur(nl)+" EURC"; delete dryCache[dk]; }
  else if(el) el.textContent=(LIVE[dk].L!=null?eur(LIVE[dk].L)+" EURC":"n/a");   // échec réseau → remet la dernière valeur connue
  if(ch!=null && ce) ce.textContent=eur(ch)+" EURC";   // solde on-chain (souvent inchangé : règlement en attente)
  markLiq(vid, nl!=null?nl:LIVE[dk].L, ch);   // Available baissé mais on-chain pas encore réglé → écart détecté → orange (respecte la vérif API/on-chain)
}
// Crée les N intents (reco) puis empile un lot (carte repliable) dans #batchout.
async function genBatch(){
  if(window._genInFlight) return;   // RC-2 : garde ré-entrance (double-clic « Générer » → double réservation d'intents)
  const dk=document.getElementById("dir").value;
  const mode=document.getElementById("mode").value, T=+document.getElementById("amt").value;
  const n=selN||bestN||1, c=T/n;
  const D=I18N[LANG];
  const st=document.getElementById("genstatus");   // statut transient SÉPARÉ de #batchout → ne pas effacer les lots empilés
  const msg=h=>{ if(st) st.innerHTML=h; };
  if(!(T>0)){ msg(D.genBatchNeedAmount); return; }
  if(!destWallet(dk)){ msg(D.genBatchNeedDestWallet(dk)); return; }   // création réelle → wallet destination obligatoire
  const row=(splitRows||[]).find(r=>r.n===n);
  if(row&&!row.ok){ msg(D.genBatchInfeasible(n)); return; }
  window._genInFlight=true; const gbtn=document.getElementById("genbtn"); if(gbtn) gbtn.disabled=true;   // RC-2 : verrou + feedback pendant la création async
  try{
    msg(D.genBatchCreating(n));
    let settled;
    try{ settled=await Promise.allSettled(Array.from({length:n},()=>postQuote(dk,c,false,mode))); }
    catch(e){ msg(D.genBatchNetFail(escapeHtml(e.message||String(e)))); return; }   // improbable (allSettled ne reject pas lui-même) ; garde-fou quand même
    // RC-12 : un reject réseau (ou .json() sur corps non-JSON) sur UNE requête ne doit plus jeter les intents déjà créés par les autres
    const js=settled.filter(r=>r.status==="fulfilled").map(r=>r.value), netFailed=settled.length-js.length;
    // échec PARTIEL : garder les intents créés (float réservé, trackables) + signaler — ne pas tout jeter (AUDIT R7)
    const okJs=js.filter(j=>!j.error), failed=js.filter(j=>j.error);
    if(!okJs.length){ msg(netFailed&&!failed.length ? D.genBatchNetFail(D.errFallback) : D.genBatchRozoFail(failed[0]&&failed[0].error&&escapeHtml(failed[0].error.message||""))); return; }
    // RC-3 : S2B — le mémo est l'UNIQUE clé de routage. Absent/vide → Memo.text("null") = tx VALIDE vers le hub, dépôt inappariable, perdu sans refund. Refuser. (B2S : dépôt par adresse, memo légitimement null.)
    if(dk==="S2B" && okJs.some(j=>!(j.source&&typeof j.source.receiverMemo==="string"&&j.source.receiverMemo.trim()))){ msg(D.genBatchBadMemo); return; }
    const b=buildBatch(dk,okJs); window._batches[b.id]=b; saveBatches();   // #15 : le store accumule les lots
    renderBatches(b.id);   // lot frais = déplié, empilé avec les précédents
    refreshLiqDir(dk);     // intents créés → la réservation a bougé l'Available de CE sens → refresh ciblé de sa liquidité + cache devis périmé
    // LOG PASSIF S2B (chantier C) : accumule θ des batchs S2B RÉELS pour recaler le point (KRAP) empiriquement. Gardes = ne pas fausser θ :
    //  S2B uniquement · batch COMPLET (okJs.length===n, sinon fees/realise ne couvrent pas tout le découpage) · row pricée (ok, non-loading, feeFlat non nul).
    if(dk==="S2B" && okJs.length===n && row && row.ok && !row.loading && row.feeFlat!=null){
      const fees=okJs.map(j=>+j.source.fee);   // frais RÉELS créés (pas des dryrun)
      const rec={ts:new Date().toISOString(), route:"S2B", mode, T, n, chunk:T/n,
        model:{min:row.feeFlat, max:row.feeWorst, probable:row.fee},
        measured:{min:row.feeFlat, realise:fees.reduce((a,b)=>a+b,0), fees, waves:new Set(fees).size},
        intent_ids:okJs.map(j=>j.id), src:"live"};   // θ NON stocké — recalculé côté onglet depuis realise/min/max
      fetch("/__log",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(rec)}).catch(()=>{});   // .catch : pas de rejection non gérée hors serve.py (prod / file://, endpoint absent)
    }
    const totalFailed=failed.length+netFailed, firstMsg=escapeHtml((failed[0]&&failed[0].error&&failed[0].error.message)||"");
    msg(totalFailed ? `<span class="warn" style="font-weight:600">⚠ ${LANG==="fr"?`Lot INCOMPLET : ${okJs.length}/${n} intents créés, ${totalFailed} en échec (${firstMsg}). Signe les tranches créées puis relance le reste.`:`INCOMPLETE batch: ${okJs.length}/${n} intents created, ${totalFailed} failed (${firstMsg}). Sign the created chunks then retry the rest.`}</span>` : "");   // signal fort d'under-delivery (gate /code-review)
  } finally { window._genInFlight=false; const g=document.getElementById("genbtn"); if(g) g.disabled=false; }   // RC-2 : release sur TOUS les chemins (retours early inclus)
}
// B→S : N transactions Safe SÉPARÉES (source = Base). Un batch atomique = 1 tx source → Rozo n'en règle qu'une, les autres bouncent (test 02/07). Donc N tx = N signatures, comme le S→B.
// en-tête chips de marque (sens du flux) — réutilisé par batchCardHTML (summary du lot)
const chipFlow=dk=>{const B=`<span class="chip b"><span class="sq"></span>Base</span>`,S=`<span class="chip s"><svg class="logo"><use href="#stellar-mark"/></svg>Stellar</span>`,arw=`<span class="mut2" style="margin:0 8px">→</span>`;return dk==="B2S"?B+arw+S:S+arw+B;};
// RC-14 : JSON Safe Transaction Builder (1 tranche B→S) construit ET téléchargé AU CLIC — plus de blob créé (et jamais révoqué) à chaque renderBatches()
function downloadB2sJson(bid,i){
  const b=(window._batches||{})[bid], r=b&&b.rows[i]; if(!r) return;
  const one={version:"1.0",chainId:"8453",createdAt:b.createdAt,meta:{name:`Rozo B→S ${i+1}/${b.rows.length} · ${eur(r.send)} EURC`,description:`Base ${b.evmAddr} → Stellar ${b.stellarAddr}`,txBuilderVersion:"1.16.0"},transactions:[{to:EURC_B,value:"0",data:null,contractMethod:{inputs:[{name:"to",type:"address",internalType:"address"},{name:"value",type:"uint256",internalType:"uint256"}],name:"transfer",payable:false},contractInputsValues:{to:r.dep,value:r.units}}]};
  const url=URL.createObjectURL(new Blob([JSON.stringify(one,null,2)],{type:"application/json"}));
  const a=document.createElement("a"); a.href=url; a.download=`rozo-b2s-${i+1}of${b.rows.length}.json`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);   // laisse le temps au navigateur de démarrer le download avant de libérer
}
window.downloadB2sJson=downloadB2sJson;
// carte repliable d'un lot (#16). srcTx présent = tranche déposée → verrouillée (plus de bouton de signature) : anti double-envoi.
// D4/D5 — état d'expiration → classe couleur (vert>5min / orange 2-5 / rouge<2 / "exp" passé) partagée carte+tableau+ticker
function expInfo(expMs){ const rem=(expMs||0)-Date.now();
  const cls = rem<=0?"exp" : rem<120000?"r" : rem<300000?"o" : "g";
  return {rem,cls}; }
const mmss=ms=>{ const s=Math.max(0,Math.floor(ms/1000)); return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0"); };   // compte à rebours mm:ss
function expBadge(expMs,fr){ const {rem,cls}=expInfo(expMs);
  const txt = rem<=0 ? (fr?"expiré":"expired") : mmss(rem);
  return {cls,txt}; }
// un seul ticker 1 s : recolore badges + cellules d'heure sans re-rendre (préserve l'état déplié) ; démarré par renderBatches
let _expTick=null;
function startExpiryTicker(){ if(_expTick) return;
  _expTick=setInterval(()=>{ const fr=LANG==="fr";
    const cards=document.querySelectorAll(".bcard[data-exp]"); if(!cards.length){ clearInterval(_expTick); _expTick=null; return; }
    cards.forEach(c=>{ const {rem,cls}=expInfo(+c.getAttribute("data-exp")); const bd=c.querySelector("summary .bbadge");
      if(bd){ bd.className="bbadge "+cls; bd.textContent= rem<=0?(fr?"expiré":"expired"):mmss(rem); }
      if(rem<=0) c.classList.add("expired"); });
    document.querySelectorAll("td.exp[data-exp]").forEach(td=>{ const e=+td.getAttribute("data-exp"); if(e) td.className="exp "+expInfo(e).cls; });
  },1000);
}
function batchCardHTML(b, open){
  const D=I18N[LANG], fr=LANG==="fr", dk=b.dk, rows=b.rows, now=Date.now();
  let totalSend=0,totalRecv=0; rows.forEach(r=>{totalSend+=r.send;totalRecv+=r.rec;});
  const deposited=rows.filter(r=>r.srcTx).length, expd=b.expiresAt&&b.expiresAt<now;
  const eb=expBadge(b.expiresAt,fr);                                   // D4/D5 : badge = heure d'expiration colorée, "expiré" une fois passé
  const dest = dk==="B2S" ? `Stellar <code>${b.stellarAddr}</code>` : `Base <code>${b.evmAddr}</code>`;   // D3 : seul le wallet destination est figé → affiché en entier, source retirée
  const hub=dk==="B2S"?(fr?"hub Stellar":"Stellar hub"):(fr?"hub Base":"Base hub");
  const tFee0=totalSend-totalRecv, tPct0=totalSend>0?tFee0/totalSend*100:0;
  const depNote = deposited>0?` · <b>${deposited}/${rows.length}</b> ${fr?"déposées":"deposited"}`:"";
  let s=`<details class="bcard${expd?" expired":""}" data-bid="${b.id}" data-exp="${b.expiresAt||0}"${open?" open":""}>`;
  s+=`<summary><span class="bflow">${chipFlow(dk)}</span><span class="bsum"><b>${rows.length}</b> ${fr?(rows.length>1?"tranches":"tranche"):(rows.length>1?"chunks":"chunk")} · <b>${eur(totalSend)} → ${eur(totalRecv)} EURC</b> · ${fr?"frais":"fee"} ${eur(tFee0)} € (${tPct0.toFixed(2)} %)${depNote}</span><span class="bbadge ${eb.cls}">${eb.txt}</span></summary>`;   // D1 : sommes bridgées en gras, frais abs+% en normal
  s+=`<div class="bbody"><div class="path">${fr?"vers":"to"} ${dest}</div>`;
  s+=`<div class="reserved"><span class="ico">🔒</span><span>${fr?`<b>Liquidité réservée</b> ${eur(totalRecv)} EURC sur le ${hub} · frais <b>figés</b> jusqu'à expiration (~10 min). Non signé → self-heal, aucun fonds bloqué.`:`<b>Liquidity reserved</b> ${eur(totalRecv)} EURC on the ${hub} · fees <b>frozen</b> until expiry (~10 min). Unsigned → self-heals, no funds locked.`}</span></div>`;
  const th=dk==="B2S"?D.b2sTableHead:D.s2bTableHead;
  s+=`<div class="tblwrap"><table><tr>${th.map(x=>`<th>${x}</th>`).join("")}</tr>`;
  rows.forEach((r,i)=>{
    const eMs=r.exp?new Date(r.exp).getTime():0;
    const expCell=`<td class="exp ${eMs?expInfo(eMs).cls:""}" data-exp="${eMs}">${r.exp?new Date(r.exp).toLocaleTimeString(LOCALE):"—"}</td>`;   // D4 : heure colorée (normal>5min, orange<5, rouge<2)
    const mid=dk==="B2S"?`<td class="mono mut2"><a href="https://basescan.org/address/${encodeURIComponent(r.dep)}" target="_blank" rel="noopener">${escapeHtml(r.dep.slice(0,6))}…${escapeHtml(r.dep.slice(-4))} ↗</a></td>`:`<td class="mono mut2">${escapeHtml(r.memo)}</td>`;   // RC-9 : dep/memo viennent de la réponse API
    let act; const sg=r.signing&&!r.srcTx;   // RC-1 : signature en vol → bouton verrouillé (état durable dans le store, survit au re-rendu langue/restore)
    if(r.srcTx){   // tranche déposée → verrou (lien explorer source), pas de re-signature
      const u=dk==="B2S"?`https://basescan.org/tx/${encodeURIComponent(r.srcTx)}`:`https://stellar.expert/explorer/public/tx/${encodeURIComponent(r.srcTx)}`;
      act=`<td>✅ <a href="${u}" target="_blank" rel="noopener">${escapeHtml(String(r.srcTx).slice(0,10))}… ↗</a></td>`;
    } else if(dk==="B2S"){
      // RC-14 : JSON Safe Transaction Builder construit ET revoqué AU CLIC (downloadB2sJson) — plus de blob créé à chaque rendu
      act=`<td><button class="btn sm" onclick="evmSignRow('${b.id}',${i},this)"${sg?" disabled":""}>${sg?(fr?"signature…":"signing…"):D.b2sSignBtn}</button> <button class="btn sm ghost" onclick="downloadB2sJson('${b.id}',${i})">${D.b2sJsonBtn}</button></td>`;
    } else {
      const issuer=EURC_S.split(":")[1];
      const uri=`web+stellar:pay?destination=${r.dep}&amount=${r.send}&asset_code=EURC&asset_issuer=${issuer}&memo=${encodeURIComponent(r.memo)}&memo_type=MEMO_TEXT`;
      act=`<td><button class="btn sm" onclick="stellarSignRow('${b.id}',${i},this)"${sg?" disabled":""}>${sg?(fr?"signature…":"signing…"):D.s2bSignBtn}</button> <button class="btn sm ghost" onclick="cp('${uri}',this)">${D.s2bCopyBtn}</button></td>`;
    }
    s+=`<tr><td>${i+1}</td><td><b>${eur(r.send)}</b></td>${mid}<td>${eur(r.rec)}</td><td><b>${eur(r.send-r.rec)}</b></td>${expCell}${act}</tr>`;
  });
  const tFee=totalSend-totalRecv, tPct=totalSend>0?tFee/totalSend*100:0;
  s+=`<tr class="totrow"><td class="mut">${D.totalRowLabel}</td><td><b>${eur(totalSend)}</b></td><td></td><td><b>${eur(totalRecv)}</b></td><td><b>${eur(tFee)}</b><div class="mut" style="font-size:11px;font-weight:400">${tPct.toFixed(3)} %</div></td><td></td><td></td></tr></table></div>`;
  const Lf=dk==="B2S"?(LIVE.B2S&&LIVE.B2S.L):(LIVE.S2B&&LIVE.S2B.L);
  if(Lf&&totalRecv>Lf) s+= dk==="B2S"?D.b2sFloatWarn(totalRecv,Lf):D.s2bFloatWarn(totalRecv,Lf);
  s+=`<div class="trackfoot"><button id="trkbtn-${b.id}" class="btn sm ghost" onclick="trackBridge('${b.id}')">${(window._trkOn&&window._trkOn[b.id])?D.trackHide:D.trackBtn}</button></div><div id="trk-${b.id}" class="trkpanel"></div>`;
  return s+`</div></details>`;
}
// re-rend TOUS les lots du store dans #batchout (source unique). Préserve l'état ouvert/replié courant ; freshId = déplié.
function renderBatches(freshId){
  const out=document.getElementById("batchout"); if(!out) return;
  const openSet=new Set(); out.querySelectorAll("details[data-bid]").forEach(d=>{ if(d.open) openSet.add(d.getAttribute("data-bid")); });
  const list=Object.values(window._batches).sort((a,b)=>a.createdAt-b.createdAt);
  out.innerHTML=list.map(b=>batchCardHTML(b, freshId===b.id||openSet.has(b.id))).join("");
  if(list.length) startExpiryTicker();   // recolore heures/badges chaque seconde (D4/D5)
}
// Suivi live d'UN lot : poll GET /payments/{id} par tranche jusqu'à livraison. Écrit srcTx au store (verrou) ; ne touche QUE #trk-<bid> (jamais renderBatches → polls concurrents ne se battent pas).
window._trkTimers=window._trkTimers||{};   // RC-10 : registre {poll,cd,gen} par bid — clear explicite au toggle-OFF/cap 60 + jeton anti-résurrection
async function trackBridge(bid){
  const b=window._batches[bid], el0=document.getElementById("trk-"+bid);
  if(!el0) return;
  const tbtn=document.getElementById("trkbtn-"+bid);
  window._trkOn=window._trkOn||{};
  const clearTimers=()=>{ const t=window._trkTimers[bid]; if(t){ if(t.poll)clearTimeout(t.poll); if(t.cd)clearInterval(t.cd); } };
  if(window._trkOn[bid]){ window._trkOn[bid]=false; clearTimers(); delete window._trkTimers[bid]; el0.innerHTML=""; if(tbtn)tbtn.textContent=I18N[LANG].trackBtn; return; }   // toggle OFF : coupe poll+cdTimer explicitement (RC-10)
  const ids=b?b.rows.map(r=>r.id):null;
  if(!ids||!ids.length){ el0.innerHTML=I18N[LANG].trackNeedGen; return; }   // RC-11 : garde AVANT de poser _trkOn=true ; el0 (pas "el", ReferenceError)
  window._trkOn[bid]=true; if(tbtn)tbtn.textContent=I18N[LANG].trackHide;
  clearTimers();   // au cas où un ancien registre traînerait encore pour ce bid
  const gen=((window._trkTimers[bid]&&window._trkTimers[bid].gen)||0)+1;
  window._trkTimers[bid]={gen,poll:null,cd:null};   // RC-10 : un setTimeout/interval d'une génération périmée (toggle OFF→ON rapide) est ignoré ci-dessous
  const current=()=>window._trkTimers[bid]&&window._trkTimers[bid].gen===gen;
  const dk=b.dk, srcCh=dk==="B2S"?"base":"stellar", dstCh=dk==="B2S"?"stellar":"base";
  const link=(hash,ch)=>hash?`<a href="${ch==="base"?"https://basescan.org/tx/":"https://stellar.expert/explorer/public/tx/"}${encodeURIComponent(hash)}" target="_blank" rel="noopener">${escapeHtml(String(hash).slice(0,8))}… ↗</a>`:"—";   // RC-9 : hash encodé en href, échappé en texte
  const receipt=id=>`<a href="https://invoice.rozo.ai/receipt?id=${encodeURIComponent(id)}" target="_blank" rel="noopener">Rozo receipt ↗</a>`;   // reçu Rozo par tranche (utile support) — RC-9 : id encodé
  // statut brut de l'API → libellé lisible (#17)
  const human=(status,done,fr)=>{ if(done) return fr?"Livré":"Delivered"; const s=String(status||"").toLowerCase();
    if(/unpaid/.test(s)) return fr?"En attente du dépôt":"Awaiting deposit";
    if(/bounce/.test(s)) return fr?"Rejeté (bounce)":"Bounced";
    if(/refund/.test(s)) return fr?"Remboursé":"Refunded";
    if(/expire/.test(s)) return fr?"Expiré":"Expired";
    if(/fail|cancel/.test(s)) return fr?"Échec":"Failed";
    if(/start|process|pending|progress|paid/.test(s)) return fr?"Dépôt reçu, en cours":"Deposit received, processing";
    return status?escapeHtml(status):"?"; };   // RC-9 : statut brut API échappé avant innerHTML
  let rounds=0, cdLeft=5;
  const poll=async()=>{
    if(!current()) return;   // RC-10 : jeton périmé (toggle OFF→ON entre-temps) → un vieux setTimeout ressuscité ne fait rien
    const el=document.getElementById("trk-"+bid); if(!el||!(window._trkOn&&window._trkOn[bid])) return;   // re-résout par id à CHAQUE tick : survit au re-rendu ; s'arrête si le lot a disparu OU si le suivi a été fermé (toggle)
    const fr=LANG==="fr", D=I18N[LANG];   // relu à CHAQUE tick → le suivi suit la langue de l'app (#14)
    const st=await Promise.all(ids.map(id=>fetch(API+"/payments/"+id).then(r=>r.json()).catch(()=>null)));
    if(!current()) return;   // re-vérifie après l'await : un toggle a pu survenir pendant le fetch
    let h=`<div class="card pad">`, allDone=true, done=0, wrote=false;
    st.forEach((s,i)=>{
      if(!s){ h+=`<div class="trk"><span class="ic">–</span><span class="n">#${i+1}</span><span class="lk mut">${D.trackUnreachable} · ${receipt(ids[i])}</span></div>`; allDone=false; return; }
      const status=s.status||"?", stx=s.source&&s.source.txHash, dtx=s.destination&&s.destination.txHash, isDone=!!dtx;
      if(stx && b.rows[i] && !b.rows[i].srcTx){ b.rows[i].srcTx=stx; wrote=true; }   // dépôt détecté → verrou persistant (survit au restore/langue)
      if(isDone) done++; else allDone=false;
      const cls=isDone?"done":(/bounce|refund|expired|fail|cancel/i.test(status)?"warn":"live");
      const icon=isDone?"✓":(cls==="warn"?"!":"…");
      h+=`<div class="trk ${cls}"><span class="ic">${icon}</span><span class="n">#${i+1}</span><span class="lk">${link(stx,srcCh)} → ${link(dtx,dstCh)} · ${receipt(ids[i])}</span><span class="status ${isDone?"ok":(cls==="warn"?"warn":"mut")}">${human(status,isDone,fr)}</span></div>`;
    });
    if(wrote) saveBatches();
    h+=`</div>`;
    const foot=allDone
      ? `<p class="ok" style="margin:6px 0 0">${fr?`✓ Terminé · ${done}/${ids.length} tranche(s) livrée(s)`:`✓ Done · ${done}/${ids.length} chunk(s) delivered`}</p>`
      : `<p class="mut" style="margin:6px 0 0">${fr?`Suivi actif · ${done}/${ids.length} livrée(s) · actualisation auto dans `:`Tracking · ${done}/${ids.length} delivered · auto-refresh in `}<b class="cd">${cdLeft}</b> s</p>`;
    el.innerHTML=h+foot;
    const t=window._trkTimers[bid];
    if(allDone){ if(t&&t.cd){clearInterval(t.cd);t.cd=null;} }
    else if(rounds++<60){ cdLeft=5; if(t&&current()) t.poll=setTimeout(poll,5000); }
    else if(t&&t.cd){clearInterval(t.cd);t.cd=null;}   // RC-10 : cap 60 tours atteint → cdTimer explicitement coupé (fuite corrigée)
  };
  el0.innerHTML=I18N[LANG].trackQuerying;
  window._trkTimers[bid].cd=setInterval(()=>{
    if(!current()){ const t=window._trkTimers[bid]; if(t&&t.cd)clearInterval(t.cd); return; }
    const e=document.getElementById("trk-"+bid); if(!e||!(window._trkOn&&window._trkOn[bid])){const t=window._trkTimers[bid]; if(t&&t.cd){clearInterval(t.cd);t.cd=null;} return;}
    const cd=e.querySelector(".cd"); if(cd&&cdLeft>0){cdLeft--;cd.textContent=cdLeft;}
  },1000);   // D6 : décompte visible entre polls
  poll();
}
// #10 restore : relit localStorage, purge les expirés, re-rend (replié), puis verrouille one-shot les tranches déjà déposées (dépôt hors-app/autre appareil) — pas de poll continu au chargement.
async function loadBatches(){
  let raw; try{ raw=localStorage.getItem(BSTORE); }catch(e){ return; }
  if(!raw) return;
  let obj; try{ obj=JSON.parse(raw)||{}; }catch(e){ return; }
  const now=Date.now(); let changed=false;
  for(const [id,b] of Object.entries(obj)){
    const delivered=b&&Array.isArray(b.rows)&&b.rows.length>0&&b.rows.every(r=>r.srcTx);   // RC-13 : toutes les tranches signées → historique/reçus à préserver, même expiré
    if(!b||(!delivered&&(!b.expiresAt||b.expiresAt<now))){ delete obj[id]; changed=true; } else b.restored=true;
  }
  window._batches=obj;
  if(changed) saveBatches();
  renderBatches();   // repliés
  const list=Object.values(obj); if(!list.length) return;
  let locked=false;
  await Promise.all(list.flatMap(b=>b.rows.map(async r=>{
    if(r.srcTx) return;
    try{ const s=await fetch(API+"/payments/"+r.id).then(x=>x.json()); const stx=s&&s.source&&s.source.txHash; if(stx){ r.srcTx=stx; locked=true; } }catch(e){}
  })));
  if(locked){ saveBatches(); renderBatches(); }
}
const SWEEP=[100,120,150,200,300,400,500,750,1000,1250,1500,2000,2500,3000,3500,4000,4500,5000,5500,6000,8000,10000,11500,12500];   // densifié (petit bout : creux réel 100–750 ; milieu 1250–5500) : min colle au réel (±cent, jamais optimiste — arrondi cent = garde-fou ; résidu ≤+cent sur tranches non ancrées). Max en k=1 (pas de sur-pondération).
// Balayage en 2 vagues, grands incréments d'abord puis resserrement, concurrence limitée
// → rafale amortie et respectueuse de l'API (le balayage est rare grâce au cache).
const SWEEP_W1=[100,400,1000,2000,3000,4500,6000,8000,10000,12500];   // vague 1 : grands incréments (courbe utilisable vite)
const SWEEP_W2=SWEEP.filter(a=>!SWEEP_W1.includes(a));                // vague 2 : points intermédiaires (resserrement)
const SWEEP_CONC=6;                                                  // requêtes simultanées max par vague
async function sweepWave(dk,amts,pts,onProg){
  const q=[...amts];
  await Promise.all(Array.from({length:Math.min(SWEEP_CONC,q.length)},async()=>{
    while(q.length){ const a=q.shift(); const j=await postQuote(dk,a,true,"exactOut").catch(()=>null); if(j&&j.source&&!j.error) pts.push([a,(+j.source.fee)/a*100]); onProg&&onProg(); }
  }));
}
async function sweepCurve(dk,L,onProg){
  try{
    const cap=(L!=null&&L>0)?L:Infinity;   // NE PAS balayer au-dessus du plafond : l'API y renvoie un forfait fixe (cap protocole MAX_PROTOCOL_FEE_BPS) = artefact sur-liquidité, pas le vrai barème
    const pts=[];
    await sweepWave(dk,SWEEP_W1.filter(a=>a<=cap),pts,onProg);   // grands incréments (≤ plafond)
    const w2=SWEEP_W2.filter(a=>a<=cap); if(cap<Infinity) w2.push(Math.floor(cap));   // resserrement + POINT EXACT au plafond (sinon la courbe fige plat au dernier point sous le cap)
    await sweepWave(dk,w2,pts,onProg);
    pts.sort((a,b)=>a[0]-b[0]);
    return pts.length>3?pts:null;
  }catch(e){return null;}
}
// ---- Cache de la courbe : la courbe frais dépend de l'Available (L). Principe : si L a CHANGÉ
//      (dans un sens OU l'autre), on re-balaye pour coller au réel ; si L est inchangé, la courbe
//      est exactement valide → cache (localStorage), un refresh coûte alors ~4 appels au lieu de 52.
//      Toujours frais après un changement ⇒ jamais optimiste ET juste (pas de cache pessimiste traînant).
const CURVE_KEY="rozoCurve";
const SWEEP_EPS=1;   // seuil anti-jitter (EURC) : une variation < 1 EURC ne bouge aucun frais ; toute vraie variation (≥ un bridge) re-balaye
const SWEEP_SIG=SWEEP.join(",")+"|leLc";   // signature de grille — "|leLc" = version sans sur-cap (montants ≤ plafond) + point exact au plafond ; invalide les caches d'avant le correctif
function saveCurve(){ try{ localStorage.setItem(CURVE_KEY,JSON.stringify({sweep:SWEEP_SIG,B2S:{pts:LIVE.B2S.pts,sweptAt:LIVE.B2S.sweptAt},S2B:{pts:LIVE.S2B.pts,sweptAt:LIVE.S2B.sweptAt}})); }catch(e){} }
function loadCurve(){ try{ const c=JSON.parse(localStorage.getItem(CURVE_KEY)||"null"); if(c&&c.sweep===SWEEP_SIG) for(const dk of["B2S","S2B"]) if(c[dk]&&c[dk].pts){ LIVE[dk].pts=c[dk].pts; LIVE[dk].sweptAt=c[dk].sweptAt; } }catch(e){} }   // signature de grille : ignore un cache d'une ancienne version de SWEEP
async function curveFor(dk,L,onProg){
  const c=LIVE[dk];
  const unchanged = c.pts && c.sweptAt!=null && (
    L==null                                    // Available inconnu (appel échoué) → on garde le cache (dégradation gracieuse), pas de balayage à l'aveugle
    || Math.abs(L - c.sweptAt) <= SWEEP_EPS     // Available inchangé → courbe encore exacte
  );
  if(unchanged) return c.pts;                   // cache : 0 appel
  const pts = await sweepCurve(dk,L,onProg);    // L a changé (ou 1er balayage) → re-balaye les montants ≤ plafond pour coller au réel
  if(pts){ c.pts=pts; c.sweptAt=(L!=null?L:c.sweptAt); saveCurve(); }
  return c.pts;                                 // garde l'ancienne courbe si le balayage échoue
}
// courbe du graphe (page Doc UNIQUEMENT) : balayée PARESSEUSEMENT à l'ouverture de la Doc — plus jamais au chargement ni au devis. Cache si L inchangé (0 appel).
// overlay de chargement : voile + roue + EXPLICATION (ce qu'on fetche) + PROGRESSION (barre done/total). Retourne {set,done}.
function loader(container,label){
  if(!container) return {set(){},done(){}};
  if(getComputedStyle(container).position==="static") container.style.position="relative";
  let ov=container.querySelector(":scope > .loader-ov");
  if(!ov){ ov=document.createElement("div"); ov.className="loader-ov";
    ov.innerHTML='<div class="spin"></div><div class="lbl"></div><div class="bar" style="display:none"><i></i></div><div class="cnt"></div>';
    container.appendChild(ov); }
  ov.querySelector(".lbl").textContent=label;
  const bar=ov.querySelector(".bar"), fill=ov.querySelector(".bar i"), cnt=ov.querySelector(".cnt");
  return { set(done,total){ if(total>0){ bar.style.display=""; fill.style.width=Math.round(done/total*100)+"%"; cnt.textContent=done+" / "+total; } },
           done(){ ov.remove(); } };
}
async function ensureChartCurve(){
  const card=(document.getElementById("chart")||{}).closest?document.getElementById("chart").closest(".card"):null;
  const ld=loader(card, I18N[LANG].loadCurve);
  try{
    let total=0, done=0;   // total = dryruns à balayer sur les 2 sens (sens cachés = 0)
    for(const dk of["B2S","S2B"]){ const c=LIVE[dk], L=c.L, cap=(L>0?L:Infinity);
      const cached=c.pts&&c.sweptAt!=null&&(L==null||Math.abs(L-c.sweptAt)<=SWEEP_EPS);
      if(!cached) total+=SWEEP.filter(a=>a<=cap).length+(cap<Infinity?1:0); }
    ld.set(0,total);
    for(const dk of["B2S","S2B"]) LIVE[dk].pts=await curveFor(dk,LIVE[dk].L,()=>ld.set(++done,total));
  } finally{ ld.done(); } }
let lastTs=null;   // cache du dernier résultat de refresh() : {ok,time} — permet à setLang() de retraduire #ts sans réseau
function renderTs(){
  const e=document.getElementById("ts"); if(!e||!lastTs) return;
  e.textContent=lastTs.ok?I18N[LANG].tsUpdated(lastTs.time.toLocaleTimeString(LOCALE)):I18N[LANG].tsOffline;
}
async function refresh(){
  if(window._refreshing) return; window._refreshing=true;   // garde ré-entrance : deux cycles concurrents doublaient la rafale API (goHome+bouton ↻, ou double-clic)
  try{
    const set=(id,v)=>document.getElementById(id).textContent=(v==null?"n/a":eur(v)+" EURC");
    document.getElementById("ts").textContent=I18N[LANG].tsUpdating;
    const _ld=loader(document.querySelector(".card.liq"), I18N[LANG].loadLiq); let _d=0; const _tick=()=>_ld.set(++_d,4);   // overlay + progression (4 appels)
    // 1) données live LÉGÈRES — toujours rafraîchies (Available + soldes on-chain), ~4 appels
    const[aB,aS,sH,bH]=await Promise.all([liq("B2S").catch(()=>null).then(v=>{_tick();return v;}),liq("S2B").catch(()=>null).then(v=>{_tick();return v;}),stellarBal().catch(()=>null).then(v=>{_tick();return v;}),baseBal().catch(()=>null).then(v=>{_tick();return v;})]);
    _ld.done();
    set("liqB",aB);set("chB",sH);set("liqS",aS);set("chS",bH);   // dispo = Available (API create, = plafond réel de refus) · vérif = solde hub lu on-chain
    markLiq("liqS",aS,bH); markLiq("liqB",aB,sH);   // vert si API≈on-chain, orange si écart (bridge récent, non-bloquant)
    LIVE.B2S.L=(aB!=null?aB:sH);LIVE.S2B.L=(aS!=null?aS:bH);   // plafond du graphe = Available (au-delà = refusé), fallback on-chain si l'API échoue
    // 2) SWEEP RETIRÉ du chargement/refresh : la courbe frais n'est plus balayée ici (le graphe Doc la balaye paresseusement à l'ouverture).
    //    Le tableau de découpage re-devise ses tranches en dryrun {T/n} (cache-aware) à la liquidité courante : 0 dryrun si L inchangé.
    drawChart();
    const _dk=document.getElementById("dir").value, _mode=document.getElementById("mode").value, _T=+document.getElementById("amt").value;
    if(_T>0) await ensureChunkFees(_dk,_T,_mode,LIVE[_dk]&&LIVE[_dk].L,splitMax,()=>simul());
    simul();
    lastTs={ok:!!(aB||aS||sH||bH),time:new Date()}; renderTs();
  } finally { window._refreshing=false; }
}

// ---- graphique canvas (sans dépendance) ----
function drawChart(){
  const c=document.getElementById("chart"),g=c.getContext("2d");
  const cs=getComputedStyle(document.body),v=n=>cs.getPropertyValue(n).trim();
  const COL={grid:v('--bd'),grid2:v('--chartgrid'),text:v('--mut'),warn:v('--warn'),b2s:v('--b2s'),s2b:v('--s2b')};
  const W=c.width,H=c.height,L=58,R=18,T=18,B=44, x0=L,x1=W-R,y0=H-B,y1=T;
  const XMAX=13000;
  // axe Y auto-échelle : s'adapte si le frais live dépasse 0,40 % → plus de courbe hors cadre
  let YMAX=0.40; { let mx=0; for(const dk of["B2S","S2B"]){ const ps=(LIVE[dk]&&LIVE[dk].pts)||MEAS[dk]||[]; for(const p of ps) if(p[1]>mx) mx=p[1]; } YMAX=Math.max(0.40, Math.ceil(mx*1.05/0.05)*0.05); }
  const X=val=>x0+(val/XMAX)*(x1-x0), Y=val=>y0-(val/YMAX)*(y0-y1);
  g.clearRect(0,0,W,H); g.font="12px sans-serif"; g.textBaseline="middle";
  g.fillStyle=COL.text; g.lineWidth=1;
  for(let p=0;p<=YMAX+1e-9;p+=0.05){g.strokeStyle=COL.grid;g.beginPath();g.moveTo(x0,Y(p));g.lineTo(x1,Y(p));g.stroke();
    g.textAlign="right";g.fillText((p*100).toFixed(0)/100+"%",x0-8,Y(p));}
  for(let xv=0;xv<=13000;xv+=2000){g.strokeStyle=COL.grid2;g.beginPath();g.moveTo(X(xv),y0);g.lineTo(X(xv),y1);g.stroke();
    g.textAlign="center";g.fillText(xv?(xv/1000)+"k":"0",X(xv),y0+16);}
  g.fillText(I18N[LANG].chartAmountAxis,(x0+x1)/2,H-10);
  for(const dk of["B2S","S2B"]){const col=dk==="B2S"?COL.b2s:COL.s2b;
    const Lv=LIVE[dk]&&LIVE[dk].L, pts=(LIVE[dk]&&LIVE[dk].pts)||MEAS[dk];   // ligne plafond SEULEMENT si liquidité live connue
    if(Lv){ const Lx=Math.min(X(Lv),x1);
      g.setLineDash([4,4]);g.strokeStyle=col;g.globalAlpha=.45;
      g.beginPath();g.moveTo(Lx,y0);g.lineTo(Lx,y1);g.stroke();g.globalAlpha=1;g.setLineDash([]);
      g.textAlign="center";g.fillStyle=col;g.fillText(I18N[LANG].chartCap+eur(Math.round(Lv)),Lx,y1+(dk==="B2S"?40:54)); }
    let cpts=Lv?pts.filter(p=>p[0]<=Lv):pts.slice();   // tronquer au plafond live (au-delà = refusé en 1 envoi)
    if(Lv){ const ye=livePct(dk,Lv); if(ye!=null) cpts=cpts.concat([[Lv,ye]]); }
    // trait plein sur toute la courbe mesurée (pointillé near-edge retiré : la prémisse d'un clamp de frais près du plafond est réfutée par les mesures)
    if(cpts.length>=2){ g.strokeStyle=col;g.lineWidth=2.2;g.beginPath(); cpts.forEach((pt,i)=>{const xx=X(pt[0]),yy=Y(pt[1]);i?g.lineTo(xx,yy):g.moveTo(xx,yy);}); g.stroke(); }
    g.fillStyle=col;cpts.forEach(pt=>{g.beginPath();g.arc(X(pt[0]),Y(pt[1]),3,0,7);g.fill();});
  }
  g.textAlign="left";g.fillStyle=COL.b2s;g.fillRect(X(800),y1+6,12,3);g.fillText("Base → Stellar",X(800)+18,y1+8);
  g.fillStyle=COL.s2b;g.fillRect(X(800),y1+22,12,3);g.fillText("Stellar → Base",X(800)+18,y1+24);
  chartGeo={x0,x1,XMAX};   // pour convertir la position souris → montant
  // ---- survol : ligne repère + points + infobulle (montant + frais des 2 sens) ----
  if(hoverAmt!=null && hoverAmt>=0){
    const hx=X(hoverAmt);
    g.strokeStyle=COL.text;g.globalAlpha=.5;g.setLineDash([2,3]);g.beginPath();g.moveTo(hx,y1);g.lineTo(hx,y0);g.stroke();g.setLineDash([]);g.globalAlpha=1;
    const lines=[[`${eur(Math.round(hoverAmt))} EURC`, v('--fg')]];
    for(const dk of["B2S","S2B"]){ const Lv=LIVE[dk]&&LIVE[dk].L; if(Lv&&hoverAmt>Lv) continue;
      const pct=livePct(dk,hoverAmt); if(pct==null) continue; const col=dk==="B2S"?COL.b2s:COL.s2b;
      g.fillStyle=col;g.beginPath();g.arc(hx,Y(pct),4,0,7);g.fill();
      lines.push([`${dk==="B2S"?"B→S":"S→B"} ${pct.toFixed(3)} % · ${eur(hoverAmt*pct/100)} EURC`, col]); }
    g.font="12px sans-serif"; const pad=6,lh=16, tw=Math.max(...lines.map(t=>g.measureText(t[0]).width))+pad*2, th=lines.length*lh+pad;
    let bx=hx+12, by=y1+6; if(bx+tw>x1) bx=hx-12-tw; if(bx<x0) bx=x0;
    g.globalAlpha=.96;g.fillStyle=v('--card');g.fillRect(bx,by,tw,th);g.globalAlpha=1;
    g.strokeStyle=COL.grid;g.strokeRect(bx,by,tw,th);
    g.textAlign="left";g.textBaseline="top";
    lines.forEach((t,i)=>{ g.fillStyle=t[1]; g.fillText(t[0],bx+pad,by+pad/2+i*lh); });
    g.textBaseline="middle";
  }
}
// onglet Dispersion (chantier C) : trace θ vs n des batchs S→B loggés (θ RECALCULÉ, jamais stocké) + N / médiane / p90. Canvas maison, sans dépendance (comme drawChart).
async function renderDisp(){
  const c=document.getElementById("dispChart"); if(!c) return;
  const g=c.getContext("2d"), st=document.getElementById("dispStats"), D=I18N[LANG];
  const cs=getComputedStyle(document.body),v=n=>cs.getPropertyValue(n).trim();
  const COL={grid:v('--bd'),grid2:v('--chartgrid'),text:v('--mut'),s2b:v('--s2b'),warn:v('--warn'),fg:v('--fg')};
  const W=c.width,H=c.height,L=48,R=18,T=18,B=44, x0=L,x1=W-R,y0=H-B,y1=T;
  g.clearRect(0,0,W,H); g.font="12px sans-serif"; g.textBaseline="middle";
  // log JSONL via serve.py ; erreur réseau (file:// / pas de serveur) → offline ; 404 → traité comme vide
  let rows=[];
  try{ const r=await fetch("/__log",{cache:"no-store"});
    if(r.ok){ const t=await r.text(); rows=t.split("\n").filter(l=>l.trim()).map(l=>{try{return JSON.parse(l)}catch(e){return null}}).filter(Boolean); }
    else if(r.status!==404){ throw 0; } }
  catch(e){ g.fillStyle=COL.text; g.textAlign="center"; g.fillText("—",(x0+x1)/2,(y0+y1)/2); if(st) st.innerHTML=D.dispOffline; return; }
  // S2B uniquement · θ = (réalisé−min)/(max−min) · exclut max=min (n=1 → division par 0 ; θ n'a de sens qu'avec drainage)
  const pts=rows.filter(o=>o&&o.route==="S2B"&&o.model&&o.measured&&o.model.max>o.model.min)
    .map(o=>({n:o.n, th:(o.measured.realise-o.model.min)/(o.model.max-o.model.min)}));
  if(!pts.length){ g.fillStyle=COL.text; g.textAlign="center"; g.fillText("∅",(x0+x1)/2,(y0+y1)/2); if(st) st.innerHTML=D.dispEmpty; return; }
  const maxN=Math.max(...pts.map(p=>p.n)), NX=Math.max(10,maxN+1);
  const X=n=>x0+((n-1)/(NX-1))*(x1-x0), Y=th=>y0-Math.max(0,Math.min(1,th))*(y0-y1);   // θ clampé [0,1] à l'affichage
  g.fillStyle=COL.text; g.lineWidth=1;
  for(let th=0;th<=1.0001;th+=0.2){ g.strokeStyle=COL.grid; g.beginPath(); g.moveTo(x0,Y(th)); g.lineTo(x1,Y(th)); g.stroke(); g.textAlign="right"; g.fillText(th.toFixed(1),x0-8,Y(th)); }
  for(let n=1;n<=NX;n++){ if(n>1){ g.strokeStyle=COL.grid2; g.beginPath(); g.moveTo(X(n),y0); g.lineTo(X(n),y1); g.stroke(); } g.textAlign="center"; g.fillText(String(n),X(n),y0+16); }
  g.fillText(D.dispAxisN,(x0+x1)/2,H-10);
  g.save(); g.translate(14,(y0+y1)/2); g.rotate(-Math.PI/2); g.textAlign="center"; g.fillText("θ",0,0); g.restore();
  // médiane + p90 (nearest-rank) — lignes horizontales de repère
  const ths=pts.map(p=>p.th).sort((a,b)=>a-b);
  const q=(arr,p)=>arr[Math.min(arr.length-1,Math.max(0,Math.ceil(p*arr.length)-1))];
  const med=q(ths,0.5), p90=q(ths,0.9);
  const hline=(th,col,lbl)=>{ g.strokeStyle=col; g.globalAlpha=.85; g.setLineDash([5,4]); g.beginPath(); g.moveTo(x0,Y(th)); g.lineTo(x1,Y(th)); g.stroke(); g.setLineDash([]); g.globalAlpha=1; g.fillStyle=col; g.textAlign="left"; g.fillText(lbl,x0+4,Y(th)-8); };
  hline(med,COL.warn,"med "+med.toFixed(2));
  hline(p90,COL.fg,"p90 "+p90.toFixed(2));
  // points θ vs n (léger décalage horizontal si superposition sur un même n)
  const byN={}; g.fillStyle=COL.s2b;
  for(const p of pts){ const k=p.n, i=(byN[k]=byN[k]||0); const off=(i%2?1:-1)*Math.ceil(i/2)*4; byN[k]=i+1; g.beginPath(); g.arc(X(p.n)+off,Y(p.th),4,0,7); g.fill(); }
  if(st) st.innerHTML=D.dispStatsFmt(pts.length, med.toFixed(2), p90.toFixed(2));
}
function toggleTheme(){
  const light=document.documentElement.classList.toggle("light");
  try{localStorage.setItem("rozoTheme",light?"light":"dark")}catch(e){}
  document.getElementById("theme").textContent=light?I18N[LANG].themeDark:I18N[LANG].themeLight;
  drawChart();
}
// re-rend #out depuis l'état EN CACHE (lastDevis), sans réseau. Même garde de fraîcheur que simul() (dk+mode+montant) ;
// si le devis en cache ne correspond plus à l'état courant, on laisse #out tel quel (contrat de setLang()).
function renderOutCached(){
  const o=document.getElementById("out"); if(!o) return;
  const dk=document.getElementById("dir").value, mode=document.getElementById("mode").value, x=+document.getElementById("amt").value;
  if(!(x>0)){ o.innerHTML=""; return; }
  if(!lastDevis || !(lastDevis.dk===dk && lastDevis.mode===mode && Math.abs(lastDevis.T-x)<0.5)) return;
  const D=I18N[LANG], {recv}=lastDevis;
  const Ldest=LIVE[dk]&&LIVE[dk].L;
  o.innerHTML=(Ldest&&recv>Ldest)?D.quoteWarnOverLiq(recv,Ldest):"";   // seul l'avertissement liquidité subsiste (phrase "Tu envoies…" retirée)
}
// changement de langue : re-rend tout depuis l'état EN CACHE (aucun fetch) → instantané, sans flash, wallets connectés préservés.
function setLang(l){ if((l!=="fr"&&l!=="en")||l===LANG) return;
  LANG=l; LOCALE=l==="fr"?"fr-FR":"en-US"; window.LANG=l; document.documentElement.lang=l;
  try{localStorage.setItem("rozoLang",l)}catch(e){}
  applyI18N(); updateDirUI(); updateLangBtn();
  const tb=document.getElementById("theme"); if(tb) tb.textContent=document.documentElement.classList.contains("light")?I18N[LANG].themeDark:I18N[LANG].themeLight;
  window.checkWalletMatch&&window.checkWalletMatch();   // re-libellé statut wallet dans la nouvelle langue (sinon applyI18N vient d'écraser à tort en "non connecté")
  renderOutCached();   // #out depuis lastDevis (cache), pas d'appel réseau
  simul();             // #splitout + #reco depuis LIVE/lastDevis (cache) ; préserve selN
  renderTs();          // #ts depuis lastTs (cache)
  drawChart();         // libellés de la courbe (axe, plafond) — lecture pure de LIVE/MEAS, pas de réseau
  renderBatches();   // #14 : tous les lots suivent la langue (re-rendu depuis le store, état ouvert/replié préservé) ; un suivi actif est à re-cliquer
}
function toggleLang(){ setLang(LANG==="fr"?"en":"fr"); }
function updateLangBtn(){ const b=document.getElementById("lang"); if(b) b.textContent=LANG.toUpperCase(); }
// applique le dictionnaire I18N à tous les éléments statiques (titres, en-têtes, textes fixes)
function applyI18N(){
  const D=I18N[LANG];
  document.title=D.pageTitle;
  const setT=(id,v)=>{const e=document.getElementById(id); if(e) e.textContent=v;};
  const setH=(id,v)=>{const e=document.getElementById(id); if(e) e.innerHTML=v;};
  const langEl=document.getElementById("lang"); if(langEl) langEl.value=LANG;
  setT("navTool",D.navTool); setT("navDoc",D.navDoc);
  setT("navDisp",D.navDisp); setT("dispTitle",D.dispTitle); setH("dispIntro",D.dispIntro);
  if(document.getElementById("disp")&&document.getElementById("disp").classList.contains("on")) renderDisp();   // re-rend l'onglet Dispersion à un changement de langue (libellés canvas/stats)
  const rb=document.getElementById("btnRefresh"); if(rb) rb.title=D.refreshTitle;
  const bb=document.getElementById("brandBtn"); if(bb) bb.title=D.brandTitle;
  const hba=document.getElementById("hubBaseA"); if(hba) hba.title=D.hubBaseTitle;
  const hsa=document.getElementById("hubStellarA"); if(hsa) hsa.title=D.hubStellarTitle;
  const mxb=document.getElementById("maxbtn"); if(mxb) mxb.title=D.maxbtnTitle;
  const drb=document.getElementById("dirbtn"); if(drb) drb.title=D.dirbtnTitle;
  const cv=document.getElementById("chart"); if(cv) cv.setAttribute("aria-label",D.chartAriaLabel);
  ["amtSend","amtRecv"].forEach(id=>{const e=document.getElementById(id); if(e) e.placeholder=D.amtPlaceholder;});
  setT("lblSend",D.amtSent); setT("lblRecv",D.amtRecv);   // libellés des deux blocs entrée/sortie
  // RC-8 : nom accessible par input (send vs receive) — le <span class="lbl"> voisin n'est pas un <label for>, un lecteur d'écran ne les distingue pas sans aria-label
  const setAria=(id,v)=>{const e=document.getElementById(id); if(e) e.setAttribute("aria-label",v);};
  setAria("amtSend",D.amtSent); setAria("amtRecv",D.amtRecv);
  setT("subtext",D.subtext); setT("h2Quote",D.h2Quote);
  setT("optRecv",D.optRecv); setT("optSend",D.optSend);
  setT("btnCalc",D.btnCalc); setT("h2Liq",D.h2Liq);
  setT("pLiqExplain",D.pLiqExplain); setT("thDir",D.thDir); setT("thHub",D.thHub);
  setT("thLiqAvail",D.thLiqAvail); setT("thOnchain",D.thOnchain);
  setT("thLiqAvail2",D.thLiqAvail); setT("thOnchain2",D.thOnchain);
  setH("pDecoyWarn",D.pDecoyWarn);
  setT("lblWallets",D.lblWallets); setT("evmStatus",D.notConnected); setT("sStatus",D.notConnected);
  setT("h2Curve",D.h2Curve); setH("pCurveExplain",D.pCurveExplain);
  setT("docGrpFees",D.docGrpFees); setT("docGrpExec",D.docGrpExec); setT("docGrpRef",D.docGrpRef);
  setT("h2Model",D.h2Model); setH("pModelDisclaimer",D.pModelDisclaimer); setH("formulaText",D.formulaText); setT("thSens2",D.thDir); setT("thBaseFull",D.thBaseFull);
  setH("modelLi1",D.modelLi1); setH("modelLi2",D.modelLi2); setH("modelLi3",D.modelLi3); setH("modelLi4",D.modelLi4); setH("modelLi5",D.modelLi5);
  setT("h2WhyRange",D.h2WhyRange); setH("pWhyRange",D.pWhyRange);
  setT("docGrpCalc",D.docGrpCalc); setT("h3Bridge",D.h3Bridge); setH("pBridge",D.pBridge); setT("h3Calc",D.h3Calc); setH("pCalc",D.pCalc); setT("h3Src",D.h3Src); setH("pSrc",D.pSrc); setT("h3Math",D.h3Math); setH("pMath",D.pMath);
  setT("h2NoAtomic",D.h2NoAtomic); setH("pNoAtomic",D.pNoAtomic);
  setT("h2SignTrack",D.h2SignTrack); setH("pSignTrack",D.pSignTrack);
  setH("pOfficialBridge",D.pOfficialBridge); setH("pRefContact",D.pRefContact);
  setT("h2Addresses",D.h2Addresses); setT("hubStellarLabel",D.hubStellarLabel); setT("hubBaseLabel",D.hubBaseLabel);
  setH("pSources",D.pSources);
  setH("splitnote",D.splitEstimateNote);   // note d'estimation à côté du bouton Générer (#2)
  const ts2=document.getElementById("ts2"); if(ts2) ts2.textContent=new Date().toLocaleString(LOCALE);   // setH ci-dessus recrée #ts2 (vide) à chaque appel → le republier ici, sinon la date disparaît après un setLang()
  updBatchLabel();   // #genbtn : sinon reste au texte HTML statique tant qu'aucun montant n'a été saisi
  updateLangBtn();
}
applyI18N();

// thème : la classe .light est déjà posée sur <html> par le script inline du <head> (avant paint, anti-FOUC) ; ici on ne fait que synchroniser le libellé du bouton
try{
  const isLight=document.documentElement.classList.contains("light");
  document.getElementById("theme").textContent=isLight?I18N[LANG].themeDark:I18N[LANG].themeLight;
}catch(e){}
// #ts2 (Documentation, "Généré le") : déjà rempli par applyI18N() ci-dessus (appelée au chargement du script)
if(location.protocol==="file:"){
  const b=document.createElement("div");
  b.style.cssText="background:var(--warn);color:#000;padding:10px 14px;border-radius:8px;margin-bottom:14px;font-size:13px;line-height:1.6";
  b.innerHTML=I18N[LANG].fileWarnHtml(location.pathname.replace(/\/[^/]*$/,""));
  (document.querySelector('.stage')||document.body).prepend(b);   // RC-5 : ".wrap" n'existe pas (conteneur réel = ".stage") → TypeError qui interrompait l'init en file://
}
(function(){ const cv=document.getElementById("chart"); if(!cv) return;
  cv.addEventListener("mousemove",e=>{ if(!chartGeo) return; const r=cv.getBoundingClientRect();
    const mx=(e.clientX-r.left)*(cv.width/r.width); const {x0,x1,XMAX}=chartGeo;
    hoverAmt=(mx>=x0-4&&mx<=x1+4)?Math.max(0,(mx-x0)/(x1-x0)*XMAX):null; drawChart(); });
  cv.addEventListener("mouseleave",()=>{ hoverAmt=null; drawChart(); });
  cv.style.cursor="crosshair";
})();
loadCurve(); updLbl(); updateDirUI(); drawChart(); quote(); simul(); refresh();   // loadCurve avant : rendu instantané depuis le cache, refresh ne re-balaye que si l'Available a bougé
loadBatches();   // #10 : restaure les lots persistés (purge expirés + verrou one-shot des tranches déjà déposées)

// auto-refresh retiré (à la demande) : la liquidité ne se rafraîchit qu'au chargement et via le bouton ↻

/* Tooltip portal : rend le contenu de .tip-box dans un nœud position:fixed au-dessus de tout (calqué sur stellar-swap "Confiance").
   Contenu adapté LANGUE (chaînes I18N re-rendues) + THÈME (variables CSS). Flip bas→haut si pas la place. */
(function(){
  const portal=document.getElementById("tipPortal"); if(!portal) return;
  const show=wrap=>{ const box=wrap.querySelector(".tip-box"); if(!box) return;
    portal.innerHTML=box.innerHTML; portal.style.left="-9999px"; portal.style.top="0"; portal.style.display="block";
    const r=wrap.getBoundingClientRect(), pw=portal.offsetWidth, ph=portal.offsetHeight, M=8;
    const left=Math.max(M,Math.min(r.left,window.innerWidth-pw-M));
    let top=r.bottom+6; if(top+ph>window.innerHeight-M){ const above=r.top-ph-6; top=above>=M?above:Math.max(M,window.innerHeight-ph-M); }
    portal.style.left=left+"px"; portal.style.top=top+"px"; };
  const hide=()=>{ if(portal.style.display==="none") return; portal.style.display="none"; portal.innerHTML=""; };
  document.addEventListener("mouseover",e=>{ const w=e.target.closest&&e.target.closest(".tip-wrap"); if(w) show(w); });
  document.addEventListener("mouseout",e=>{ const w=e.target.closest&&e.target.closest(".tip-wrap"); if(!w) return; if(e.relatedTarget&&w.contains(e.relatedTarget)) return; hide(); });
  // a11y : mêmes tooltips au focus clavier (tip-wrap posent tabindex=0) qu'au survol souris
  document.addEventListener("focusin",e=>{ const w=e.target.closest&&e.target.closest(".tip-wrap"); if(w) show(w); });
  document.addEventListener("focusout",e=>{ const w=e.target.closest&&e.target.closest(".tip-wrap"); if(w) hide(); });
  window.addEventListener("scroll",hide,{capture:true,passive:true});
})();
