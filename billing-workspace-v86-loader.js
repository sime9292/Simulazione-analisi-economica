/* v86 - Load established billing workspace without legacy 54k fallback and with exact offer-line allocation matching. */
(async function(){
  if(window.DABSTER_BILLING_WORKSPACE_V86_LOADING)return;
  window.DABSTER_BILLING_WORKSPACE_V86_LOADING=true;
  try{
    const response=await fetch('billing-workspace-v39.js?v=86-source',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    let source=await response.text();

    const legacyBlock=/  const FALLBACK_OFFER=\{[\s\S]*?\n  \];\n\n  const model=/;
    if(!legacyBlock.test(source))throw new Error('Blocco dati demo billing non riconosciuto.');
    source=source.replace(legacyBlock,`  const FALLBACK_OFFER={code:'',commessa:'',commessaLabel:'',title:'',client:'',amount:0,status:''};\n  const FALLBACK_LINES=[];\n  const INITIAL_INVOICES=[];\n\n  const model=`);

    const oldMatch="function allocationMatches(a,line){return (a.offerLineId&&a.offerLineId===line.id)||(!a.offerLineId&&a.phase===line.phase)||a.phase===line.phase;}";
    const newMatch="function allocationMatches(a,line){return a.offerLineId?String(a.offerLineId)===String(line.id):(!a.offerLineId&&a.phase===line.phase);}";
    if(!source.includes(oldMatch))throw new Error('Matching allocazioni billing non riconosciuto.');
    source=source.replace(oldMatch,newMatch);

    source=source.replace('/* v40 - Billing workspace: hierarchical dashboard + new invoice with native Billing Plan allocation API. */','/* v86 - Billing workspace: hierarchical dashboard + new invoice, no seeded fallback, exact offerLineId allocations. */');
    source+='\n//# sourceURL=billing-workspace-v86-runtime.js';
    (0,eval)(source);
    if(!window.DABSTER_BILLING_V40?.showDashboard)throw new Error('Workspace fatturazione v86 non inizializzato.');
    window.DABSTER_BILLING_V86=window.DABSTER_BILLING_V40;
    window.dispatchEvent(new CustomEvent('dabster-billing-workspace-v86-ready',{detail:{version:86}}));
  }catch(err){
    console.error('[Dabster] Errore billing workspace v86',err);
    window.DABSTER_BILLING_WORKSPACE_V86_ERROR=String(err?.message||err);
  }
})();