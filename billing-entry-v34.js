/* v49 entry - Shared lazy loader for dashboard/manual invoice + trigger-aware Billing Plan prefill. */
(function(){
  let loadingPromise=null;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function waitFor(fn,loops=160,delay=30){for(let i=0;i<loops;i++){const v=fn();if(v)return v;await sleep(delay);}return null;}
  async function ensureModule(selector,src,apiGetter,datasetName){const existingApi=apiGetter();if(existingApi)return existingApi;let script=document.querySelector(selector);if(!script){script=document.createElement('script');script.src=src;script.dataset[datasetName]='1';document.head.appendChild(script);}return waitFor(apiGetter,180,30);}
  function nativeApi(){const api=window.DABSTER_BILLING_V40||window.DABSTER_BILLING_V39||null;return api?.applySourceAllocations?api:null;}
  function anyApi(){return nativeApi()||window.DABSTER_BILLING_V40||window.DABSTER_BILLING_V39||null;}
  async function ensureInvoiceSource(){
    await ensureModule('script[data-plan-invoice-v55]','billing-plan-invoice-v51.js?v=55',()=>window.DABSTER_PLAN_TO_INVOICE_V55,'planInvoiceV55');
    const source=await ensureModule('script[data-plan-invoice-source-v58]','billing-plan-source-v52.js?v=58',()=>window.DABSTER_BILLING_PLAN_SOURCE_V58,'planInvoiceSourceV58');source?.refresh?.();setTimeout(()=>source?.refresh?.(),60);return source;
  }
  function openTarget(target){const api=anyApi();if(!api)return null;if(target==='invoice'){api.showInvoice?.();setTimeout(()=>ensureInvoiceSource(),0);}else api.showDashboard?.();return api;}
  function loadWorkspace(target='dashboard'){
    if(target==='invoice')history.replaceState(null,'','#nuova-fattura');else history.replaceState(null,'','#dashboard-fatturazione');
    if(nativeApi())return Promise.resolve(openTarget(target));
    if(loadingPromise)return loadingPromise.then(()=>openTarget(target));
    loadingPromise=new Promise((resolve,reject)=>{
      let existing=document.querySelector('script[data-clean-billing-workspace-v40]');
      if(existing){const wait=()=>{if(nativeApi())resolve(nativeApi());else setTimeout(wait,30);};wait();return;}
      existing=document.querySelector('script[data-clean-billing-workspace]');if(existing&&!nativeApi())existing.remove();
      const script=document.createElement('script');script.src='billing-workspace-v39.js?v=40';script.dataset.cleanBillingWorkspaceV40='1';script.dataset.cleanBillingWorkspace='1';
      script.onload=()=>{if(!nativeApi()){loadingPromise=null;reject(new Error('Workspace fatturazione v40 caricato senza API allocazioni.'));return;}if(!document.querySelector('script[data-billing-dashboard-totals-v40]')){const totals=document.createElement('script');totals.src='billing-dashboard-totals-v40.js?v=40';totals.dataset.billingDashboardTotalsV40='1';document.head.appendChild(totals);}resolve(nativeApi());};
      script.onerror=()=>{loadingPromise=null;console.error('[Dabster] Impossibile caricare workspace fatturazione v40');reject(new Error('Workspace fatturazione non disponibile.'));};document.head.appendChild(script);
    });
    return loadingPromise.then(()=>openTarget(target));
  }
  const api={loadWorkspace,ensureInvoiceSource};window.DABSTER_BILLING_ENTRY_V49=api;window.DABSTER_BILLING_ENTRY_V48=api;window.DABSTER_BILLING_ENTRY_V47=api;window.DABSTER_BILLING_ENTRY_V46=api;window.DABSTER_BILLING_ENTRY_V45=api;window.DABSTER_BILLING_ENTRY_V44=api;window.DABSTER_BILLING_ENTRY_V43=api;window.DABSTER_BILLING_ENTRY_V42=api;window.DABSTER_BILLING_ENTRY_V41=api;
  function install(attempt=0){const nav=document.querySelector('#appSidebar .sidebar-nav');if(!nav){if(attempt<220)setTimeout(()=>install(attempt+1),50);return;}let btn=nav.querySelector('[data-page="billing"]');if(!btn){btn=document.createElement('button');btn.type='button';btn.className='sidebar-item';btn.dataset.page='billing';btn.innerHTML='<span class="side-icon">€</span>Dashboard Fatturazione';nav.appendChild(btn);}const billable=nav.querySelector('[data-page="billable"]');if(billable&&btn.nextElementSibling!==billable)btn.insertAdjacentElement('afterend',billable);if(btn.dataset.billingEntryReady!=='49'){btn.dataset.billingEntryReady='49';btn.addEventListener('click',e=>{if(nativeApi())return;e.preventDefault();e.stopImmediatePropagation();loadWorkspace('dashboard');},true);}if(location.hash==='#nuova-fattura')loadWorkspace('invoice');else if(location.hash==='#dashboard-fatturazione')loadWorkspace('dashboard');}
  install();
})();