/* v39 entry - Lazy-load hierarchical billing dashboard and new invoice workflow. */
(function(){
  let loading=false,loaded=false;
  function loadWorkspace(){
    if(loaded||loading)return;loading=true;
    const script=document.createElement('script');script.src='billing-workspace-v39.js?v=39';script.dataset.cleanBillingWorkspace='1';
    script.onload=()=>{
      loaded=true;loading=false;
      if(!document.querySelector('script[data-billing-dashboard-totals-v40]')){
        const totals=document.createElement('script');totals.src='billing-dashboard-totals-v40.js?v=40';totals.dataset.billingDashboardTotalsV40='1';document.head.appendChild(totals);
      }
    };
    script.onerror=()=>{loading=false;console.error('[Dabster] Impossibile caricare workspace fatturazione v39');};document.head.appendChild(script);
  }
  function install(attempt=0){
    const nav=document.querySelector('#appSidebar .sidebar-nav');if(!nav){if(attempt<220)setTimeout(()=>install(attempt+1),50);return;}
    let btn=nav.querySelector('[data-page="billing"]');if(!btn){btn=document.createElement('button');btn.type='button';btn.className='sidebar-item';btn.dataset.page='billing';btn.innerHTML='<span class="side-icon">€</span>Dashboard Fatturazione';nav.appendChild(btn);}
    if(btn.dataset.billingEntryReady!=='1'){
      btn.dataset.billingEntryReady='1';btn.addEventListener('click',e=>{if(loaded)return;e.preventDefault();e.stopImmediatePropagation();history.replaceState(null,'','#dashboard-fatturazione');loadWorkspace();},true);
    }
    if(location.hash==='#dashboard-fatturazione'||location.hash==='#nuova-fattura')loadWorkspace();
  }
  install();
})();
