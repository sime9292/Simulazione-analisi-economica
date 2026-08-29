/* clean-v2 compatibility loader: preload legacy UI modules without patching browser globals. */
(function(){
  const revealFailsafe=()=>document.documentElement.classList.remove('dabster-booting');
  setTimeout(revealFailsafe,9000);

  const preload=[
    ['app-v5.js','v=10'],['app-v6.js','v=11'],['app-v7.js','v=12'],['app-v8.js','v=13'],
    ['app-v9.js','v=clean2'],['app-v10.js','v=clean2'],['app-v11.js','v=15'],['app-v12.js','v=16'],['app-v13.js','v=clean2']
  ];
  preload.forEach(([file,query])=>{
    if(document.querySelector(`link[data-clean-preload="${file}"]`))return;
    const link=document.createElement('link');link.rel='preload';link.as='script';link.href=`${file}?${query}`;link.dataset.cleanPreload=file;document.head.appendChild(link);
  });

  function loadOfferFlow(){
    if(document.querySelector('script[data-offer-flow-v38]'))return;
    const flow=document.createElement('script');flow.src='offer-flow-v38.js?v=38';flow.dataset.offerFlowV38='1';
    flow.onerror=()=>{revealFailsafe();console.error('[Dabster] Errore caricamento flusso offerta v38');};document.head.appendChild(flow);
  }
  function loadTestDataEntry(){
    if(document.querySelector('script[data-test-data-entry-v45]'))return;
    const test=document.createElement('script');test.src='test-data-entry-v44.js?v=45';test.dataset.testDataEntryV45='1';
    test.onerror=()=>console.error('[Dabster] Errore caricamento Ambiente Test dati v45');document.head.appendChild(test);
  }

  const core=document.createElement('script');
  core.src='app-v13.js?v=clean2';core.dataset.cleanLegacyUi='1';core.onerror=revealFailsafe;
  core.onload=()=>{
    const cleanup=document.createElement('script');cleanup.src='workspace-cleanup-v34.js?v=34';document.head.appendChild(cleanup);
    const billingEntry=document.createElement('script');billingEntry.src='billing-entry-v34.js?v=39';document.head.appendChild(billingEntry);
    loadTestDataEntry();
    if(document.readyState==='complete')setTimeout(loadOfferFlow,0);else window.addEventListener('load',loadOfferFlow,{once:true});
  };
  document.head.appendChild(core);
})();