/* v47 - Test-only data seed. No billing business rules live here. */
(function(){
  const PLAN=[
    {id:'26_022pe01:plan:deposit',baseType:'offer',eventLabel:'Acconto',percent:10,driver:'percent',trigger:'confirmation'},
    {id:'26_022pe01:plan:pua-close',baseType:'line',basePhase:'preliminare',eventLabel:'Saldo PUA',percent:90,driver:'percent',trigger:'activity_closed',activityPhase:'preliminare',activityName:'PUA'},
    {id:'26_022pe01:plan:pdc-close',baseType:'line',basePhase:'esecutivo',eventLabel:'Saldo Progetto PDC',percent:90,driver:'percent',trigger:'activity_closed',activityPhase:'esecutivo',activityName:'Progetto impianti per PDC'},
    {id:'26_022pe01:plan:vvf-close',baseType:'line',basePhase:'valutazione_vvf',eventLabel:'Saldo Parere VVF',percent:90,driver:'percent',trigger:'activity_closed',activityPhase:'valutazione_vvf',activityName:'Parere Preventivo VVF'}
  ];
  function apply(){
    const c=window.DABSTER_TEST_CASE_V44;
    if(!c||c.offer?.code!=='26_022pe01')return false;
    c.billingPlan=PLAN.map(x=>({...x}));return true;
  }
  let tries=0;const timer=setInterval(()=>{if(apply()||++tries>300)clearInterval(timer);},40);
  window.addEventListener('dabster-offer-flow-change',()=>setTimeout(apply,0));
})();