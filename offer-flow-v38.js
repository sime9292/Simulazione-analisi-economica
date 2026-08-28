/* v38 - New offer simulation: Offerte -> Analisi -> Conferma -> Righe Offerta. Billing plan intentionally left undefined. */
(function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const OFFER={
    id:'26_142pe01',code:'26_142pe01',commessa:'26_142',commessaLabel:'26_142 - RISTRUTTURAZIONE SEDE DIREZIONALE',
    title:'Progettazione impianti, direzione lavori e assistenza antincendio',
    client:'Cliente Demo 26_142',projectManager:'CP Demo',commessaManager:'RC Demo',status:'Confermata',amount:54000,
    confirmation:{consulting:6000,projects:30000,direction:18000},
    phases:{preliminare:8000,esecutivo:22000,dl:18000,consulenze:6000}
  };

  const ACTIVITY_PLAN={
    preliminare:[
      {name:'Progetto Preliminare IE',assign:[['RS_IE',18],['UT_IE_J',28]]},
      {name:'Progetto preliminare IM',assign:[['RS_IM',16],['UT_IM_J',24]]}
    ],
    esecutivo:[
      {name:'Elaborati grafici IE',assign:[['RS_IE',18],['UT_IE_S',54]]},
      {name:'Elaborati grafici IM',assign:[['RS_IM',18],['UT_IM_S',54]]},
      {name:'Calcoli Illuminotecnici',assign:[['RS_IE',10],['UT_IE_J',24]]}
    ],
    dl:[
      {name:'Direzione Lavori Generica IE',assign:[['PM',12],['RS_IE',30]]},
      {name:'Direzione Lavori Generica IM',assign:[['PM',10],['RS_IM',26]]}
    ],
    consulenze:[
      {name:'Consulenza Generica VVF',assign:[['VVF_S',18],['VVF_J',22]]}
    ]
  };

  const state={loadedOffer:false,listStatus:'all',listSearch:''};
  let offersPage=null,planSection=null;

  function field(label){return [...document.querySelectorAll('#tab-dati label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))||null;}
  function control(label){return field(label)?.querySelector('input,select,textarea')||null;}
  function fire(el,type='input'){el?.dispatchEvent(new Event(type,{bubbles:true}));}
  function setControl(el,value,type='input'){if(!el)return;el.value=String(value);fire(el,type);}
  function statusSelect(){return control('Stato');}
  function setStatus(label){const s=statusSelect();if(!s)return;let opt=[...s.options].find(o=>norm(o.value||o.textContent)===norm(label));if(!opt){opt=new Option(label,label);s.add(opt);}s.value=opt.value;fire(s,'change');}
  function amountField(label){return [...document.querySelectorAll('#tab-dati .accordion.amounts label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))?.querySelector('input')||null;}

  function currentLines(){
    const live=window.DABSTER_OFFER_LINES?.lines;
    if(Array.isArray(live)&&live.length){
      const cleaned=live.map(x=>({...x,amount:Number(x.amount||0)})).filter(x=>x.amount>0.005);
      if(cleaned.length)return cleaned;
    }
    const descriptions={
      preliminare:'Progettazione preliminare impianti',
      esecutivo:'Progettazione esecutiva impianti',
      dl:'Direzione lavori impianti',
      consulenze:'Assistenza prevenzione incendi'
    };
    return Object.entries(OFFER.phases).map(([phase,amount])=>({id:`${OFFER.code}:phase:${phase}`,phase,description:descriptions[phase]||phase,amount}));
  }
  function getSnapshot(){return {offer:{...OFFER},lines:currentLines(),loadedOffer:state.loadedOffer};}
  function emit(){window.dispatchEvent(new CustomEvent('dabster-offer-flow-change',{detail:getSnapshot()}));}

  function installStyles(){
    if(document.getElementById('offerFlowV38Styles'))return;
    const s=document.createElement('style');s.id='offerFlowV38Styles';s.textContent=`
      #offersListPage[hidden]{display:none!important}.offers38{background:#f4f6f7;border:1px solid #dbe2e5;border-radius:9px;padding:13px;min-height:650px}.offers38-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:11px}.offers38-head strong{display:block;font-size:15px;color:#304650}.offers38-head span{display:block;margin-top:2px;font-size:9px;color:#718089}.offers38-new{height:32px;padding:0 12px;border:1px solid #d36520;border-radius:6px;background:#e97026;color:#fff;font-size:10px;font-weight:750;cursor:pointer}.offers38-kpis{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:8px;margin-bottom:11px}.offers38-kpi{min-height:62px;padding:9px 11px;border:1px solid #dce3e6;border-radius:8px;background:#fff;cursor:pointer;text-align:left}.offers38-kpi span{display:block;font-size:8px;font-weight:750;color:#71808a;text-transform:uppercase}.offers38-kpi strong{display:block;margin-top:5px;font-size:18px;color:#334955}.offers38-kpi.active{border-color:#e2a16f;background:#fff8f2;box-shadow:0 0 0 2px rgba(225,112,35,.07)}.offers38-controls{display:grid;grid-template-columns:minmax(240px,1fr) 180px;gap:8px;margin-bottom:9px}.offers38-controls input,.offers38-controls select{height:31px;border:1px solid #d5dde1;border-radius:6px;background:#fff;padding:0 9px;font-size:10px;color:#40545f}.offers38-table{border:1px solid #d7dfe3;border-radius:8px;overflow:hidden;background:#fff}.offers38-row{display:grid;grid-template-columns:105px 120px minmax(250px,1.5fr) minmax(170px,.8fr) 118px 120px 34px;min-height:43px}.offers38-row>div{display:flex;align-items:center;min-width:0;padding:6px 8px;border-right:1px solid #e8ecee;border-bottom:1px solid #e8ecee;font-size:9.7px;color:#3c515c}.offers38-row>div:last-child{border-right:0;justify-content:center}.offers38-row.head{min-height:32px;background:#f1f4f5}.offers38-row.head>div{font-size:7.8px;font-weight:780;color:#63727b;text-transform:uppercase}.offers38-row.data{cursor:pointer}.offers38-row.data:hover>div{background:#fff8f3}.offers38-code{font-weight:800;color:#31596b}.offers38-title{font-weight:700;line-height:1.25}.offers38-money{justify-content:flex-end;font-variant-numeric:tabular-nums;font-weight:700}.offers38-status{display:inline-flex;padding:4px 7px;border-radius:999px;background:#e8f3eb;color:#3d6c4d;font-size:8px;font-weight:750}.offers38-open{font-size:17px;color:#e06b22}.offers38-empty{padding:22px;text-align:center;color:#7c8991;font-size:10px}
      #billingPlanSection{margin-top:10px!important;border-left-color:#9aa8af!important}#billingPlanSection>.section-head{background:linear-gradient(90deg,#f2f5f6,#fbfcfc)!important;color:#50636d!important}.plan38-empty{padding:12px;border:1px dashed #ccd5d9;border-radius:7px;background:#fafcfc}.plan38-empty strong{display:block;font-size:10px;color:#415761}.plan38-empty span{display:block;margin-top:4px;font-size:8.7px;color:#728089;line-height:1.35}.clean-lines-hint.offer38-updated{font-weight:650;color:#4f6874}.clean-lines-btn.offer38-import{border-color:#8bb1bc!important;background:#f3fafb!important;color:#315d69!important}
      @media(max-width:900px){.offers38-kpis{grid-template-columns:repeat(2,1fr)}.offers38-table{overflow-x:auto}.offers38-row{min-width:900px}.offers38-controls{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function hideAllPages(){
    document.querySelector('.main-card')?.style.setProperty('display','none');
    const k=document.getElementById('kanbanPage');if(k)k.hidden=true;
    ['billingDashboardPageV38','billingDashboardPageV37','billingDashboardPageV36','billingDashboardPageV35','billingDashboardPage'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=true;});
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
    return `<div class="offers38-row data" data-open-offer><div><strong>${esc(OFFER.commessa)}</strong></div><div><span class="offers38-code">${esc(OFFER.code)}</span></div><div><span class="offers38-title">${esc(OFFER.title)}</span></div><div>${esc(OFFER.client)}</div><div class="offers38-money">${money(OFFER.amount)} €</div><div><span class="offers38-status">Confermata</span></div><div class="offers38-open">›</div></div>`;
  }
  function renderOffers(){
    if(!offersPage)return;
    offersPage.innerHTML=`<div class="offers38"><div class="offers38-head"><div><strong>Offerte</strong><span>Nuovo esempio costruito dall’Analisi Offerta e successivamente confermato.</span></div><button type="button" class="offers38-new" id="offers38New">＋ Nuova offerta</button></div><div class="offers38-kpis"><button class="offers38-kpi" data-kpi="in lavorazione"><span>Da inviare</span><strong>0</strong></button><button class="offers38-kpi" data-kpi="completata"><span>Da revisionare</span><strong>0</strong></button><button class="offers38-kpi" data-kpi="inviata"><span>Inviate</span><strong>0</strong></button><button class="offers38-kpi ${state.listStatus==='confermata'?'active':''}" data-kpi="confermata"><span>Confermate</span><strong>1</strong></button></div><div class="offers38-controls"><input id="offers38Search" value="${esc(state.listSearch)}" placeholder="Cerca commessa, codice, titolo o cliente…"><select id="offers38Status"><option value="all">Tutti gli stati</option><option value="in lavorazione">In lavorazione</option><option value="completata">Completata</option><option value="inviata">Inviata</option><option value="confermata">Confermata</option></select></div><div class="offers38-table"><div class="offers38-row head"><div>Commessa</div><div>Codice offerta</div><div>Offerta</div><div>Cliente</div><div>Importo</div><div>Stato</div><div></div></div>${offerListRow()||'<div class="offers38-empty">Nessuna offerta corrisponde ai filtri.</div>'}</div></div>`;
    const sel=offersPage.querySelector('#offers38Status');if(sel)sel.value=state.listStatus;
    offersPage.querySelector('#offers38Search')?.addEventListener('input',e=>{state.listSearch=e.target.value;renderOffers();});
    offersPage.querySelector('#offers38Status')?.addEventListener('change',e=>{state.listStatus=e.target.value;renderOffers();});
    offersPage.querySelectorAll('[data-kpi]').forEach(b=>b.addEventListener('click',()=>{const v=b.dataset.kpi;state.listStatus=state.listStatus===v?'all':v;renderOffers();}));
    offersPage.querySelector('[data-open-offer]')?.addEventListener('click',openOffer);
    offersPage.querySelector('#offers38New')?.addEventListener('click',openNewOffer);
  }
  function showOffers(){hideAllPages();offersPage.hidden=false;setPageChrome('Offerte','<span>⌂</span><span>›</span><strong>Offerte</strong>','offers');history.replaceState(null,'','#offerte');renderOffers();}
  function showDetail(){hideAllPages();const main=document.querySelector('.main-card');if(main)main.style.removeProperty('display');setPageChrome('Offerta','<span>⌂</span><span>›</span><span>Offerte</span><span>›</span><strong>'+esc(OFFER.code)+'</strong>','offers');history.replaceState(null,'','#offerta-'+OFFER.code);}

  function clearAnalysisActivities(){document.querySelectorAll('#phaseWorkCards .activity-delete').forEach(btn=>btn.click());}
  function cardForPhase(id){return [...document.querySelectorAll('#phaseWorkCards > .phase-work-card')].find(c=>(c.querySelector('.phase-type-select')?.value||c.dataset.planningPhase||'')===id)||null;}
  async function addPlannedActivity(phaseId,item){
    const card=cardForPhase(phaseId);if(!card)return;
    card.querySelector('.add-activity')?.click();await sleep(90);
    const activity=[...card.querySelectorAll('.activities .activity-card')].at(-1);if(!activity)return;
    const name=activity.querySelector('.activity-name');if(name){name.value=item.name;fire(name,'change');}
    await sleep(45);
    const rows=activity.querySelector('.assignment-rows');if(rows)rows.innerHTML='';
    for(const [role,hours] of item.assign){
      activity.querySelector('.add-assignment')?.click();await sleep(30);
      const row=activity.querySelector('.assignment-rows .assignment-row:last-child');
      const r=row?.querySelector('.assignment-role'),h=row?.querySelector('.assignment-hours');if(r){r.value=role;fire(r,'change');}if(h){h.value=String(hours);fire(h,'input');}
    }
    fire(name,'change');await sleep(30);
  }
  function setProposal(phaseId,value){const row=document.querySelector(`#tab-analisi .economic-table .phase-row[data-economic-phase="${phaseId}"]`);const input=row?.querySelector('.ae-proposal');if(input){input.value=money(value);fire(input,'input');fire(input,'change');}}
  async function waitDetailReady(){for(let i=0;i<220;i++){const ready=document.getElementById('analysisSubtabs')&&document.querySelectorAll('#phaseWorkCards > .phase-work-card').length>=7&&document.querySelectorAll('.phase-type-select').length>=7&&document.getElementById('totaleOfferta');if(ready)return true;await sleep(50);}return false;}

  async function seedOffer(){
    if(state.loadedOffer){window.DABSTER_OFFER_LINES?.sync?.();installPlanSection();return;}
    if(!await waitDetailReady())return;
    setStatus('In lavorazione');await sleep(100);
    const comm=control('Commessa');if(comm){let opt=[...comm.options].find(o=>o.value===OFFER.commessaLabel);if(!opt){opt=new Option(OFFER.commessaLabel,OFFER.commessaLabel);comm.add(opt);}comm.value=opt.value;fire(comm,'change');}
    setControl(control('Titolo'),OFFER.title);setControl(control('Codice'),OFFER.code);
    setControl(amountField('Importo stimato'),OFFER.amount);setControl(document.getElementById('totaleOfferta'),OFFER.amount);
    setControl(amountField('Consulenza'),OFFER.confirmation.consulting);setControl(amountField('Progetti'),OFFER.confirmation.projects);setControl(amountField('Direzione lavori'),OFFER.confirmation.direction);
    clearAnalysisActivities();await sleep(180);
    for(const [phase,items] of Object.entries(ACTIVITY_PLAN))for(const item of items)await addPlannedActivity(phase,item);
    await sleep(260);window.dabsterEconomicPhaseController?.reconcile?.();await sleep(140);
    Object.entries(OFFER.phases).forEach(([phase,value])=>setProposal(phase,value));setControl(document.getElementById('tradePct'),0);window.dabsterRecalcEconomic?.();await sleep(140);
    setControl(document.getElementById('totaleOfferta'),OFFER.amount);fire(document.getElementById('totaleOfferta'),'blur');
    setStatus('Confermata');await sleep(600);
    const ci=document.getElementById('confirmationConsulting'),pi=document.getElementById('confirmationProjects'),di=document.getElementById('confirmationDirection');
    if(ci){ci.value=money(OFFER.confirmation.consulting);fire(ci,'input');}if(pi){pi.value=money(OFFER.confirmation.projects);fire(pi,'input');}if(di){di.value=money(OFFER.confirmation.direction);fire(di,'input');}
    await sleep(200);window.DABSTER_OFFER_LINES?.sync?.();patchOfferLinesCopy();installPlanSection();state.loadedOffer=true;emit();
  }
  async function openOffer(){showDetail();await seedOffer();window.dabsterAnalysisSubtabs?.activate('impianti');}
  async function openNewOffer(){showDetail();if(!await waitDetailReady())return;setStatus('In lavorazione');setControl(control('Titolo'),'');setControl(control('Codice'),'');setControl(document.getElementById('totaleOfferta'),0);setControl(amountField('Importo stimato'),0);setControl(amountField('Consulenza'),0);setControl(amountField('Progetti'),0);setControl(amountField('Direzione lavori'),0);clearAnalysisActivities();window.dabsterEconomicPhaseController?.reconcile?.();window.dabsterAnalysisSubtabs?.activate('impianti');}

  function patchOfferLinesCopy(){
    const btn=document.getElementById('cleanResetLines');if(btn){btn.textContent='⇩ Preleva fasi da Analisi';btn.classList.add('offer38-import');}
    const hint=document.querySelector('#offerLinesSection .clean-lines-hint');if(hint){hint.textContent='Le Righe Offerta confermate derivano dall’Analisi e restano il riferimento economico della fatturazione.';hint.classList.add('offer38-updated');}
  }
  function installPlanSection(){
    const lines=document.getElementById('offerLinesSection');if(!lines)return;
    planSection=document.getElementById('billingPlanSection');if(!planSection){planSection=document.createElement('section');planSection.id='billingPlanSection';planSection.className='accordion open';planSection.innerHTML='<button class="section-head" type="button"><span>◈&nbsp;&nbsp;Piano di fatturazione</span><span class="chevron">⌄</span></button><div class="section-body" id="billingPlanBody"></div>';lines.insertAdjacentElement('afterend',planSection);planSection.querySelector('.section-head')?.addEventListener('click',()=>planSection.classList.toggle('open'));}
    const body=document.getElementById('billingPlanBody');if(body)body.innerHTML='<div class="plan38-empty"><strong>Da definire</strong><span>La gestione operativa del piano di fatturazione è temporaneamente esclusa dalla simulazione. La sezione resta predisposta per la definizione successiva.</span></div>';
  }

  function installNavigation(){
    const nav=document.querySelector('#appSidebar .sidebar-nav'),old=nav?.querySelector('[data-page="offer"], [data-page="offers"]');if(!nav||!old)return false;
    let offersBtn=old;if(old.dataset.page!=='offers'||old.dataset.offer38Nav!=='1'){offersBtn=old.cloneNode(true);offersBtn.dataset.page='offers';offersBtn.dataset.offer38Nav='1';offersBtn.innerHTML='<span class="side-icon">▣</span>Offerte';old.replaceWith(offersBtn);}
    offersBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showOffers();});
    document.addEventListener('click',e=>{const b=e.target.closest?.('#appSidebar .sidebar-item');if(b&&b.dataset.page!=='offers'&&offersPage)offersPage.hidden=true;},true);
    return true;
  }

  async function install(){
    installStyles();
    for(let i=0;i<240;i++){
      const shell=document.querySelector('.page-shell'),main=shell?.querySelector('.main-card'),kanban=document.getElementById('kanbanPage'),nav=document.querySelector('#appSidebar .sidebar-nav');
      if(shell&&main&&kanban&&nav&&document.getElementById('analysisSubtabs')){
        offersPage=document.getElementById('offersListPage');
        if(!offersPage){offersPage=document.createElement('section');offersPage.id='offersListPage';offersPage.hidden=true;main.insertAdjacentElement('afterend',offersPage);}
        document.getElementById('kanbanBillingEvents')?.remove();
        document.getElementById('pe04EventModal')?.remove();
        installNavigation();
        window.DABSTER_OFFER_FLOW={offer:OFFER,getSnapshot,showOffers,openOffer,openNewOffer,refresh:emit};
        if(location.hash.startsWith('#offerta-'))openOffer();else if(location.hash==='#dashboard-fatturazione'){}else showOffers();
        emit();return;
      }
      await sleep(50);
    }
  }
  install();
})();
