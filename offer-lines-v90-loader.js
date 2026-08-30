/* v90 - Manual confirmation uses the same explicit finalization sequence as Test. */
(async function(){
  if(window.DABSTER_OFFER_LINES_V90_LOADING)return;
  window.DABSTER_OFFER_LINES_V90_LOADING=true;
  try{
    const response=await fetch('offer-lines-v63.js?v=90-source',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    let source=await response.text();

    const oldPublish="window.dispatchEvent(new CustomEvent('dabster-offer-lines-change',{detail:window.DABSTER_OFFER_LINES}));\n    return v;";
    const newPublish=`window.dispatchEvent(new CustomEvent('dabster-offer-lines-change',{detail:window.DABSTER_OFFER_LINES}));\n    if(isConfirmed()){\n      const finalize=()=>{\n        try{\n          window.DABSTER_OFFER_FLOW?.refresh?.();\n          window.DABSTER_BILLING_DASHBOARD_V87?.refresh?.();\n          window.dispatchEvent(new CustomEvent('dabster-confirmed-offer-finalized',{detail:{offerCode:offerCode(),lines:(window.DABSTER_OFFER_LINES?.lines||[]).map(x=>({...x}))}}));\n        }catch(err){console.error('[Dabster] finalizzazione conferma manuale',err);}\n      };\n      queueMicrotask(finalize);\n      setTimeout(finalize,0);\n      setTimeout(finalize,120);\n      setTimeout(finalize,350);\n    }\n    return v;`;
    if(!source.includes(oldPublish))throw new Error('Punto pubblicazione Righe Offerta non riconosciuto.');
    source=source.replace(oldPublish,newPublish);

    const oldConfirmed="syncAll();\n    window.dispatchEvent(new CustomEvent('dabster-offer-confirmed',{detail:{offerCode:offerCode(),confirmedAt}}));";
    const newConfirmed=`syncAll();\n    // Same finalization used by Test: force Righe Offerta publication before downstream consumers read the offer.\n    setTimeout(()=>{syncAll();window.DABSTER_OFFER_FLOW?.refresh?.();},0);\n    setTimeout(()=>{syncAll();window.DABSTER_OFFER_FLOW?.refresh?.();window.DABSTER_BILLING_DASHBOARD_V87?.refresh?.();},160);\n    window.dispatchEvent(new CustomEvent('dabster-offer-confirmed',{detail:{offerCode:offerCode(),confirmedAt}}));`;
    if(!source.includes(oldConfirmed))throw new Error('Punto conferma Righe Offerta non riconosciuto.');
    source=source.replace(oldConfirmed,newConfirmed);

    source=source.replace('/* v66 - Post-confirmation offer lines: Importo Conferma -> Righe Offerta -> invoice readiness. */','/* v90 - Post-confirmation offer lines with explicit manual-confirmation finalization. */');
    source+='\n//# sourceURL=offer-lines-v90-runtime.js';
    (0,eval)(source);
    window.DABSTER_OFFER_LINES_V90_READY=true;
    window.dispatchEvent(new CustomEvent('dabster-offer-lines-v90-ready'));
  }catch(err){
    console.error('[Dabster] Errore caricamento Righe Offerta v90',err);
    window.DABSTER_OFFER_LINES_V90_ERROR=String(err?.message||err);
  }
})();