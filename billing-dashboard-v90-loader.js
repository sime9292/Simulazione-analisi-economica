/* v90 - Standalone Billing Dashboard can also consume the confirmed-offer record produced by Righe Offerta. */
(async function(){
  if(window.DABSTER_BILLING_DASHBOARD_V90_LOADING)return;
  window.DABSTER_BILLING_DASHBOARD_V90_LOADING=true;
  try{
    const response=await fetch('billing-dashboard-live-v87.js?v=90-source',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    let source=await response.text();

    const oldSnapshot=`  function offerSnapshot(){\n    const snap=window.DABSTER_OFFER_FLOW?.getSnapshot?.()||{};\n    const offer=snap.offer||{};\n    const raw=Array.isArray(snap.lines)&&snap.lines.length?snap.lines:(Array.isArray(window.DABSTER_OFFER_LINES?.lines)?window.DABSTER_OFFER_LINES.lines:[]);`;
    const newSnapshot=`  function offerSnapshot(){\n    const snap=window.DABSTER_OFFER_FLOW?.getSnapshot?.()||{};\n    const confirmed=window.DABSTER_CONFIRMED_OFFER||window.DABSTER_OFFER_LINES?.snapshot||null;\n    const offer={...(snap.offer||{})};\n    if(!offer.code&&confirmed?.offerCode)offer.code=confirmed.offerCode;\n    const raw=Array.isArray(snap.lines)&&snap.lines.length?snap.lines:(Array.isArray(window.DABSTER_OFFER_LINES?.lines)&&window.DABSTER_OFFER_LINES.lines.length?window.DABSTER_OFFER_LINES.lines:(Array.isArray(confirmed?.lines)?confirmed.lines:[]));`;
    if(!source.includes(oldSnapshot))throw new Error('Snapshot Dashboard non riconosciuto.');
    source=source.replace(oldSnapshot,newSnapshot);

    source=source.replace('/* v87 - Standalone live Billing Dashboard. Commessa -> Offerta -> Righe Offerta -> Righe Fattura. */','/* v90 - Standalone Billing Dashboard with confirmed-offer fallback. */');
    source+='\n//# sourceURL=billing-dashboard-v90-runtime.js';
    (0,eval)(source);
    window.DABSTER_BILLING_DASHBOARD_V90_READY=true;
  }catch(err){
    console.error('[Dabster] Errore caricamento Dashboard Fatturazione v90',err);
    window.DABSTER_BILLING_DASHBOARD_V90_ERROR=String(err?.message||err);
  }
})();