const short=a=>a?a.slice(0,a.startsWith("0x")?6:4)+"…"+a.slice(-4):"";
const setTxt=(id,t,warn)=>{const e=document.getElementById(id); if(e) e.innerHTML=warn?`<span class="warn">${t}</span>`:t;};
const D=()=>window.I18N[window.LANG];   // relit window.LANG à chaque appel (et non figé au chargement du module) → les libellés wallet suivent setLang()

/* ---------- Statut du wallet connecté (plus de comptes codés en dur) ---------- */
function syncFromWallet(addr){ window.checkWalletMatch(); }   // wallet connecté/changé → rafraîchit le statut
window.checkWalletMatch=function(){   // affiche l'adresse connectée ; source/destination dérivées du sens côté app.js
  const dot=(id,on)=>{const e=document.getElementById(id);if(e){const b=e.closest(".wbtn");if(b)b.classList.toggle("on",on);}};
  if(window.evmAddr) setTxt("evmStatus","✓ "+short(window.evmAddr),false);
  if(window.stellarAddr) setTxt("sStatus","✓ "+short(window.stellarAddr),false);
  dot("evmStatus",!!window.evmAddr); dot("sStatus",!!window.stellarAddr);   // point vert = connecté
};

/* ---------- EVM (Base) : provider injecté + batch atomique EIP-5792 ---------- */
const CHAIN_HEX="0x2105"; // 8453
const pad=h=>h.replace(/^0x/,"").toLowerCase().padStart(64,"0");
const transferData=(to,units)=>"0xa9059cbb"+pad(to)+pad(BigInt(units).toString(16));
window.evmConnect=async()=>{
  if(!window.ethereum){ setTxt("evmStatus",D().moduleNoEvm,true); return; }
  try{
    const acc=await window.ethereum.request({method:"eth_requestAccounts"}); window.evmAddr=acc[0];
    try{localStorage.setItem("rozoEvm","1");}catch(_){}   // C2 : marqueur pour reconnexion silencieuse au reload
    try{ await window.ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId:CHAIN_HEX}]}); }catch(_){}
    if(!window._evmHooked && window.ethereum.on){ window._evmHooked=true;   // wallet change de compte → resynchronise
      window.ethereum.on("accountsChanged",a=>{ window.evmAddr=a&&a[0]; if(window.evmAddr){syncFromWallet(window.evmAddr);}else{setTxt("evmStatus",D().moduleDisconnected,true);window.checkWalletMatch();} }); }
    syncFromWallet(window.evmAddr);
  }catch(e){ setTxt("evmStatus",D().moduleRejected(e.message||e),true); }
};
// clic sur la zone wallet = bascule connexion/déconnexion
window.evmDisconnect=async()=>{
  try{ await window.ethereum?.request({method:"wallet_revokePermissions",params:[{eth_accounts:{}}]}); }catch(_){}   // best-effort (pas supporté partout) ; on nettoie l'état app dans tous les cas
  window.evmAddr=null; try{localStorage.removeItem("rozoEvm");}catch(_){}   // C2 : déconnexion explicite → pas de reconnexion auto
  setTxt("evmStatus",D().notConnected,false); window.checkWalletMatch();
};
window.evmToggle=()=> window.evmAddr ? window.evmDisconnect() : window.evmConnect();
// signe UNE tranche = 1 tx source distincte (eth_sendTransaction). PAS de batch atomique (wallet_sendCalls) : ça ferait 1 tx source → bounce des autres.
window.evmSignRow=async(bid,i,btn)=>{
  const b=(window._batches||{})[bid], row=b&&b.rows[i]; if(!row) return;
  if(row.srcTx||row.signing) return;   // RC-1 : verrou anti double-envoi (déposé OU signature en vol)
  const old=btn.textContent;
  const unlock=()=>{ if(row.signing){ row.signing=false; window.saveBatches&&window.saveBatches(); } };
  const showErr=(msg)=>{ btn.textContent=old; btn.disabled=false; unlock();
    let s=btn.parentNode.querySelector(".rowerr"); if(!s){ s=document.createElement("span"); s.className="rowerr warn"; s.style.fontSize="11px"; s.style.marginLeft="6px"; btn.parentNode.appendChild(s);} s.textContent=msg; };
  if(row.exp && new Date(row.exp).getTime()-Date.now()<=0){ showErr(D().evmSignExpired); return; }   // RC-1 : refuser après expiry (l'intent ne sera plus honoré)
  if(!window.evmAddr){ await window.evmConnect(); if(!window.evmAddr) return; }
  btn.textContent="…"; btn.disabled=true;
  try{
    // RC-1 : assurer la chaîne Base (8453) — sinon la tx part sur la mauvaise chaîne (no-op / faux « déposé » au reload)
    let cid; try{ cid=await window.ethereum.request({method:"eth_chainId"}); }catch(_){}
    if(cid!==CHAIN_HEX){ try{ await window.ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId:CHAIN_HEX}]}); cid=await window.ethereum.request({method:"eth_chainId"}); }catch(_){}
      if(cid!==CHAIN_HEX){ showErr(D().evmWrongChain); return; } }
    row.signing=true; window.saveBatches&&window.saveBatches();   // RC-1 : verrou durable AVANT diffusion (survit à un re-rendu pendant la pop-up wallet)
    const hash=await window.ethereum.request({method:"eth_sendTransaction",params:[{from:window.evmAddr,to:row.to,data:transferData(row.dep,row.units),value:"0x0"}]});
    const hx=typeof hash==="string"?hash:(hash&&hash.hash)||String(hash);
    // RC-1 : ne « déposer » qu'après un REÇU confirmé (status 1) — un revert ne doit pas passer pour un dépôt
    let rcpt=null;
    for(let k=0;k<20&&!rcpt;k++){ await new Promise(r=>setTimeout(r,2000)); try{ rcpt=await window.ethereum.request({method:"eth_getTransactionReceipt",params:[hx]}); }catch(_){} }
    if(rcpt&&/^0x0$/i.test(rcpt.status)){ showErr(D().evmTxReverted); return; }   // revert → PAS de verrou « déposé », re-tentable
    row.srcTx=hx; row.signing=false; window.saveBatches&&window.saveBatches();   // reçu OK (ou timeout : tx diffusée → verrou pour empêcher un double-envoi ; le suivi confirmera)
    btn.outerHTML=`✅ <a href="https://basescan.org/tx/${hx}" target="_blank" rel="noopener">${String(hx).slice(0,10)}… ↗</a>`+(rcpt?"":` <span class="mut" style="font-size:11px">${D().evmUnconfirmed}</span>`);
  }catch(e){
    const m=e.message||String(e);
    if(/user rejected|4001|denied/i.test(m)){ btn.textContent=old; btn.disabled=false; unlock(); return; }
    showErr(/unsupport|not found|4200|does not exist|method/i.test(m)?D().evmSignUnsupported:D().evmSignFail(m));
  }
};

