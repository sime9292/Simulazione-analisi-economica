/* v38 - Hierarchical billing dashboard: Commessa -> Offerta -> Righe Offerta, with linked invoice lines below. */
(function(){
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cents=n=>Math.round(Number(n||0)*100)/100;

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

  const INVOICE_LINES=[
    {id:'inv-118-1',invoiceNo:'FT 2026/118',date:'15/04/2026',description:'Acconto 20% incarico professionale',lineAmount:10800,allocations:{preliminare:1600,esecutivo:4400,dl:3600,consulenze:1200}},
    {id:'inv-171-1',invoiceNo:'FT 2026/171',date:'30/06/2026',description:'Saldo progettazione preliminare impianti',lineAmount:6400,allocations:{preliminare:6400}},
    {id:'inv-171-2',invoiceNo:'FT 2026/171',date:'30/06/2026',description:'SAL progettazione esecutiva - consegna elaborati',lineAmount:8800,allocations:{esecutivo:8800}},
    {id:'inv-219-1',invoiceNo:'FT 2026/219',date:'31/07/2026',description:'SAL Direzione Lavori n. 1',lineAmount:4500,allocations:{dl:4500}}
  ];

  const state={view:'commesse',selectedPhase:'preliminare',splitHeight:null};
  let page=null;

  function flowSnapshot(){
    const live=window.DABSTER_OFFER_FLOW?.getSnapshot?.();
    if(live?.offer&&Array.isArray(live.lines)&&live.lines.length)return live;
    return {offer:{...FALLBACK_OFFER},lines:FALLBACK_LINES.map(x=>({...x})),loadedOffer:false};
  }
  function lines(){return (flowSnapshot().lines||[]).map(x=>({...x,amount:Number(x.amount||0)})).filter(x=>x.amount>0.005);}
  function offer(){return {...FALLBACK_OFFER,...(flowSnapshot().offer||{})};}
  function allocatedToPhase(phase){return cents(INVOICE_LINES.reduce((s,row)=>s+Number(row.allocations?.[phase]||0),0));}
  function linkedRows(phase){return INVOICE_LINES.filter(row=>Number(row.allocations?.[phase]||0)>0).map(row=>({...row,attributed:Number(row.allocations[phase]||0)}));}
  function lineMetrics(line){const invoiced=allocatedToPhase(line.phase),residual=Math.max(0,cents(Number(line.amount||0)-invoiced)),pct=line.amount?Math.min(100,(invoiced/line.amount)*100):0;return {...line,invoiced,residual,pct};}
  function offerMetrics(){const ls=lines().map(lineMetrics),amount=cents(ls.reduce((s,x)=>s+x.amount,0)),invoiced=cents(ls.reduce((s,x)=>s+x.invoiced,0)),residual=cents(amount-invoiced),pct=amount?(invoiced/amount)*100:0;return {lines:ls,amount,invoiced,residual,pct};}

  function installStyles(){
    if(document.getElementById('billingDashboardV38Styles'))return;
    const s=document.createElement('style');s.id='billingDashboardV38Styles';s.textContent=`
      #billingDashboardPageV38[hidden]{display:none!important}.bd38{min-height:660px;background:#f4f6f7;border:1px solid #dbe2e5;border-radius:9px;padding:12px}.bd38-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:9px}.bd38-title strong{display:block;font-size:15px;color:#304650}.bd38-title span{display:block;margin-top:2px;font-size:8.8px;color:#728089}.bd38-breadcrumb{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-bottom:10px;padding:7px 9px;border:1px solid #dde4e7;border-radius:7px;background:#fff;font-size:8.8px;color:#718089}.bd38-breadcrumb button{padding:0;border:0;background:transparent;color:#476876;font:inherit;font-weight:750;cursor:pointer}.bd38-breadcrumb strong{color:#334c58}.bd38-kpis{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:7px;margin-bottom:9px}.bd38-kpi{padding:8px 9px;border:1px solid #dce3e6;border-radius:7px;background:#fff}.bd38-kpi span{display:block;font-size:7.4px;text-transform:uppercase;font-weight:760;color:#73818a}.bd38-kpi strong{display:block;margin-top:4px;font-size:13px;color:#334b57}.bd38-table{border:1px solid #d8e0e4;border-radius:7px;overflow:hidden;background:#fff}.bd38-row{display:grid;min-height:40px}.bd38-row>div{display:flex;align-items:center;min-width:0;padding:6px 8px;border-right:1px solid #e7ecee;border-bottom:1px solid #e7ecee;font-size:9px;color:#40545f}.bd38-row>div:last-child{border-right:0}.bd38-row.head{min-height:29px;background:#f1f4f5}.bd38-row.head>div{font-size:7.4px;text-transform:uppercase;font-weight:780;color:#67757e}.bd38-commessa-grid{grid-template-columns:120px minmax(310px,1.5fr) 150px 145px 145px 95px 34px}.bd38-offer-grid{grid-template-columns:125px minmax(300px,1.5fr) 145px 145px 145px 95px 34px}.bd38-data{cursor:pointer}.bd38-data:hover>div{background:#fff8f3}.bd38-code{font-weight:800;color:#31596b}.bd38-money{justify-content:flex-end;font-weight:760;font-variant-numeric:tabular-nums}.bd38-pct{justify-content:flex-end;font-weight:760}.bd38-arrow{justify-content:center!important;font-size:16px!important;color:#df6d26!important}.bd38-muted{font-size:8px;color:#74828a}.bd38-offer-title{font-weight:720;line-height:1.25}.bd38-status{display:inline-flex;padding:4px 7px;border-radius:999px;background:#e8f3eb;color:#3d6c4d;font-size:7.7px;font-weight:760}
      .bd38-workspace{height:590px;display:flex;flex-direction:column;min-height:440px}.bd38-pane{min-height:0;border:1px solid #d8e0e4;border-radius:8px;background:#fff;overflow:hidden;display:flex;flex-direction:column}.bd38-pane.top{height:54%;min-height:185px;flex:none}.bd38-pane.bottom{flex:1;min-height:170px}.bd38-pane-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid #e1e7ea;background:#f6f8f9}.bd38-pane-head strong{display:block;font-size:10.5px;color:#354d59}.bd38-pane-head span{display:block;margin-top:2px;font-size:8px;color:#75828a}.bd38-pane-head .right{margin:0;font-size:8px;font-weight:750;color:#55717d;text-align:right}.bd38-scroll{min-height:0;overflow:auto;flex:1}.bd38-grid{grid-template-columns:minmax(300px,1.6fr) 150px 145px 145px 95px}.bd38-line-row.selected>div{background:#eef6f8;border-bottom-color:#cfdfe4}.bd38-line-row.selected>div:first-child{box-shadow:inset 4px 0 0 #568292}.bd38-line-copy strong{display:block;font-size:9.2px;color:#354f5b}.bd38-line-copy span{display:block;margin-top:2px;font-size:7.8px;color:#7a878e}.bd38-progress{width:100%;height:5px;border-radius:99px;background:#e6ecef;overflow:hidden}.bd38-progress i{display:block;height:100%;background:#718f9b}.bd38-splitter{height:12px;flex:none;cursor:row-resize;display:flex;align-items:center;justify-content:center;position:relative;touch-action:none}.bd38-splitter:before{content:'';position:absolute;left:0;right:0;top:5px;border-top:1px solid #cfd8dc}.bd38-splitter span{position:relative;z-index:1;padding:2px 8px;border:1px solid #ccd7dc;border-radius:999px;background:#f4f7f8;color:#637680;font-size:7.4px;font-weight:750;letter-spacing:.02em}.bd38-link-banner{padding:6px 10px;border-bottom:1px solid #dce6ea;background:#edf6f8;font-size:8.3px;color:#4e6975}.bd38-link-banner strong{color:#315765}.bd38-invoice-main strong{display:block;font-size:9px;color:#36515d}.bd38-invoice-main span{display:block;margin-top:2px;font-size:8px;color:#667982;line-height:1.25}.bd38-attributed{justify-content:flex-end!important;font-weight:800!important;color:#305d6c!important;background:#f4fafb}.bd38-invoice-amount{justify-content:flex-end!important;font-weight:720!important}.bd38-link-chip{display:inline-flex;padding:4px 6px;border-radius:999px;background:#edf4f6;color:#52717e;font-size:7.2px;font-weight:750}.bd38-empty{padding:24px;text-align:center;color:#75828a;font-size:9px}.bd38-help{margin-top:8px;padding:7px 9px;border:1px solid #dce4e7;border-radius:7px;background:#fff;font-size:8px;color:#6c7b83;line-height:1.35}.bd38-help strong{color:#405a66}
      @media(max-width:900px){.bd38-kpis{grid-template-columns:repeat(2,1fr)}.bd38-table,.bd38-scroll{overflow:auto}.bd38-row{min-width:860px}.bd38-workspace{height:700px}}
    `;document.head.appendChild(s);
  }

  function hideOtherPages(){
    document.querySelector('.main-card')?.style.setProperty('display','none');
    const k=document.getElementById('kanbanPage');if(k)k.hidden=true;
    const offers=document.getElementById('offersListPage');if(offers)offers.hidden=true;
    ['billingDashboardPageV37','billingDashboardPageV36','billingDashboardPageV35','billingDashboardPage'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=true;});
  }
  function setChrome(){
    const t=document.querySelector('.page-title');if(t)t.textContent='Dashboard Fatturazione';
    const bc=document.querySelector('.breadcrumb');if(bc)bc.innerHTML='<span>⌂</span><span>›</span><strong>Dashboard Fatturazione</strong>';
    document.querySelectorAll('#appSidebar .sidebar-item').forEach(x=>x.classList.toggle('active',x.dataset.page==='billing'));
    document.getElementById('appSidebar')?.classList.remove('open');document.getElementById('appSidebarOverlay')?.classList.remove('open');
  }
  function show(){hideOtherPages();if(page)page.hidden=false;setChrome();history.replaceState(null,'','#dashboard-fatturazione');render();}

  function breadcrumb(){
    const o=offer();
    if(state.view==='commesse')return '<strong>Dashboard Fatturazione</strong>';
    if(state.view==='offerte')return `<button data-nav="commesse">Dashboard Fatturazione</button><span>›</span><strong>${esc(o.commessa)}</strong>`;
    return `<button data-nav="commesse">Dashboard Fatturazione</button><span>›</span><button data-nav="offerte">${esc(o.commessa)}</button><span>›</span><strong>${esc(o.code)}</strong><span>›</span><strong>Righe Offerta</strong>`;
  }
  function kpis(){
    const m=offerMetrics();return `<div class="bd38-kpis"><div class="bd38-kpi"><span>Valore offerta</span><strong>${money(m.amount)} €</strong></div><div class="bd38-kpi"><span>Fatturato</span><strong>${money(m.invoiced)} €</strong></div><div class="bd38-kpi"><span>Residuo da fatturare</span><strong>${money(m.residual)} €</strong></div><div class="bd38-kpi"><span>% fatturato</span><strong>${m.pct.toLocaleString('it-IT',{maximumFractionDigits:1})}%</strong></div></div>`;}

  function renderCommesse(){
    const o=offer(),m=offerMetrics();
    return `${kpis()}<div class="bd38-table"><div class="bd38-row head bd38-commessa-grid"><div>Commessa</div><div>Descrizione</div><div>Valore offerte</div><div>Fatturato</div><div>Residuo</div><div>%</div><div></div></div><div class="bd38-row bd38-data bd38-commessa-grid" data-open-commessa><div><strong class="bd38-code">${esc(o.commessa)}</strong></div><div><span class="bd38-offer-title">${esc(o.commessaLabel||o.title)}</span></div><div class="bd38-money">${money(m.amount)} €</div><div class="bd38-money">${money(m.invoiced)} €</div><div class="bd38-money">${money(m.residual)} €</div><div class="bd38-pct">${m.pct.toLocaleString('it-IT',{maximumFractionDigits:1})}%</div><div class="bd38-arrow">›</div></div></div><div class="bd38-help"><strong>Livello Commessa.</strong> Aprendo la commessa trovi le offerte confermate che generano il valore da fatturare.</div>`;
  }

  function renderOfferte(){
    const o=offer(),m=offerMetrics();
    return `${kpis()}<div class="bd38-table"><div class="bd38-row head bd38-offer-grid"><div>Offerta</div><div>Descrizione</div><div>Importo confermato</div><div>Fatturato</div><div>Residuo</div><div>%</div><div></div></div><div class="bd38-row bd38-data bd38-offer-grid" data-open-offer><div><span class="bd38-code">${esc(o.code)}</span></div><div><span class="bd38-offer-title">${esc(o.title)}</span><span class="bd38-muted">${esc(o.client||'')}</span></div><div class="bd38-money">${money(m.amount)} €</div><div class="bd38-money">${money(m.invoiced)} €</div><div class="bd38-money">${money(m.residual)} €</div><div class="bd38-pct">${m.pct.toLocaleString('it-IT',{maximumFractionDigits:1})}%</div><div class="bd38-arrow">›</div></div></div><div class="bd38-help"><strong>Livello Offerta.</strong> Aprendo l’offerta passi alle Righe Offerta confermate: sono queste che mantengono il residuo e il collegamento con le Righe Fattura.</div>`;
  }

  function renderDetail(){
    const o=offer(),m=offerMetrics();
    const metricLines=m.lines;
    if(!metricLines.some(x=>x.phase===state.selectedPhase))state.selectedPhase=metricLines[0]?.phase||'';
    const selected=metricLines.find(x=>x.phase===state.selectedPhase)||metricLines[0];
    const linked=selected?linkedRows(selected.phase):[];
    const topRows=metricLines.map(x=>`<div class="bd38-row bd38-grid bd38-line-row ${x.phase===state.selectedPhase?'selected':''}" data-line-phase="${esc(x.phase)}"><div class="bd38-line-copy"><strong>${esc(x.description||x.phase)}</strong><span>${esc(x.phase)} · Riga Offerta</span></div><div class="bd38-money">${money(x.amount)} €</div><div class="bd38-money">${money(x.invoiced)} €</div><div class="bd38-money">${money(x.residual)} €</div><div><div style="width:100%"><div class="bd38-pct">${x.pct.toLocaleString('it-IT',{maximumFractionDigits:1})}%</div><div class="bd38-progress"><i style="width:${Math.min(100,x.pct)}%"></i></div></div></div></div>`).join('');
    const invoiceRows=linked.length?linked.map(row=>`<div class="bd38-row bd38-grid"><div class="bd38-invoice-main"><strong>${esc(row.invoiceNo)}</strong><span>${esc(row.description)}</span></div><div class="bd38-attributed">${money(row.attributed)} €</div><div class="bd38-invoice-amount">${money(row.lineAmount)} €</div><div>${esc(row.date)}</div><div><span class="bd38-link-chip">↳ Riga selezionata</span></div></div>`).join(''):'<div class="bd38-empty">Nessuna Riga Fattura collegata a questa Riga Offerta.</div>';
    return `${kpis()}<div class="bd38-workspace" id="billing38Workspace"><section class="bd38-pane top" id="billing38Top"><div class="bd38-pane-head"><div><strong>Offerta ${esc(o.code)} · Righe Offerta</strong><span>Seleziona una riga: la sezione sotto mostra esclusivamente le Righe Fattura collegate.</span></div><span class="right">${metricLines.length} righe · ${money(m.residual)} € residui</span></div><div class="bd38-scroll"><div class="bd38-row head bd38-grid"><div>Descrizione Riga Offerta</div><div>Importo Riga Offerta</div><div>Fatturato</div><div>Residuo</div><div>%</div></div>${topRows}</div></section><div class="bd38-splitter" id="billing38Splitter" title="Trascina per regolare l’altezza"><span>Righe Fattura collegate ↓ · trascina</span></div><section class="bd38-pane bottom"><div class="bd38-pane-head"><div><strong>Righe Fattura collegate</strong><span>${selected?esc(selected.description):'Seleziona una Riga Offerta'}</span></div><span class="right">${linked.length} collegamenti</span></div><div class="bd38-link-banner">Collegamento attivo: <strong>${selected?esc(selected.description):'—'}</strong> ↔ Righe Fattura che hanno attribuito importi a questa riga.</div><div class="bd38-scroll"><div class="bd38-row head bd38-grid"><div>Fattura / descrizione Riga Fattura</div><div>Importo attribuito</div><div>Importo Riga Fattura</div><div>Data fattura</div><div>Collegamento</div></div>${invoiceRows}</div></section></div><div class="bd38-help"><strong>Nota:</strong> “Importo attribuito” è allineato alla colonna “Importo Riga Offerta” perché rappresenta la quota della Riga Fattura che riduce proprio quella Riga Offerta. L’importo completo della Riga Fattura rimane distinto nella colonna successiva.</div>`;
  }

  function render(){
    if(!page)return;
    const body=state.view==='commesse'?renderCommesse():state.view==='offerte'?renderOfferte():renderDetail();
    page.innerHTML=`<div class="bd38"><div class="bd38-head"><div class="bd38-title"><strong>Dashboard Fatturazione</strong><span>Dal valore confermato fino alle Righe Fattura già collegate.</span></div><span class="bd38-status">Simulazione ${esc(offer().code)}</span></div><div class="bd38-breadcrumb">${breadcrumb()}</div>${body}</div>`;
    page.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.nav;render();}));
    page.querySelector('[data-open-commessa]')?.addEventListener('click',()=>{state.view='offerte';render();});
    page.querySelector('[data-open-offer]')?.addEventListener('click',()=>{state.view='righe';render();});
    page.querySelectorAll('[data-line-phase]').forEach(row=>row.addEventListener('click',()=>{state.selectedPhase=row.dataset.linePhase;render();}));
    if(state.view==='righe')installSplitter();
  }

  function installSplitter(){
    const workspace=document.getElementById('billing38Workspace'),top=document.getElementById('billing38Top'),splitter=document.getElementById('billing38Splitter');if(!workspace||!top||!splitter)return;
    if(state.splitHeight){const max=Math.max(185,workspace.clientHeight-190);top.style.height=Math.min(max,state.splitHeight)+'px';}
    splitter.addEventListener('pointerdown',e=>{
      e.preventDefault();splitter.setPointerCapture?.(e.pointerId);
      const rect=workspace.getBoundingClientRect();
      const move=ev=>{const min=185,max=Math.max(min,rect.height-190),h=Math.max(min,Math.min(max,ev.clientY-rect.top));state.splitHeight=h;top.style.height=h+'px';};
      const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);};
      window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
    });
  }

  function installBillingNav(){
    const nav=document.querySelector('#appSidebar .sidebar-nav'),old=nav?.querySelector('[data-page="billing"]');if(!nav||!old)return false;
    const btn=old.cloneNode(true);btn.dataset.page='billing';btn.dataset.billingDashboardV38='1';btn.innerHTML='<span class="side-icon">€</span>Dashboard Fatturazione';old.replaceWith(btn);btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();state.view='commesse';show();});return true;
  }

  function install(attempt=0){
    const shell=document.querySelector('.page-shell'),main=shell?.querySelector('.main-card'),nav=document.querySelector('#appSidebar .sidebar-nav');
    if(!shell||!main||!nav){if(attempt<220)setTimeout(()=>install(attempt+1),50);return;}
    installStyles();
    page=document.getElementById('billingDashboardPageV38');if(!page){page=document.createElement('section');page.id='billingDashboardPageV38';page.hidden=true;main.insertAdjacentElement('afterend',page);}
    installBillingNav();window.addEventListener('dabster-offer-flow-change',()=>{if(page&&!page.hidden)render();});show();
  }
  install();
})();
