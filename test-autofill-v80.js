/* v80 - TEST is only an autofill robot over the normal/manual runtime. No snapshot patching, no parallel state, no trigger override. */
(function(){
  if(window.DABSTER_TEST_AUTOFILL_V80)return;
  const ENV_KEY='dabster.environment.v44';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fire=(el,type='input')=>el?.dispatchEvent(new Event(type,{bubbles:true}));
  const FIXTURE={
    id:'TEST_FATT_001',
    offer:{code:'TEST_FATT_001pe01',commessa:'TEST_FATT_001',commessaLabel:'TEST_FATT_001 - COMMESSA COLLAUDO FATTURAZIONE',title:'Progettazione esecutiva e consulenza tecnica - caso collaudo',date:'30/08/2026',amount:15000},
    confirmation:{consulting:5000,projects:10000,direction:0},
    lines:[
      {phase:'esecutivo',description:'Progetto esecutivo impianti - TEST',amount:10000},
      {phase:'consulenze',description:'Consulenza tecnica specialistica - TEST',amount:5000}
    ],
    activities:{
      esecutivo:{name:'Consegna progetto esecutivo - TEST',assign:[['RS_IE',18]]},
      consulenze:{name:'Conclusione consulenza specialistica - TEST',assign:[['PM',6]]}
    }
  };
  let bar=null,busy=false,lastError='',loaded=false;
  async function waitFor(fn,loops=320,delay=35){for(let i=0;i<loops;i++){const v=fn();if(v)return v;await sleep(delay);}return null;}
  function field(label){return [...document.querySelectorAll('#tab-dati label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))||null;}
  function control(label){return field(label)?.querySelector('input,select,textarea')||null;}
  function amountField(label){return [...document.querySelectorAll('#tab-dati .accordion.amounts label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))?.querySelector('input')||null;}
  function setControl(el,value,type='input'){if(!el)return false;el.value=String(value);fire(el,type);return true;}
  function setStatus(label){const s=control('Stato');if(!s)return false;let o=[...s.options].find(x=>norm(x.value||x.textContent)===norm(label));if(!o){o=new Option(label,label);s.add(o);}s.value=o.value;fire(s,'change');return true;}
  function tab(name){document.querySelector(`.tab[data-tab="${name}"]`)?.click();}
  function cardForPhase(id){return [...document.querySelectorAll('#phaseWorkCards>.phase-work-card')].find(c=>(c.querySelector('.phase-type-select')?.value||c.dataset.planningPhase||'')===id)||null;}
  function clearActivities(){document.querySelectorAll('#phaseWorkCards .activity-delete').forEach(b=>b.click());}
  function setProposal(phase,value){const row=document.querySelector(`#tab-analisi .economic-table .phase-row[data-economic-phase="${phase}"]`),input=row?.querySelector('.ae-proposal');if(input){input.value=money(value);fire(input,'input');fire(input,'change');}}
  function enforceEconomicPhases(){const wanted=new Set(FIXTURE.lines.map(x=>x.phase));document.querySelectorAll('#tab-analisi .economic-table .phase-row[data-economic-phase]').forEach(row=>{const phase=row.dataset.economicPhase||'',keep=wanted.has(phase),proposal=row.querySelector('.ae-proposal');row.dataset.economicActive=keep?'1':'0';row.hidden=!keep;if(keep)row.style.removeProperty('display');else row.style.setProperty('display','none','important');if(!keep&&proposal){proposal.value='0,00';fire(proposal,'input');fire(proposal,'change');}});}
  async function addActivity(phase,item){
    const card=cardForPhase(phase);if(!card)throw new Error(`Fase ${phase} non disponibile.`);
    card.querySelector('.add-activity')?.click();await sleep(70);
    const activity=[...card.querySelectorAll('.activity-card')].at(-1);if(!activity)throw new Error(`Impossibile creare attività ${item.name}.`);
    const name=activity.querySelector('.activity-name');if(name){name.value=item.name;fire(name,'input');fire(name,'change');}
    const rows=activity.querySelector('.assignment-rows');if(rows)rows.innerHTML='';
    for(const [role,hours] of item.assign){activity.querySelector('.add-assignment')?.click();await sleep(35);const row=activity.querySelector('.assignment-rows .assignment-row:last-child'),r=row?.querySelector('.assignment-role'),h=row?.querySelector('.assignment-hours');if(r){r.value=role;fire(r,'change');}if(h){h.value=String(hours);fire(h,'input');fire(h,'change');}}
  }
  function lineRows(){const clean=document.getElementById('cleanOfferLineRows');if(clean)return [...clean.querySelectorAll('.clean-line')];const legacy=document.getElementById('offerLineRows');return legacy?[...legacy.querySelectorAll('.offer-line-row')]:[];}
  function linePhase(row){return row.dataset.phase||row.querySelector('.clean-line-phase-select,.offer-line-phase-select')?.value||'';}
  function lineDesc(row){return row.querySelector('.clean-line-desc,.offer-line-desc');}
  function lineAmount(row){return row.querySelector('.clean-line-amount,.offer-line-amount');}
  function enforceLines(){
    const rows=lineRows();
    FIXTURE.lines.forEach(line=>{const row=rows.find(r=>linePhase(r)===line.phase);if(!row)return;const d=lineDesc(row),a=lineAmount(row);if(d){d.value=line.description;fire(d,'input');fire(d,'change');}if(a){a.value=money(line.amount);row.dataset.manualAmount='1';fire(a,'input');fire(a,'change');fire(a,'blur');}});
    window.DABSTER_OFFER_LINES?.sync?.();
    const relevant=lineRows().filter(r=>FIXTURE.lines.some(x=>x.phase===linePhase(r))),total=relevant.reduce((s,r)=>s+num(lineAmount(r)?.value),0);
    return {ok:FIXTURE.lines.every(x=>relevant.some(r=>linePhase(r)===x.phase))&&Math.abs(total-15000)<=.01,total,count:relevant.length};
  }
  function selectValue(sel,value){if(!sel)return false;const o=[...sel.options].find(x=>String(x.value)===String(value));if(!o)return false;sel.value=o.value;fire(sel,'change');return true;}
  function selectText(sel,text){if(!sel)return false;const o=[...sel.options].find(x=>norm(x.textContent)===norm(text));if(!o)return false;sel.value=o.value;fire(sel,'change');return true;}
  function planRows(){return [...document.querySelectorAll('#billingPlanBody .bp47-row')];}
  async function addPlanRule({baseValue,label,percent,trigger='confirmation',activityName=''}){
    const before=planRows().length,add=document.querySelector('#billingPlanBody [data-add]');if(!add)throw new Error('Pulsante Aggiungi regola non disponibile.');add.click();
    if(!await waitFor(()=>planRows().length===before+1))throw new Error('Impossibile aggiungere regola Piano.');
    let row=planRows().at(-1);
    if(baseValue&&baseValue!=='offer'){if(!selectValue(row.querySelector('[data-f="base"]'),baseValue))throw new Error('Base Piano non disponibile.');await sleep(60);row=planRows().at(-1);}
    const ev=row.querySelector('[data-f="eventLabel"]');if(ev){ev.value=label;fire(ev,'input');}
    const pct=row.querySelector('[data-f="percent"]');if(pct){pct.value=String(percent);fire(pct,'input');fire(pct,'blur');await sleep(60);row=planRows().at(-1);}
    if(trigger==='activity_closed'){
      if(!selectValue(row.querySelector('[data-f="trigger"]'),'activity_closed'))throw new Error('Trigger Attività conclusa non disponibile.');await sleep(60);row=planRows().at(-1);
      if(!selectText(row.querySelector('[data-f="activityKey"]'),activityName))throw new Error(`Attività Piano non disponibile: ${activityName}.`);
    }
    await sleep(70);
  }
  async function buildPlanManually(){
    const plan=await waitFor(()=>window.DABSTER_BILLING_PLAN_V47?.getSnapshot&&window.DABSTER_BILLING_PLAN_V47);if(!plan)throw new Error('Piano di fatturazione non disponibile.');
    plan.reset?.();await sleep(80);plan.refresh?.();
    const live=window.DABSTER_OFFER_LINES?.lines||[];
    const exec=live.find(x=>x.phase==='esecutivo'),cons=live.find(x=>x.phase==='consulenze');if(!exec||!cons)throw new Error('Righe Offerta live non disponibili per il Piano.');
    await addPlanRule({baseValue:'offer',label:'Acconto 10% alla conferma',percent:10});
    await addPlanRule({baseValue:`line:${exec.id}`,label:'Consegna progetto esecutivo 90%',percent:90,trigger:'activity_closed',activityName:FIXTURE.activities.esecutivo.name});
    await addPlanRule({baseValue:`line:${cons.id}`,label:'Consegna consulenza specialistica 90%',percent:90,trigger:'activity_closed',activityName:FIXTURE.activities.consulenze.name});
    plan.refresh?.();await sleep(100);return plan.getSnapshot();
  }
  async function loadAll(){
    if(busy)return;busy=true;loaded=false;lastError='';renderBar();
    try{
      sessionStorage.setItem(ENV_KEY,'test');
      const flow=await waitFor(()=>window.DABSTER_OFFER_FLOW?.openNewOffer&&window.DABSTER_OFFER_FLOW);if(!flow)throw new Error('Flusso Offerta non disponibile.');
      window.DABSTER_BILLING_PLAN_V47?.reset?.();window.DABSTER_BILLING_MODEL_V39={invoices:[]};
      await flow.openNewOffer();
      if(!await waitFor(()=>document.getElementById('analysisSubtabs')&&document.querySelectorAll('#phaseWorkCards>.phase-work-card').length>=7&&document.getElementById('totaleOfferta')))throw new Error('Dettaglio Offerta non disponibile.');
      tab('dati');setStatus('In lavorazione');await sleep(100);window.DABSTER_OFFER_LINES?.resetPostConfirmation?.();
      const comm=control('Commessa');if(comm){let o=[...comm.options].find(x=>x.value===FIXTURE.offer.commessaLabel);if(!o){o=new Option(FIXTURE.offer.commessaLabel,FIXTURE.offer.commessaLabel);comm.add(o);}comm.value=o.value;fire(comm,'change');}
      setControl(control('Titolo'),FIXTURE.offer.title);setControl(control('Codice'),FIXTURE.offer.code);setControl(control('Data offerta'),FIXTURE.offer.date);
      setControl(amountField('Importo stimato'),15000);setControl(amountField('Consulenza'),5000);setControl(amountField('Progetti'),10000);setControl(amountField('Direzione lavori'),0);
      tab('analisi');window.dabsterAnalysisSubtabs?.activate?.('impianti');clearActivities();await sleep(160);for(const [phase,item] of Object.entries(FIXTURE.activities))await addActivity(phase,item);await sleep(180);
      window.dabsterEconomicPhaseController?.reconcile?.();['preliminare','definitivo','valutazione_vvf','esecutivo','dl','scia_vvf','consulenze'].forEach(p=>setProposal(p,0));FIXTURE.lines.forEach(l=>setProposal(l.phase,l.amount));enforceEconomicPhases();setControl(document.getElementById('tradePct'),0);window.dabsterRecalcEconomic?.();await sleep(120);
      setControl(document.getElementById('totaleOfferta'),15000);fire(document.getElementById('totaleOfferta'),'blur');
      tab('dati');if(!setStatus('Confermata'))throw new Error('Stato Confermata non disponibile.');
      if(!await waitFor(()=>!document.getElementById('confirmationAmountsSection')?.hidden&&document.getElementById('confirmationConsulting')&&document.getElementById('confirmationProjects')))throw new Error('Importo Conferma non disponibile.');
      [['confirmationConsulting',5000],['confirmationProjects',10000],['confirmationDirection',0]].forEach(([id,v])=>{const el=document.getElementById(id);if(el){el.value=money(v);fire(el,'input');fire(el,'change');fire(el,'blur');}});
      await sleep(260);window.DABSTER_OFFER_LINES?.sync?.();
      if(!await waitFor(()=>lineRows().length>=2))throw new Error('Righe Offerta non disponibili dopo la conferma.');let check=enforceLines();await sleep(140);check=enforceLines();if(!check.ok)throw new Error(`Righe Offerta non quadrate: ${money(check.total)} €.`);
      await sleep(160);
      const realSnap=flow.getSnapshot();if(realSnap.offer?.code!==FIXTURE.offer.code||norm(realSnap.offer?.status)!=='confermata'||realSnap.lines?.length<2)throw new Error('Il normale snapshot Offerta non vede correttamente il caso compilato.');
      const planSnap=await buildPlanManually();if(planSnap.rows?.length!==3||planSnap.incomplete!==0||Math.abs(Number(planSnap.allocated||0)-15000)>.01)throw new Error(`Piano reale non quadrato: ${money(planSnap.allocated)} € · incomplete ${planSnap.incomplete}.`);
      loaded=true;lastError='';document.getElementById('billingPlanSection')?.classList.add('open');document.getElementById('billingPlanSection')?.scrollIntoView({behavior:'smooth',block:'center'});
      window.dispatchEvent(new CustomEvent('dabster-test-autofill-v80-ready',{detail:{fixture:FIXTURE,offer:realSnap,plan:planSnap}}));
    }catch(err){lastError=err?.message||String(err);console.error('[Dabster Test Autofill v80]',err);}finally{busy=false;renderBar();}
  }
  async function reset(){if(busy)return;busy=true;lastError='';try{window.DABSTER_BILLING_PLAN_V47?.reset?.();window.DABSTER_OFFER_LINES?.resetPostConfirmation?.();window.DABSTER_BILLING_MODEL_V39={invoices:[]};await window.DABSTER_OFFER_FLOW?.openNewOffer?.();window.DABSTER_OFFER_FLOW?.showOffers?.();loaded=false;}finally{busy=false;renderBar();}}
  function setEnv(mode){sessionStorage.setItem(ENV_KEY,mode);renderBar();if(mode==='free')window.DABSTER_OFFER_FLOW?.showOffers?.();}
  function installStyles(){if(document.getElementById('testAutofillV80Styles'))return;const s=document.createElement('style');s.id='testAutofillV80Styles';s.textContent='#dabsterEnvironmentBar{position:relative;z-index:60;margin:0 0 9px;padding:8px 10px;border:1px solid #d6e0e4;border-radius:8px;background:#fff;font-family:Arial,sans-serif}.v80-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.v80-label{font-size:7.5px;font-weight:800;text-transform:uppercase;color:#75848c}.v80-seg{display:flex;border:1px solid #cfd9de;border-radius:6px;overflow:hidden}.v80-mode,.v80-action{height:29px;border:0;background:#fff;color:#4b626d;font-size:8.8px;font-weight:760;cursor:pointer}.v80-mode{padding:0 11px;border-right:1px solid #dbe2e5}.v80-mode.active{background:#3e6574;color:#fff}.v80-mode.test.active{background:#d86c27}.v80-fixture{font-size:8px;font-weight:750;color:#3f6674;background:#eef6f8;border:1px solid #ccdde3;border-radius:5px;padding:5px 8px}.v80-status{font-size:7.8px;color:#526873}.v80-actions{display:flex;gap:6px;margin-left:auto}.v80-action{padding:0 10px;border:1px solid #cad6db;border-radius:6px}.v80-action.primary{background:#d86c27;border-color:#c85f20;color:#fff}.v80-action:disabled{opacity:.45}.v80-error{font-size:7.7px;font-weight:750;color:#a4484f;background:#fff1f1;border:1px solid #edc7ca;border-radius:5px;padding:4px 7px}@media(max-width:950px){.v80-actions{width:100%;margin-left:0}}';document.head.appendChild(s);}
  function renderBar(){
    if(!bar)return;const env=sessionStorage.getItem(ENV_KEY)||'free';bar.innerHTML=`<div class="v80-row"><span class="v80-label">Ambiente</span><div class="v80-seg"><button class="v80-mode ${env==='free'?'active':''}" data-env="free">Libero</button><button class="v80-mode test ${env==='test'?'active':''}" data-env="test">Test</button></div>${env==='test'?'<span class="v80-fixture">TEST_FATT_001 · Autocompilazione flusso reale</span>':''}<span class="v80-status">${busy?'Compilazione…':loaded?'Piano compilato · motore identico al Libero':'Nessun dato Test caricato'}</span>${lastError?`<span class="v80-error">${lastError}</span>`:''}${env==='test'?`<div class="v80-actions"><button class="v80-action primary" data-load ${busy?'disabled':''}>▶ Compila fino al Piano</button><button class="v80-action" data-reset ${busy?'disabled':''}>↺ Reset test</button></div>`:''}</div>`;
    bar.querySelectorAll('[data-env]').forEach(b=>b.addEventListener('click',()=>setEnv(b.dataset.env)));bar.querySelector('[data-load]')?.addEventListener('click',loadAll);bar.querySelector('[data-reset]')?.addEventListener('click',reset);
  }
  async function install(){installStyles();if(!await waitFor(()=>document.querySelector('.page-shell')&&window.DABSTER_OFFER_FLOW?.openNewOffer&&window.DABSTER_BILLING_PLAN_V47?.getSnapshot))return;bar=document.getElementById('dabsterEnvironmentBar');if(!bar){bar=document.createElement('div');bar.id='dabsterEnvironmentBar';const shell=document.querySelector('.page-shell');shell?.insertBefore(bar,shell.firstChild);}renderBar();window.DABSTER_TEST_AUTOFILL_V80={version:80,fixture:FIXTURE,loadAll,reset};}
  install();
})();