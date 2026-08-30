/* v92 - TEST FIXTURE ONLY. Uses the existing v90 engine without modifying it. */
(function(){
  if(window.DABSTER_TEST_FIXTURE_V92)return;
  window.DABSTER_TEST_FIXTURE_V92=true;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fire=(el,type='input')=>el?.dispatchEvent(new Event(type,{bubbles:true}));

  const FIXTURE={
    id:'TEST_ANALISI_001',
    customer:'ALFA IMMOBILIARE SRL',
    offer:{
      code:'TEST_ANALISI_001pe01',
      commessa:'TEST_ANALISI_001',
      commessaLabel:'TEST_ANALISI_001 - ALFA IMMOBILIARE SRL - RIQUALIFICAZIONE UFFICI VERONA',
      title:'Progettazione impianti e consulenza tecnica - TEST COMPLETO',
      date:'30/08/2026',
      amount:18000
    },
    confirmation:{consulting:4000,projects:14000,direction:0},
    phases:[
      {id:'definitivo',sale:6000,activities:[
        {name:'Rilievo e impostazione progetto definitivo',assign:[['JD_IE',14],['RS_IE',8]]},
        {name:'Consegna progetto definitivo',assign:[['RS_IE',10]]}
      ]},
      {id:'esecutivo',sale:8000,activities:[
        {name:'Redazione elaborati esecutivi',assign:[['JD_IE',24],['RS_IE',12]]},
        {name:'Consegna elaborati esecutivi',assign:[['RS_IE',8]]}
      ]},
      {id:'consulenze',sale:4000,activities:[
        {name:'Verifica tecnica e coordinamento cliente',assign:[['PM',8]]},
        {name:'Chiusura consulenza tecnica',assign:[['PM',4]]}
      ]}
    ],
    lines:[
      {phase:'definitivo',description:'Progettazione definitiva impianti - TEST',amount:6000},
      {phase:'esecutivo',description:'Progettazione esecutiva impianti - TEST',amount:8000},
      {phase:'consulenze',description:'Consulenza tecnica specialistica - TEST',amount:4000}
    ]
  };

  let bar=null,busy=false,loaded=false,lastError='';

  function normalRuntime(){
    sessionStorage.setItem('dabster.environment.v44','free');
    sessionStorage.removeItem('dabster.test.case.v44');
    sessionStorage.removeItem('dabster.test.stage.v44');
    delete window.DABSTER_TEST_CASE_V50;
    delete window.DABSTER_TEST_FIXTURE_V64;
  }
  normalRuntime();

  async function waitFor(fn,loops=360,delay=35){for(let i=0;i<loops;i++){const v=fn();if(v)return v;await sleep(delay);}return null;}
  function field(label){return [...document.querySelectorAll('#tab-dati label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))||null;}
  function control(label){return field(label)?.querySelector('input,select,textarea')||null;}
  function amountField(label){return [...document.querySelectorAll('#tab-dati .accordion.amounts label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))?.querySelector('input')||null;}
  function setControl(el,value,type='input'){if(!el)return false;el.value=String(value);fire(el,type);return true;}
  function setStatus(label){const s=control('Stato');if(!s)return false;let o=[...s.options].find(x=>norm(x.value||x.textContent)===norm(label));if(!o){o=new Option(label,label);s.add(o);}s.value=o.value;fire(s,'change');return true;}
  function setOptional(label,value){const el=control(label);if(!el)return false;if(el instanceof HTMLSelectElement){let o=[...el.options].find(x=>norm(x.value||x.textContent)===norm(value));if(!o){o=new Option(value,value);el.add(o);}el.value=o.value;fire(el,'change');}else{el.value=value;fire(el,'input');fire(el,'change');}return true;}
  function tab(name){document.querySelector(`.tab[data-tab="${name}"]`)?.click();}

  function cardForPhase(id){return [...document.querySelectorAll('#phaseWorkCards>.phase-work-card')].find(c=>(c.querySelector('.phase-type-select')?.value||c.dataset.planningPhase||'')===id)||null;}
  function clearActivities(){document.querySelectorAll('#phaseWorkCards .activity-delete').forEach(b=>b.click());}
  async function addActivity(phase,item){
    const card=cardForPhase(phase);if(!card)throw new Error(`Fase ${phase} non disponibile.`);
    card.querySelector('.add-activity')?.click();await sleep(70);
    const activity=[...card.querySelectorAll('.activity-card')].at(-1);if(!activity)throw new Error(`Impossibile creare attività ${item.name}.`);
    const name=activity.querySelector('.activity-name');if(name){name.value=item.name;fire(name,'input');fire(name,'change');}
    const rows=activity.querySelector('.assignment-rows');if(rows)rows.innerHTML='';
    for(const [role,hours] of item.assign){
      activity.querySelector('.add-assignment')?.click();await sleep(40);
      const row=activity.querySelector('.assignment-rows .assignment-row:last-child'),r=row?.querySelector('.assignment-role'),h=row?.querySelector('.assignment-hours');
      if(r){r.value=role;fire(r,'change');}
      if(h){h.value=String(hours);fire(h,'input');fire(h,'change');}
    }
  }
  function setProposal(phase,value){const row=document.querySelector(`#tab-analisi .economic-table .phase-row[data-economic-phase="${phase}"]`),input=row?.querySelector('.ae-proposal');if(input){input.value=money(value);fire(input,'input');fire(input,'change');}}
  function setOnlyWantedPhases(){
    const wanted=new Set(FIXTURE.phases.map(x=>x.id));
    document.querySelectorAll('#tab-analisi .economic-table .phase-row[data-economic-phase]').forEach(row=>{
      const phase=row.dataset.economicPhase||'',keep=wanted.has(phase),proposal=row.querySelector('.ae-proposal');
      row.dataset.economicActive=keep?'1':'0';row.hidden=!keep;
      if(keep)row.style.removeProperty('display');else row.style.setProperty('display','none','important');
      if(!keep&&proposal){proposal.value='0,00';fire(proposal,'input');fire(proposal,'change');}
    });
  }
  function phaseCostSummary(){return FIXTURE.phases.map(p=>{const row=document.querySelector(`#tab-analisi .economic-table .phase-row[data-economic-phase="${p.id}"]`);return {phase:p.id,sale:p.sale,cost:num(row?.querySelector('.ae-cost')?.value||0)};});}

  function lineRows(){const clean=document.getElementById('cleanOfferLineRows');if(clean)return [...clean.querySelectorAll('.clean-line')];const legacy=document.getElementById('offerLineRows');return legacy?[...legacy.querySelectorAll('.offer-line-row')]:[];}
  function linePhase(row){return row.dataset.phase||row.querySelector('.clean-line-phase-select,.offer-line-phase-select')?.value||'';}
  function lineDesc(row){return row.querySelector('.clean-line-desc,.offer-line-desc');}
  function lineAmount(row){return row.querySelector('.clean-line-amount,.offer-line-amount');}
  function setOfferLines(){
    const rows=lineRows();
    FIXTURE.lines.forEach(line=>{
      const row=rows.find(r=>linePhase(r)===line.phase);if(!row)return;
      const d=lineDesc(row),a=lineAmount(row);
      if(d){d.value=line.description;fire(d,'input');fire(d,'change');}
      if(a){a.value=money(line.amount);row.dataset.manualAmount='1';fire(a,'input');fire(a,'change');fire(a,'blur');}
    });
    window.DABSTER_OFFER_LINES?.sync?.();
    const relevant=lineRows().filter(r=>FIXTURE.lines.some(x=>x.phase===linePhase(r))),total=relevant.reduce((s,r)=>s+num(lineAmount(r)?.value),0);
    return {ok:FIXTURE.lines.every(x=>relevant.some(r=>linePhase(r)===x.phase))&&Math.abs(total-18000)<=.01,total,count:relevant.length};
  }

  function selectValue(sel,value){if(!sel)return false;const o=[...sel.options].find(x=>String(x.value)===String(value));if(!o)return false;sel.value=o.value;fire(sel,'change');return true;}
  function selectText(sel,text){if(!sel)return false;const o=[...sel.options].find(x=>norm(x.textContent)===norm(text));if(!o)return false;sel.value=o.value;fire(sel,'change');return true;}
  function planRows(){return [...document.querySelectorAll('#billingPlanBody .bp47-row')];}
  async function addPlanRule({baseValue,label,percent,trigger='confirmation',activityName=''}){
    const before=planRows().length,add=document.querySelector('#billingPlanBody [data-add]');if(!add)throw new Error('Pulsante Aggiungi regola non disponibile.');
    add.click();if(!await waitFor(()=>planRows().length===before+1))throw new Error('Impossibile aggiungere regola Piano.');
    let row=planRows().at(-1);
    if(baseValue&&baseValue!=='offer'){
      if(!selectValue(row.querySelector('[data-f="base"]'),baseValue))throw new Error(`Base Piano non disponibile: ${baseValue}.`);
      await sleep(70);row=planRows().at(-1);
    }
    const ev=row.querySelector('[data-f="eventLabel"]');if(ev){ev.value=label;fire(ev,'input');}
    const pct=row.querySelector('[data-f="percent"]');if(pct){pct.value=String(percent);fire(pct,'input');fire(pct,'blur');await sleep(70);row=planRows().at(-1);}
    if(trigger==='activity_closed'){
      if(!selectValue(row.querySelector('[data-f="trigger"]'),'activity_closed'))throw new Error('Trigger Attività conclusa non disponibile.');
      await sleep(70);row=planRows().at(-1);
      if(!selectText(row.querySelector('[data-f="activityKey"]'),activityName))throw new Error(`Attività Piano non disponibile: ${activityName}.`);
    }
    await sleep(80);
  }
  async function buildPlan(){
    const plan=await waitFor(()=>window.DABSTER_BILLING_PLAN_V47?.getSnapshot&&window.DABSTER_BILLING_PLAN_V47);if(!plan)throw new Error('Piano di fatturazione non disponibile.');
    plan.reset?.();await sleep(100);plan.refresh?.();
    const live=window.DABSTER_OFFER_LINES?.lines||[];
    const def=live.find(x=>x.phase==='definitivo'),exec=live.find(x=>x.phase==='esecutivo'),cons=live.find(x=>x.phase==='consulenze');
    if(!def||!exec||!cons)throw new Error('Le tre Righe Offerta non sono disponibili al Piano.');
    await addPlanRule({baseValue:'offer',label:'Acconto 20% alla conferma',percent:20});
    await addPlanRule({baseValue:`line:${def.id}`,label:'Saldo fase definitiva 80%',percent:80,trigger:'activity_closed',activityName:'Consegna progetto definitivo'});
    await addPlanRule({baseValue:`line:${exec.id}`,label:'Saldo fase esecutiva 80%',percent:80,trigger:'activity_closed',activityName:'Consegna elaborati esecutivi'});
    await addPlanRule({baseValue:`line:${cons.id}`,label:'Saldo consulenza 80%',percent:80,trigger:'activity_closed',activityName:'Chiusura consulenza tecnica'});
    plan.refresh?.();await sleep(140);return plan.getSnapshot();
  }

  async function loadFixture(){
    if(busy)return;busy=true;loaded=false;lastError='';renderBar();
    try{
      normalRuntime();
      const flow=await waitFor(()=>window.DABSTER_OFFER_FLOW?.openNewOffer&&window.DABSTER_OFFER_FLOW);if(!flow)throw new Error('Flusso Offerta non disponibile.');
      window.DABSTER_BILLING_PLAN_V47?.reset?.();window.DABSTER_BILLING_MODEL_V39={invoices:[]};await flow.openNewOffer();
      if(!await waitFor(()=>document.getElementById('analysisSubtabs')&&document.querySelectorAll('#phaseWorkCards>.phase-work-card').length>=7&&document.getElementById('totaleOfferta')))throw new Error('Dettaglio Offerta non disponibile.');

      tab('dati');setStatus('In lavorazione');await sleep(100);window.DABSTER_OFFER_LINES?.resetPostConfirmation?.();
      const comm=control('Commessa');if(comm){let o=[...comm.options].find(x=>x.value===FIXTURE.offer.commessaLabel);if(!o){o=new Option(FIXTURE.offer.commessaLabel,FIXTURE.offer.commessaLabel);comm.add(o);}comm.value=o.value;fire(comm,'change');}
      setOptional('Cliente',FIXTURE.customer);
      setControl(control('Titolo'),FIXTURE.offer.title);setControl(control('Codice'),FIXTURE.offer.code);setControl(control('Data offerta'),FIXTURE.offer.date);
      setControl(amountField('Importo stimato'),18000);setControl(amountField('Consulenza'),4000);setControl(amountField('Progetti'),14000);setControl(amountField('Direzione lavori'),0);

      tab('analisi');window.dabsterAnalysisSubtabs?.activate?.('impianti');clearActivities();await sleep(180);
      for(const phase of FIXTURE.phases){for(const activity of phase.activities)await addActivity(phase.id,activity);}
      await sleep(220);window.dabsterEconomicPhaseController?.reconcile?.();
      ['preliminare','definitivo','valutazione_vvf','esecutivo','dl','scia_vvf','consulenze'].forEach(p=>setProposal(p,0));
      FIXTURE.phases.forEach(p=>setProposal(p.id,p.sale));setOnlyWantedPhases();setControl(document.getElementById('tradePct'),0);window.dabsterRecalcEconomic?.();await sleep(180);
      setControl(document.getElementById('totaleOfferta'),18000);fire(document.getElementById('totaleOfferta'),'blur');

      tab('dati');if(!setStatus('Confermata'))throw new Error('Stato Confermata non disponibile.');
      if(!await waitFor(()=>document.getElementById('confirmationConsulting')&&document.getElementById('confirmationProjects')))throw new Error('Importo Conferma non disponibile.');
      [['confirmationConsulting',4000],['confirmationProjects',14000],['confirmationDirection',0]].forEach(([id,v])=>{const el=document.getElementById(id);if(el){el.value=money(v);fire(el,'input');fire(el,'change');fire(el,'blur');}});
      await sleep(320);window.DABSTER_OFFER_LINES?.sync?.();if(!await waitFor(()=>lineRows().length>=3))throw new Error('Righe Offerta non disponibili dopo la conferma.');
      let lineCheck=setOfferLines();await sleep(170);lineCheck=setOfferLines();if(!lineCheck.ok)throw new Error(`Righe Offerta non quadrate: ${money(lineCheck.total)} €.`);

      const planSnap=await buildPlan();
      if(planSnap.rows?.length!==4||planSnap.incomplete!==0||Math.abs(Number(planSnap.allocated||0)-18000)>.01)throw new Error(`Piano non quadrato: ${money(planSnap.allocated)} € · incomplete ${planSnap.incomplete}.`);

      flow.refresh?.();loaded=true;
      const costs=phaseCostSummary();console.info('[Dabster Test v92] Costi e vendite fase',costs,'Piano',planSnap);
      document.getElementById('billingPlanSection')?.classList.add('open');document.getElementById('billingPlanSection')?.scrollIntoView({behavior:'smooth',block:'center'});
    }catch(err){lastError=err?.message||String(err);console.error('[Dabster Test Fixture v92]',err);}finally{busy=false;renderBar();}
  }

  async function reset(){if(busy)return;busy=true;lastError='';try{normalRuntime();window.DABSTER_BILLING_PLAN_V47?.reset?.();window.DABSTER_OFFER_LINES?.resetPostConfirmation?.();await window.DABSTER_OFFER_FLOW?.openNewOffer?.();window.DABSTER_OFFER_FLOW?.showOffers?.();loaded=false;}finally{busy=false;renderBar();}}

  function installStyles(){if(document.getElementById('testFixtureV92Styles'))return;const s=document.createElement('style');s.id='testFixtureV92Styles';s.textContent='#dabsterEnvironmentBar{position:relative;z-index:60;margin:0 0 9px;padding:8px 10px;border:1px solid #d6e0e4;border-radius:8px;background:#fff;font-family:Arial,sans-serif}.v92-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.v92-label{font-size:7.5px;font-weight:800;text-transform:uppercase;color:#75848c}.v92-fixture{font-size:8px;font-weight:750;color:#3f6674;background:#eef6f8;border:1px solid #ccdde3;border-radius:5px;padding:5px 8px}.v92-status{font-size:7.8px;color:#526873}.v92-actions{display:flex;gap:6px;margin-left:auto}.v92-btn{height:29px;padding:0 10px;border:1px solid #cad6db;border-radius:6px;background:#fff;color:#4b626d;font-size:8.8px;font-weight:760;cursor:pointer}.v92-btn.primary{background:#d86c27;border-color:#c85f20;color:#fff}.v92-error{font-size:7.7px;font-weight:750;color:#a4484f;background:#fff1f1;border:1px solid #edc7ca;border-radius:5px;padding:4px 7px}';document.head.appendChild(s);}
  function renderBar(){if(!bar)return;bar.innerHTML=`<div class="v92-row"><span class="v92-label">Ambiente Test</span><span class="v92-fixture">${FIXTURE.id} · Analisi + attività + costi + vendite + Righe Offerta + Piano</span><span class="v92-status">${busy?'Compilazione…':loaded?'Caso completo caricato':'Motore v90 invariato'}</span>${lastError?`<span class="v92-error">${lastError}</span>`:''}<div class="v92-actions"><button type="button" class="v92-btn primary" data-load ${busy?'disabled':''}>Compila caso completo</button><button type="button" class="v92-btn" data-reset ${busy?'disabled':''}>Reset test</button></div></div>`;bar.querySelector('[data-load]')?.addEventListener('click',loadFixture);bar.querySelector('[data-reset]')?.addEventListener('click',reset);}
  function installBar(){installStyles();const main=document.querySelector('.page-shell .main-card');if(!main)return false;bar=document.getElementById('dabsterEnvironmentBar');if(!bar){bar=document.createElement('div');bar.id='dabsterEnvironmentBar';main.insertAdjacentElement('beforebegin',bar);}renderBar();return true;}
  (async()=>{for(let i=0;i<260;i++){if(window.DABSTER_OFFER_FLOW?.openNewOffer&&installBar())return;await sleep(50);}})();

  window.DABSTER_TEST_FIXTURE_V92_API={fixture:FIXTURE,load:loadFixture,reset};
})();