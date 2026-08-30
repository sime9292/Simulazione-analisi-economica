/* v71 compatibility loader: preserve full engine/UI, remove only legacy seeded data. */
(function(){
  const revealFailsafe=()=>document.documentElement.classList.remove('dabster-booting');
  setTimeout(revealFailsafe,9000);

  function resetLegacyDataOnce(){
    const KEY='dabster.empty-data-migration.v66';
    if(sessionStorage.getItem(KEY)==='1')return;
    const remove=[];
    for(let i=0;i<sessionStorage.length;i++){
      const k=sessionStorage.key(i)||'';
      if(k==='dabster.test.case.v44'||k==='dabster.test.stage.v44'||k.startsWith('dabster.billing.plan.v47.'))remove.push(k);
    }
    remove.forEach(k=>sessionStorage.removeItem(k));
    sessionStorage.setItem('dabster.test.stage.v44','0');
    sessionStorage.setItem(KEY,'1');
  }
  resetLegacyDataOnce();

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
  function loadKanbanTriggerDirect(){
    if(document.querySelector('script[data-kanban-trigger-direct-v71]'))return;
    const direct=document.createElement('script');direct.src='kanban-trigger-direct-v71.js?v=71';direct.dataset.kanbanTriggerDirectV71='1';
    direct.onerror=()=>console.error('[Dabster] Errore collegamento diretto Attività → Trigger v71');document.head.appendChild(direct);
  }
  function loadKanbanBillingLink(){
    if(document.querySelector('script[data-kanban-billing-v60]')){loadKanbanTriggerDirect();return;}
    const link=document.createElement('script');link.src='kanban-billing-link-v60.js?v=60';link.dataset.kanbanBillingV60='1';
    link.onload=loadKanbanTriggerDirect;
    link.onerror=()=>console.error('[Dabster] Errore collegamento Kanban → Fatturabile v60');document.head.appendChild(link);
  }
  function loadBillingTrigger(){
    if(document.querySelector('script[data-billing-trigger-v58]')){loadKanbanBillingLink();return;}
    const trigger=document.createElement('script');trigger.src='billing-trigger-v58.js?v=58';trigger.dataset.billingTriggerV58='1';
    trigger.onload=loadKanbanBillingLink;
    trigger.onerror=()=>console.error('[Dabster] Errore caricamento trigger Fatturabile v58');document.head.appendChild(trigger);
  }
  function loadPlanInvoiceSource(){
    if(document.querySelector('script[data-plan-invoice-source-v58]'))return;
    const source=document.createElement('script');source.src='billing-plan-source-v52.js?v=58';source.dataset.planInvoiceSourceV58='1';
    source.onerror=()=>console.error('[Dabster] Errore caricamento Piano sotto Righe Offerta v58');document.head.appendChild(source);
  }
  function loadPlanInvoiceBridge(){
    if(document.querySelector('script[data-plan-invoice-v55]')){loadPlanInvoiceSource();return;}
    const bridge=document.createElement('script');bridge.src='billing-plan-invoice-v51.js?v=55';bridge.dataset.planInvoiceV55='1';
    bridge.onload=loadPlanInvoiceSource;
    bridge.onerror=()=>console.error('[Dabster] Errore caricamento collegamento Piano v55');document.head.appendChild(bridge);
  }
  function loadBillingPlan(){
    if(document.querySelector('script[data-billing-plan-v47]')){loadPlanInvoiceBridge();return;}
    const plan=document.createElement('script');plan.src='billing-plan-v47.js?v=47';plan.dataset.billingPlanV47='1';
    plan.onload=loadPlanInvoiceBridge;
    plan.onerror=()=>console.error('[Dabster] Errore caricamento Piano di fatturazione v47');document.head.appendChild(plan);
  }
  function loadOfferFlow(){
    if(document.querySelector('script[data-offer-flow-v66]'))return;
    normalizeTestRoute();
    const flow=document.createElement('script');flow.src='offer-flow-v38.js?v=66';flow.dataset.offerFlowV66='1';
    flow.onload=loadBillingPlan;
    flow.onerror=()=>{revealFailsafe();console.error('[Dabster] Errore caricamento flusso offerta v66');};document.head.appendChild(flow);
  }
  function loadTestDataEntry(){
    if(document.querySelector('script[data-test-data-entry-v67]'))return;
    const test=document.createElement('script');test.src='test-data-entry-v50.js?v=67';test.dataset.testDataEntryV67='1';
    test.onerror=()=>console.error('[Dabster] Errore caricamento Ambiente Test v67');document.head.appendChild(test);
  }

  const core=document.createElement('script');
  core.src='app-v13.js?v=46';core.dataset.cleanLegacyUi='1';core.onerror=revealFailsafe;
  core.onload=()=>{
    const cleanup=document.createElement('script');cleanup.src='workspace-cleanup-v34.js?v=34';document.head.appendChild(cleanup);
    const billingEntry=document.createElement('script');billingEntry.src='billing-entry-v34.js?v=50';document.head.appendChild(billingEntry);
    normalizeTestRoute();loadTestDataEntry();loadBillingTrigger();
    if(document.readyState==='complete')setTimeout(loadOfferFlow,0);else window.addEventListener('load',loadOfferFlow,{once:true});
  };
  document.head.appendChild(core);
})();