/* ---------- Stellar : multi-wallet + paiement (mémo TEXT) ---------- */
let SWK=null, KIT_NET=null, kitReady=null;
async function ensureKit(){   // bundle wallet-kit LOCAL (esbuild) : les CDN cassent tweetnacl → import KO
  if(!kitReady) kitReady=(async()=>{
    const m=await import("./walletkit.js");
    // icônes wallets = distant (CDN Creit Tech) : le bundle local ne sert pas les images → on force le productIcon
    const ICON="https://stellar.creit.tech/wallet-icons/";
    const mk=(M,f)=>{const x=new M();try{Object.defineProperty(x,"productIcon",{value:ICON+f,configurable:true});}catch(e){} return x;};
    m.StellarWalletsKit.init({network:m.Networks.PUBLIC,modules:[
      mk(m.FreighterModule,"freighter.svg"),mk(m.xBullModule,"xbull.svg"),mk(m.LobstrModule,"lobstr.svg"),
      mk(m.AlbedoModule,"albedo.svg"),mk(m.RabetModule,"rabet.svg"),mk(m.HanaModule,"hana.svg")]});
    SWK=m.StellarWalletsKit; KIT_NET=m.Networks.PUBLIC;
  })();
  await kitReady; return SWK;
}
const PASS=()=>window.StellarSdk.Networks.PUBLIC;
const HZ=()=>new window.StellarSdk.Horizon.Server("https://horizon.stellar.org");
const ISSUER="GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2";
function buildPayXDR(src,p){ const S=window.StellarSdk;
  const acct = p._acct || new S.Account(src,"0");
  return new S.TransactionBuilder(acct,{fee:"100000",networkPassphrase:PASS()})
    .addOperation(S.Operation.payment({destination:p.destination,asset:new S.Asset("EURC",ISSUER),amount:String(p.amount)}))
    .addMemo(S.Memo.text(String(p.memo))).setTimeout(180).build(); }
