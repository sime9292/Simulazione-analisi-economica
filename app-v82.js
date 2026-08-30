/* v82 - Standard Dabster runtime with one authoritative Activity Domain. No legacy Test/Kanban trigger bridges. */
(function(){
  const revealFailsafe=()=>document.documentElement.classList.remove('dabster-booting');
  setTimeout(revealFailsafe,9000);

  sessionStorage.setItem('dabster.environment.v44','free');
  sessionStorage.removeItem('dabster.test.case.v44');
  sessionStorage.removeItem('dabster.test.stage.v44');
  delete window.DABSTER_TEST_CASE_V50;delete window.DABSTER_TEST_FIXTURE_V64;

  const preload=[
    ['app-v5.js','v=10'],['app-v6.js','v=11'],['app-v7.js','v=12'],['app-v8.js','v=13'],
    ['app-v9.js','v=clean2'],['app-v10.js','v=clean2'],['app-v11.js','v=15'],['app-v12.js','v=16'],['app-v13.js','v=82']
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
  function loadPlanInvoiceSource(){loadScript('billing-plan-source-v52.js?v=82','plan-source-v82');}
  function loadPlanInvoiceBridge(){loadScript('billing-plan-invoice-v51.js?v=82','plan-invoice-v82',loadPlanInvoiceSource);}
  function loadBillingPlan(){loadScript('billing-plan-v47.js?v=82','billing-plan-v82',loadPlanInvoiceBridge);}
  function loadOfferFlow(){
    const test=sessionStorage.getItem('dabster.environment.v44')==='test';if(test&&location.hash.startsWith('#offerta-'))history.replaceState(null,'','#offerte');
    loadScript('offer-flow-v38.js?v=82','offer-flow-v82',loadBillingPlan);
  }
  function loadTrigger(){loadScript('billing-trigger-v82-loader.js?v=82','billing-trigger-v82');}
  function loadActivityDomain(){loadScript('activity-domain-v82.js?v=82','activity-domain-v82',loadTrigger);}

  const core=document.createElement('script');
  core.src='app-v13.js?v=82';core.dataset.cleanLegacyUi='1';core.onerror=revealFailsafe;
  core.onload=()=>{
    loadScript('workspace-cleanup-v34.js?v=34','workspace-cleanup-v82');
    loadScript('billing-entry-v34.js?v=50','billing-entry-v82');
    loadActivityDomain();
    if(document.readyState==='complete')setTimeout(loadOfferFlow,0);else window.addEventListener('load',loadOfferFlow,{once:true});
  };
  document.head.appendChild(core);
})();