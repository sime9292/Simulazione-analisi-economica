/* v36 - Single coherent PE04 simulation: Offerte list -> Dettaglio -> Attivita Commessa -> Piano/Eventi. */
(function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cents=n=>Math.round(Number(n||0)*100)/100;

  const OFFER={
    id:'23_68pe04',code:'23_68pe04',commessa:'23_68',commessaLabel:'23_68 - AMPLIAMENTI E ADEGUAMENTI SEDE',
    title:'Progettazione impianti, direzione lavori e assistenza prevenzione incendi',
    client:'Cliente Test 23_68',projectManager:'CP Demo',commessaManager:'RC Demo',status:'Confermata',amount:80000,
    confirmation:{consulting:10000,projects:50000,direction:20000},
    phases:{preliminare:20000,esecutivo:30000,dl:20000,consulenze:10000}
  };

  const ACTIVITY_PLAN={
    preliminare:[
      {name:'Progetto Preliminare IE',assign:[['RS_IE',30],['UT_IE_J',40]]},
      {name:'Progetto preliminare IM',assign:[['RS_IM',24],['UT_IM_J',36]]}
    ],
    esecutivo:[
      {name:'Elaborati grafici IM',assign:[['RS_IM',20],['UT_IM_S',70]]},
      {name:'Elaborati grafici IE',assign:[['RS_IE',20],['UT_IE_S',70]]},
      {name:'Calcoli Illuminotecnici',assign:[['RS_IE',12],['UT_IE_J',36]]}
    ],
    dl:[
      {name:'Direzione Lavori Generica IE',assign:[['PM',15],['RS_IE',30]]},
      {name:'Direzione Lavori Generica IM',assign:[['PM',15],['RS_IM',30]]}
    ],
    consulenze:[
      {name:'Consulenza Generica VVF',assign:[['VVF_S',24],['VVF_J',32]]}
    ]
  };

  const EVENTS=[
    {id:'acconto',name:'Acconto alla sottoscrizione',kind:'confirmation',condition:'Alla conferma dell’offerta',percent:20,amount:16000,phases:'all',state:'ready',maturedAt:'27/08/2026',source:'Automatico'},
    {id:'sal-preliminare',name:'SAL · Consegna progettazione preliminare',kind:'activity',condition:'Tutte le attività della fase preliminare concluse',percent:20,amount:16000,phases:['preliminare','esecutivo'],watchPhase:'preliminare',state:'waiting',maturedAt:'',source:'Attività Commessa'},
    {id:'inizio-lavori',name:'SAL · Inizio lavori',kind:'external',condition:'Avvenimento esterno: inizio lavori',percent:20,amount:16000,phases:['esecutivo','dl'],state:'waiting_external',maturedAt:'',source:'Evento esterno'},
    {id:'verbale-vvf',name:'SAL · Consegna verbale VVF',kind:'external',condition:'Avvenimento esterno: consegna verbale VVF',percent:15,amount:12000,phases:['dl','consulenze'],state:'waiting_external',maturedAt:'',source:'Evento esterno',documentSuggested:true},
    {id:'saldo',name:'Saldo finale',kind:'final',condition:'Chiusura incarico e verifica residuo',percent:25,amount:20000,phases:'remaining',state:'waiting',maturedAt:'',source:'Chiusura incarico'}
  ];

  const state={loadedOffer:false,events:EVENTS.map(x=>({...x,registration:null})),listStatus:'all',listSearch:''};
  let offersPage=null,planSection=null,eventModal=null,boardObserver=null;

  function field(label){return [...document.querySelectorAll('#tab-dati label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))||null;}
  function control(label){return field(label)?.querySelector('input,select,textarea')||null;}
  function fire(el,type='input'){el?.dispatchEvent(new Event(type,{bubbles:true}));}
  function setControl(el,value,type='input'){if(!el)return;el.value=String(value);fire(el,type);}
  function statusSelect(){return control('Stato');}
  function setStatus(label){const s=statusSelect();if(!s)return;let opt=[...s.options].find(o=>norm(o.value||o.textContent)===norm(label));if(!opt){opt=new Option(label,label);s.add(opt);}s.value=opt.value;fire(s,'change');}
  function amountField(label){return [...document.querySelectorAll('#tab-dati .accordion.amounts label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))?.querySelector('input')||null;}

  function currentLines(){
    const live=window.DABSTER_OFFER_LINES?.lines;
    if(Array.isArray(live)&&live.length)return live.map(x=>({...x,amount:Number(x.amount||0)}));
    return Object.entries(OFFER.phases).map(([phase,amount],i)=>({id:`${OFFER.code}:phase:${phase}`,phase,description:['Progettazione e pratiche autorizzative','Progettazione esecutiva impianti','Direzione lavori','Prevenzione incendi e assistenza VVF'][i]||phase,amount}));
  }

  function eventAllocations(event){
    const lines=currentLines();
    if(!lines.length)return [];
    let selected=[];
    if(event.phases==='all')selected=lines;
    else if(event.phases==='remaining'){
      const used=new Map();
      state.events.filter(e=>e.id!==event.id).forEach(e=>eventAllocationsBase(e,lines).forEach(a=>used.set(a.offerLineId,cents((used.get(a.offerLineId)||0)+a.amount))));
      selected=lines.map(l=>({...l,weight:Math.max(0,cents(l.amount-(used.get(l.id)||0)))})).filter(l=>l.weight>.01);
    }else selected=lines.filter(l=>(event.phases||[]).includes(l.phase));
    return allocate(event.amount,selected,event.phases==='remaining');
  }
  function eventAllocationsBase(event,lines){
    let selected=event.phases==='all'?lines:event.phases==='remaining'?[]:lines.filter(l=>(event.phases||[]).includes(l.phase));
    return allocate(event.amount,selected,false);
  }
  function allocate(total,selected,useWeight){
    if(!selected.length)return [];
    const weightTotal=selected.reduce((s,l)=>s+Number(useWeight?l.weight:l.amount||0),0);if(weightTotal<=0)return [];
    let assigned=0;
    return selected.map((l,i)=>{const weight=Number(useWeight?l.weight:l.amount||0);const amount=i===selected.length-1?cents(total-assigned):cents(total*weight/weightTotal);assigned=cents(assigned+amount);return {offerLineId:l.id,phase:l.phase,description:l.description,amount,lineAmount:l.amount};});
  }

  function eventStateLabel(e){return e.state==='ready'?'Pronto da fatturare':e.state==='matured'?'Maturato':e.state==='waiting_external'?'Da registrare':e.state==='waiting'?'Programmato':e.state==='invoiced'?'Fatturato':e.state;}
  function eventStateClass(e){return e.state==='ready'?'ready':e.state==='waiting_external'?'external':e.state==='invoiced'?'done':'waiting';}
  function emit(){
    renderPlan();renderMilestones();
    window.dispatchEvent(new CustomEvent('dabster-pe04-flow-change',{detail:getSnapshot()}));
  }
  function getSnapshot(){return {offer:{...OFFER},events:state.events.map(e=>({...e,allocations:eventAllocations(e)})),lines:currentLines(),loadedOffer:state.loadedOffer};}
  function eventById(id){return state.events.find(e=>e.id===id)||null;}

  function installStyles(){
    if(document.getElementById('pe04FlowStyles'))return;
    const s=document.createElement('style');s.id='pe04FlowStyles';s.textContent=`
      #offersListPage[hidden]{display:none!important}.offers36{background:#f4f6f7;border:1px solid #dbe2e5;border-radius:9px;padding:13px;min-height:650px}.offers36-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:11px}.offers36-head strong{display:block;font-size:15px;color:#304650}.offers36-head span{display:block;margin-top:2px;font-size:9px;color:#718089}.offers36-new{height:32px;padding:0 12px;border:1px solid #d36520;border-radius:6px;background:#e97026;color:#fff;font-size:10px;font-weight:750;cursor:pointer}.offers36-kpis{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:8px;margin-bottom:11px}.offers36-kpi{min-height:62px;padding:9px 11px;border:1px solid #dce3e6;border-radius:8px;background:#fff;cursor:pointer;text-align:left}.offers36-kpi span{display:block;font-size:8px;font-weight:750;color:#71808a;text-transform:uppercase}.offers36-kpi strong{display:block;margin-top:5px;font-size:18px;color:#334955}.offers36-kpi.active{border-color:#e2a16f;background:#fff8f2;box-shadow:0 0 0 2px rgba(225,112,35,.07)}.offers36-controls{display:grid;grid-template-columns:minmax(240px,1fr) 180px;gap:8px;margin-bottom:9px}.offers36-controls input,.offers36-controls select{height:31px;border:1px solid #d5dde1;border-radius:6px;background:#fff;padding:0 9px;font-size:10px;color:#40545f}.offers36-table{border:1px solid #d7dfe3;border-radius:8px;overflow:hidden;background:#fff}.offers36-row{display:grid;grid-template-columns:105px 120px minmax(250px,1.5fr) minmax(170px,.8fr) 118px 120px 34px;min-height:43px}.offers36-row>div{display:flex;align-items:center;min-width:0;padding:6px 8px;border-right:1px solid #e8ecee;border-bottom:1px solid #e8ecee;font-size:9.7px;color:#3c515c}.offers36-row>div:last-child{border-right:0;justify-content:center}.offers36-row.head{min-height:32px;background:#f1f4f5}.offers36-row.head>div{font-size:7.8px;font-weight:780;color:#63727b;text-transform:uppercase}.offers36-row.data{cursor:pointer}.offers36-row.data:hover>div{background:#fff8f3}.offers36-code{font-weight:800;color:#31596b}.offers36-title{font-weight:700;line-height:1.25}.offers36-money{justify-content:flex-end;font-variant-numeric:tabular-nums;font-weight:700}.offers36-status{display:inline-flex;padding:4px 7px;border-radius:999px;background:#e8f3eb;color:#3d6c4d;font-size:8px;font-weight:750}.offers36-open{font-size:17px;color:#e06b22}.offers36-empty{padding:22px;text-align:center;color:#7c8991;font-size:10px}
      #billingPlanSection{margin-top:10px!important;border-left-color:#4b8492!important}#billingPlanSection>.section-head{background:linear-gradient(90deg,#eef7f8,#fbfdfd)!important;color:#315461!important}.plan36-intro{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;font-size:8.7px;color:#6a7982}.plan36-intro strong{font-size:10px;color:#3a525e}.plan36-table{border:1px solid #d8e1e4;border-radius:7px;overflow:hidden}.plan36-row{display:grid;grid-template-columns:minmax(190px,1.2fr) minmax(235px,1.45fr) 75px 115px 140px;min-height:37px;background:#fff}.plan36-row>div{display:flex;align-items:center;min-width:0;padding:5px 7px;border-right:1px solid #e7ecee;border-bottom:1px solid #e7ecee;font-size:9px;color:#3f535e}.plan36-row>div:last-child{border-right:0}.plan36-row.head{min-height:30px;background:#f2f6f7}.plan36-row.head>div{font-size:7.7px;font-weight:780;text-transform:uppercase;color:#64737c}.plan36-name{font-weight:730}.plan36-money{justify-content:flex-end;font-weight:760;font-variant-numeric:tabular-nums}.plan36-state{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:7.8px;font-weight:760}.plan36-state.ready{background:#e7f4ea;color:#356847}.plan36-state.external{background:#fff1df;color:#955c1d}.plan36-state.waiting{background:#eef2f4;color:#65747d}.plan36-state.done{background:#e6eff7;color:#3f6077}.plan36-foot{margin-top:7px;font-size:8.4px;color:#718088}.plan36-foot strong{color:#3c5561}
      .kb36-events{margin:0 0 10px;border:1px solid #d8e1e4;border-left:4px solid #de7a32;border-radius:8px;background:#fff;padding:9px}.kb36-events-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:7px}.kb36-events-head strong{font-size:11px;color:#354b56}.kb36-events-head span{font-size:8.3px;color:#738189}.kb36-event-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:7px}.kb36-event{border:1px solid #dce3e6;border-radius:7px;background:#fafcfc;padding:8px;display:grid;grid-template-columns:1fr auto;gap:6px}.kb36-event .copy strong{display:block;font-size:9.8px;color:#334a56}.kb36-event .copy span{display:block;margin-top:3px;font-size:8px;line-height:1.25;color:#718089}.kb36-event button{align-self:center;height:27px;padding:0 8px;border:1px solid #d58b50;border-radius:5px;background:#fff7ef;color:#8d5225;font-size:8.5px;font-weight:750;cursor:pointer}.kb36-event.ready{border-left:3px solid #66a078}.kb36-event.ready button{display:none}.kb36-auto{font-size:8.3px;font-weight:750;color:#47715a;align-self:center}
      .pe04-modal{position:fixed;inset:0;z-index:99995;background:rgba(28,39,46,.5);display:flex;align-items:center;justify-content:center;padding:18px}.pe04-modal[hidden]{display:none!important}.pe04-dialog{width:min(520px,95vw);background:#fff;border-radius:9px;border:1px solid #d5dde1;box-shadow:0 20px 50px rgba(25,37,45,.25);overflow:hidden}.pe04-dialog-head{padding:12px 14px;background:#f5f7f8;border-bottom:1px solid #e1e7ea}.pe04-dialog-head strong{display:block;font-size:13px;color:#324853}.pe04-dialog-head span{display:block;margin-top:2px;font-size:8.5px;color:#718089}.pe04-dialog-body{padding:13px;display:grid;gap:9px}.pe04-dialog-body label{display:grid;gap:4px;font-size:8.5px;font-weight:700;color:#596b75}.pe04-dialog-body input,.pe04-dialog-body textarea{border:1px solid #d5dde1;border-radius:6px;padding:7px 8px;font:10px Arial;color:#3c505c}.pe04-dialog-foot{display:flex;justify-content:flex-end;gap:7px;padding:10px 13px;border-top:1px solid #e3e8ea;background:#fafbfc}.pe04-dialog-foot button{height:29px;padding:0 10px;border:1px solid #ccd6db;border-radius:6px;background:#fff;font-size:9px;font-weight:700;color:#50636d;cursor:pointer}.pe04-dialog-foot .primary{background:#e97026;border-color:#d7661f;color:#fff}
      .clean-lines-hint.pe04-updated{font-weight:650;color:#4f6874}.clean-lines-btn.pe04-import{border-color:#8bb1bc!important;background:#f3fafb!important;color:#315d69!important}
      @media(max-width:900px){.offers36-kpis{grid-template-columns:repeat(2,1fr)}.offers36-table{overflow-x:auto}.offers36-row{min-width:900px}.plan36-table{overflow-x:auto}.plan36-row{min-width:780px}.offers36-controls{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function hideAllPages(){
    document.querySelector('.main-card')?.style.setProperty('display','none');
    const k=document.getElementById('kanbanPage');if(k)k.hidden=true;
    const b=document.getElementById('billingDashboardPageV36')||document.getElementById('billingDashboardPageV35')||document.getElementById('billingDashboardPage');if(b)b.hidden=true;
    if(offersPage)offersPage.hidden=true;
  }
  function setPageChrome(title,breadcrumb,page){
    const t=document.querySelector('.page-title');if(t)t.textContent=title;
    const bc=document.querySelector('.breadcrumb');if(bc)bc.innerHTML=breadcrumb;
    document.querySelectorAll('#appSidebar .sidebar-item').forEach(x=>x.classList.toggle('active',x.dataset.page===page));
    document.getElementById('appSidebar')?.classList.remove('open');document.getElementById('appSidebarOverlay')?.classList.remove('open');
  }

  function offerListRow(){
    if(state.listStatus!=='all'&&state.listStatus!==norm(OFFER.status))return '';
    const q=norm(state.listSearch);if(q&&!norm(`${OFFER.code} ${OFFER.commessa} ${OFFER.title} ${OFFER.client}`).includes(q))return '';
    return `<div class="offers36-row data" data-open-pe04><div><strong>${esc(OFFER.commessa)}</strong></div><div><span class="offers36-code">${esc(OFFER.code)}</span></div><div><span class="offers36-title">${esc(OFFER.title)}</span></div><div>${esc(OFFER.client)}</div><div class="offers36-money">${money(OFFER.amount)} €</div><div><span class="offers36-status">Confermata</span></div><div class="offers36-open">›</div></div>`;
  }
  function renderOffers(){
    if(!offersPage)return;
    const counts={draft:0,review:0,sent:0,confirmed:1};
    offersPage.innerHTML=`<div class="offers36"><div class="offers36-head"><div><strong>Offerte</strong><span>Elenco tabellare · clicca una riga per aprire Dati Offerta e Analisi Economica.</span></div><button type="button" class="offers36-new" id="offers36New">＋ Nuova offerta</button></div><div class="offers36-kpis"><button class="offers36-kpi" data-kpi="in lavorazione"><span>Da inviare</span><strong>${counts.draft}</strong></button><button class="offers36-kpi" data-kpi="completata"><span>Da revisionare</span><strong>${counts.review}</strong></button><button class="offers36-kpi" data-kpi="inviata"><span>Inviate</span><strong>${counts.sent}</strong></button><button class="offers36-kpi ${state.listStatus==='confermata'?'active':''}" data-kpi="confermata"><span>Confermate</span><strong>${counts.confirmed}</strong></button></div><div class="offers36-controls"><input id="offers36Search" value="${esc(state.listSearch)}" placeholder="Cerca commessa, codice, titolo o cliente…"><select id="offers36Status"><option value="all">Tutti gli stati</option><option value="in lavorazione">In lavorazione</option><option value="completata">Completata</option><option value="inviata">Inviata</option><option value="confermata">Confermata</option></select></div><div class="offers36-table"><div class="offers36-row head"><div>Commessa</div><div>Codice offerta</div><div>Offerta</div><div>Cliente</div><div>Importo</div><div>Stato</div><div></div></div>${offerListRow()||'<div class="offers36-empty">Nessuna offerta corrisponde ai filtri.</div>'}</div></div>`;
    const sel=offersPage.querySelector('#offers36Status');if(sel)sel.value=state.listStatus;
    offersPage.querySelector('#offers36Search')?.addEventListener('input',e=>{state.listSearch=e.target.value;renderOffers();});
    offersPage.querySelector('#offers36Status')?.addEventListener('change',e=>{state.listStatus=e.target.value;renderOffers();});
    offersPage.querySelectorAll('[data-kpi]').forEach(b=>b.addEventListener('click',()=>{const v=b.dataset.kpi;state.listStatus=state.listStatus===v?'all':v;renderOffers();}));
    offersPage.querySelector('[data-open-pe04]')?.addEventListener('click',()=>openPe04());
    offersPage.querySelector('#offers36New')?.addEventListener('click',()=>openNewOffer());
  }
  function showOffers(){
    hideAllPages();offersPage.hidden=false;setPageChrome('Offerte','<span>⌂</span><span>›</span><strong>Offerte</strong>','offers');history.replaceState(null,'','#offerte');renderOffers();
  }
  function showDetail(){
    hideAllPages();const main=document.querySelector('.main-card');if(main)main.style.removeProperty('display');setPageChrome('Offerta','<span>⌂</span><span>›</span><span>Offerte</span><span>›</span><strong>'+esc(OFFER.code)+'</strong>','offers');history.replaceState(null,'','#offerta-'+OFFER.code);
  }

  function clearAnalysisActivities(){document.querySelectorAll('#phaseWorkCards .activity-delete').forEach(btn=>btn.click());}
  function cardForPhase(id){return [...document.querySelectorAll('#phaseWorkCards > .phase-work-card')].find(c=>(c.querySelector('.phase-type-select')?.value||c.dataset.planningPhase||'')===id)||null;}
  async function addPlannedActivity(phaseId,item){
    const card=cardForPhase(phaseId);if(!card)return;
    card.querySelector('.add-activity')?.click();await sleep(100);
    const activity=[...card.querySelectorAll('.activities .activity-card')].at(-1);if(!activity)return;
    const name=activity.querySelector('.activity-name');if(name){name.value=item.name;fire(name,'change');}
    await sleep(60);
    const rows=activity.querySelector('.assignment-rows');if(rows)rows.innerHTML='';
    for(const [role,hours] of item.assign){
      activity.querySelector('.add-assignment')?.click();await sleep(35);
      const row=activity.querySelector('.assignment-rows .assignment-row:last-child');
      const r=row?.querySelector('.assignment-role'),h=row?.querySelector('.assignment-hours');if(r){r.value=role;fire(r,'change');}if(h){h.value=String(hours);fire(h,'input');}
    }
    fire(name,'change');await sleep(35);
  }
  function setProposal(phaseId,value){const row=document.querySelector(`#tab-analisi .economic-table .phase-row[data-economic-phase="${phaseId}"]`);const input=row?.querySelector('.ae-proposal');if(input){input.value=money(value);fire(input,'input');fire(input,'change');}}

  async function waitDetailReady(){
    for(let i=0;i<220;i++){
      const ready=document.getElementById('analysisSubtabs')&&document.querySelectorAll('#phaseWorkCards > .phase-work-card').length>=7&&document.querySelectorAll('.phase-type-select').length>=7&&document.getElementById('totaleOfferta');
      if(ready)return true;await sleep(50);
    }return false;
  }
  async function seedPe04(){
    if(state.loadedOffer){window.DABSTER_OFFER_LINES?.sync?.();return;}
    if(!await waitDetailReady())return;
    setStatus('In lavorazione');await sleep(120);
    const comm=control('Commessa');if(comm){let opt=comm.selectedOptions?.[0];if(!opt){opt=new Option(OFFER.commessaLabel,OFFER.commessaLabel);comm.add(opt);}opt.textContent=OFFER.commessaLabel;opt.value=OFFER.commessaLabel;comm.value=opt.value;fire(comm,'change');}
    setControl(control('Titolo'),OFFER.title);setControl(control('Codice'),OFFER.code);
    setControl(amountField('Importo stimato'),OFFER.amount);setControl(document.getElementById('totaleOfferta'),OFFER.amount);
    setControl(amountField('Consulenza'),OFFER.confirmation.consulting);setControl(amountField('Progetti'),OFFER.confirmation.projects);setControl(amountField('Direzione lavori'),OFFER.confirmation.direction);
    clearAnalysisActivities();await sleep(220);
    for(const [phase,items] of Object.entries(ACTIVITY_PLAN))for(const item of items)await addPlannedActivity(phase,item);
    await sleep(300);window.dabsterEconomicPhaseController?.reconcile?.();await sleep(180);
    Object.entries(OFFER.phases).forEach(([phase,value])=>setProposal(phase,value));setControl(document.getElementById('tradePct'),0);window.dabsterRecalcEconomic?.();await sleep(180);
    setControl(document.getElementById('totaleOfferta'),OFFER.amount);fire(document.getElementById('totaleOfferta'),'blur');
    setStatus('Confermata');await sleep(650);
    const ci=document.getElementById('confirmationConsulting'),pi=document.getElementById('confirmationProjects'),di=document.getElementById('confirmationDirection');
    if(ci){ci.value=money(OFFER.confirmation.consulting);fire(ci,'input');}if(pi){pi.value=money(OFFER.confirmation.projects);fire(pi,'input');}if(di){di.value=money(OFFER.confirmation.direction);fire(di,'input');}
    await sleep(220);window.DABSTER_OFFER_LINES?.sync?.();
    patchOfferLinesCopy();installPlanSection();state.loadedOffer=true;emit();
  }
  async function openPe04(){showDetail();await seedPe04();window.dabsterAnalysisSubtabs?.activate('impianti');}

  async function openNewOffer(){
    showDetail();if(!await waitDetailReady())return;setStatus('In lavorazione');setControl(control('Titolo'),'');setControl(control('Codice'),'');setControl(document.getElementById('totaleOfferta'),0);setControl(amountField('Importo stimato'),0);setControl(amountField('Consulenza'),0);setControl(amountField('Progetti'),0);setControl(amountField('Direzione lavori'),0);clearAnalysisActivities();window.dabsterEconomicPhaseController?.reconcile?.();window.dabsterAnalysisSubtabs?.activate('impianti');
  }

  function patchOfferLinesCopy(){
    const btn=document.getElementById('cleanResetLines');if(btn){btn.textContent='⇩ Preleva fasi da Analisi';btn.classList.add('pe04-import');}
    const hint=document.querySelector('#offerLinesSection .clean-lines-hint');if(hint){hint.textContent='Preleva le fasi come base, poi adatta descrizioni e importi. Il totale delle Righe Offerta deve essere uguale al Totale conferma.';hint.classList.add('pe04-updated');}
  }

  function installPlanSection(){
    const lines=document.getElementById('offerLinesSection');if(!lines)return;
    planSection=document.getElementById('billingPlanSection');if(!planSection){planSection=document.createElement('section');planSection.id='billingPlanSection';planSection.className='accordion open';planSection.innerHTML='<button class="section-head" type="button"><span>◈&nbsp;&nbsp;Piano di fatturazione</span><span class="chevron">⌄</span></button><div class="section-body" id="billingPlanBody"></div>';lines.insertAdjacentElement('afterend',planSection);planSection.querySelector('.section-head')?.addEventListener('click',()=>planSection.classList.toggle('open'));}
    renderPlan();
  }
  function renderPlan(){
    const body=document.getElementById('billingPlanBody');if(!body)return;
    body.innerHTML=`<div class="plan36-intro"><div><strong>Piano definito alla conferma</strong><span> · gli eventi decidono quando nasce il diritto operativo a fatturare.</span></div><span>Totale piano ${money(state.events.reduce((s,e)=>s+e.amount,0))} €</span></div><div class="plan36-table"><div class="plan36-row head"><div>Evento</div><div>Condizione</div><div>%</div><div>Importo</div><div>Stato</div></div>${state.events.map(e=>`<div class="plan36-row"><div class="plan36-name">${esc(e.name)}</div><div>${esc(e.condition)}</div><div>${e.percent}%</div><div class="plan36-money">${money(e.amount)} €</div><div><span class="plan36-state ${eventStateClass(e)}">${esc(eventStateLabel(e))}</span></div></div>`).join('')}</div><div class="plan36-foot">Gli importi generali vengono <strong>allocati proporzionalmente sulle Righe Offerta interessate</strong>. Le attività possono maturare un evento, ma non vengono mai fatturate direttamente.</div>`;
  }

  function installMilestones(){
    const shell=document.querySelector('#kanbanPage .kanban-shell'),top=shell?.querySelector('.kanban-top');if(!shell||!top)return;
    let strip=document.getElementById('kanbanBillingEvents');if(!strip){strip=document.createElement('section');strip.id='kanbanBillingEvents';strip.className='kb36-events';top.insertAdjacentElement('afterend',strip);}renderMilestones();
    const board=document.getElementById('kanbanBoard');if(board&&!boardObserver){boardObserver=new MutationObserver(()=>setTimeout(checkAutomaticEvents,40));boardObserver.observe(board,{childList:true,subtree:true});board.addEventListener('drop',()=>setTimeout(checkAutomaticEvents,120),true);board.addEventListener('click',()=>setTimeout(checkAutomaticEvents,120),true);}
  }
  function renderMilestones(){
    const strip=document.getElementById('kanbanBillingEvents');if(!strip)return;
    const ext=state.events.filter(e=>e.kind==='external');
    strip.innerHTML=`<div class="kb36-events-head"><div><strong>Milestone / eventi del piano di fatturazione</strong><span>Stesso Kanban: questi elementi registrano avvenimenti esterni, non ore di lavoro.</span></div><span>${OFFER.code}</span></div><div class="kb36-event-list">${ext.map(e=>`<article class="kb36-event ${e.state==='ready'?'ready':''}"><div class="copy"><strong>${esc(e.name)}</strong><span>${esc(e.condition)} · ${money(e.amount)} €${e.maturedAt?' · avvenuto '+esc(e.maturedAt):''}</span></div>${e.state==='ready'?'<span class="kb36-auto">✓ registrato</span>':`<button type="button" data-register-event="${e.id}">Registra avvenimento</button>`}</article>`).join('')}</div>`;
    strip.querySelectorAll('[data-register-event]').forEach(b=>b.addEventListener('click',()=>openEventModal(b.dataset.registerEvent)));
  }
  function checkAutomaticEvents(){
    const active=document.querySelector('#kanbanPhaseTabs .kanban-phase-tab.active')?.dataset.phase||'';
    state.events.filter(e=>e.kind==='activity'&&e.state==='waiting'&&e.watchPhase===active).forEach(e=>{
      const board=document.getElementById('kanbanBoard');if(!board)return;const total=board.querySelectorAll('.kanban-card').length,closed=board.querySelectorAll('.kanban-list[data-status="chiusa"] .kanban-card').length;
      if(total>0&&closed===total){e.state='ready';e.maturedAt=new Date().toLocaleDateString('it-IT');e.source='Completamento attività automatico';emit();}
    });
  }

  function ensureEventModal(){
    if(eventModal)return eventModal;eventModal=document.createElement('div');eventModal.className='pe04-modal';eventModal.id='pe04EventModal';eventModal.hidden=true;eventModal.innerHTML=`<div class="pe04-dialog"><div class="pe04-dialog-head"><strong>Registra avvenimento</strong><span data-event-title></span></div><div class="pe04-dialog-body"><label>Data evento<input type="date" data-event-date></label><label>Nota<textarea rows="3" data-event-note placeholder="Nota o riferimento operativo"></textarea></label><label>Documento / riferimento (facoltativo nella simulazione)<input data-event-doc placeholder="Es. verbale, protocollo, file SharePoint"></label></div><div class="pe04-dialog-foot"><button type="button" data-event-cancel>Annulla</button><button type="button" class="primary" data-event-confirm>Conferma avvenimento</button></div></div>`;document.body.appendChild(eventModal);eventModal.querySelector('[data-event-cancel]')?.addEventListener('click',()=>eventModal.hidden=true);eventModal.addEventListener('click',e=>{if(e.target===eventModal)eventModal.hidden=true;});eventModal.querySelector('[data-event-confirm]')?.addEventListener('click',confirmEvent);return eventModal;
  }
  function openEventModal(id){const e=eventById(id);if(!e)return;const m=ensureEventModal();m.dataset.eventId=id;m.querySelector('[data-event-title]').textContent=e.name+' · '+money(e.amount)+' €';m.querySelector('[data-event-date]').value=new Date().toISOString().slice(0,10);m.querySelector('[data-event-note]').value='';m.querySelector('[data-event-doc]').value='';m.hidden=false;}
  function confirmEvent(){const m=ensureEventModal(),e=eventById(m.dataset.eventId);if(!e)return;const date=m.querySelector('[data-event-date]').value;if(!date)return;const d=new Date(date+'T12:00:00');e.state='ready';e.maturedAt=Number.isNaN(d.getTime())?date:d.toLocaleDateString('it-IT');e.registration={date,note:m.querySelector('[data-event-note]').value.trim(),document:m.querySelector('[data-event-doc]').value.trim(),registeredBy:'Utente loggato',registeredAt:new Date().toISOString()};m.hidden=true;emit();}

  function installNavigation(){
    const nav=document.querySelector('#appSidebar .sidebar-nav'),old=nav?.querySelector('[data-page="offer"], [data-page="offers"]');if(!nav||!old)return false;
    let offersBtn=old;if(old.dataset.page!=='offers'||old.dataset.pe04Nav!=='1'){offersBtn=old.cloneNode(true);offersBtn.dataset.page='offers';offersBtn.dataset.pe04Nav='1';offersBtn.innerHTML='<span class="side-icon">▣</span>Offerte';old.replaceWith(offersBtn);}
    offersBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showOffers();});
    document.addEventListener('click',e=>{const b=e.target.closest?.('#appSidebar .sidebar-item');if(b&&b.dataset.page!=='offers'&&offersPage)offersPage.hidden=true;},true);
    return true;
  }

  async function install(){
    installStyles();
    for(let i=0;i<240;i++){
      const shell=document.querySelector('.page-shell'),main=shell?.querySelector('.main-card'),kanban=document.getElementById('kanbanPage'),nav=document.querySelector('#appSidebar .sidebar-nav');
      if(shell&&main&&kanban&&nav&&document.getElementById('analysisSubtabs')){
        if(!document.getElementById('offersListPage')){offersPage=document.createElement('section');offersPage.id='offersListPage';offersPage.hidden=true;main.insertAdjacentElement('afterend',offersPage);}else offersPage=document.getElementById('offersListPage');
        installNavigation();installMilestones();ensureEventModal();
        const watcher=new MutationObserver(()=>{patchOfferLinesCopy();if(state.loadedOffer)installPlanSection();installMilestones();});watcher.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>watcher.disconnect(),12000);
        window.DABSTER_PE04_FLOW={offer:OFFER,getSnapshot,showOffers,openPe04,openNewOffer,eventAllocations,registerEvent:openEventModal,refresh:emit};
        if(location.hash.startsWith('#offerta-'))openPe04();else if(location.hash==='#dashboard-fatturazione'){}else showOffers();
        emit();return;
      }
      await sleep(50);
    }
  }
  install();
})();
