/* clean-v2 compatibility loader: no global MutationObserver overrides. */
(function(){
  const core=document.createElement('script');core.src='app-v10.js?v=clean2';document.head.appendChild(core);
  document.addEventListener('click',e=>{
    if(e.target.closest('.add-assignment,.assignment-delete,.activity-delete,.add-activity,.phase-delete,#addEconomicPhase,.supplier-delete,#addSupplierCost'))setTimeout(()=>window.dabsterRecalcEconomic?.(),30);
  },true);
})();
