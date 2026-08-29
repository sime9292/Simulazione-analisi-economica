/* clean-v2 compatibility loader: preload legacy UI modules without patching browser globals. */
(function(){
  const revealFailsafe=()=>document.documentElement.classList.remove('dabster-booting');
  setTimeout(revealFailsafe,9000);

  const preload=[
    ['app-v5.js','v=10'],['app-v6.js','v=11'],['app-v7.js','v=12'],['app-v8.js','v=13'],
    ['app-v9.js','v=clean2'],['app-v10.js','v=clean2'],['app-v11.js','v=15'],['app-v12.js','v=16'],['app-v13.js','v=46']
  ];
  preload.forEach(([file,query])=>{
    if(document.querySelector(`link[data-clean-preload="${file}"]`))return;
    const link=document.createElement('link');link.rel='preload';link.as='script';link.href=`${file}?${query}`;link.dataset.cleanPreload=file;document.head.appendChild(link);
  });

  function normalizeTestRoute(){
    const test=sessionStorage.getItem('dabster.environment.v44')==='test';
    if(test&&location.hash.startsWith('#offerta-'))history.replaceState(null,'','#offerte');
  }
  function loadPlanInvoiceSource(){
    if(document.querySelector('script[data-plan-invoice-source-v52]'))return;
    const source=document.createElement('script');source.src='billing-plan-source-v52.js?v=52';source.dataset.planInvoiceSourceV52='1';
    source.onerror=()=>console.error('[Dabster] Errore caricamento origine Piano in Nuova fattura v52');document.head.appendChild(source);
  }
  function loadPlanInvoiceBridge(){
    if(document.querySelector('script[data-plan-invoice-v51]')){loadPlanInvoiceSource();return;}
    const bridge=document.createElement('script');bridge.src='billing-plan-invoice-v51.js?v=51';bridge.dataset.planInvoiceV51='1';
    bridge.onload=loadPlanInvoiceSource;
    bridge.onerror=()=>console.error('[Dabster] Errore caricamento collegamento Piano → Fattura v51');document.head.appendChild(bridge);
  }
  function loadBillingPlan(){
    if(document.querySelector('script[data-billing-plan-v47]')){loadPlanInvoiceBridge();return;}
    const plan=document.createElement('script');plan.src='billing-plan-v47.js?v=47';plan.dataset.billingPlanV47='1';
    plan.onload=loadPlanInvoiceBridge;
    plan.onerror=()=>console.error('[Dabster] Errore caricamento Piano di fatturazione v47');document.head.appendChild(plan);
  }
  function loadOfferFlow(){
    if(document.querySelector('script[data-offer-flow-v38]'))return;
    normalizeTestRoute();
    const flow=document.createElement('script');flow.src='offer-flow-v38.js?v=38';flow.dataset.offerFlowV38='1';
    flow.onload=loadBillingPlan;
    flow.onerror=()=>{revealFailsafe();console.error('[Dabster] Errore caricamento flusso offerta v38');};document.head.appendChild(flow);
  }
  function loadTestDataEntry(){
    if(document.querySelector('script[data-test-data-entry-v50]'))return;
    const test=document.createElement('script');test.src='test-data-entry-v50.js?v=50';test.dataset.testDataEntryV50='1';
    test.onerror=()=>console.error('[Dabster] Errore caricamento Ambiente Test dati v50');document.head.appendChild(test);
  }

  const core=document.createElement('script');
  core.src='app-v13.js?v=46';core.dataset.cleanLegacyUi='1';core.onerror=revealFailsafe;
  core.onload=()=>{
    const cleanup=document.createElement('script');cleanup.src='workspace-cleanup-v34.js?v=34';document.head.appendChild(cleanup);
    const billingEntry=document.createElement('script');billingEntry.src='billing-entry-v34.js?v=42';document.head.appendChild(billingEntry);
    normalizeTestRoute();loadTestDataEntry();
    if(document.readyState==='complete')setTimeout(loadOfferFlow,0);else window.addEventListener('load',loadOfferFlow,{once:true});
  };
  document.head.appendChild(core);
})();
