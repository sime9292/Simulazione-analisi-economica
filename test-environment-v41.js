/* v41 - Guided Test Environment. Uses the existing free UI; never replaces menus or core workflows. */
(function(){
  const ENV_KEY='dabster.environment.v41';
  const CASE_KEY='dabster.test.case.v41';
  const REPLAY_KEY='dabster.test.replay.v41';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const CASES={
    '26_022pe01':{
      label:'26_022pe01 · Guardamiglio (LO)',
      offer:{
        id:'26_022pe01',code:'26_022pe01',commessa:'26_022',
        commessaLabel:'26_022 - URBANIZZAZIONE GUARDAMIGLIO (LO) - LOGISTICO',
        title:'Consulenza tecnica Edificio a destinazione logistica in località Guardamiglio (LO)',
        client:"G. B. & PARTNERS SRL PROGETTI E SERVIZI IMMOBILIARI - SOCIETA' UNIPERSONALE",
        offerDate:'23/04/2026',status:'Confermata',amount:19000
      },
      confirmation:{consulting:6000,projects:13000,direction:0},
      lines:[
        {id:'26_022pe01:test:pua',phase:'preliminare',description:'PUA',amount:3000},
        {id:'26_022pe01:test:pdc',phase:'esecutivo',description:'Progetto impianti per PDC',amount:10000},
        {id:'26_022pe01:test:vvf',phase:'consulenze',description:'Parere Preventivo VVF',amount:6000}
      ],
      activities:{
        preliminare:[{name:'PUA · analisi ed elaborati',assign:[['PM',4],['RS_IE',6]]}],
        esecutivo:[{name:'Progetto impianti per PDC',assign:[['RS_IM',10],['RS_IE',10],['UT_IE_S',16]]}],
        consulenze:[{name:'Parere Preventivo VVF',assign:[['VVF_S',8],['VVF_J',8]]}]
      },
      invoice:{
        number:'169 /E',date:'2026-05-31',due:'90 gg Fine Mese',payment:'Bonifico',
        client:"G. B. & PARTNERS SRL PROGETTI E SERVIZI IMMOBILIARI - SOCIETA' UNIPERSONALE",
        pensionFund:true,pensionPct:4,vat:22,taxable:19000,total:24107.20
      }
    }
  };

  let env=sessionStorage.getItem(ENV_KEY)||'free';
  let caseId=sessionStorage.getItem(CASE_KEY)||Object.keys(CASES)[0];
  if(!CASES[caseId])caseId=Object.keys(CASES)[0];
  let current=-1,busy=false,replaying=false,bar=null;
  let originalFlowSnapshot=null;

  const currentCase=()=>CASES[caseId];
  const fire=(el,type='input')=>el?.dispatchEvent(new Event(type,{bubbles:true}));
  function setControl(el,value,type='input'){if(!el)return;el.value=String(value);fire(el,type);}
  function field(label){return [...document.querySelectorAll('#tab-dati label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))||null;}
  function control(label){return field(label)?.querySelector('input,select,textarea')||null;}
  function amountField(label){return [...document.querySelectorAll('#tab-dati .accordion.amounts label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))?.querySelector('input')||null;}
  function setStatus(label){const s=control('Stato');if(!s)return;let opt=[...s.options].find(o=>norm(o.value||o.textContent)===norm(label));if(!opt){opt=new Option(label,label);s.add(opt);}s.value=opt.value;fire(s,'change');}
  function tab(name){document.querySelector(`.tab[data-tab="${name}"]`)?.click();}
  function scrollTo(el){if(!el)return;try{el.scrollIntoView({behavior:replaying?'auto':'smooth',block:'center'});}catch{el.scrollIntoView();}}
  function clearActivities(){document.querySelectorAll('#phaseWorkCards .activity-delete').forEach(btn=>btn.click());}
  function cardForPhase(id){return [...document.querySelectorAll('#phaseWorkCards > .phase-work-card')].find(c=>(c.querySelector('.phase-type-select')?.value||c.dataset.planningPhase||'')===id)||null;}
  async function addActivity(phaseId,item){
    const card=cardForPhase(phaseId);if(!card)return;
    card.querySelector('.add-activity')?.click();await sleep(replaying?15:70);
    const activity=[...card.querySelectorAll('.activities .activity-card')].at(-1);if(!activity)return;
    const name=activity.querySelector('.activity-name');if(name){name.value=item.name;fire(name,'change');}
    const rows=activity.querySelector('.assignment-rows');if(rows)rows.innerHTML='';
    for(const [role,hours] of item.assign){
      activity.querySelector('.add-assignment')?.click();await sleep(replaying?10:25);
      const row=activity.querySelector('.assignment-rows .assignment-row:last-child');
      const roleEl=row?.querySelector('.assignment-role'),hoursEl=row?.querySelector('.assignment-hours');
      if(roleEl){roleEl.value=role;fire(roleEl,'change');}
      if(hoursEl){hoursEl.value=String(hours);fire(hoursEl,'input');}
    }
    fire(name,'change');
  }
  function setProposal(phase,value){const row=document.querySelector(`#tab-analisi .economic-table .phase-row[data-economic-phase="${phase}"]`);const input=row?.querySelector('.ae-proposal');if(input){input.value=money(value);fire(input,'input');fire(input,'change');}}
  async function waitFor(fn,loops=220,delay=40){for(let i=0;i<loops;i++){const x=fn();if(x)return x;await sleep(delay);}return null;}
  async function waitDetail(){return waitFor(()=>document.getElementById('analysisSubtabs')&&document.querySelectorAll('#phaseWorkCards > .phase-work-card').length>=7&&document.getElementById('totaleOfferta'));}
  async function waitFlow(){return waitFor(()=>window.DABSTER_OFFER_FLOW?.openNewOffer&&window.DABSTER_OFFER_FLOW);}
  async function waitBilling(){return waitFor(()=>window.DABSTER_BILLING_V39?.getModel&&window.DABSTER_BILLING_V39,260,45);}

  function testSnapshot(){
    const c=currentCase(),confirmed=current>=3;
    return {offer:{...c.offer,status:confirmed?'Confermata':'In lavorazione'},lines:confirmed?c.lines.map(x=>({...x})):[],loadedOffer:true,testEnvironment:true};
  }
  async function patchFlow(){
    const flow=await waitFlow();if(!flow)return null;
    if(!originalFlowSnapshot)originalFlowSnapshot=flow.getSnapshot?.bind(flow)||null;
    flow.getSnapshot=()=>testSnapshot();
    flow.offer={...currentCase().offer};
    window.DABSTER_TEST_CASE_V41=currentCase();
    window.dispatchEvent(new CustomEvent('dabster-offer-flow-change',{detail:testSnapshot()}));
    return flow;
  }

  function installStyles(){
    if(document.getElementById('dabsterTestEnvironmentV41Styles'))return;
    const s=document.createElement('style');s.id='dabsterTestEnvironmentV41Styles';s.textContent=`
      #dabsterEnvironmentBar{position:relative;z-index:50;margin:0 0 9px;padding:7px 9px;border:1px solid #d6e0e4;border-radius:8px;background:#fff;box-shadow:0 1px 3px rgba(45,63,72,.04);font-family:Arial,sans-serif}
      .te41-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.te41-label{font-size:7.5px;font-weight:800;text-transform:uppercase;color:#75848c;letter-spacing:.04em}.te41-seg{display:flex;border:1px solid #cfd9de;border-radius:6px;overflow:hidden}.te41-mode{height:27px;padding:0 10px;border:0;border-right:1px solid #dbe2e5;background:#fff;color:#526872;font-size:8.7px;font-weight:760;cursor:pointer}.te41-mode:last-child{border-right:0}.te41-mode.active{background:#3e6574;color:#fff}.te41-test .te41-mode.active{background:#d86c27}.te41-case{height:28px;min-width:235px;border:1px solid #cfd9de;border-radius:6px;background:#fff;padding:0 8px;color:#3e5661;font-size:8.8px}.te41-nav{display:flex;align-items:center;gap:5px;margin-left:auto}.te41-arrow,.te41-reset{height:28px;border:1px solid #cad6db;border-radius:6px;background:#fff;color:#425c68;font-size:10px;font-weight:800;cursor:pointer}.te41-arrow{width:32px;font-size:16px}.te41-reset{padding:0 9px;font-size:8px}.te41-arrow:disabled,.te41-reset:disabled,.te41-case:disabled{opacity:.45;cursor:not-allowed}.te41-step{min-width:245px;padding:0 7px}.te41-step strong{display:block;font-size:8.9px;color:#354e59}.te41-step span{display:block;margin-top:2px;font-size:7.5px;color:#7b878d}.te41-real{display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:999px;background:#edf6ef;color:#427053;font-size:7.2px;font-weight:780}.te41-free-note{font-size:8px;color:#74828a}.te41-busy{opacity:.72}.te41-demo-zero{display:none!important}
      @media(max-width:900px){.te41-nav{width:100%;margin-left:0}.te41-step{flex:1;min-width:180px}.te41-case{min-width:190px;max-width:100%}}
    `;document.head.appendChild(s);
  }

  function renderBar(){
    if(!bar)return;const test=env==='test',step=STEPS[current];
    bar.classList.toggle('te41-test',test);bar.classList.toggle('te41-busy',busy);
    bar.innerHTML=`<div class="te41-row"><span class="te41-label">Ambiente</span><div class="te41-seg"><button class="te41-mode ${!test?'active':''}" data-env="free">Libero</button><button class="te41-mode ${test?'active':''}" data-env="test">Test</button></div>${test?`<span class="te41-label">Caso</span><select class="te41-case" ${busy?'disabled':''}>${Object.entries(CASES).map(([id,c])=>`<option value="${esc(id)}" ${id===caseId?'selected':''}>${esc(c.label)}</option>`).join('')}</select><span class="te41-real">PDF + fattura reali</span><div class="te41-nav"><button class="te41-arrow" data-prev ${busy||current<=0?'disabled':''}>←</button><div class="te41-step"><strong>${step?`Step ${current+1} di ${STEPS.length} · ${esc(step.title)}`:'Preparazione test'}</strong><span>${step?esc(step.hint):'Le pagine restano quelle del gestionale libero.'}</span></div><button class="te41-arrow" data-next ${busy||current>=STEPS.length-1?'disabled':''}>→</button><button class="te41-reset" data-reset ${busy?'disabled':''}>↺ Reset</button></div>`:`<span class="te41-free-note">Inserimento manuale normale · nessuna compilazione automatica.</span>`}</div>`;
    bar.querySelectorAll('[data-env]').forEach(b=>b.addEventListener('click',()=>switchEnvironment(b.dataset.env)));
    bar.querySelector('.te41-case')?.addEventListener('change',e=>{sessionStorage.setItem(CASE_KEY,e.target.value);sessionStorage.setItem(REPLAY_KEY,'0');location.reload();});
    bar.querySelector('[data-next]')?.addEventListener('click',()=>gotoStep(current+1));
    bar.querySelector('[data-prev]')?.addEventListener('click',()=>replayTo(current-1));
    bar.querySelector('[data-reset]')?.addEventListener('click',()=>replayTo(0));
  }
  function installBar(){
    installStyles();const shell=document.querySelector('.page-shell');if(!shell)return false;
    bar=document.getElementById('dabsterEnvironmentBar');if(!bar){bar=document.createElement('section');bar.id='dabsterEnvironmentBar';const title=shell.querySelector('.page-title');shell.insertBefore(bar,title||shell.firstChild);}
    renderBar();return true;
  }
  function switchEnvironment(next){if(next===env)return;sessionStorage.setItem(ENV_KEY,next);sessionStorage.removeItem(REPLAY_KEY);location.reload();}
  function replayTo(target){sessionStorage.setItem(ENV_KEY,'test');sessionStorage.setItem(CASE_KEY,caseId);sessionStorage.setItem(REPLAY_KEY,String(Math.max(0,target)));location.reload();}

  async function stepNewOffer(){
    const flow=await patchFlow();if(!flow)return;
    await flow.openNewOffer();await waitDetail();tab('dati');
    const title=document.querySelector('.page-title');if(title)title.textContent='Nuova offerta';
    scrollTo(document.querySelector('#tab-dati .accordion.general'));
  }
  async function stepOfferData(){
    const c=currentCase();await waitDetail();tab('dati');setStatus('In lavorazione');
    const comm=control('Commessa');if(comm){let opt=[...comm.options].find(o=>o.value===c.offer.commessaLabel);if(!opt){opt=new Option(c.offer.commessaLabel,c.offer.commessaLabel);comm.add(opt);}comm.value=opt.value;fire(comm,'change');}
    setControl(control('Titolo'),c.offer.title);setControl(control('Codice'),c.offer.code);setControl(control('Data offerta'),c.offer.offerDate);
    setControl(amountField('Importo stimato'),c.offer.amount);setControl(amountField('Consulenza'),c.confirmation.consulting);setControl(amountField('Progetti'),c.confirmation.projects);setControl(amountField('Direzione lavori'),c.confirmation.direction);
    setControl(document.getElementById('totaleOfferta'),c.offer.amount);scrollTo(document.querySelector('#tab-dati .accordion.general'));
  }
  async function stepAnalysis(){
    const c=currentCase();await waitDetail();setStatus('In lavorazione');tab('analisi');window.dabsterAnalysisSubtabs?.activate?.('impianti');
    clearActivities();await sleep(replaying?30:120);
    for(const [phase,items] of Object.entries(c.activities))for(const item of items)await addActivity(phase,item);
    await sleep(replaying?30:150);window.dabsterEconomicPhaseController?.reconcile?.();
    ['preliminare','definitivo','esecutivo','dl','consulenze','scia_vvf','collaudo'].forEach(p=>setProposal(p,0));
    c.lines.forEach(l=>setProposal(l.phase,l.amount));setControl(document.getElementById('tradePct'),0);window.dabsterRecalcEconomic?.();setControl(document.getElementById('totaleOfferta'),c.offer.amount);
    scrollTo(document.getElementById('analysisSubtabImpianti')||document.getElementById('tab-analisi'));
  }
  async function stepConfirm(){
    const c=currentCase();tab('dati');setStatus('Confermata');
    await waitFor(()=>!document.getElementById('confirmationAmountsSection')?.hidden&&document.getElementById('confirmationConsulting'));
    const vals=[['confirmationConsulting',c.confirmation.consulting],['confirmationProjects',c.confirmation.projects],['confirmationDirection',c.confirmation.direction]];
    for(const [id,val] of vals){const el=document.getElementById(id);if(el){el.value=money(val);fire(el,'input');fire(el,'blur');}}
    await sleep(replaying?40:180);window.DABSTER_OFFER_LINES?.sync?.();scrollTo(document.getElementById('confirmationAmountsSection'));
  }
  async function stepOfferLines(){
    const c=currentCase();tab('dati');await waitFor(()=>document.querySelectorAll('#offerLineRows .offer-line-row').length);
    const map=new Map(c.lines.map(x=>[x.phase,x]));
    document.querySelectorAll('#offerLineRows .offer-line-row').forEach(row=>{
      const phase=row.dataset.phase||row.querySelector('.offer-line-phase-select')?.value||'';const line=map.get(phase);const desc=row.querySelector('.offer-line-desc'),amount=row.querySelector('.offer-line-amount');
      if(line){row.classList.remove('te41-demo-zero');if(desc){desc.value=line.description;fire(desc,'input');}if(amount){amount.value=money(line.amount);fire(amount,'input');fire(amount,'blur');}}
      else{const n=Number(String(amount?.value||'0').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;row.classList.toggle('te41-demo-zero',Math.abs(n)<.01);}
    });
    await sleep(replaying?40:160);window.DABSTER_OFFER_LINES?.sync?.();
    document.querySelectorAll('#offerLineRows .offer-line-row').forEach(row=>{const phase=row.dataset.phase||'';if(!map.has(phase)){const amount=row.querySelector('.offer-line-amount');const n=Number(String(amount?.value||'0').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;if(Math.abs(n)<.01)row.classList.add('te41-demo-zero');}});
    scrollTo(document.getElementById('offerLinesSection'));
  }
  async function ensureBillingEmpty(){
    await patchFlow();let api=window.DABSTER_BILLING_V39;
    if(!api){document.querySelector('#appSidebar .sidebar-item[data-page="billing"]')?.click();api=await waitBilling();}
    if(!api)return null;const model=api.getModel();if(Array.isArray(model?.invoices))model.invoices.splice(0,model.invoices.length);window.dispatchEvent(new CustomEvent('dabster-offer-flow-change',{detail:testSnapshot()}));return api;
  }
  async function stepDashboardCommessa(){
    const api=await ensureBillingEmpty();if(!api)return;document.querySelector('#appSidebar .sidebar-item[data-page="billing"]')?.click();await sleep(replaying?40:160);scrollTo(document.getElementById('billingDashboardPageV39'));
  }
  async function stepDashboardOffer(){const api=await waitBilling();api?.showDashboard?.();await sleep(40);document.querySelector('#billingDashboardPageV39 [data-open-commessa]')?.click();await sleep(replaying?30:100);scrollTo(document.getElementById('billingDashboardPageV39'));}
  async function stepDashboardLines(){document.querySelector('#billingDashboardPageV39 [data-open-offer]')?.click();await sleep(replaying?30:100);scrollTo(document.getElementById('bw39Top')||document.getElementById('billingDashboardPageV39'));}
  async function stepNewInvoice(){document.querySelector('#billingDashboardPageV39 [data-new-invoice]')?.click();await waitFor(()=>!document.getElementById('newInvoicePageV39')?.hidden&&document.querySelector('[data-meta="number"]'));scrollTo(document.querySelector('#newInvoicePageV39 .ni39-section'))}
  async function stepInvoiceSource(){
    document.querySelector('#newInvoicePageV39 [data-src-commessa]')?.click();await sleep(replaying?20:80);document.querySelector('#newInvoicePageV39 [data-src-offer]')?.click();await sleep(replaying?30:100);scrollTo(document.querySelector('#newInvoicePageV39 .ni39-section.source'));
  }
  async function stepInvoiceAllocate(){
    const c=currentCase();
    for(const line of c.lines){const cb=[...document.querySelectorAll('#newInvoicePageV39 [data-src-check]')].find(x=>x.dataset.srcCheck===line.id);if(cb&&!cb.checked){cb.click();await sleep(replaying?15:60);}}
    document.querySelector('#newInvoicePageV39 [data-add-selected]')?.click();await sleep(replaying?30:120);scrollTo(document.querySelector('#newInvoicePageV39 .ni39-section.invoice'));
  }
  async function setMeta(name,value){const el=document.querySelector(`#newInvoicePageV39 [data-meta="${name}"]`);if(!el)return;el.value=value;fire(el,'change');await sleep(replaying?15:55);}
  async function stepInvoiceData(){
    const c=currentCase();await setMeta('client',c.invoice.client);await setMeta('number',c.invoice.number);await setMeta('date',c.invoice.date);await setMeta('due',c.invoice.due);await setMeta('payment',c.invoice.payment);scrollTo(document.querySelector('#newInvoicePageV39 .ni39-section'));
  }
  async function stepSaveInvoice(){document.querySelector('#newInvoicePageV39 [data-save-invoice]')?.click();await waitFor(()=>!document.getElementById('billingDashboardPageV39')?.hidden);scrollTo(document.getElementById('bw39Top')||document.getElementById('billingDashboardPageV39'));}
  async function stepFinalCommessa(){document.querySelector('#appSidebar .sidebar-item[data-page="billing"]')?.click();await sleep(replaying?35:120);scrollTo(document.getElementById('billingDashboardPageV39'));}

  const STEPS=[
    {title:'Nuova offerta',hint:'Schermata reale vuota, pronta per l’inserimento.',run:stepNewOffer},
    {title:'Dati offerta',hint:'Compilazione automatica dei dati reali di 26_022pe01.',run:stepOfferData},
    {title:'Analisi Economica',hint:'Attività semplici, ore demo e valori 3.000 + 10.000 + 6.000 €.',run:stepAnalysis},
    {title:'Conferma offerta',hint:'Conferma senza variazioni: totale 19.000 €.',run:stepConfirm},
    {title:'Righe Offerta',hint:'PUA, Progetto impianti per PDC, Parere Preventivo VVF.',run:stepOfferLines},
    {title:'Dashboard · Commessa',hint:'KPI solo a livello 26_022; fatturato iniziale 0 €.',run:stepDashboardCommessa},
    {title:'Dashboard · Offerta',hint:'Apertura di 26_022pe01 con Totale tabella.',run:stepDashboardOffer},
    {title:'Dashboard · Righe Offerta',hint:'Tre righe, residuo iniziale complessivo 19.000 €.',run:stepDashboardLines},
    {title:'Nuova fattura',hint:'Apre la vera funzione Nuova fattura.',run:stepNewInvoice},
    {title:'Origine fatturazione',hint:'Commessa → Offerta → Righe Offerta.',run:stepInvoiceSource},
    {title:'Evasione righe',hint:'Seleziona ed evade 3.000 + 10.000 + 6.000 €.',run:stepInvoiceAllocate},
    {title:'Fattura 169/E',hint:'Numero, data e tre Righe Fattura reali; imponibile 19.000 €.',run:stepInvoiceData},
    {title:'Salvataggio fattura',hint:'Salva 169/E usando la funzione reale del gestionale.',run:stepSaveInvoice},
    {title:'Situazione finale',hint:'Commessa 26_022: fatturato 19.000 €, residuo 0 €, 100%.',run:stepFinalCommessa}
  ];

  async function gotoStep(target){
    if(env!=='test'||busy||target<0||target>=STEPS.length)return;busy=true;renderBar();
    try{await patchFlow();await STEPS[target].run();current=target;window.dispatchEvent(new CustomEvent('dabster-test-step-change',{detail:{caseId,step:current,title:STEPS[current].title}}));}
    catch(err){console.error('[Dabster Test v41] step fallito',target,err);}
    finally{busy=false;renderBar();}
  }
  async function bootTest(){
    await patchFlow();const replayRaw=sessionStorage.getItem(REPLAY_KEY);sessionStorage.removeItem(REPLAY_KEY);const target=replayRaw===null?0:Math.max(0,Math.min(STEPS.length-1,Number(replayRaw)||0));
    replaying=target>0;for(let i=0;i<=target;i++)await gotoStep(i);replaying=false;renderBar();
  }
  async function install(){
    for(let i=0;i<240&&!installBar();i++)await sleep(40);if(!bar)return;
    if(env==='test')bootTest();
  }
  install();
})();
