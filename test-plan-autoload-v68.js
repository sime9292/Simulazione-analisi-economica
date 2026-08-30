/* v69 - Auto-load controlled TEST_FATT_001 billing plan from live UI context. Temporary test-only module. */
(function(){
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const PLAN=[
    {id:'TEST_FATT_001:plan:acconto',baseType:'offer',eventLabel:'Acconto 10% alla conferma',percent:10,driver:'percent',trigger:'confirmation'},
    {id:'TEST_FATT_001:plan:consegna-esecutivo',baseType:'line',basePhase:'esecutivo',eventLabel:'Consegna progetto esecutivo 90%',percent:90,driver:'percent',trigger:'activity_closed',activityPhase:'esecutivo',activityName:'Consegna progetto esecutivo - TEST'},
    {id:'TEST_FATT_001:plan:consegna-consulenza',baseType:'line',basePhase:'consulenze',eventLabel:'Consegna consulenza specialistica 90%',percent:90,driver:'percent',trigger:'activity_closed',activityPhase:'consulenze',activityName:'Conclusione consulenza specialistica - TEST'}
  ];
  let seeded=false,queued=false;

  function expectedRows(snapshot){
    const ids=new Set((snapshot?.rows||[]).map(r=>String(r.id)));
    return PLAN.every(r=>ids.has(r.id));
  }
  function contextReady(api){
    if(sessionStorage.getItem('dabster.environment.v44')!=='test')return false;
    const ctx=api.getContext?.();
    if(!ctx||ctx.code!=='TEST_FATT_001pe01'||norm(ctx.status)!=='confermata')return false;
    if(!Array.isArray(ctx.lines)||ctx.lines.length<2)return false;
    const execLine=ctx.lines.some(l=>l.phase==='esecutivo'&&Number(l.amount||0)>0);
    const consLine=ctx.lines.some(l=>l.phase==='consulenze'&&Number(l.amount||0)>0);
    if(!execLine||!consLine)return false;
    const activities=ctx.activities||[];
    const exec=activities.some(a=>a.phase==='esecutivo'&&norm(a.name)===norm('Consegna progetto esecutivo - TEST'));
    const cons=activities.some(a=>a.phase==='consulenze'&&norm(a.name)===norm('Conclusione consulenza specialistica - TEST'));
    return exec&&cons;
  }
  function markReady(result){
    seeded=true;
    sessionStorage.setItem('dabster.test.stage.v44','3');
    const stage=document.querySelector('#dabsterEnvironmentBar .td50-stage');
    if(stage)stage.textContent='Piano caricato · 1.500 € subito fatturabili';
    const error=document.querySelector('#dabsterEnvironmentBar .td50-error');
    if(error)error.remove();
    window.dispatchEvent(new CustomEvent('dabster-test-plan-v69-ready',{detail:result}));
  }
  async function ensurePlan(){
    if(seeded)return true;
    const api=window.DABSTER_BILLING_PLAN_V47;
    if(!api?.seed||!api?.getSnapshot||!api?.getContext)return false;
    const current=api.getSnapshot();
    if(expectedRows(current)){markReady(current);return true;}
    if(!contextReady(api))return false;
    const result=api.seed(PLAN,{replace:true});
    if(result.incomplete||Math.abs(Number(result.allocated||0)-15000)>0.01){
      console.error('[Dabster Test v69] Piano TEST_FATT_001 non valido',result);
      return false;
    }
    api.refresh?.();
    markReady(result);
    console.log('[Dabster Test v69] Piano caricato: 1.500 acconto + 9.000 consegna esecutivo + 4.500 consegna consulenza');
    return true;
  }
  function schedule(){
    if(queued||seeded)return;queued=true;setTimeout(async()=>{queued=false;await ensurePlan();},40);
  }
  window.addEventListener('dabster-offer-flow-change',schedule);
  window.addEventListener('dabster-billing-plan-ready',schedule);
  window.addEventListener('dabster-offer-lines-change',schedule);
  document.addEventListener('change',schedule,true);
  document.addEventListener('click',schedule,true);
  let tries=0;const timer=setInterval(async()=>{if(await ensurePlan()||++tries>300)clearInterval(timer);},100);
  window.DABSTER_TEST_PLAN_V69={ensurePlan,getPlan:()=>PLAN.map(x=>({...x}))};
})();