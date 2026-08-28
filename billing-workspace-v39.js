/* v39 - Billing workspace: hierarchical dashboard + new invoice with offer-line allocations. */
(function(){
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const cents=n=>Math.round(Number(n||0)*100)/100;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today=()=>new Date().toISOString().slice(0,10);

  const FALLBACK_OFFER={
    code:'26_142pe01',commessa:'26_142',commessaLabel:'26_142 - RISTRUTTURAZIONE SEDE DIREZIONALE',
    title:'Progettazione impianti, direzione lavori e assistenza antincendio',client:'Cliente Demo 26_142',amount:54000,status:'Confermata'
  };
  const FALLBACK_LINES=[
    {id:'26_142pe01:phase:preliminare',phase:'preliminare',description:'Progettazione preliminare impianti',amount:8000},
    {id:'26_142pe01:phase:esecutivo',phase:'esecutivo',description:'Progettazione esecutiva impianti',amount:22000},
    {id:'26_142pe01:phase:dl',phase:'dl',description:'Direzione lavori impianti',amount:18000},
    {id:'26_142pe01:phase:consulenze',phase:'consulenze',description:'Assistenza prevenzione incendi',amount:6000}
  ];
  const INITIAL_INVOICES=[
    {id:'ft-118',number:'FT 2026/118',date:'15/04/2026',client:'Cliente Demo 26_142',lines:[
      {id:'ft-118-1',description:'Acconto 20% incarico professionale',amount:10800,vat:22,allocations:[
        {phase:'preliminare',amount:1600},{phase:'esecutivo',amount:4400},{phase:'dl',amount:3600},{phase:'consulenze',amount:1200}
      ]}
    ]},
    {id:'ft-171',number:'FT 2026/171',date:'30/06/2026',client:'Cliente Demo 26_142',lines:[
      {id:'ft-171-1',description:'Saldo progettazione preliminare impianti',amount:6400,vat:22,allocations:[{phase:'preliminare',amount:6400}]},
      {id:'ft-171-2',description:'SAL progettazione esecutiva - consegna elaborati',amount:8800,vat:22,allocations:[{phase:'esecutivo',amount:8800}]}
    ]},
    {id:'ft-219',number:'FT 2026/219',date:'31/07/2026',client:'Cliente Demo 26_142',lines:[
      {id:'ft-219-1',description:'SAL Direzione Lavori n. 1',amount:4500,vat:22,allocations:[{phase:'dl',amount:4500}]}
    ]}
  ];

  const model=window.DABSTER_BILLING_MODEL_V39||{invoices:INITIAL_INVOICES.map(i=>({...i,lines:i.lines.map(l=>({...l,allocations:l.allocations.map(a=>({...a}))}))}))};
  window.DABSTER_BILLING_MODEL_V39=model;

  const state={dashboardView:'commesse',selectedPhase:'esecutivo',splitHeight:null,sourceView:'commesse',selections:new Map(),draftLines:[],selectedDraft:new Set(),message:''};
  const invoiceMeta={number:'252 /E',date:today(),due:'90 gg Fine Mese',payment:'Bonifico',client:FALLBACK_OFFER.client,pensionFund:true,pensionPct:4,vat:22};
  let dashboardPage=null,invoicePage=null,seq=0;

  function snapshot(){
    const live=window.DABSTER_OFFER_FLOW?.getSnapshot?.();
    if(live?.offer&&Array.isArray(live.lines)&&live.lines.length){
      return {offer:{...FALLBACK_OFFER,...live.offer},lines:live.lines.map(x=>({...x,amount:Number(x.amount||0)})).filter(x=>x.amount>0.005)};
    }
    return {offer:{...FALLBACK_OFFER},lines:FALLBACK_LINES.map(x=>({...x}))};
  }
  function offer(){return snapshot().offer;}
  function lines(){return snapshot().lines;}
  function lineKey(line){return line.id||`${offer().code}:${line.phase}`;}
  function findLineByPhase(phase){return lines().find(l=>l.phase===phase)||null;}
  function allInvoiceLines(){return model.invoices.flatMap(inv=>(inv.lines||[]).map(line=>({invoice:inv,line})));}
  function allocationMatches(a,line){return (a.offerLineId&&a.offerLineId===line.id)||(!a.offerLineId&&a.phase===line.phase)||a.phase===line.phase;}
  function billedForLine(line){
    return cents(allInvoiceLines().reduce((sum,x)=>sum+(x.line.allocations||[]).filter(a=>allocationMatches(a,line)).reduce((s,a)=>s+Number(a.amount||0),0),0));
  }
  function draftForLine(line){
    return cents(state.draftLines.reduce((sum,row)=>sum+(row.allocations||[]).filter(a=>allocationMatches(a,line)).reduce((s,a)=>s+Number(a.amount||0),0),0));
  }
  function metrics(line){
    const billed=billedForLine(line),draft=draftForLine(line),residual=Math.max(0,cents(Number(line.amount||0)-billed)),available=Math.max(0,cents(residual-draft));
    const pct=line.amount?Math.min(100,billed/Number(line.amount)*100):0;
    return {...line,billed,draft,residual,available,pct};
  }
  function offerMetrics(){
    const ms=lines().map(metrics),amount=cents(ms.reduce((s,x)=>s+Number(x.amount||0),0)),billed=cents(ms.reduce((s,x)=>s+x.billed,0)),draft=cents(ms.reduce((s,x)=>s+x.draft,0));
    return {lines:ms,amount,billed,draft,residual:Math.max(0,cents(amount-billed)),available:Math.max(0,cents(amount-billed-draft)),pct:amount?billed/amount*100:0};
  }
  function linkedInvoiceRows(line){
    const out=[];
    allInvoiceLines().forEach(({invoice,line:invoiceLine})=>{
      const attributed=cents((invoiceLine.allocations||[]).filter(a=>allocationMatches(a,line)).reduce((s,a)=>s+Number(a.amount||0),0));
      if(attributed>0)out.push({invoiceNo:invoice.number,date:invoice.date,description:invoiceLine.description,lineAmount:Number(invoiceLine.amount||0),attributed});
    });
    return out;
  }
  function uid(prefix){seq++;return `${prefix}-${Date.now().toString(36)}-${seq}`;}
  function draftTotal(){return cents(state.draftLines.reduce((s,x)=>s+Number(x.amount||0),0));}
  function selectionTotal(){return cents([...state.selections.values()].reduce((s,x)=>s+Number(x||0),0));}
  function selectedCount(){return [...state.selections.values()].filter(x=>Number(x)>0).length;}

  function installStyles(){
    if(document.getElementById('billingWorkspaceV39Styles'))return;
    const s=document.createElement('style');s.id='billingWorkspaceV39Styles';s.textContent=`
      #billingDashboardPageV39[hidden],#newInvoicePageV39[hidden]{display:none!important}.bw39{min-height:660px;background:#f4f6f7;border:1px solid #dbe2e5;border-radius:9px;padding:12px}.bw39-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:9px}.bw39-title strong{display:block;font-size:15px;color:#304650}.bw39-title span{display:block;margin-top:2px;font-size:8.8px;color:#728089}.bw39-actions{display:flex;gap:7px}.bw39-btn{height:30px;padding:0 10px;border:1px solid #cbd6da;border-radius:6px;background:#fff;color:#4b626d;font-size:8.8px;font-weight:760;cursor:pointer}.bw39-btn.primary{background:#e97026;border-color:#d7651d;color:#fff}.bw39-btn.soft{background:#eef6f8;border-color:#c9dce2;color:#416675}.bw39-btn:disabled{opacity:.45;cursor:not-allowed}.bw39-breadcrumb{display:flex;align-items:center;flex-wrap:wrap;gap:5px;padding:7px 9px;margin-bottom:9px;border:1px solid #dde4e7;border-radius:7px;background:#fff;font-size:8.6px;color:#73818a}.bw39-breadcrumb button{border:0;padding:0;background:transparent;color:#426776;font:inherit;font-weight:760;cursor:pointer}.bw39-breadcrumb strong{color:#334d59}.bw39-kpis{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:7px;margin-bottom:9px}.bw39-kpi{padding:8px 9px;border:1px solid #dce3e6;border-radius:7px;background:#fff}.bw39-kpi span{display:block;font-size:7.3px;text-transform:uppercase;font-weight:760;color:#74818a}.bw39-kpi strong{display:block;margin-top:4px;font-size:13px;color:#344b57}.bw39-table{border:1px solid #d8e0e4;border-radius:7px;overflow:hidden;background:#fff}.bw39-row{display:grid;min-height:39px}.bw39-row>div{display:flex;align-items:center;min-width:0;padding:6px 8px;border-right:1px solid #e7ecee;border-bottom:1px solid #e7ecee;font-size:8.8px;color:#40545f}.bw39-row>div:last-child{border-right:0}.bw39-row.head{min-height:29px;background:#f1f4f5}.bw39-row.head>div{font-size:7.2px;text-transform:uppercase;font-weight:780;color:#67757e}.bw39-row.data{cursor:pointer}.bw39-row.data:hover>div{background:#fff8f3}.bw39-code{font-weight:800;color:#31596b}.bw39-money{justify-content:flex-end;font-weight:760;font-variant-numeric:tabular-nums}.bw39-arrow{justify-content:center!important;font-size:16px!important;color:#df6d26!important}.bw39-status{display:inline-flex;padding:4px 7px;border-radius:999px;background:#e8f3eb;color:#3d6c4d;font-size:7.6px;font-weight:760}.bw39-commessa{grid-template-columns:120px minmax(300px,1.5fr) 145px 145px 145px 90px 34px}.bw39-offer{grid-template-columns:125px minmax(300px,1.5fr) 145px 145px 145px 90px 34px}.bw39-lines{grid-template-columns:minmax(285px,1.5fr) 145px 135px 135px 90px}.bw39-help{margin-top:8px;padding:7px 9px;border:1px solid #dce4e7;border-radius:7px;background:#fff;font-size:8px;color:#6c7b83;line-height:1.35}.bw39-help strong{color:#405a66}
      .bw39-workspace{height:590px;display:flex;flex-direction:column;min-height:440px}.bw39-pane{min-height:0;border:1px solid #d8e0e4;border-radius:8px;background:#fff;overflow:hidden;display:flex;flex-direction:column}.bw39-pane.top{height:54%;min-height:185px;flex:none}.bw39-pane.bottom{flex:1;min-height:170px}.bw39-pane-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid #e1e7ea;background:#f6f8f9}.bw39-pane-head strong{display:block;font-size:10.5px;color:#354d59}.bw39-pane-head span{display:block;margin-top:2px;font-size:8px;color:#75828a}.bw39-scroll{min-height:0;overflow:auto;flex:1}.bw39-line.selected>div{background:#eef6f8}.bw39-line.selected>div:first-child{box-shadow:inset 4px 0 0 #568292}.bw39-split{height:12px;flex:none;cursor:row-resize;display:flex;align-items:center;justify-content:center;position:relative;touch-action:none}.bw39-split:before{content:'';position:absolute;left:0;right:0;top:5px;border-top:1px solid #cfd8dc}.bw39-split span{position:relative;z-index:1;padding:2px 8px;border:1px solid #ccd7dc;border-radius:999px;background:#f4f7f8;color:#637680;font-size:7.3px;font-weight:750}.bw39-link{padding:6px 10px;border-bottom:1px solid #dce6ea;background:#edf6f8;font-size:8.2px;color:#4e6975}.bw39-invoicegrid{grid-template-columns:minmax(290px,1.5fr) 145px 145px 120px 120px}.bw39-attributed{justify-content:flex-end!important;font-weight:800!important;color:#305d6c!important;background:#f4fafb}.bw39-chip{display:inline-flex;padding:4px 6px;border-radius:999px;background:#edf4f6;color:#52717e;font-size:7.1px;font-weight:750}
      .ni39-section{margin-top:9px;border:1px solid #d7e0e4;border-radius:8px;background:#fff;overflow:hidden}.ni39-section-head{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid #e0e6e9;background:#f4f7f8}.ni39-section-head strong{font-size:10.5px;color:#344d59}.ni39-section-head span{font-size:7.9px;color:#75828a}.ni39-section.source .ni39-section-head{background:#fff8ef;border-top:3px solid #e99652}.ni39-section.invoice .ni39-section-head{background:#f0f8f2;border-top:3px solid #73a783}.ni39-body{padding:9px}.ni39-fields{display:grid;grid-template-columns:1.35fr .7fr .85fr 1fr 1fr;gap:8px}.ni39-field{display:grid;gap:4px}.ni39-field span{font-size:7.4px;font-weight:760;color:#677780}.ni39-field input,.ni39-field select{height:30px;border:1px solid #d2dce0;border-radius:6px;background:#fff;padding:0 8px;font-size:9px;color:#3e535e}.ni39-fund{display:flex;align-items:center;gap:6px;height:30px}.ni39-fund input{width:auto;height:auto}.ni39-sourcegrid{grid-template-columns:36px minmax(280px,1.6fr) 135px 135px 135px 130px}.ni39-sourcegrid input[type=checkbox]{width:14px;height:14px}.ni39-amount{width:100%;height:27px;border:1px solid #ccd8dd;border-radius:5px;text-align:right;padding:0 7px;font-size:9px;color:#3e5661}.ni39-amount:disabled{background:#f3f5f6;color:#98a1a6}.ni39-linecopy strong{display:block;font-size:9px;color:#344f5b}.ni39-linecopy span{display:block;margin-top:2px;font-size:7.5px;color:#7a878e}.ni39-selectbar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:8px}.ni39-selectbar strong{font-size:9px;color:#3f5965}.ni39-selectbar span{font-size:8px;color:#78858c}.ni39-draftgrid{grid-template-columns:36px minmax(300px,1.5fr) 130px 120px 105px 86px}.ni39-desc{width:100%;height:28px;border:1px solid #d3dde1;border-radius:5px;padding:0 7px;font-size:9px;color:#3e535e}.ni39-origin{font-size:7.6px;color:#657780}.ni39-origin strong{color:#3e6573}.ni39-breakdown{grid-column:1/-1;padding:6px 10px!important;background:#fafcfc!important;border-top:0!important;font-size:7.7px!important;color:#687982!important;gap:8px!important;flex-wrap:wrap}.ni39-breakdown span{display:inline-flex;padding:3px 6px;border-radius:999px;background:#eef4f6;color:#4d6c79}.ni39-draft-actions{display:flex;gap:5px;justify-content:flex-end}.ni39-icon{height:24px;padding:0 7px;border:1px solid #d3dde1;border-radius:5px;background:#fff;color:#566b75;font-size:7.7px;font-weight:750;cursor:pointer}.ni39-totals{display:grid;grid-template-columns:1fr 330px;gap:12px;margin-top:9px}.ni39-note{padding:8px;border:1px solid #dce4e7;border-radius:7px;background:#fafcfc;font-size:8px;line-height:1.4;color:#65747c}.ni39-summary{border:1px solid #d9e1e4;border-radius:7px;padding:9px;background:#fff}.ni39-sumrow{display:flex;justify-content:space-between;gap:10px;padding:4px 0;font-size:8.7px;color:#596c75}.ni39-sumrow.total{margin-top:4px;padding-top:8px;border-top:1px solid #dce3e6;font-size:12px;font-weight:800;color:#334a55}.ni39-alert{margin-top:8px;padding:7px 9px;border-radius:6px;background:#fff4e7;border:1px solid #efd3ad;color:#895a26;font-size:8.3px}.ni39-alert.ok{background:#edf7ef;border-color:#cfe3d4;color:#3d704b}.ni39-empty{padding:22px;text-align:center;font-size:8.8px;color:#7b878e}
      @media(max-width:900px){.bw39-kpis{grid-template-columns:repeat(2,1fr)}.bw39-table,.bw39-scroll{overflow:auto}.bw39-row{min-width:850px}.bw39-workspace{height:700px}.ni39-fields{grid-template-columns:1fr 1fr}.ni39-totals{grid-template-columns:1fr}.ni39-body{overflow:auto}.ni39-sourcegrid,.ni39-draftgrid{min-width:850px}}
    `;document.head.appendChild(s);
  }

  function hideOtherPages(){
    document.querySelector('.main-card')?.style.setProperty('display','none');
    const k=document.getElementById('kanbanPage');if(k)k.hidden=true;
    const offers=document.getElementById('offersListPage');if(offers)offers.hidden=true;
    ['billingDashboardPageV38','billingDashboardPageV37','billingDashboardPageV36','billingDashboardPageV35','billingDashboardPage'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=true;});
  }
  function setChrome(title,pageKey){
    const t=document.querySelector('.page-title');if(t)t.textContent=title;
    const bc=document.querySelector('.breadcrumb');if(bc)bc.innerHTML=`<span>⌂</span><span>›</span><strong>${esc(title)}</strong>`;
    document.querySelectorAll('#appSidebar .sidebar-item').forEach(x=>x.classList.toggle('active',x.dataset.page===pageKey));
    document.getElementById('appSidebar')?.classList.remove('open');document.getElementById('appSidebarOverlay')?.classList.remove('open');
  }

  function dashboardBreadcrumb(){
    const o=offer();
    if(state.dashboardView==='commesse')return '<strong>Dashboard Fatturazione</strong>';
    if(state.dashboardView==='offerte')return `<button data-db-nav="commesse">Dashboard Fatturazione</button><span>›</span><strong>${esc(o.commessa)}</strong>`;
    return `<button data-db-nav="commesse">Dashboard Fatturazione</button><span>›</span><button data-db-nav="offerte">${esc(o.commessa)}</button><span>›</span><strong>${esc(o.code)}</strong><span>›</span><strong>Righe Offerta</strong>`;
  }
  function kpis(){
    const m=offerMetrics();return `<div class="bw39-kpis"><div class="bw39-kpi"><span>Valore offerta</span><strong>${money(m.amount)} €</strong></div><div class="bw39-kpi"><span>Fatturato</span><strong>${money(m.billed)} €</strong></div><div class="bw39-kpi"><span>Residuo da fatturare</span><strong>${money(m.residual)} €</strong></div><div class="bw39-kpi"><span>% fatturato</span><strong>${m.pct.toLocaleString('it-IT',{maximumFractionDigits:1})}%</strong></div></div>`;
  }
  function renderCommesse(){
    const o=offer(),m=offerMetrics();return `${kpis()}<div class="bw39-table"><div class="bw39-row head bw39-commessa"><div>Commessa</div><div>Descrizione</div><div>Valore offerte</div><div>Fatturato</div><div>Residuo</div><div>%</div><div></div></div><div class="bw39-row data bw39-commessa" data-open-commessa><div><strong class="bw39-code">${esc(o.commessa)}</strong></div><div><strong>${esc(o.commessaLabel||o.title)}</strong></div><div class="bw39-money">${money(m.amount)} €</div><div class="bw39-money">${money(m.billed)} €</div><div class="bw39-money">${money(m.residual)} €</div><div class="bw39-money">${m.pct.toLocaleString('it-IT',{maximumFractionDigits:1})}%</div><div class="bw39-arrow">›</div></div></div>`;}
  function renderOfferte(){
    const o=offer(),m=offerMetrics();return `${kpis()}<div class="bw39-table"><div class="bw39-row head bw39-offer"><div>Offerta</div><div>Descrizione</div><div>Importo confermato</div><div>Fatturato</div><div>Residuo</div><div>%</div><div></div></div><div class="bw39-row data bw39-offer" data-open-offer><div><span class="bw39-code">${esc(o.code)}</span></div><div><strong>${esc(o.title)}</strong><span style="margin-left:6px;color:#7a878e">${esc(o.client||'')}</span></div><div class="bw39-money">${money(m.amount)} €</div><div class="bw39-money">${money(m.billed)} €</div><div class="bw39-money">${money(m.residual)} €</div><div class="bw39-money">${m.pct.toLocaleString('it-IT',{maximumFractionDigits:1})}%</div><div class="bw39-arrow">›</div></div></div>`;}
  function renderDashboardLines(){
    const o=offer(),m=offerMetrics(),ms=m.lines;if(!ms.some(x=>x.phase===state.selectedPhase))state.selectedPhase=ms[0]?.phase||'';
    const selected=ms.find(x=>x.phase===state.selectedPhase)||ms[0],linked=selected?linkedInvoiceRows(selected):[];
    const top=ms.map(x=>`<div class="bw39-row bw39-lines bw39-line ${x.phase===state.selectedPhase?'selected':''}" data-db-line="${esc(x.phase)}"><div><strong>${esc(x.description||x.phase)}</strong></div><div class="bw39-money">${money(x.amount)} €</div><div class="bw39-money">${money(x.billed)} €</div><div class="bw39-money">${money(x.residual)} €</div><div class="bw39-money">${x.pct.toLocaleString('it-IT',{maximumFractionDigits:1})}%</div></div>`).join('');
    const bottom=linked.length?linked.map(r=>`<div class="bw39-row bw39-invoicegrid"><div><strong>${esc(r.invoiceNo)}</strong><span style="margin-left:6px;color:#6d7d85">${esc(r.description)}</span></div><div class="bw39-attributed">${money(r.attributed)} €</div><div class="bw39-money">${money(r.lineAmount)} €</div><div>${esc(r.date)}</div><div><span class="bw39-chip">↳ Riga selezionata</span></div></div>`).join(''):'<div class="ni39-empty">Nessuna Riga Fattura collegata.</div>';
    return `${kpis()}<div class="bw39-workspace" id="bw39Workspace"><section class="bw39-pane top" id="bw39Top"><div class="bw39-pane-head"><div><strong>Offerta ${esc(o.code)} · Righe Offerta</strong><span>Seleziona una riga per vedere sotto le Righe Fattura collegate.</span></div><span>${money(m.residual)} € residui</span></div><div class="bw39-scroll"><div class="bw39-row head bw39-lines"><div>Descrizione Riga Offerta</div><div>Importo Riga Offerta</div><div>Fatturato</div><div>Residuo</div><div>%</div></div>${top}</div></section><div class="bw39-split" id="bw39Splitter"><span>Righe Fattura collegate ↓ · trascina</span></div><section class="bw39-pane bottom"><div class="bw39-pane-head"><div><strong>Righe Fattura collegate</strong><span>${selected?esc(selected.description):''}</span></div><span>${linked.length} collegamenti</span></div><div class="bw39-link">La stessa Riga Fattura può comparire sotto più Righe Offerta; <strong>Importo attribuito</strong> indica solo la quota che riduce la riga selezionata.</div><div class="bw39-scroll"><div class="bw39-row head bw39-invoicegrid"><div>Fattura / descrizione Riga Fattura</div><div>Importo attribuito</div><div>Importo Riga Fattura</div><div>Data</div><div>Collegamento</div></div>${bottom}</div></section></div>`;
  }
  function renderDashboard(){
    if(!dashboardPage)return;const body=state.dashboardView==='commesse'?renderCommesse():state.dashboardView==='offerte'?renderOfferte():renderDashboardLines();
    dashboardPage.innerHTML=`<div class="bw39"><div class="bw39-top"><div class="bw39-title"><strong>Dashboard Fatturazione</strong><span>Commessa → Offerta → Righe Offerta → Righe Fattura collegate.</span></div><div class="bw39-actions"><button class="bw39-btn primary" data-new-invoice>＋ Nuova fattura</button></div></div><div class="bw39-breadcrumb">${dashboardBreadcrumb()}</div>${body}<div class="bw39-help"><strong>Logica:</strong> il residuo delle Righe Offerta è determinato dalle allocazioni interne delle Righe Fattura, non dalla descrizione stampata in fattura.</div></div>`;
    dashboardPage.querySelectorAll('[data-db-nav]').forEach(b=>b.addEventListener('click',()=>{state.dashboardView=b.dataset.dbNav;renderDashboard();}));
    dashboardPage.querySelector('[data-open-commessa]')?.addEventListener('click',()=>{state.dashboardView='offerte';renderDashboard();});
    dashboardPage.querySelector('[data-open-offer]')?.addEventListener('click',()=>{state.dashboardView='righe';renderDashboard();});
    dashboardPage.querySelectorAll('[data-db-line]').forEach(r=>r.addEventListener('click',()=>{state.selectedPhase=r.dataset.dbLine;renderDashboard();}));
    dashboardPage.querySelector('[data-new-invoice]')?.addEventListener('click',showInvoice);
    if(state.dashboardView==='righe')installSplitter();
  }
  function installSplitter(){
    const ws=document.getElementById('bw39Workspace'),top=document.getElementById('bw39Top'),sp=document.getElementById('bw39Splitter');if(!ws||!top||!sp)return;
    if(state.splitHeight)top.style.height=Math.min(Math.max(185,state.splitHeight),Math.max(185,ws.clientHeight-190))+'px';
    sp.addEventListener('pointerdown',e=>{e.preventDefault();const rect=ws.getBoundingClientRect();const move=ev=>{const h=Math.max(185,Math.min(Math.max(185,rect.height-190),ev.clientY-rect.top));state.splitHeight=h;top.style.height=h+'px';};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});});
  }

  function sourceBreadcrumb(){
    const o=offer();if(state.sourceView==='commesse')return '<strong>Commesse</strong>';
    if(state.sourceView==='offerte')return `<button data-src-nav="commesse">Commesse</button><span>›</span><strong>${esc(o.commessa)}</strong>`;
    return `<button data-src-nav="commesse">Commesse</button><span>›</span><button data-src-nav="offerte">${esc(o.commessa)}</button><span>›</span><strong>${esc(o.code)}</strong><span>›</span><strong>Righe Offerta</strong>`;
  }
  function renderSource(){
    const o=offer(),m=offerMetrics();
    if(state.sourceView==='commesse')return `<div class="bw39-breadcrumb">${sourceBreadcrumb()}</div><div class="bw39-table"><div class="bw39-row head bw39-commessa"><div>Commessa</div><div>Descrizione</div><div>Valore</div><div>Fatturato</div><div>Residuo disponibile</div><div>%</div><div></div></div><div class="bw39-row data bw39-commessa" data-src-commessa><div><strong class="bw39-code">${esc(o.commessa)}</strong></div><div><strong>${esc(o.commessaLabel||o.title)}</strong></div><div class="bw39-money">${money(m.amount)} €</div><div class="bw39-money">${money(m.billed)} €</div><div class="bw39-money">${money(m.available)} €</div><div class="bw39-money">${m.pct.toLocaleString('it-IT',{maximumFractionDigits:1})}%</div><div class="bw39-arrow">›</div></div></div>`;
    if(state.sourceView==='offerte')return `<div class="bw39-breadcrumb">${sourceBreadcrumb()}</div><div class="bw39-table"><div class="bw39-row head bw39-offer"><div>Offerta</div><div>Descrizione</div><div>Importo confermato</div><div>Fatturato</div><div>Residuo disponibile</div><div>%</div><div></div></div><div class="bw39-row data bw39-offer" data-src-offer><div><span class="bw39-code">${esc(o.code)}</span></div><div><strong>${esc(o.title)}</strong></div><div class="bw39-money">${money(m.amount)} €</div><div class="bw39-money">${money(m.billed)} €</div><div class="bw39-money">${money(m.available)} €</div><div class="bw39-money">${m.pct.toLocaleString('it-IT',{maximumFractionDigits:1})}%</div><div class="bw39-arrow">›</div></div></div>`;
    const rows=m.lines.map(x=>{const key=lineKey(x),sel=Number(state.selections.get(key)||0),checked=sel>0;return `<div class="bw39-row ni39-sourcegrid"><div><input type="checkbox" data-src-check="${esc(key)}" ${checked?'checked':''} ${x.available<=.005?'disabled':''}></div><div class="ni39-linecopy"><strong>${esc(x.description)}</strong><span>${esc(x.phase)}${x.draft>0?' · già in questa fattura '+money(x.draft)+' €':''}</span></div><div class="bw39-money">${money(x.amount)} €</div><div class="bw39-money">${money(x.billed)} €</div><div class="bw39-money">${money(x.available)} €</div><div><input class="ni39-amount" data-src-amount="${esc(key)}" value="${sel?money(sel):'0,00'}" ${x.available<=.005?'disabled':''}></div></div>`;}).join('');
    return `<div class="bw39-breadcrumb">${sourceBreadcrumb()}</div><div class="bw39-table"><div class="bw39-row head ni39-sourcegrid"><div>Sel.</div><div>Descrizione Riga Offerta</div><div>Importo</div><div>Già fatturato</div><div>Residuo disponibile</div><div>Da fatturare</div></div>${rows}</div><div class="ni39-selectbar"><div><strong>${selectedCount()} Righe Offerta selezionate · ${money(selectionTotal())} €</strong><span> · gli importi diventano allocazioni interne.</span></div><button class="bw39-btn primary" data-add-selected ${selectionTotal()<=0?'disabled':''}>↓ Aggiungi righe selezionate</button></div>`;
  }

  function selectionLine(key){return lines().find(l=>lineKey(l)===key)||null;}
  function setSelection(key,value){
    const line=selectionLine(key);if(!line)return;const max=metrics(line).available;const n=Math.max(0,Math.min(cents(Number(String(value).replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0),max));
    if(n>0)state.selections.set(key,n);else state.selections.delete(key);
  }
  function addSelected(){
    const chosen=[...state.selections.entries()].map(([key,amount])=>({line:selectionLine(key),amount:Number(amount||0)})).filter(x=>x.line&&x.amount>0);
    if(!chosen.length)return;
    for(const x of chosen){const available=metrics(x.line).available;if(x.amount>available+.01){state.message=`Importo superiore al residuo di ${x.line.description}.`;renderInvoice();return;}}
    chosen.forEach(x=>state.draftLines.push({id:uid('draft'),description:x.line.description,amount:cents(x.amount),vat:invoiceMeta.vat,originType:'offer',allocations:[{offerLineId:x.line.id,phase:x.line.phase,amount:cents(x.amount)}]}));
    state.selections.clear();state.message='Righe aggiunte separatamente. Puoi selezionarle sotto e raggrupparle in una sola Riga Fattura.';renderInvoice();
  }
  function addFree(){state.draftLines.push({id:uid('free'),description:'Riga libera',amount:0,vat:invoiceMeta.vat,originType:'free',allocations:[]});renderInvoice();}
  function removeDraft(id){state.draftLines=state.draftLines.filter(x=>x.id!==id);state.selectedDraft.delete(id);renderInvoice();}
  function groupDraft(){
    const rows=state.draftLines.filter(x=>state.selectedDraft.has(x.id)&&x.originType==='offer');if(rows.length<2){state.message='Seleziona almeno due Righe Fattura originate da Righe Offerta.';renderInvoice();return;}
    const ids=new Set(rows.map(x=>x.id)),allocations=rows.flatMap(x=>x.allocations.map(a=>({...a}))),amount=cents(rows.reduce((s,x)=>s+x.amount,0));
    state.draftLines=state.draftLines.filter(x=>!ids.has(x.id));state.draftLines.push({id:uid('group'),description:'Acconto / SAL incarico professionale',amount,vat:invoiceMeta.vat,originType:'offer',allocations});state.selectedDraft.clear();state.message=`Raggruppate ${rows.length} Righe Fattura in una sola riga da ${money(amount)} €. Le allocazioni alle Righe Offerta sono rimaste distinte.`;renderInvoice();
  }
  function splitDraft(id){
    const row=state.draftLines.find(x=>x.id===id);if(!row||row.allocations.length<2)return;state.draftLines=state.draftLines.filter(x=>x.id!==id);
    row.allocations.forEach(a=>{const src=findLineByPhase(a.phase);state.draftLines.push({id:uid('split'),description:src?.description||a.phase,amount:cents(a.amount),vat:row.vat,originType:'offer',allocations:[{...a}]});});state.message='Riga raggruppata nuovamente separata mantenendo le allocazioni originarie.';renderInvoice();
  }
  function draftBreakdown(row){
    if(row.originType==='free')return '<span>Riga libera · nessun collegamento a Righe Offerta</span>';
    return row.allocations.map(a=>{const src=findLineByPhase(a.phase);return `<span>${esc(src?.description||a.phase)} → <strong>${money(a.amount)} €</strong></span>`;}).join('');
  }
  function renderDraft(){
    if(!state.draftLines.length)return '<div class="ni39-empty">Nessuna Riga Fattura. Seleziona le Righe Offerta sopra oppure aggiungi una Riga libera.</div>';
    return state.draftLines.map(row=>`<div class="bw39-row ni39-draftgrid"><div><input type="checkbox" data-draft-check="${esc(row.id)}" ${state.selectedDraft.has(row.id)?'checked':''} ${row.originType==='free'?'disabled':''}></div><div><input class="ni39-desc" data-draft-desc="${esc(row.id)}" value="${esc(row.description)}"><div class="ni39-origin">${row.originType==='free'?'Riga libera':`Origine: <strong>${row.allocations.length} Riga${row.allocations.length>1?'he':''} Offerta</strong>`}</div></div><div class="bw39-money">${row.originType==='free'?`<input class="ni39-amount" data-free-amount="${esc(row.id)}" value="${money(row.amount)}">`:`${money(row.amount)} €`}</div><div>${row.vat}%</div><div>${row.originType==='offer'?`<span class="bw39-chip">${row.allocations.length>1?'Raggruppata':'Collegata'}</span>`:'—'}</div><div class="ni39-draft-actions">${row.allocations.length>1?`<button class="ni39-icon" data-split="${esc(row.id)}">Separa</button>`:''}<button class="ni39-icon" data-remove="${esc(row.id)}">Elimina</button></div><div class="ni39-breakdown">${draftBreakdown(row)}</div></div>`).join('');
  }
  function invoiceTotals(){
    const taxable=draftTotal(),fund=invoiceMeta.pensionFund?cents(taxable*Number(invoiceMeta.pensionPct||0)/100):0,vat=cents((taxable+fund)*Number(invoiceMeta.vat||0)/100),total=cents(taxable+fund+vat);return {taxable,fund,vat,total};
  }
  function validateDraft(){
    const errors=[];if(!state.draftLines.length)errors.push('Inserisci almeno una Riga Fattura.');
    state.draftLines.forEach(row=>{if(Number(row.amount||0)<=0)errors.push(`Importo non valido: ${row.description}`);if(row.originType==='offer'){const allocated=cents(row.allocations.reduce((s,a)=>s+Number(a.amount||0),0));if(Math.abs(allocated-Number(row.amount||0))>.01)errors.push(`Allocazioni non quadrate: ${row.description}`);}});
    lines().forEach(line=>{const existing=billedForLine(line),draft=draftForLine(line);if(existing+draft>Number(line.amount||0)+.01)errors.push(`Superato residuo Riga Offerta: ${line.description}`);});
    return errors;
  }
  function saveInvoice(){
    const errors=validateDraft();if(errors.length){state.message=errors.join(' · ');renderInvoice();return;}
    if(model.invoices.some(x=>x.number===invoiceMeta.number)){state.message='Numero fattura già presente nella simulazione.';renderInvoice();return;}
    const invoice={id:uid('invoice'),number:invoiceMeta.number,date:invoiceMeta.date,client:invoiceMeta.client,due:invoiceMeta.due,payment:invoiceMeta.payment,lines:state.draftLines.map(x=>({...x,id:uid('invline'),allocations:x.allocations.map(a=>({...a}))}))};model.invoices.push(invoice);
    const first=invoice.lines.flatMap(x=>x.allocations||[])[0];if(first?.phase)state.selectedPhase=first.phase;state.draftLines=[];state.selections.clear();state.selectedDraft.clear();state.message='';state.dashboardView='righe';showDashboard();
  }

  function renderInvoice(){
    if(!invoicePage)return;const totals=invoiceTotals();
    invoicePage.innerHTML=`<div class="bw39"><div class="bw39-top"><div class="bw39-title"><strong>Nuova fattura</strong><span>Prima scegli cosa evadere delle Righe Offerta; poi decidi come rappresentarlo nelle Righe Fattura.</span></div><div class="bw39-actions"><button class="bw39-btn" data-cancel-invoice>← Dashboard</button><button class="bw39-btn primary" data-save-invoice>Salva fattura</button></div></div>
      <section class="ni39-section"><div class="ni39-section-head"><strong>Dati fattura</strong><span>Dati documento</span></div><div class="ni39-body"><div class="ni39-fields"><label class="ni39-field"><span>Cliente fattura</span><input data-meta="client" value="${esc(invoiceMeta.client)}"></label><label class="ni39-field"><span>Numero</span><input data-meta="number" value="${esc(invoiceMeta.number)}"></label><label class="ni39-field"><span>Data</span><input type="date" data-meta="date" value="${esc(invoiceMeta.date)}"></label><label class="ni39-field"><span>Scadenza</span><select data-meta="due"><option>30 gg</option><option>60 gg Fine Mese</option><option ${invoiceMeta.due==='90 gg Fine Mese'?'selected':''}>90 gg Fine Mese</option></select></label><label class="ni39-field"><span>Pagamento</span><select data-meta="payment"><option selected>Bonifico</option><option>RIBA</option></select></label></div><div class="ni39-fields" style="margin-top:8px;grid-template-columns:1fr 1fr 1fr 1fr 1fr"><label class="ni39-field"><span>Cassa previdenza</span><div class="ni39-fund"><input type="checkbox" data-meta-check="pensionFund" ${invoiceMeta.pensionFund?'checked':''}><strong>${invoiceMeta.pensionPct}%</strong></div></label><label class="ni39-field"><span>IVA</span><input value="${invoiceMeta.vat}%" disabled></label></div></div></section>
      <section class="ni39-section source"><div class="ni39-section-head"><strong>Origine fatturazione</strong><span>Un solo navigatore: Commessa → Offerta → Righe Offerta</span></div><div class="ni39-body" id="ni39Source">${renderSource()}</div></section>
      <section class="ni39-section invoice"><div class="ni39-section-head"><strong>Righe fattura</strong><span>La forma della fattura è separata dalle allocazioni interne.</span></div><div class="ni39-body"><div class="bw39-actions" style="margin-bottom:8px"><button class="bw39-btn soft" data-add-free>＋ Riga libera</button><button class="bw39-btn" data-group-draft ${state.selectedDraft.size<2?'disabled':''}>Raggruppa selezionate</button></div><div class="bw39-table"><div class="bw39-row head ni39-draftgrid"><div>Sel.</div><div>Descrizione Riga Fattura</div><div>Importo</div><div>IVA</div><div>Origine</div><div>Azioni</div></div>${renderDraft()}</div><div class="ni39-totals"><div class="ni39-note"><strong>Quadratura interna.</strong> Per ogni Riga Fattura proveniente dalle offerte, la somma degli importi attribuiti alle Righe Offerta deve coincidere con l'importo della Riga Fattura. Raggruppare cambia solo la presentazione al cliente, non l'evasione interna.${state.message?`<div class="ni39-alert">${esc(state.message)}</div>`:''}</div><div class="ni39-summary"><div class="ni39-sumrow"><span>Imponibile</span><strong>${money(totals.taxable)} €</strong></div><div class="ni39-sumrow"><span>Cassa previdenza (${invoiceMeta.pensionPct}%)</span><strong>${money(totals.fund)} €</strong></div><div class="ni39-sumrow"><span>IVA (${invoiceMeta.vat}%)</span><strong>${money(totals.vat)} €</strong></div><div class="ni39-sumrow total"><span>Totale</span><strong>${money(totals.total)} €</strong></div></div></div></div></section></div>`;
    bindInvoice();
  }
  function bindInvoice(){
    invoicePage.querySelector('[data-cancel-invoice]')?.addEventListener('click',showDashboard);invoicePage.querySelector('[data-save-invoice]')?.addEventListener('click',saveInvoice);
    invoicePage.querySelectorAll('[data-meta]').forEach(el=>el.addEventListener('change',()=>{invoiceMeta[el.dataset.meta]=el.value;renderInvoice();}));invoicePage.querySelector('[data-meta-check="pensionFund"]')?.addEventListener('change',e=>{invoiceMeta.pensionFund=e.target.checked;renderInvoice();});
    invoicePage.querySelectorAll('[data-src-nav]').forEach(b=>b.addEventListener('click',()=>{state.sourceView=b.dataset.srcNav;renderInvoice();}));invoicePage.querySelector('[data-src-commessa]')?.addEventListener('click',()=>{state.sourceView='offerte';renderInvoice();});invoicePage.querySelector('[data-src-offer]')?.addEventListener('click',()=>{state.sourceView='righe';renderInvoice();});
    invoicePage.querySelectorAll('[data-src-check]').forEach(cb=>cb.addEventListener('change',()=>{const key=cb.dataset.srcCheck,line=selectionLine(key);if(!line)return;if(cb.checked){const current=state.selections.get(key)||metrics(line).available;setSelection(key,current);}else state.selections.delete(key);renderInvoice();}));
    invoicePage.querySelectorAll('[data-src-amount]').forEach(inp=>inp.addEventListener('change',()=>{setSelection(inp.dataset.srcAmount,inp.value);renderInvoice();}));invoicePage.querySelector('[data-add-selected]')?.addEventListener('click',addSelected);
    invoicePage.querySelector('[data-add-free]')?.addEventListener('click',addFree);invoicePage.querySelector('[data-group-draft]')?.addEventListener('click',groupDraft);
    invoicePage.querySelectorAll('[data-draft-check]').forEach(cb=>cb.addEventListener('change',()=>{if(cb.checked)state.selectedDraft.add(cb.dataset.draftCheck);else state.selectedDraft.delete(cb.dataset.draftCheck);renderInvoice();}));
    invoicePage.querySelectorAll('[data-draft-desc]').forEach(inp=>inp.addEventListener('change',()=>{const r=state.draftLines.find(x=>x.id===inp.dataset.draftDesc);if(r)r.description=inp.value.trim()||r.description;renderInvoice();}));
    invoicePage.querySelectorAll('[data-free-amount]').forEach(inp=>inp.addEventListener('change',()=>{const r=state.draftLines.find(x=>x.id===inp.dataset.freeAmount);if(r)r.amount=Math.max(0,cents(Number(String(inp.value).replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0));renderInvoice();}));
    invoicePage.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>removeDraft(b.dataset.remove)));invoicePage.querySelectorAll('[data-split]').forEach(b=>b.addEventListener('click',()=>splitDraft(b.dataset.split)));
  }

  function showDashboard(){hideOtherPages();if(invoicePage)invoicePage.hidden=true;if(dashboardPage)dashboardPage.hidden=false;setChrome('Dashboard Fatturazione','billing');history.replaceState(null,'','#dashboard-fatturazione');renderDashboard();}
  function showInvoice(){hideOtherPages();if(dashboardPage)dashboardPage.hidden=true;if(invoicePage)invoicePage.hidden=false;setChrome('Nuova fattura','billing');history.replaceState(null,'','#nuova-fattura');renderInvoice();}

  function selfTest(){
    const m=offerMetrics();const errors=[];
    if(Math.abs(m.amount-54000)>.01)errors.push(`Totale offerta atteso 54000, ottenuto ${m.amount}`);
    if(Math.abs(m.billed-30500)>.01)errors.push(`Fatturato iniziale atteso 30500, ottenuto ${m.billed}`);
    if(Math.abs(m.residual-23500)>.01)errors.push(`Residuo iniziale atteso 23500, ottenuto ${m.residual}`);
    const exec=m.lines.find(x=>x.phase==='esecutivo'),dl=m.lines.find(x=>x.phase==='dl');if(!exec||Math.abs(exec.residual-8800)>.01)errors.push('Residuo esecutivo non coerente.');if(!dl||Math.abs(dl.residual-9900)>.01)errors.push('Residuo DL non coerente.');
    const grouped={amount:5000,allocations:[{phase:'esecutivo',amount:2500},{phase:'dl',amount:2500}]};const allocated=grouped.allocations.reduce((s,a)=>s+a.amount,0);if(Math.abs(grouped.amount-allocated)>.01)errors.push('Test raggruppamento: allocazioni non quadrate.');if(exec&&2500>exec.residual+.01)errors.push('Test raggruppamento supera residuo esecutivo.');if(dl&&2500>dl.residual+.01)errors.push('Test raggruppamento supera residuo DL.');
    const result={ok:errors.length===0,errors,expected:{offer:54000,billed:30500,residual:23500,groupedInvoiceLine:5000,allocations:{esecutivo:2500,dl:2500}}};console[result.ok?'info':'error']('[Dabster v39] self-test fatturazione',result);return result;
  }
  window.DABSTER_BILLING_V39={showDashboard,showInvoice,selfTest,getModel:()=>model,getOfferMetrics:offerMetrics};

  function install(attempt=0){
    const shell=document.querySelector('.page-shell'),main=shell?.querySelector('.main-card'),nav=document.querySelector('#appSidebar .sidebar-nav');if(!shell||!main||!nav){if(attempt<220)setTimeout(()=>install(attempt+1),50);return;}
    installStyles();dashboardPage=document.getElementById('billingDashboardPageV39');if(!dashboardPage){dashboardPage=document.createElement('section');dashboardPage.id='billingDashboardPageV39';dashboardPage.hidden=true;main.insertAdjacentElement('afterend',dashboardPage);}invoicePage=document.getElementById('newInvoicePageV39');if(!invoicePage){invoicePage=document.createElement('section');invoicePage.id='newInvoicePageV39';invoicePage.hidden=true;dashboardPage.insertAdjacentElement('afterend',invoicePage);}
    const old=nav.querySelector('[data-page="billing"]');if(old){const btn=old.cloneNode(true);btn.dataset.page='billing';btn.innerHTML='<span class="side-icon">€</span>Dashboard Fatturazione';old.replaceWith(btn);btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();state.dashboardView='commesse';showDashboard();});}
    document.addEventListener('click',e=>{const b=e.target.closest?.('#appSidebar .sidebar-item');if(b&&b.dataset.page!=='billing'){if(dashboardPage)dashboardPage.hidden=true;if(invoicePage)invoicePage.hidden=true;}},true);
    window.addEventListener('dabster-offer-flow-change',()=>{if(dashboardPage&&!dashboardPage.hidden)renderDashboard();if(invoicePage&&!invoicePage.hidden)renderInvoice();});selfTest();if(location.hash==='#nuova-fattura')showInvoice();else showDashboard();
  }
  install();
})();
