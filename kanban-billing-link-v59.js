/* v59 - Kanban ↔ Billing trigger bridge + deterministic Test re-entry guard. */
(function(){
  const ENV_KEY='dabster.environment.v44';
  const STAGE_KEY='dabster.test.stage.v44';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const statusCache=new Map();
  let observer=null,restoreQueued=false,restoring=false,lastTriggerCheck=null;

  const isTest=()=>sessionStorage.getItem(ENV_KEY)==='test';
  const testStage=()=>Number(sessionStorage.getItem(STAGE_KEY)||0);
  const testCase=()=>window.DABSTER_TEST_CASE_V50||null;
  const triggerApi=()=>window.DABSTER_BILLING_TRIGGER_V58||null;

  async function waitFor(fn,loops=220,delay=40){
    for(let i=0;i<loops;i++){const v=fn();if(v)return v;await sleep(delay);}
    return null;
  }
  function field(label){
    return [...document.querySelectorAll('#tab-dati label.field')]
      .find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))||null;
  }
  function control(label){return field(label)?.querySelector('input,select,textarea')||null;}
  function amountField(label){
    return [...document.querySelectorAll('#tab-dati .accordion.amounts label.field')]
      .find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))
      ?.querySelector('input')||null;
  }
  function setValue(el,value,type='input'){
    if(!el)return false;
    const next=String(value),current=String(el.value??'');
    if(current===next)return false;
    el.value=next;
    el.dispatchEvent(new Event(type,{bubbles:true}));
    return true;
  }
  function setMoney(el,value){
    if(!el)return false;
    if(Math.abs(num(el.value)-Number(value||0))<=.01)return false;
    el.value=money(value);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }
  function setSelect(el,value){
    if(!el)return false;
    let opt=[...el.options].find(o=>String(o.value)===String(value)||norm(o.textContent)===norm(value));
    if(!opt){opt=new Option(value,value);el.add(opt);}
    if(el.value===opt.value)return false;
    el.value=opt.value;el.dispatchEvent(new Event('change',{bubbles:true}));return true;
  }
  function cardForPhase(id){
    return [...document.querySelectorAll('#phaseWorkCards>.phase-work-card')]
      .find(c=>(c.querySelector('.phase-type-select')?.value||c.dataset.planningPhase||'')===id)||null;
  }
  function activityPresent(phase,name){
    const card=cardForPhase(phase);if(!card)return false;
    return [...card.querySelectorAll('.activity-card .activity-name')]
      .some(x=>norm(x.value)===norm(name));
  }
  function offerLineRows(){
    const clean=document.getElementById('cleanOfferLineRows');
    if(clean)return [...clean.querySelectorAll('.clean-line')].map(row=>({
      row,phase:row.dataset.phase||row.querySelector('.clean-line-phase-select')?.value||'',
      desc:row.querySelector('.clean-line-desc'),amount:row.querySelector('.clean-line-amount')
    }));
    const legacy=document.getElementById('offerLineRows');
    if(legacy)return [...legacy.querySelectorAll('.offer-line-row')].map(row=>({
      row,phase:row.dataset.phase||row.querySelector('.offer-line-phase-select')?.value||'',
      desc:row.querySelector('.offer-line-desc'),amount:row.querySelector('.offer-line-amount')
    }));
    return [];
  }
  function offerLinesMatch(c){
    if(testStage()<2)return true;
    const rows=offerLineRows(),wanted=c.lines||[];
    if(!rows.length)return false;
    const relevant=rows.filter(r=>wanted.some(x=>x.phase===r.phase));
    if(relevant.length!==wanted.length)return false;
    return wanted.every(x=>{
      const r=relevant.find(y=>y.phase===x.phase);
      return !!r&&norm(r.desc?.value)===norm(x.description)&&Math.abs(num(r.amount?.value)-Number(x.amount||0))<=.01;
    });
  }
  function activitiesMatch(c){
    if(testStage()<1)return true;
    return Object.entries(c.activities||{}).every(([phase,a])=>activityPresent(phase,a.name));
  }
  function expectedPlanIds(c){
    return (c.billingPlan||[])
      .filter(x=>!(c.offer?.code==='26_022pe01'&&String(x.id)==='26_022pe01:plan:pua-close'))
      .map(x=>String(x.id)).sort();
  }
  function planMatches(c){
    if(testStage()<3)return true;
    const rows=window.DABSTER_BILLING_PLAN_V47?.getSnapshot?.()?.rows||[];
    const got=rows.map(x=>String(x.id)).sort(),exp=expectedPlanIds(c);
    return got.length===exp.length&&exp.every((x,i)=>got[i]===x);
  }
  function coreValuesMatch(c){
    return norm(control('Codice')?.value)===norm(c.offer?.code)&&
      Math.abs(num(document.getElementById('totaleOfferta')?.value)-Number(c.offer?.amount||0))<=.01;
  }
  function currentTestIsHealthy(c){
    return coreValuesMatch(c)&&activitiesMatch(c)&&offerLinesMatch(c)&&planMatches(c);
  }

  function enforceLight(c){
    if(!c||testStage()<1)return;
    const comm=control('Commessa');
    if(comm){
      let opt=[...comm.options].find(o=>o.value===c.offer.commessaLabel);
      if(!opt){opt=new Option(c.offer.commessaLabel,c.offer.commessaLabel);comm.add(opt);}
      if(comm.value!==opt.value){comm.value=opt.value;comm.dispatchEvent(new Event('change',{bubbles:true}));}
    }
    setValue(control('Titolo'),c.offer.title);
    setValue(control('Codice'),c.offer.code);
    setValue(control('Data offerta'),c.offer.offerDate);
    setMoney(amountField('Importo stimato'),c.offer.amount);
    setMoney(amountField('Consulenza'),c.confirmation?.consulting||0);
    setMoney(amountField('Progetti'),c.confirmation?.projects||0);
    setMoney(amountField('Direzione lavori'),c.confirmation?.direction||0);
    setMoney(document.getElementById('totaleOfferta'),c.offer.amount);

    if(testStage()>=2){
      setSelect(control('Stato'),'Confermata');
      const rows=offerLineRows();
      (c.lines||[]).forEach(line=>{
        const r=rows.find(x=>x.phase===line.phase);if(!r)return;
        if(norm(r.desc?.value)!==norm(line.description)){
          r.desc.value=line.description;r.desc.dispatchEvent(new Event('input',{bubbles:true}));r.desc.dispatchEvent(new Event('change',{bubbles:true}));
        }
        if(Math.abs(num(r.amount?.value)-Number(line.amount||0))>.01){
          r.amount.value=money(line.amount);r.row.dataset.manualAmount='1';
          r.amount.dispatchEvent(new Event('input',{bubbles:true}));r.amount.dispatchEvent(new Event('change',{bubbles:true}));
        }
      });
    }
    const proposals=new Map((c.lines||[]).map(x=>[x.phase,Number(x.amount||0)]));
    document.querySelectorAll('#tab-analisi .economic-table .phase-row[data-economic-phase]').forEach(row=>{
      const phase=row.dataset.economicPhase||'',input=row.querySelector('.ae-proposal'),target=proposals.get(phase)||0;
      if(input&&Math.abs(num(input.value)-target)>.01){
        input.value=money(target);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
      }
    });
  }

  async function rebuildTest(targetStage,c){
    if(restoring)return;
    restoring=true;
    try{
      const b1=await waitFor(()=>document.querySelector('#dabsterEnvironmentBar [data-load-analysis]:not([disabled])'));
      if(!b1)return;
      b1.click();
      if(!await waitFor(()=>Number(sessionStorage.getItem(STAGE_KEY)||0)>=1&&document.querySelector('#dabsterEnvironmentBar [data-confirm-lines]:not([disabled])'),320,50))return;
      if(targetStage>=2){
        document.querySelector('#dabsterEnvironmentBar [data-confirm-lines]')?.click();
        if(!await waitFor(()=>Number(sessionStorage.getItem(STAGE_KEY)||0)>=2&&document.querySelector('#dabsterEnvironmentBar [data-load-plan]:not([disabled])'),320,50))return;
      }
      if(targetStage>=3){
        document.querySelector('#dabsterEnvironmentBar [data-load-plan]')?.click();
        await waitFor(()=>Number(sessionStorage.getItem(STAGE_KEY)||0)>=3,220,50);
      }
      enforceLight(c);
      showKbToast('Caso Test ripristinato · valori invariati');
    }finally{restoring=false;}
  }

  async function ensureTestStable(){
    if(!isTest()||testStage()<1||restoring)return;
    const c=await waitFor(()=>testCase(),120,40);if(!c)return;
    const target=testStage();
    if(!currentTestIsHealthy(c)){
      await rebuildTest(target,c);
      return;
    }
    enforceLight(c);
  }
  function scheduleTestStable(delay=100){
    if(!isTest()||testStage()<1||restoreQueued)return;
    restoreQueued=true;setTimeout(()=>{restoreQueued=false;ensureTestStable();},delay);
  }

  function visibleKanban(){
    const board=document.getElementById('kanbanBoard');
    const phase=document.querySelector('.kanban-phase-tab.active')?.dataset.phase||'';
    if(!board||!phase)return [];
    return [...board.querySelectorAll('.kanban-list[data-status] .kanban-card[data-id]')].map(card=>({
      id:String(card.dataset.id||''),phaseType:phase,
      title:String(card.querySelector('.kanban-card-title')?.textContent||'').trim(),
      status:String(card.closest('.kanban-list')?.dataset.status||'')
    })).filter(x=>x.id);
  }
  function showKbToast(text){
    const el=document.getElementById('kbToast');if(!el)return;
    el.textContent=text;el.classList.add('show');clearTimeout(showKbToast.timer);
    showKbToast.timer=setTimeout(()=>el.classList.remove('show'),2600);
  }
  function linkedEventsFor(item){
    const events=triggerApi()?.getSnapshot?.()?.events||[];
    return events.filter(e=>e.trigger==='activity_closed'&&(
      String(e.activity?.id||'')===String(item.id)||
      (String(e.activity?.phaseType||'')===String(item.phaseType)&&norm(e.activity?.title)===norm(item.title))||
      (String(e.activityKey||'').startsWith(item.phaseType+'::')&&norm(String(e.activityKey).split('::').slice(1).join('::'))===norm(item.title))
    ));
  }
  async function verifyTrigger(item,previousStatus,attempt=0){
    window.dispatchEvent(new CustomEvent('dabster-billing-plan-ready',{detail:{reason:'kanban-status-change'}}));
    await sleep(attempt?180:90);
    const linked=linkedEventsFor(item);
    if(!linked.length){
      lastTriggerCheck={ok:true,linked:false,item,previousStatus,checkedAt:Date.now()};
      return lastTriggerCheck;
    }
    if(item.status==='chiusa'){
      const ok=linked.every(e=>e.matured===true&&(e.billable>0||e.status==='Fatturato'));
      if(!ok&&attempt<2)return verifyTrigger(item,previousStatus,attempt+1);
      lastTriggerCheck={ok,linked:true,item,previousStatus,events:linked.map(e=>({id:e.id,status:e.status,billable:e.billable,matured:e.matured})),checkedAt:Date.now()};
      if(ok){
        const total=linked.reduce((s,e)=>s+Number(e.billable||0),0);
        showKbToast(total>0?`Trigger attivato · Fatturabile ${money(total)} €`:'Trigger attivato · evento già fatturato');
      }else{
        showKbToast('Attenzione · trigger fatturazione non attivato');
        console.error('[Dabster v59] Trigger non maturato dopo chiusura attività',lastTriggerCheck);
      }
    }else if(previousStatus==='chiusa'){
      const ok=linked.every(e=>e.matured===false||e.anomaly===true||e.status==='Fatturato');
      lastTriggerCheck={ok,linked:true,item,previousStatus,events:linked.map(e=>({id:e.id,status:e.status,billable:e.billable,matured:e.matured,anomaly:e.anomaly})),checkedAt:Date.now()};
      showKbToast(ok?'Trigger riaperto · evento non più maturato':'Attenzione · verifica riapertura trigger');
    }
    window.dispatchEvent(new CustomEvent('dabster-kanban-trigger-verified',{detail:lastTriggerCheck}));
    return lastTriggerCheck;
  }
  function scanKanban({initial=false}={}){
    const items=visibleKanban();
    items.forEach(item=>{
      const prev=statusCache.get(item.id);
      statusCache.set(item.id,item);
      if(!initial&&prev&&prev.status!==item.status){
        window.dispatchEvent(new CustomEvent('dabster-kanban-status-change',{detail:{...item,previousStatus:prev.status}}));
        verifyTrigger(item,prev.status);
      }
    });
  }
  function installKanbanObserver(){
    const root=document.getElementById('kanbanPage')||document.documentElement;
    observer=new MutationObserver(()=>scanKanban());
    observer.observe(root,{childList:true,subtree:true});
    scanKanban({initial:true});
  }

  function install(){
    installKanbanObserver();
    document.addEventListener('click',e=>{
      if(e.target.closest?.('#appSidebar [data-page="offer"]'))scheduleTestStable(120);
      if(e.target.closest?.('#appSidebar [data-page="kanban"]'))setTimeout(()=>scanKanban({initial:true}),80);
    },true);
    window.addEventListener('hashchange',()=>{
      if(location.hash==='#analisi'||location.hash.startsWith('#offerta-'))scheduleTestStable(120);
      if(location.hash==='#attivita-commessa')setTimeout(()=>scanKanban({initial:true}),80);
    });
    window.addEventListener('pageshow',()=>scheduleTestStable(180));
    setTimeout(scheduleTestStable,350);
    window.DABSTER_KANBAN_BILLING_V59={
      getVisibleItems:visibleKanban,
      ensureTestStable,
      getLastTriggerCheck:()=>lastTriggerCheck,
      verifyTrigger:(id)=>{
        const item=visibleKanban().find(x=>String(x.id)===String(id));
        return item?verifyTrigger(item,statusCache.get(item.id)?.status||''):Promise.resolve(null);
      }
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();