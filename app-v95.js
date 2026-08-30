/* v95 - v90 runtime + Activity Domain identity fix: Analysis owns phase/title, Kanban owns status only. */
(function(){
  const revealFailsafe=()=>document.documentElement.classList.remove('dabster-booting');
  setTimeout(revealFailsafe,9000);

  sessionStorage.setItem('dabster.environment.v44','free');
  sessionStorage.removeItem('dabster.test.case.v44');
  sessionStorage.removeItem('dabster.test.stage.v44');
  delete window.DABSTER_TEST_CASE_V50;delete window.DABSTER_TEST_FIXTURE_V64;

  const preload=[
    ['app-v5.js','v=10'],['app-v6.js','v=11'],['app-v7.js','v=12'],['app-v8.js','v=13'],
    ['app-v9.js','v=clean2'],['app-v10.js','v=clean2'],['app-v11.js','v=15'],['app-v12.js','v=16'],['app-v13.js','v=95-source']
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
  function loadPlanInvoiceSource(){loadScript('billing-plan-source-v52.js?v=95','plan-source-v95');}
  function loadPlanInvoiceBridge(){loadScript('billing-plan-invoice-v51.js?v=95','plan-invoice-v95',loadPlanInvoiceSource);}
  function loadBillingPlan(){loadScript('billing-plan-v47.js?v=95','billing-plan-v95',loadPlanInvoiceBridge);}
  function loadDashboard(){loadScript('billing-dashboard-v90-loader.js?v=95','billing-dashboard-v95');}
  function loadBillingEntry(){loadScript('billing-entry-v86.js?v=95','billing-entry-v95',loadDashboard);}
  function loadOfferFlow(){loadScript('offer-flow-v38.js?v=95','offer-flow-v95',()=>{loadBillingEntry();loadBillingPlan();});}
  function afterOfferLinesReady(){
    window.DABSTER_OFFER_LINES?.sync?.();
    loadOfferFlow();
  }
  function loadOfferLines(){
    if(window.DABSTER_OFFER_LINES_V90_READY){afterOfferLinesReady();return;}
    window.addEventListener('dabster-offer-lines-v90-ready',afterOfferLinesReady,{once:true});
    loadScript('offer-lines-v90-loader.js?v=95','offer-lines-v95');
  }
  function loadTrigger(){loadScript('billing-trigger-v85-loader.js?v=95','billing-trigger-v95');}
  function loadActivityDomain(){
    if(window.DABSTER_ACTIVITY_DOMAIN_V95){loadTrigger();return;}
    window.addEventListener('dabster-activity-domain-v95-ready',loadTrigger,{once:true});
    loadScript('activity-domain-v95-loader.js?v=95','activity-domain-v95');
  }

  function afterKanbanReady(attempt=0){
    if(window.DABSTER_APP_V13_V83_READY){
      loadScript('workspace-cleanup-v34.js?v=34','workspace-cleanup-v95');
      loadActivityDomain();
      if(document.readyState==='complete')setTimeout(loadOfferLines,0);else window.addEventListener('load',loadOfferLines,{once:true});
      return;
    }
    if(attempt<240)setTimeout(()=>afterKanbanReady(attempt+1),25);else revealFailsafe();
  }

  const core=document.createElement('script');
  core.src='app-v13-v83-loader.js?v=95';core.dataset.cleanLegacyUi='1';core.onerror=revealFailsafe;
  core.onload=()=>afterKanbanReady();
  document.head.appendChild(core);
})();