/* v99 - Load invoice register v97 with payment states aligned to receipt allocation. */
(async function(){
  if(window.DABSTER_INVOICE_REGISTER_V99_LOADING)return;
  window.DABSTER_INVOICE_REGISTER_V99_LOADING=true;
  try{
    const response=await fetch('invoice-register-v97.js?v=99-source',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    let source=await response.text();

    const oldStatus="const status=residual<=.01?'Pagata':received>.01?'Parziale':'Da incassare';";
    const newStatus="const status=residual<=.01?'Incassata':received>.01?'Parziale':'Da incassare';";
    if(!source.includes(oldStatus))throw new Error('Formula stato pagamento v97 non riconosciuta.');
    source=source.replace(oldStatus,newStatus);

    const oldClass="function statusClass(s){return s==='Pagata'?'paid':s==='Parziale'?'partial':'open';}";
    const newClass="function statusClass(s){return s==='Incassata'?'paid':s==='Parziale'?'partial':'open';}";
    if(!source.includes(oldClass))throw new Error('Classi stato pagamento v97 non riconosciute.');
    source=source.replace(oldClass,newClass);

    const oldButton='<button type="button" class="ir97-btn orange" data-ir-receipt disabled title="Gestione incassi: prossimo step">Registra incasso</button>';
    const newButton='<button type="button" class="ir97-btn orange" data-ir-receipt>Registra incasso</button>';
    if(!source.includes(oldButton))throw new Error('Pulsante Registra incasso v97 non riconosciuto.');
    source=source.replace(oldButton,newButton);

    source=source.replace('/* v97 - Invoice register: saved invoices remain linked to offer/offer lines and are visible from Sidebar > Fatture. */','/* v99 - Invoice register with receipt allocation states: Da incassare / Parziale / Incassata. */');
    source+='\n//# sourceURL=invoice-register-v99-runtime.js';
    (0,eval)(source);
    if(!window.DABSTER_INVOICE_REGISTER_V97_API?.show)throw new Error('Registro fatture v99 non inizializzato.');
    window.DABSTER_INVOICE_REGISTER_V99=window.DABSTER_INVOICE_REGISTER_V97_API;
    window.dispatchEvent(new CustomEvent('dabster-invoice-register-v99-ready',{detail:{version:99}}));
  }catch(err){
    console.error('[Dabster] Errore invoice register v99',err);
    window.DABSTER_INVOICE_REGISTER_V99_ERROR=String(err?.message||err);
  }
})();
