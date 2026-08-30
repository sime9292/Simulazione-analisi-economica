/* v86 - v85 activity runtime + restored global Billing Dashboard / New Invoice entry. */
(function(){
  const revealFailsafe=()=>document.documentElement.classList.remove('dabster-booting');
  setTimeout(revealFailsafe,9000);

  sessionStorage.setItem('dabster.environment.v44','free');
  sessionStorage.removeItem('dabster.test.case.v44');
  sessionStorage.removeItem('dabster.test.stage.v44');
  delete window.DABSTER_TEST_CASE_V50;delete window.DABSTER_TEST_FIXTURE_V64;

  const preload=[
    ['app-v5.js','v=10'],['app-v6.js','v=11'],['app-v7.js','v=12'],['app-v8.js','v=13'],
    ['app-v9.js','v=clean2'],['app-v10.js','v=clean2'],['app-v11.js','v=15'],['app-v12.js','v=16'],['app-v13.js','v=86-source']
  ];
  preload.forEach(([file,query])=>{
    if(document.querySelector(`link[data-clean-preload="${file}"]`))return;
    const link=document.createElement('link');link.rel='preload';link.as='script';link.href=`${file}?${query}`;link.dataset.cleanPreload=file;document.head.appendChild(link);
  });

  function loadScript(src,datasetKey,onload){
    if(document.querySelector(`script[data-${datasetKey}]`)){onload?.();return;}
    const s=document.createElement('script');s.src=src;s.setAttribute(`data-${datasetKey}`,'1');
    s.onload=()=>onload?.();s.onerror=()=>console.error('[Dabster] Errore caricamento',src);document.head.appendChild(s);
  }
  function loadPlanInvoiceSource(){loadScript('billing-plan-source-v52.js?v=86','plan-source-v86');}
  function loadPlanInvoiceBridge(){loadScript('billing-plan-invoice-v51.js?v=86','plan-invoice-v86',loadPlanInvoiceSource);}
  function loadBillingPlan(){loadScript('billing-plan-v47.js?v=86','billing-plan-v86',loadPlanInvoiceBridge);}
  function loadBillingEntry(){loadScript('billing-entry-v86.js?v=86','billing-entry-v86');}
  function loadOfferFlow(){loadScript('offer-flow-v38.js?v=86','offer-flow-v86',()=>{loadBillingEntry();loadBillingPlan();});}
  function loadTrigger(){loadScript('billing-trigger-v85-loader.js?v=86','billing-trigger-v86');}
  function loadActivityDomain(){
    if(window.DABSTER_ACTIVITY_DOMAIN_V84){loadTrigger();return;}
    window.addEventListener('dabster-activity-domain-v84-ready',loadTrigger,{once:true});
    loadScript('activity-domain-v84-loader.js?v=86','activity-domain-v86');
  }

  function afterKanbanReady(attempt=0){
    if(window.DABSTER_APP_V13_V83_READY){
      loadScript('workspace-cleanup-v34.js?v=34','workspace-cleanup-v86');
      loadActivityDomain();
      if(document.readyState==='complete')setTimeout(loadOfferFlow,0);else window.addEventListener('load',loadOfferFlow,{once:true});
      return;
    }
    if(attempt<240)setTimeout(()=>afterKanbanReady(attempt+1),25);else revealFailsafe();
  }

  const core=document.createElement('script');
  core.src='app-v13-v83-loader.js?v=86';core.dataset.cleanLegacyUi='1';core.onerror=revealFailsafe;
  core.onload=()=>afterKanbanReady();
  document.head.appendChild(core);
})();