/* v78 - Normal-page loader with authoritative live Kanban activity resolution inside Billing Trigger. */
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
  function loadKanbanBillingLink(){
    if(document.querySelector('script[data-kanban-billing-v60]'))return;
    const link=document.createElement('script');link.src='kanban-billing-link-v60.js?v=78';link.dataset.kanbanBillingV60='1';
    link.onerror=()=>console.error('[Dabster] Errore collegamento Kanban → Fatturabile');document.head.appendChild(link);
  }
  async function loadBillingTrigger(){
    if(window.DABSTER_BILLING_TRIGGER_V58){loadKanbanBillingLink();return;}
    try{
      const response=await fetch('billing-trigger-v58.js?v=78-live',{cache:'no-store'});
      if(!response.ok)throw new Error('HTTP '+response.status);
      let source=await response.text();
      const oldBlock=`  function activityFromKey(key){\n    const raw=String(key||''),i=raw.indexOf('::');if(i<0)return null;\n    const phase=raw.slice(0,i),name=raw.slice(i+2);\n    return [...activities.values()].find(a=>a.phaseType===phase&&norm(a.title)===norm(name))||null;\n  }`;
      const newBlock=`  function activityFromKey(key){\n    const raw=String(key||''),i=raw.indexOf('::');if(i<0)return null;\n    const phase=raw.slice(0,i),name=raw.slice(i+2);\n    const activePhase=String(document.querySelector('.kanban-phase-tab.active')?.dataset.phase||'');\n    if(activePhase===phase){\n      const cards=[...document.querySelectorAll('#kanbanBoard .kanban-list[data-status] .kanban-card[data-id]')];\n      const card=cards.find(c=>norm(c.querySelector('.kanban-card-title')?.textContent)===norm(name));\n      if(card){\n        const live={id:String(card.dataset.id||('live:'+phase+':'+norm(name))),phaseType:phase,title:String(card.querySelector('.kanban-card-title')?.textContent||name).trim(),status:String(card.closest('.kanban-list[data-status]')?.dataset.status||'')};\n        const matches=[...activities.values()].filter(a=>a.phaseType===phase&&norm(a.title)===norm(name));\n        matches.forEach(a=>{a.id=live.id;a.phaseType=live.phaseType;a.title=live.title;a.status=live.status;});\n        if(!matches.length)activities.set(live.id,live);\n        return live;\n      }\n    }\n    const matches=[...activities.values()].filter(a=>a.phaseType===phase&&norm(a.title)===norm(name));\n    return matches.length?matches[matches.length-1]:null;\n  }`;
      if(!source.includes(oldBlock))throw new Error('activityFromKey signature not found');
      source=source.replace(oldBlock,newBlock).replace('const VERSION=58;','const VERSION=78;');
      (0,eval)(source+'\n//# sourceURL=billing-trigger-v78-runtime.js');
      if(!window.DABSTER_BILLING_TRIGGER_V58)throw new Error('Trigger API not installed');
      window.DABSTER_BILLING_TRIGGER_V78=window.DABSTER_BILLING_TRIGGER_V58;
      loadKanbanBillingLink();
    }catch(err){console.error('[Dabster v78] Errore caricamento Trigger autorevole',err);}
  }
  function loadPlanInvoiceSource(){
    if(document.querySelector('script[data-plan-invoice-source-v58]'))return;
    const source=document.createElement('script');source.src='billing-plan-source-v52.js?v=78';source.dataset.planInvoiceSourceV58='1';
    source.onerror=()=>console.error('[Dabster] Errore caricamento Piano sotto Righe Offerta');document.head.appendChild(source);
  }
  function loadPlanInvoiceBridge(){
    if(document.querySelector('script[data-plan-invoice-v55]')){loadPlanInvoiceSource();return;}
    const bridge=document.createElement('script');bridge.src='billing-plan-invoice-v51.js?v=78';bridge.dataset.planInvoiceV55='1';
    bridge.onload=loadPlanInvoiceSource;bridge.onerror=()=>console.error('[Dabster] Errore collegamento Piano');document.head.appendChild(bridge);
  }
  function loadBillingPlan(){
    if(document.querySelector('script[data-billing-plan-v47]')){loadPlanInvoiceBridge();return;}
    const plan=document.createElement('script');plan.src='billing-plan-v47.js?v=78';plan.dataset.billingPlanV47='1';
    plan.onload=loadPlanInvoiceBridge;plan.onerror=()=>console.error('[Dabster] Errore caricamento Piano di fatturazione');document.head.appendChild(plan);
  }
  function loadOfferFlow(){
    if(document.querySelector('script[data-offer-flow-v66]'))return;
    normalizeTestRoute();
    const flow=document.createElement('script');flow.src='offer-flow-v38.js?v=78';flow.dataset.offerFlowV66='1';
    flow.onload=loadBillingPlan;flow.onerror=()=>{revealFailsafe();console.error('[Dabster] Errore caricamento flusso offerta');};document.head.appendChild(flow);
  }
  function loadTestEnvironment(){
    if(!document.querySelector('script[data-test-data-entry-v67]')){
      const test=document.createElement('script');test.src='test-data-entry-v50.js?v=78';test.dataset.testDataEntryV67='1';document.head.appendChild(test);
    }
    if(!document.querySelector('script[data-test-flow-v70]')){
      const fixture=document.createElement('script');fixture.src='test-flow-v70.js?v=78';fixture.dataset.testFlowV70='1';document.head.appendChild(fixture);
    }
  }

  const core=document.createElement('script');
  core.src='app-v13.js?v=46';core.dataset.cleanLegacyUi='1';core.onerror=revealFailsafe;
  core.onload=()=>{
    const cleanup=document.createElement('script');cleanup.src='workspace-cleanup-v34.js?v=34';document.head.appendChild(cleanup);
    const billingEntry=document.createElement('script');billingEntry.src='billing-entry-v34.js?v=50';document.head.appendChild(billingEntry);
    normalizeTestRoute();loadTestEnvironment();loadBillingTrigger();
    if(document.readyState==='complete')setTimeout(loadOfferFlow,0);else window.addEventListener('load',loadOfferFlow,{once:true});
  };
  document.head.appendChild(core);
})();