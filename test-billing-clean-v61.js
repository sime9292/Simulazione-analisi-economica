/* v61 - Test billing isolation: remove fallback 26_142 invoices from the active Test case without touching user-created invoices. */
(function(){
  const ENV_KEY='dabster.environment.v44';
  const STAGE_KEY='dabster.test.stage.v44';
  const TEST_CODE='26_022pe01';
  const FALLBACK_IDS=new Set(['ft-118','ft-171','ft-219']);
  let cleaned=false,checking=false;

  const isTest=()=>sessionStorage.getItem(ENV_KEY)==='test';
  const stage=()=>Number(sessionStorage.getItem(STAGE_KEY)||0);
  const currentCode=()=>String(window.DABSTER_OFFER_FLOW?.getSnapshot?.()?.offer?.code||'').trim();
  const billingApi=()=>window.DABSTER_BILLING_V40||window.DABSTER_BILLING_V39||null;

  function audit(){
    const api=billingApi();
    const metrics=api?.getOfferMetrics?.();
    if(!metrics)return null;
    const result={
      ok:Math.abs(Number(metrics.amount||0)-19000)<=.01&&Number(metrics.billed||0)<=.01&&Math.abs(Number(metrics.residual||0)-19000)<=.01,
      amount:Number(metrics.amount||0),
      billed:Number(metrics.billed||0),
      residual:Number(metrics.residual||0),
      lines:(metrics.lines||[]).map(x=>({id:x.id,phase:x.phase,amount:x.amount,billed:x.billed,residual:x.residual}))
    };
    console[result.ok?'info':'warn']('[Dabster Test v61] audit residui iniziali',result);
    return result;
  }

  async function ensureClean(){
    if(checking||cleaned||!isTest()||stage()<2)return;
    if(currentCode()!==TEST_CODE)return;
    checking=true;
    try{
      for(let i=0;i<220;i++){
        const api=billingApi(),model=api?.getModel?.();
        if(model&&Array.isArray(model.invoices)){
          const before=model.invoices.length;
          for(let j=model.invoices.length-1;j>=0;j--){
            if(FALLBACK_IDS.has(String(model.invoices[j]?.id||'')))model.invoices.splice(j,1);
          }
          cleaned=true;
          if(model.invoices.length!==before){
            window.dispatchEvent(new CustomEvent('dabster-offer-flow-change',{detail:window.DABSTER_OFFER_FLOW?.getSnapshot?.()||{}}));
          }
          setTimeout(audit,0);
          return;
        }
        await new Promise(r=>setTimeout(r,40));
      }
    }finally{checking=false;}
  }

  window.addEventListener('dabster-offer-flow-change',()=>setTimeout(ensureClean,0));
  window.addEventListener('pageshow',()=>setTimeout(ensureClean,100));
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#appSidebar [data-page="billing"]'))setTimeout(ensureClean,0);
  },true);
  setTimeout(ensureClean,250);

  window.DABSTER_TEST_BILLING_V61={ensureClean,audit};
})();