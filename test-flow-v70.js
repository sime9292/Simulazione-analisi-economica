/* v70 - Single-step controlled TEST_FATT_001 loader. Test-only; remove after billing test. */
(function(){
  const ENV_KEY='dabster.environment.v44';
  const CASE_KEY='dabster.test.case.v44';
  const STAGE_KEY='dabster.test.stage.v44';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fire=(el,type='input')=>el?.dispatchEvent(new Event(type,{bubbles:true}));

  const FIXTURE={
    id:'TEST_FATT_001',
    label:'TEST_FATT_001 · Collaudo fatturazione',
    offer:{id:'TEST_FATT_001pe01',code:'TEST_FATT_001pe01',commessa:'TEST_FATT_001',commessaLabel:'TEST_FATT_001 - COMMESSA COLLAUDO FATTURAZIONE',title:'Progettazione esecutiva e consulenza tecnica - caso collaudo',client:'CLIENTE TEST SRL',offerDate:'30/08/2026',status:'Confermata',amount:15000},
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
      {id:'TEST_FATT_001:plan:consegna-esecutivo',baseType:'line',basePhase:'esecutivo',eventLabel:'Consegna progetto esecutivo 90%',percent:90,driver:'percent',trigger:'activity_closed',activityPhase:'esecutivo',activityName:'Consegna progetto esecutivo - TEST'},
      {id:'TEST_FATT_001:plan:consegna-consulenza',baseType:'line',basePhase:'consulenze',eventLabel:'Consegna consulenza specialistica 90%',percent:90,driver:'percent',trigger:'activity_closed',activityPhase:'consulenze',activityName:'Conclusione consulenza specialistica - TEST'}
    ]
  };

  let busy=false,lastError='',loaded=false,bar=null,originalGetSnapshot=null;
  const env=()=>sessionStorage.getItem(ENV_KEY)||'free';
  async function waitFor(fn,loops=300,delay=40){for(let i=0;i<loops;i++){const v=fn();if(v)return v;await sleep(delay);}return null;}
  function field(label){return [...document.querySelectorAll('#tab-dati label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))||null;}
  function control(label){return field(label)?.querySelector('input,select,textarea')||null;}
  function amountField(label){return [...document.querySelectorAll('#tab-dati .accordion.amounts label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))?.querySelector('input')||null;}
  function setControl(el,value,type='input'){if(!el)return;el.value=String(value);fire(el,type);}
  function tab(name){document.querySelector(`.tab[data-tab="${name}"]`)?.click();}
  function setStatus(label){const s=control('Stato');if(!s)return false;let o=[...s.options].find(x=>norm(x.value||x.textContent)===norm(label));if(!o){o=new Option(label,label);s.add(o);}s.value=o.value;fire(s,'change');return true;}
  function cardForPhase(id){return [...document.querySelectorAll('#phaseWorkCards>.phase-work-card')].find(c=>(c.querySelector('.phase-type-select')?.value||c.dataset.planningPhase||'')===id)||null;}
  function clearActivities(){document.querySelectorAll('#phaseWorkCards .activity-delete').forEach(b=>b.click());}
  function setProposal(phase,value){const row=document.querySelector(`#tab-analisi .economic-table .phase-row[data-economic-phase="${phase}"]`),input=row?.querySelector('.ae-proposal');if(input){input.value=money(value);fire(input,'input');fire(input,'change');}}
  function enforceEconomicPhases(){const wanted=new Set(FIXTURE.lines.map(x=>x.phase));document.querySelectorAll('#tab-analisi .economic-table .phase-row[data-economic-phase]').forEach(row=>{const phase=row.dataset.economicPhase||'',keep=wanted.has(phase),proposal=row.querySelector('.ae-proposal');row.dataset.economicActive=keep?'1':'0';row.hidden=!keep;if(keep)row.style.removeProperty('display');else row.style.setProperty('display','none','important');if(!keep&&proposal){proposal.value='0,00';fire(proposal,'input');fire(proposal,'change');}});}
  async function addActivity(phase,item){const card=cardForPhase(phase);if(!card)throw new Error(`Fase ${phase} non disponibile.`);card.querySelector('.add-activity')?.click();await sleep(70);const activity=[...card.querySelectorAll('.activity-card')].at(-1);if(!activity)throw new Error(`Impossibile creare attività ${item.name}.`);const name=activity.querySelector('.activity-name');if(name){name.value=item.name;fire(name,'input');fire(name,'change');}const rows=activity.querySelector('.assignment-rows');if(rows)rows.innerHTML='';for(const [role,hours] of item.assign){activity.querySelector('.add-assignment')?.click();await sleep(30);const row=activity.querySelector('.assignment-rows .assignment-row:last-child'),r=row?.querySelector('.assignment-role'),h=row?.querySelector('.assignment-hours');if(r){r.value=role;fire(r,'change');}if(h){h.value=String(hours);fire(h,'input');fire(h,'change');}}}

  function lineAdapter(){
    const legacy=document.getElementById('offerLineRows');
    if(legacy)return {rows:()=>[...legacy.querySelectorAll('.offer-line-row')],phase:r=>r.dataset.phase||r.querySelector('.offer-line-phase-select')?.value||'',desc:r=>r.querySelector('.offer-line-desc'),amount:r=>r.querySelector('.offer-line-amount')};
    const clean=document.getElementById('cleanOfferLineRows');
    if(clean)return {rows:()=>[...clean.querySelectorAll('.clean-line')],phase:r=>r.dataset.phase||r.querySelector('.clean-line-phase-select')?.value||'',desc:r=>r.querySelector('.clean-line-desc'),amount:r=>r.querySelector('.clean-line-amount')};
    return null;
  }
  function enforceLines(){const a=lineAdapter();if(!a)return {ok:false,total:0,count:0};const rows=a.rows();for(const line of FIXTURE.lines){const row=rows.find(r=>a.phase(r)===line.phase);if(!row)continue;const d=a.desc(row),m=a.amount(row);if(d){d.value=line.description;fire(d,'input');fire(d,'change');}if(m){m.value=money(line.amount);row.dataset.manualAmount='1';fire(m,'input');fire(m,'change');fire(m,'blur');}}window.DABSTER_OFFER_LINES?.sync?.();const live=a.rows().filter(r=>FIXTURE.lines.some(x=>x.phase===a.phase(r))),total=live.reduce((s,r)=>s+num(a.amount(r)?.value),0);return {ok:FIXTURE.lines.every(x=>live.some(r=>a.phase(r)===x.phase))&&Math.abs(total-15000)<=.01,total,count:live.length};}

  function confirmedSnapshot(){return {offer:{...FIXTURE.offer,status:'Confermata'},lines:FIXTURE.lines.map(x=>({...x})),loadedOffer:true,testEnvironment:true};}
  function patchFlow(){const flow=window.DABSTER_OFFER_FLOW;if(!flow)return;if(!originalGetSnapshot)originalGetSnapshot=flow.getSnapshot?.bind(flow)||null;flow.getSnapshot=()=>confirmedSnapshot();window.DABSTER_TEST_CASE_V50=JSON.parse(JSON.stringify(FIXTURE));window.DABSTER_TEST_FIXTURE_V64=window.DABSTER_TEST_CASE_V50;window.dispatchEvent(new CustomEvent('dabster-offer-flow-change',{detail:confirmedSnapshot()}));}
  function restoreFlow(){const flow=window.DABSTER_OFFER_FLOW;if(flow&&originalGetSnapshot){flow.getSnapshot=originalGetSnapshot;originalGetSnapshot=null;}delete window.DABSTER_TEST_CASE_V50;window.DABSTER_TEST_FIXTURE_V64=null;}

  async function loadAll(){
    if(busy||env()!=='test')return;busy=true;loaded=false;lastError='';renderBar();
    try{
      sessionStorage.setItem(CASE_KEY,FIXTURE.id);sessionStorage.setItem(STAGE_KEY,'0');
      window.DABSTER_BILLING_PLAN_V47?.reset?.();window.DABSTER_BILLING_MODEL_V39={invoices:[]};restoreFlow();
      const flow=await waitFor(()=>window.DABSTER_OFFER_FLOW?.openNewOffer&&window.DABSTER_OFFER_FLOW);if(!flow)throw new Error('Flusso Offerta non disponibile.');
      await flow.openNewOffer();
      if(!await waitFor(()=>document.getElementById('analysisSubtabs')&&document.querySelectorAll('#phaseWorkCards>.phase-work-card').length>=7&&document.getElementById('totaleOfferta')))throw new Error('Dettaglio Offerta non disponibile.');
      tab('dati');setStatus('In lavorazione');await sleep(80);window.DABSTER_OFFER_LINES?.resetPostConfirmation?.();
      const comm=control('Commessa');if(comm){let o=[...comm.options].find(x=>x.value===FIXTURE.offer.commessaLabel);if(!o){o=new Option(FIXTURE.offer.commessaLabel,FIXTURE.offer.commessaLabel);comm.add(o);}comm.value=o.value;fire(comm,'change');}
      setControl(control('Titolo'),FIXTURE.offer.title);setControl(control('Codice'),FIXTURE.offer.code);setControl(control('Data offerta'),FIXTURE.offer.offerDate);setControl(amountField('Importo stimato'),15000);setControl(amountField('Consulenza'),5000);setControl(amountField('Progetti'),10000);setControl(amountField('Direzione lavori'),0);
      tab('analisi');window.dabsterAnalysisSubtabs?.activate?.('impianti');clearActivities();await sleep(160);for(const [phase,item] of Object.entries(FIXTURE.activities))await addActivity(phase,item);await sleep(180);window.dabsterEconomicPhaseController?.reconcile?.();
      ['preliminare','definitivo','valutazione_vvf','esecutivo','dl','scia_vvf','consulenze'].forEach(p=>setProposal(p,0));FIXTURE.lines.forEach(l=>setProposal(l.phase,l.amount));enforceEconomicPhases();setControl(document.getElementById('tradePct'),0);window.dabsterRecalcEconomic?.();setControl(document.getElementById('totaleOfferta'),15000);fire(document.getElementById('totaleOfferta'),'blur');
      tab('dati');setStatus('Confermata');
      if(!await waitFor(()=>!document.getElementById('confirmationAmountsSection')?.hidden&&document.getElementById('confirmationConsulting')&&document.getElementById('confirmationProjects')))throw new Error('Importo Conferma non disponibile.');
      [['confirmationConsulting',5000],['confirmationProjects',10000],['confirmationDirection',0]].forEach(([id,v])=>{const el=document.getElementById(id);if(el){el.value=money(v);fire(el,'input');fire(el,'change');fire(el,'blur');}});
      await sleep(220);window.DABSTER_OFFER_LINES?.sync?.();
      if(!await waitFor(()=>{const a=lineAdapter();return a&&a.rows().length>=2&&a;}))throw new Error('Righe Offerta non disponibili dopo la conferma.');
      let check=enforceLines();await sleep(120);window.DABSTER_OFFER_LINES?.sync?.();await sleep(120);check=enforceLines();if(!check.ok)throw new Error(`Righe Offerta non quadrate: ${money(check.total)} €.`);
      patchFlow();
      const plan=await waitFor(()=>window.DABSTER_BILLING_PLAN_V47?.seed&&window.DABSTER_BILLING_PLAN_V47);if(!plan)throw new Error('Piano di fatturazione non disponibile.');
      const result=plan.seed(FIXTURE.billingPlan,{replace:true});plan.refresh?.();
      if(result.incomplete)throw new Error(`Piano con ${result.incomplete} regola/e incomplete.`);
      if(result.rows?.length!==3||Math.abs(Number(result.allocated||0)-15000)>.01)throw new Error(`Piano non quadrato: ${money(result.allocated)} € su ${result.rows?.length||0} regole.`);
      sessionStorage.setItem(STAGE_KEY,'3');loaded=true;lastError='';
      document.querySelector('.breadcrumb strong')?.replaceChildren(document.createTextNode(FIXTURE.offer.code));
      document.getElementById('billingPlanSection')?.classList.add('open');document.getElementById('billingPlanSection')?.scrollIntoView({behavior:'smooth',block:'center'});
      window.dispatchEvent(new CustomEvent('dabster-test-v70-ready',{detail:{fixture:FIXTURE,plan:result}}));
    }catch(err){lastError=err?.message||String(err);console.error('[Dabster Test v70]',err);}
    finally{busy=false;renderBar();}
  }

  async function resetTest(){
    if(busy)return;busy=true;lastError='';
    try{window.DABSTER_BILLING_PLAN_V47?.reset?.();window.DABSTER_OFFER_LINES?.resetPostConfirmation?.();window.DABSTER_BILLING_MODEL_V39={invoices:[]};for(let i=sessionStorage.length-1;i>=0;i--){const k=sessionStorage.key(i)||'';if(k.startsWith('dabster.billing.plan.v47.TEST_FATT_001')||k===CASE_KEY||k===STAGE_KEY)sessionStorage.removeItem(k);}restoreFlow();await window.DABSTER_OFFER_FLOW?.openNewOffer?.();window.DABSTER_OFFER_FLOW?.showOffers?.();loaded=false;}finally{busy=false;renderBar();}}

  function installStyles(){if(document.getElementById('testFlowV70Styles'))return;const s=document.createElement('style');s.id='testFlowV70Styles';s.textContent='#dabsterEnvironmentBar{position:relative;z-index:60;margin:0 0 9px;padding:8px 10px;border:1px solid #d6e0e4;border-radius:8px;background:#fff;font-family:Arial,sans-serif}.v70-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.v70-label{font-size:7.5px;font-weight:800;text-transform:uppercase;color:#75848c}.v70-seg{display:flex;border:1px solid #cfd9de;border-radius:6px;overflow:hidden}.v70-mode,.v70-action{height:29px;border:0;background:#fff;color:#4b626d;font-size:8.8px;font-weight:760;cursor:pointer}.v70-mode{padding:0 11px;border-right:1px solid #dbe2e5}.v70-mode:last-child{border-right:0}.v70-mode.active{background:#3e6574;color:#fff}.v70-test .v70-mode.active{background:#d86c27}.v70-fixture{font-size:8px;font-weight:750;color:#3f6674;background:#eef6f8;border:1px solid #ccdde3;border-radius:5px;padding:5px 8px}.v70-stage{font-size:7.7px;font-weight:750;color:#526873}.v70-actions{display:flex;gap:6px;margin-left:auto}.v70-action{padding:0 10px;border:1px solid #cad6db;border-radius:6px}.v70-action.primary{background:#d86c27;border-color:#c85f20;color:#fff}.v70-action:disabled{opacity:.45}.v70-error{font-size:7.7px;font-weight:750;color:#a4484f;background:#fff1f1;border:1px solid #edc7ca;border-radius:5px;padding:4px 7px}@media(max-width:950px){.v70-actions{width:100%;margin-left:0}}';document.head.appendChild(s);}
  function renderBar(){if(!bar)return;const test=env()==='test';bar.className=test?'v70-test':'';bar.innerHTML=`<div class="v70-row"><span class="v70-label">Ambiente</span><div class="v70-seg"><button class="v70-mode ${!test?'active':''}" data-v70-env="free">Libero</button><button class="v70-mode ${test?'active':''}" data-v70-env="test">Test</button></div>${test?`<span class="v70-fixture">${esc(FIXTURE.label)}</span><span class="v70-stage">${loaded?'Piano compilato · 3 regole · 15.000 €':busy?'Compilazione in corso…':'Pronto'}</span>${lastError?`<span class="v70-error">${esc(lastError)}</span>`:''}<div class="v70-actions"><button class="v70-action primary" data-v70-load ${busy?'disabled':''}>▶ Compila fino al Piano</button><button class="v70-action" data-v70-reset ${busy?'disabled':''}>↺ Reset test</button></div>`:'<span class="v70-stage">Uso normale · nessun dato Test</span>'}</div>`;bar.querySelectorAll('[data-v70-env]').forEach(b=>b.addEventListener('click',async()=>{const next=b.dataset.v70Env;if(next===env())return;if(next==='free')await resetTest();sessionStorage.setItem(ENV_KEY,next);location.reload();}));bar.querySelector('[data-v70-load]')?.addEventListener('click',loadAll);bar.querySelector('[data-v70-reset]')?.addEventListener('click',resetTest);}
  async function install(){installStyles();for(let i=0;i<300;i++){const shell=document.querySelector('.page-shell');if(shell){bar=document.getElementById('dabsterEnvironmentBar');if(!bar){bar=document.createElement('section');bar.id='dabsterEnvironmentBar';shell.insertBefore(bar,shell.querySelector('.page-title')||shell.firstChild);}renderBar();window.DABSTER_TEST_V70={fixture:()=>JSON.parse(JSON.stringify(FIXTURE)),loadAll,resetTest};return;}await sleep(40);}}
  install();
})();