window._buildPayXDR=(src,p)=>buildPayXDR(src,p).toXDR();   // pour vérif (build hors-ligne)
window.stellarConnect=async()=>{
  if(!window.StellarSdk){ setTxt("sStatus",D().stellarNoSdk,true); return; }
  try{ await ensureKit(); }catch(e){ setTxt("sStatus",D().stellarKitUnavailable(e.message||e),true); return; }
  try{ const {address}=await SWK.authModal(); window.stellarAddr=address;
    let id=null; try{ id=SWK.selectedModule&&SWK.selectedModule.productId; }catch(_){}   // id du wallet sélectionné (kit) → restaurable via setWallet()
    try{ localStorage.setItem("rozoStellar",JSON.stringify({id:id||null,address})); }catch(_){}   // C2 : mémorise wallet+adresse pour restauration au reload
    syncFromWallet(address); }
  catch(e){ /* modal fermé par l'utilisateur */ }
};
window.stellarDisconnect=async()=>{
  try{ if(SWK&&SWK.disconnect) await SWK.disconnect(); }catch(_){}
  window.stellarAddr=null; try{localStorage.removeItem("rozoStellar");}catch(_){}   // C2 : déconnexion explicite → pas de restauration auto
  setTxt("sStatus",D().notConnected,false); window.checkWalletMatch();
};
window.stellarToggle=()=> window.stellarAddr ? window.stellarDisconnect() : window.stellarConnect();
window.stellarSignRow=async(bid,i,btn)=>{
  const b=(window._batches||{})[bid], p=b&&b.rows[i]; if(!p) return;
  if(p.srcTx||p.signing) return;   // RC-1 : verrou anti double-envoi (déposé OU signature en vol)
  if(p.exp && new Date(p.exp).getTime()-Date.now()<=0){ setTxt("sStatus","✗ "+D().s2bExpired,true); return; }   // RC-1 : refuser après expiry
  if(!window.stellarAddr){ await window.stellarConnect(); if(!window.stellarAddr) return; }
  const src=window.stellarAddr, S=window.StellarSdk;   // D3 : l'expéditeur Stellar n'est pas figé (Rozo apparie l'intent sur le mémo) → toute source livre à la destination verrouillée
  const old=btn.textContent; btn.textContent="…"; btn.disabled=true;
  const unlock=()=>{ btn.textContent=old; btn.disabled=false; if(p.signing){ p.signing=false; window.saveBatches&&window.saveBatches(); } };
  const lock=hash=>{ p.srcTx=hash; p.signing=false; window.saveBatches&&window.saveBatches();
    btn.outerHTML=`✅ <a href="https://stellar.expert/explorer/public/tx/${hash}" target="_blank" rel="noopener">${String(hash).slice(0,8)}… ↗</a>`; };
  p.signing=true; window.saveBatches&&window.saveBatches();   // RC-1 : verrou durable (survit au re-rendu langue/restore pendant la signature)
  try{
    const acct=await HZ().loadAccount(src);
    const tx=buildPayXDR(src,{destination:p.dep,amount:p.send,memo:p.memo,_acct:acct});
    const txHash=tx.hash().toString("hex");   // hash indépendant des signatures → = hash on-chain après submit
    const {signedTxXdr}=await SWK.signTransaction(tx.toXDR(),{address:src,networkPassphrase:KIT_NET});
    try{
      const res=await HZ().submitTransaction(S.TransactionBuilder.fromXDR(signedTxXdr,PASS()));
      lock(res.hash);
    }catch(subErr){
      // RC-1 : submit échoué CÔTÉ RÉPONSE (timeout/504) mais la tx a pu ATTERRIR → vérifier Horizon par le hash AVANT de ré-autoriser (sinon re-clic = DOUBLE DÉPÔT même mémo)
      let notFound=false;
      try{ const landed=await HZ().transactions().transaction(txHash).call(); if(landed&&landed.successful){ lock(txHash); return; } }
      catch(hzErr){ notFound=!!(hzErr&&hzErr.response&&hzErr.response.status===404); }
      if(notFound) throw subErr;   // confirmé PAS atterrie → déverrouille (catch externe), re-tentable
      btn.disabled=true; setTxt("sStatus","⚠ "+D().s2bVerifyExplorer,true); return;   // indéterminé → garder le verrou (p.signing) ; le suivi verrouillera si ça a atterri
    }
  }catch(e){
    const rc=e&&e.response&&e.response.data&&e.response.data.extras&&e.response.data.extras.result_codes;
    unlock(); const esc=window.escapeHtml||(x=>x);   // RC-9 : rc/e.message viennent de Horizon (externe) → échapper avant innerHTML (setTxt)
    setTxt("sStatus","✗ "+esc(rc?JSON.stringify(rc):(e.message||e)),true);
  }
};
// C2 : reconnexion silencieuse au chargement (aucun prompt) — un refresh de page ne reset plus les wallets
window.walletRestore=async()=>{
  try{ if(window.ethereum&&localStorage.getItem("rozoEvm")){ const acc=await window.ethereum.request({method:"eth_accounts"});
    if(acc&&acc[0]){ window.evmAddr=acc[0];
      if(!window._evmHooked&&window.ethereum.on){ window._evmHooked=true; window.ethereum.on("accountsChanged",a=>{ window.evmAddr=a&&a[0]; if(window.evmAddr){syncFromWallet(window.evmAddr);}else{setTxt("evmStatus",D().moduleDisconnected,true);window.checkWalletMatch();} }); }
      window.checkWalletMatch(); } } }catch(_){}
  try{ const raw=localStorage.getItem("rozoStellar"); if(raw){ const s=JSON.parse(raw);
    if(s&&s.id&&s.address){ await ensureKit(); try{ await SWK.setWallet(s.id); }catch(_){}
      window.stellarAddr=s.address; window.checkWalletMatch(); } } }catch(_){}
};
window.walletReady=true;
window.walletRestore();
