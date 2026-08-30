/* v67 - Temporary controlled fixture TEST_FATT_001. REMOVE after user billing test. */
(function(){
  const ENV_KEY='dabster.environment.v44';
  const CASE_KEY='dabster.test.case.v44';
  const STAGE_KEY='dabster.test.stage.v44';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fire=(el,type='input')=>el?.dispatchEvent(new Event(type,{bubbles:true}));

  const FIXTURE={
    id:'TEST_FATT_001',
    label:'TEST_FATT_001 · Collaudo fatturazione',
    offer:{
      id:'TEST_FATT_001pe01',code:'TEST_FATT_001pe01',commessa:'TEST_FATT_001',
      commessaLabel:'TEST_FATT_001 - COMMESSA COLLAUDO FATTURAZIONE',
      title:'Progettazione esecutiva e consulenza tecnica - caso collaudo',
      client:'CLIENTE TEST SRL',offerDate:'30/08/2026',status:'Confermata',amount:15000
    },
    confirmation:{consulting:5000,projects:10000,direction:0},
    lines:[
      {id:'TEST_FATT_001pe01:line:esecutivo',phase:'esecutivo',description:'Progetto esecutivo impianti - TEST',amount:10000},
      {id:'TEST_FATT_001pe01:line:consulenze',phase:'consulenze',description:'Consulenza tecnica specialistica - TEST',amount:5000}
    ],
    activities:{
      esecutivo:{name:'Consegna progetto esecutivo - TEST',assign:[['RS_IE',18]]},
      consulenze:{name:'Conclusione consulenza specialistica - TEST',assign:[['PM',6]]}
    },
    billingPlan:[
      {id:'TEST_FATT_001:plan:acconto',baseType:'offer',eventLabel:'Acconto 10% alla conferma',percent:10,driver:'percent',trigger:'confirmation'},
      {id:'TEST_FATT_001:plan:saldo-esecutivo',baseType:'line',basePhase:'esecutivo',eventLabel:'Saldo progetto esecutivo 90%',percent:90,driver:'percent',trigger:'activity_closed',activityPhase:'esecutivo',activityName:'Consegna progetto esecutivo - TEST'},
      {id:'TEST_FATT_001:plan:saldo-consulenze',baseType:'line',basePhase:'consulenze',eventLabel:'Saldo consulenza 90%',percent:90,driver:'percent',trigger:'activity_closed',activityPhase:'consulenze',activityName:'Conclusione consulenza specialistica - TEST'}
    ]
  };

  let env=sessionStorage.getItem(ENV_KEY)||'free';
  let stage=Number(sessionStorage.getItem(STAGE_KEY)||0);if(![0,1,2,3].includes(stage))stage=0;
  let bar=null,busy=false,billingPrepared=false,lastError='',originalGetSnapshot=null;

  function setControl(el,value,type='input'){if(!el)return;el.value=String(value);fire(el,type);}
  function field(label){return [...document.querySelectorAll('#tab-dati label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))||null;}
  function control(label){return field(label)?.querySelector('input,select,textarea')||null;}
  function amountField(label){return [...document.querySelectorAll('#tab-dati .accordion.amounts label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))?.querySelector('input')||null;}
  function statusSelect(){return control('Stato');}
  function tab(name){document.querySelector(`.tab[data-tab="${name}"]`)?.click();}
  function scrollTo(el){try{el?.scrollIntoView({behavior:'smooth',block:'center'});}catch{el?.scrollIntoView();}}
  async function waitFor(fn,loops=260,delay=40){for(let i=0;i<loops;i++){const v=fn();if(v)return v;await sleep(delay);}return null;}
  async function waitFlow(){return waitFor(()=>window.DABSTER_OFFER_FLOW?.openNewOffer&&window.DABSTER_OFFER_FLOW);}
  async function waitDetail(){return waitFor(()=>document.getElementById('analysisSubtabs')&&document.querySelectorAll('#phaseWorkCards>.phase-work-card').length>=7&&document.getElementById('totaleOfferta'));}
  function setStatus(label){const s=statusSelect();if(!s)return false;let o=[...s.options].find(x=>norm(x.value||x.textContent)===norm(label));if(!o){o=new Option(label,label);s.add(o);}s.value=o.value;fire(s,'change');return true;}
  function cardForPhase(id){return [...document.querySelectorAll('#phaseWorkCards>.phase-work-card')].find(c=>(c.querySelector('.phase-type-select')?.value||c.dataset.planningPhase||'')===id)||null;}
  function clearActivities(){document.querySelectorAll('#phaseWorkCards .activity-delete').forEach(b=>b.click());}
  function syncCaseChrome(){const crumb=document.querySelector('.breadcrumb strong');if(crumb)crumb.textContent=FIXTURE.offer.code;history.replaceState(null,'','#offerta-'+FIXTURE.offer.code);}

  function snapshot(){
    const confirmed=stage>=2;
    return {offer:{...FIXTURE.offer,status:confirmed?'Confermata':'In lavorazione'},lines:confirmed?FIXTURE.lines.map(x=>({...x})):[],loadedOffer:stage>0,testEnvironment:true};
  }
  async function patchFlow(){
    const flow=await waitFlow();if(!flow)return null;
    if(!originalGetSnapshot)originalGetSnapshot=flow.getSnapshot?.bind(flow)||null;
    flow.getSnapshot=()=>snapshot();
    window.DABSTER_TEST_CASE_V50=JSON.parse(JSON.stringify(FIXTURE));
    window.DABSTER_TEST_FIXTURE_V64=window.DABSTER_TEST_CASE_V50;
    window.dispatchEvent(new CustomEvent('dabster-offer-flow-change',{detail:snapshot()}));
    return flow;
  }
  function restoreFlow(){const flow=window.DABSTER_OFFER_FLOW;if(flow&&originalGetSnapshot){flow.getSnapshot=originalGetSnapshot;originalGetSnapshot=null;}delete window.DABSTER_TEST_CASE_V50;window.DABSTER_TEST_FIXTURE_V64=null;}

  async function clearPostConfirmationState(){
    const api=await waitFor(()=>window.DABSTER_OFFER_LINES?.resetPostConfirmation&&window.DABSTER_OFFER_LINES,120,30);
    if(api){api.resetPostConfirmation();await sleep(60);}
  }
  async function addActivity(phase,item){
    const card=cardForPhase(phase);if(!card)throw new Error(`Fase ${phase} non disponibile.`);
    card.querySelector('.add-activity')?.click();await sleep(70);
    const activity=[...card.querySelectorAll('.activity-card')].at(-1);if(!activity)throw new Error(`Impossibile creare attività ${item.name}.`);
    const name=activity.querySelector('.activity-name');if(name){name.value=item.name;fire(name,'input');fire(name,'change');}
    const rows=activity.querySelector('.assignment-rows');if(rows)rows.innerHTML='';
    for(const [role,hours] of item.assign){
      activity.querySelector('.add-assignment')?.click();await sleep(30);
      const row=activity.querySelector('.assignment-rows .assignment-row:last-child');
      const r=row?.querySelector('.assignment-role'),h=row?.querySelector('.assignment-hours');
      if(r){r.value=role;fire(r,'change');}if(h){h.value=String(hours);fire(h,'input');fire(h,'change');}
    }
  }
  function setProposal(phase,value){const row=document.querySelector(`#tab-analisi .economic-table .phase-row[data-economic-phase="${phase}"]`),input=row?.querySelector('.ae-proposal');if(input){input.value=money(value);fire(input,'input');fire(input,'change');}}
  function enforceEconomicPhases(){
    const wanted=new Set(FIXTURE.lines.map(x=>x.phase));
    document.querySelectorAll('#tab-analisi .economic-table .phase-row[data-economic-phase]').forEach(row=>{
      const phase=row.dataset.economicPhase||'',keep=wanted.has(phase),proposal=row.querySelector('.ae-proposal');
      row.dataset.economicActive=keep?'1':'0';row.hidden=!keep;
      if(keep)row.style.removeProperty('display');else row.style.setProperty('display','none','important');
      if(!keep&&proposal){proposal.value='0,00';fire(proposal,'input');fire(proposal,'change');}
    });
  }
  function offerLineRows(){return [...document.querySelectorAll('#offerLineRows .offer-line-row')];}
  function offerLinePhase(row){return row.dataset.phase||row.querySelector('.offer-line-phase-select')?.value||'';}
  function enforceExactOfferLines(){
    const rows=offerLineRows();
    for(const line of FIXTURE.lines){
      const row=rows.find(r=>offerLinePhase(r)===line.phase);if(!row)continue;
      const desc=row.querySelector('.offer-line-desc'),amount=row.querySelector('.offer-line-amount');
      if(desc){desc.value=line.description;fire(desc,'input');fire(desc,'change');}
      if(amount){amount.value=money(line.amount);row.dataset.manualAmount='1';fire(amount,'input');fire(amount,'change');fire(amount,'blur');}
    }
    const relevant=offerLineRows().filter(r=>FIXTURE.lines.some(x=>x.phase===offerLinePhase(r)));
    const total=relevant.reduce((s,r)=>s+num(r.querySelector('.offer-line-amount')?.value),0);
    const ok=FIXTURE.lines.every(x=>relevant.some(r=>offerLinePhase(r)===x.phase))&&Math.abs(total-FIXTURE.offer.amount)<=0.01;
    return {ok,total,count:relevant.length};
  }

  async function loadAnalysis(){
    if(busy)return false;busy=true;lastError='';renderBar();
    try{
      stage=0;sessionStorage.setItem(STAGE_KEY,'0');billingPrepared=false;
      window.DABSTER_BILLING_PLAN_V47?.reset?.();window.DABSTER_BILLING_MODEL_V39={invoices:[]};
      const flow=await waitFlow();if(!flow)throw new Error('Flusso Offerta non disponibile.');
      restoreFlow();await flow.openNewOffer();if(!await waitDetail())throw new Error('Dettaglio Offerta non disponibile.');
      tab('dati');setStatus('In lavorazione');await clearPostConfirmationState();
      const comm=control('Commessa');if(comm){let o=[...comm.options].find(x=>x.value===FIXTURE.offer.commessaLabel);if(!o){o=new Option(FIXTURE.offer.commessaLabel,FIXTURE.offer.commessaLabel);comm.add(o);}comm.value=o.value;fire(comm,'change');}
      setControl(control('Titolo'),FIXTURE.offer.title);setControl(control('Codice'),FIXTURE.offer.code);setControl(control('Data offerta'),FIXTURE.offer.offerDate);
      setControl(amountField('Importo stimato'),FIXTURE.offer.amount);setControl(amountField('Consulenza'),FIXTURE.confirmation.consulting);setControl(amountField('Progetti'),FIXTURE.confirmation.projects);setControl(amountField('Direzione lavori'),0);
      tab('analisi');window.dabsterAnalysisSubtabs?.activate?.('impianti');clearActivities();await sleep(160);
      for(const [phase,item] of Object.entries(FIXTURE.activities))await addActivity(phase,item);
      await sleep(180);window.dabsterEconomicPhaseController?.reconcile?.();
      ['preliminare','definitivo','valutazione_vvf','esecutivo','dl','scia_vvf','consulenze'].forEach(p=>setProposal(p,0));
      FIXTURE.lines.forEach(l=>setProposal(l.phase,l.amount));enforceEconomicPhases();setControl(document.getElementById('tradePct'),0);window.dabsterRecalcEconomic?.();
      setControl(document.getElementById('totaleOfferta'),FIXTURE.offer.amount);fire(document.getElementById('totaleOfferta'),'blur');
      stage=1;sessionStorage.setItem(CASE_KEY,FIXTURE.id);sessionStorage.setItem(STAGE_KEY,'1');await patchFlow();syncCaseChrome();scrollTo(document.getElementById('analysisSubtabImpianti'));return true;
    }catch(err){lastError=err?.message||String(err);console.error('[Dabster Test v67]',err);return false;}
    finally{busy=false;renderBar();}
  }

  async function confirmAndCreateLines(){
    if(busy||stage<1)return false;busy=true;lastError='';renderBar();
    try{
      if(!await waitDetail())throw new Error('Dettaglio Offerta non disponibile.');
      enforceEconomicPhases();FIXTURE.lines.forEach(l=>setProposal(l.phase,l.amount));window.dabsterRecalcEconomic?.();tab('dati');
      if(!setStatus('Confermata'))throw new Error('Stato Confermata non disponibile.');
      const ready=await waitFor(()=>!document.getElementById('confirmationAmountsSection')?.hidden&&document.getElementById('confirmationConsulting')&&document.getElementById('confirmationProjects'));
      if(!ready)throw new Error('Sezione Importo Conferma non disponibile.');
      [['confirmationConsulting',5000],['confirmationProjects',10000],['confirmationDirection',0]].forEach(([id,v])=>{const el=document.getElementById(id);if(el){el.value=money(v);fire(el,'input');fire(el,'change');fire(el,'blur');}});
      await sleep(180);window.DABSTER_OFFER_LINES?.sync?.();
      if(!await waitFor(()=>offerLineRows().length>=2))throw new Error('Righe Offerta non disponibili dopo la conferma.');
      let check=enforceExactOfferLines();await sleep(100);window.DABSTER_OFFER_LINES?.sync?.();await sleep(100);check=enforceExactOfferLines();
      if(!check.ok)throw new Error(`Righe Offerta non quadrate: ${money(check.total)} € invece di 15.000,00 €.`);
      stage=2;sessionStorage.setItem(STAGE_KEY,'2');await patchFlow();window.DABSTER_BILLING_PLAN_V47?.refresh?.();syncCaseChrome();scrollTo(document.getElementById('offerLinesSection'));return true;
    }catch(err){lastError=err?.message||String(err);console.error('[Dabster Test v67]',err);return false;}
    finally{busy=false;renderBar();}
  }

  async function loadBillingPlan(){
    if(busy||stage<2)return false;busy=true;lastError='';renderBar();
    try{
      const api=await waitFor(()=>window.DABSTER_BILLING_PLAN_V47?.seed&&window.DABSTER_BILLING_PLAN_V47);if(!api)throw new Error('Piano di fatturazione non disponibile.');
      const result=api.seed(FIXTURE.billingPlan,{replace:true});
      if(result.incomplete)throw new Error(`Piano con ${result.incomplete} regola/e incomplete.`);
      if(Math.abs(result.allocated-15000)>0.01)throw new Error(`Piano non quadrato: ${money(result.allocated)} €.`);
      stage=3;sessionStorage.setItem(STAGE_KEY,'3');await patchFlow();syncCaseChrome();scrollTo(document.getElementById('billingPlanSection'));return true;
    }catch(err){lastError=err?.message||String(err);console.error('[Dabster Test v67]',err);return false;}
    finally{busy=false;renderBar();}
  }

  async function loadAll(){
    if(busy)return;lastError='';
    const a=await loadAnalysis();if(!a)return;
    const b=await confirmAndCreateLines();if(!b)return;
    await loadBillingPlan();
  }
  async function resetTest({reload=false}={}){
    window.DABSTER_BILLING_PLAN_V47?.reset?.();window.DABSTER_OFFER_LINES?.resetPostConfirmation?.();window.DABSTER_BILLING_MODEL_V39={invoices:[]};
    for(let i=sessionStorage.length-1;i>=0;i--){const k=sessionStorage.key(i)||'';if(k.startsWith('dabster.billing.plan.v47.TEST_FATT_001')||k===CASE_KEY||k===STAGE_KEY)sessionStorage.removeItem(k);}
    stage=0;billingPrepared=false;lastError='';restoreFlow();
    await window.DABSTER_OFFER_FLOW?.openNewOffer?.();window.DABSTER_OFFER_FLOW?.showOffers?.();
    if(reload)location.reload();else renderBar();
  }
  async function prepareBilling(){
    if(env!=='test'||billingPrepared||stage<2)return;
    const api=await waitFor(()=>window.DABSTER_BILLING_V39?.getModel&&window.DABSTER_BILLING_V39);if(!api)return;
    const model=api.getModel();if(Array.isArray(model?.invoices))model.invoices.splice(0,model.invoices.length);
    billingPrepared=true;window.dispatchEvent(new CustomEvent('dabster-offer-flow-change',{detail:snapshot()}));
  }

  function installStyles(){
    if(document.getElementById('testDataEntryV67Styles'))return;
    const s=document.createElement('style');s.id='testDataEntryV67Styles';s.textContent=`#dabsterEnvironmentBar{position:relative;z-index:50;margin:0 0 9px;padding:8px 10px;border:1px solid #d6e0e4;border-radius:8px;background:#fff;font-family:Arial,sans-serif}.td50-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.td50-label{font-size:7.5px;font-weight:800;text-transform:uppercase;color:#75848c}.td50-seg{display:flex;border:1px solid #cfd9de;border-radius:6px;overflow:hidden}.td50-mode,.td50-action{height:29px;border:0;background:#fff;color:#4b626d;font-size:8.8px;font-weight:760;cursor:pointer}.td50-mode{padding:0 11px;border-right:1px solid #dbe2e5}.td50-mode:last-child{border-right:0}.td50-mode.active{background:#3e6574;color:#fff}.td50-test .td50-mode.active{background:#d86c27}.td50-fixture{font-size:8px;font-weight:750;color:#3f6674;background:#eef6f8;border:1px solid #ccdde3;border-radius:5px;padding:5px 8px}.td50-stage{display:inline-flex;height:20px;align-items:center;padding:0 7px;border-radius:999px;background:#f1f5f6;color:#526873;font-size:7.4px;font-weight:750}.td50-actions{display:flex;gap:6px;margin-left:auto;flex-wrap:wrap}.td50-action{padding:0 9px;border:1px solid #cad6db;border-radius:6px}.td50-action.primary{background:#d86c27;border-color:#c85f20;color:#fff}.td50-action.done{background:#edf6ef;border-color:#cfe3d5;color:#3f6f50}.td50-action:disabled{opacity:.45;cursor:not-allowed}.td50-note{font-size:7.7px;color:#728089}.td50-error{font-size:7.7px;font-weight:750;color:#a4484f;background:#fff1f1;border:1px solid #edc7ca;border-radius:5px;padding:4px 7px}@media(max-width:950px){.td50-actions{width:100%;margin-left:0}}`;document.head.appendChild(s);
  }
  function stageLabel(){if(stage===0)return'Nessun dato caricato';if(stage===1)return'Offerta + Analisi';if(stage===2)return'Confermata + 2 righe · 15.000 €';return'Piano caricato · 1.500 € subito fatturabili';}
  function renderBar(){
    if(!bar)return;const test=env==='test';bar.classList.toggle('td50-test',test);
    bar.innerHTML=`<div class="td50-row"><span class="td50-label">Ambiente</span><div class="td50-seg"><button class="td50-mode ${!test?'active':''}" data-env="free">Libero</button><button class="td50-mode ${test?'active':''}" data-env="test">Test</button></div>${test?`<span class="td50-fixture">${esc(FIXTURE.label)}</span><span class="td50-stage">${stageLabel()}</span>${lastError?`<span class="td50-error">${esc(lastError)}</span>`:''}<div class="td50-actions"><button class="td50-action primary" data-load-all ${busy?'disabled':''}>▶ Carica tutto fino al Piano</button><button class="td50-action ${stage>=1?'done':''}" data-load-analysis ${busy?'disabled':''}>1 · Offerta + Analisi</button><button class="td50-action ${stage>=2?'done':''}" data-confirm-lines ${busy||stage<1?'disabled':''}>2 · Conferma + Righe</button><button class="td50-action ${stage>=3?'done':''}" data-load-plan ${busy||stage<2?'disabled':''}>3 · Piano</button><button class="td50-action" data-reset ${busy?'disabled':''}>↺ Reset test</button></div>`:`<span class="td50-note">Uso normale del gestionale. Nessun dato Test nel Libero.</span>`}</div>`;
    bar.querySelectorAll('[data-env]').forEach(b=>b.addEventListener('click',()=>switchEnv(b.dataset.env)));
    bar.querySelector('[data-load-all]')?.addEventListener('click',loadAll);bar.querySelector('[data-load-analysis]')?.addEventListener('click',loadAnalysis);bar.querySelector('[data-confirm-lines]')?.addEventListener('click',confirmAndCreateLines);bar.querySelector('[data-load-plan]')?.addEventListener('click',loadBillingPlan);bar.querySelector('[data-reset]')?.addEventListener('click',()=>resetTest());
  }
  async function switchEnv(next){if(next===env)return;if(next==='free')await resetTest();env=next;sessionStorage.setItem(ENV_KEY,next);stage=0;sessionStorage.setItem(STAGE_KEY,'0');location.reload();}
  function installBar(){installStyles();const shell=document.querySelector('.page-shell');if(!shell)return false;bar=document.getElementById('dabsterEnvironmentBar');if(!bar){bar=document.createElement('section');bar.id='dabsterEnvironmentBar';const title=shell.querySelector('.page-title');shell.insertBefore(bar,title||shell.firstChild);}renderBar();return true;}

  async function install(){
    for(let i=0;i<260&&!installBar();i++)await sleep(40);if(!bar)return;
    if(env==='test'){
      document.addEventListener('click',e=>{if(e.target.closest?.('#appSidebar .sidebar-item[data-page="billing"]'))setTimeout(prepareBilling,60);},true);
      if(stage>0)renderBar();
    }
    window.DABSTER_TEST_HARNESS_V67={fixture:()=>JSON.parse(JSON.stringify(FIXTURE)),loadAnalysis,confirmAndCreateLines,loadBillingPlan,loadAll,resetTest,getStage:()=>stage,getEnvironment:()=>env};
  }
  install();
})();