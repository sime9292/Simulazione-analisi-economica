/* v14 stable loader: prevent recursive table observer, keep explicit recalculation triggers */
(function(){
  const NativeMutationObserver=window.MutationObserver;
  window.MutationObserver=class extends NativeMutationObserver{
    observe(target,options){
      if(target?.classList?.contains('economic-table') && options?.childList && options?.characterData)return;
      return super.observe(target,options);
    }
  };

  const core=document.createElement('script');
  core.src='app-v10.js?v=14';
  core.onload=()=>waitReady();
  document.head.appendChild(core);

  function waitReady(attempt=0){
    const table=document.querySelector('#tab-analisi .economic-table');
    if(table && document.getElementById('reimbursementsSection')){
      document.addEventListener('click',e=>{
        if(e.target.closest('.add-assignment,.assignment-delete,.activity-delete,.add-activity,.phase-delete,#addEconomicPhase,#dimTransfer,.supplier-delete,#addSupplierCost')){
          setTimeout(()=>table.dispatchEvent(new Event('input',{bubbles:true})),20);
        }
      },true);
      return;
    }
    if(attempt<140)setTimeout(()=>waitReady(attempt+1),60);
  }
})();
