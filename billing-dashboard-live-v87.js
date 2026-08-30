/* v87 - Standalone live Billing Dashboard. Commessa -> Offerta -> Righe Offerta -> Righe Fattura. */
(function(){
  if(window.DABSTER_BILLING_DASHBOARD_V87)return;
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cents=n=>Math.round(Number(n||0)*100)/100;
  const pct=(part,total)=>total>0?Math.max(0,Math.min(100,part/total*100)):0;
  const state={level:'commesse',selectedLineId:''};
  let page=null;

  function offerSnapshot(){
    const snap=window.DABSTER_OFFER_FLOW?.getSnapshot?.()||{};
    const offer=snap.offer||{};
    const raw=Array.isArray(snap.lines)&&snap.lines.length?snap.lines:(Array.isArray(window.DABSTER_OFFER_LINES?.lines)?window.DABSTER_OFFER_LINES.lines:[]);
    const lines=raw.map((x,i)=>({
      id:String(x.id||`${offer.code||'offer'}:${x.phase||'line'}:${i}`),
      phase:String(x.phase||''),description:String(x.description||x.label||`Riga ${i+1}`),amount:Number(x.amount||0)
    })).filter(x=>x.amount>0.005);
    return {offer,lines,loaded:!!(offer.code&&lines.length)};
  }
  function invoices(){const m=window.DABSTER_BILLING_MODEL_V39;return Array.isArray(m?.invoices)?m.invoices:[];}
  function allInvoiceLines(){return invoices().flatMap(inv=>(inv.lines||[]).map(line=>({invoice:inv,line})));}
  function allocationMatches(a,line){
    if(a?.offerLineId)return String(a.offerLineId)===String(line.id);
    return !a?.offerLineId&&a?.phase&&String(a.phase)===String(line.phase);
  }
  function billedForLine(line){return cents(allInvoiceLines().reduce((sum,x)=>sum+(x.line.allocations||[]).filter(a=>allocationMatches(a,line)).reduce((s,a)=>s+Number(a.amount||0),0),0));}
  function linkedInvoiceRows(line){
    const out=[];
    allInvoiceLines().forEach(({invoice,line:invLine})=>{
      const attributed=cents((invLine.allocations||[]).filter(a=>allocationMatches(a,line)).reduce((s,a)=>s+Number(a.amount||0),0));
      if(Math.abs(attributed)>.005)out.push({invoiceNo:invoice.number||'—',date:invoice.date||'',description:invLine.description||'',lineAmount:Number(invLine.amount||0),attributed});
    });
    return out;
  }
  function lineMetrics(line){
    const billed=billedForLine(line),residual=Math.max(0,cents(Number(line.amount||0)-billed)),percent=pct(billed,Number(line.amount||0));
    const status=billed<=.005?'Da fatturare':residual<=.005?'Evasa':'Parziale';
    return {...line,billed,residual,percent,status};
  }
  function metrics(){
    const snap=offerSnapshot(),ls=snap.lines.map(lineMetrics);
    const amount=cents(ls.reduce((s,x)=>s+x.amount,0)),billed=cents(ls.reduce((s,x)=>s+x.billed,0)),residual=Math.max(0,cents(amount-billed));
    return {...snap,lines:ls,amount,billed,residual,percent:pct(billed,amount)};
  }
  function manager(offer,type){
    if(type==='cp')return offer.projectManager||offer.project_manager||offer.cp||offer.capoProgetto||'—';
    return offer.commessaManager||offer.commessa_manager||offer.cc||offer.capoCommessa||'—';
  }
  function statusPill(status){const cls=status==='Evasa'?'done':status==='Parziale'?'partial':'todo';return `<span class="bd87-status ${cls}">${esc(status)}</span>`;}
  function progress(value){const n=Math.max(0,Math.min(100,Number(value||0)));return `<div class="bd87-progress"><span>${n.toLocaleString('it-IT',{maximumFractionDigits:1})}%</span><div><i style="width:${n}%"></i></div></div>`;}

  function installStyles(){
    if(document.getElementById('billingDashboardLiveV87Styles'))return;
    const s=document.createElement('style');s.id='billingDashboardLiveV87Styles';s.textContent=`
      #billingDashboardLiveV87[hidden]{display:none!important}.bd87{min-height:650px;background:#f4f6f7;border:1px solid #dbe2e5;border-radius:9px;padding:12px;color:#354b56;font-family:Arial,sans-serif}.bd87-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:9px}.bd87-title strong{display:block;font-size:15px;color:#2f4651}.bd87-title span{display:block;margin-top:2px;font-size:8.5px;color:#74828a}.bd87-actions{display:flex;gap:6px}.bd87-btn{height:30px;padding:0 10px;border:1px solid #cbd6da;border-radius:6px;background:#fff;color:#4c6570;font-size:8.5px;font-weight:780;cursor:pointer}.bd87-btn.primary{background:#e97026;border-color:#d3631f;color:#fff}.bd87-crumb{display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding:7px 9px;margin-bottom:9px;border:1px solid #dce4e7;border-radius:7px;background:#fff;font-size:8.5px;color:#74818a}.bd87-crumb button{border:0;background:transparent;padding:0;color:#426876;font:inherit;font-weight:780;cursor:pointer}.bd87-crumb strong{color:#344f5a}.bd87-kpis{display:grid;grid-template-columns:repeat(4,minmax(110px,1fr));gap:7px;margin-bottom:9px}.bd87-kpi{padding:8px 9px;border:1px solid #dce3e6;border-radius:7px;background:#fff}.bd87-kpi span{display:block;font-size:7px;font-weight:780;color:#74818a;text-transform:uppercase}.bd87-kpi strong{display:block;margin-top:4px;font-size:13px;color:#334b56}.bd87-table{border:1px solid #d8e0e4;border-radius:7px;overflow:auto;background:#fff}.bd87-row{display:grid;min-height:39px;min-width:980px}.bd87-row>div{display:flex;align-items:center;min-width:0;padding:6px 7px;border-right:1px solid #e7ecee;border-bottom:1px solid #e7ecee;font-size:8.5px;color:#40545f}.bd87-row>div:last-child{border-right:0}.bd87-row.head{min-height:29px;background:#f1f4f5}.bd87-row.head>div{font-size:6.8px;font-weight:800;text-transform:uppercase;color:#68767e}.bd87-row.data{cursor:pointer}.bd87-row.data:hover>div{background:#fff8f3}.bd87-commessa{grid-template-columns:100px minmax(190px,1.4fr) 135px 58px 58px 105px 105px 105px 92px 90px 28px}.bd87-offer{grid-template-columns:115px minmax(210px,1.5fr) 135px 58px 58px 105px 105px 105px 92px 90px 28px}.bd87-lines{grid-template-columns:100px minmax(250px,1.7fr) 120px 120px 120px 100px 90px}.bd87-code{font-weight:800;color:#315e6f}.bd87-money{justify-content:flex-end!important;font-weight:760;font-variant-numeric:tabular-nums}.bd87-arrow{justify-content:center!important;font-size:16px!important;color:#df6d26!important}.bd87-status{display:inline-flex;padding:4px 6px;border-radius:999px;font-size:7px;font-weight:780;white-space:nowrap}.bd87-status.todo{background:#fff3e8;color:#9a622e}.bd87-status.partial{background:#fff8dc;color:#8a722d}.bd87-status.done{background:#eaf5ed;color:#42704f}.bd87-progress{width:100%;display:flex;align-items:center;gap:5px;justify-content:flex-end}.bd87-progress>span{width:34px;text-align:right;font-weight:760}.bd87-progress>div{width:48px;height:5px;border-radius:99px;background:#e5ebee;overflow:hidden}.bd87-progress i{display:block;height:100%;background:#708f9b}.bd87-help{margin-top:8px;padding:7px 9px;border:1px solid #dce4e7;border-radius:7px;background:#fff;font-size:7.8px;color:#6c7b83;line-height:1.35}.bd87-workspace{display:grid;grid-template-rows:minmax(210px,1fr) 12px minmax(180px,.8fr);height:570px}.bd87-pane{min-height:0;border:1px solid #d8e0e4;border-radius:7px;background:#fff;overflow:hidden;display:flex;flex-direction:column}.bd87-pane-head{padding:8px 9px;border-bottom:1px solid #e0e6e9;background:#f5f8f9;display:flex;justify-content:space-between;gap:10px}.bd87-pane-head strong{font-size:9.5px;color:#36505b}.bd87-pane-head span{font-size:7.5px;color:#75828a}.bd87-scroll{min-height:0;overflow:auto;flex:1}.bd87-split{display:flex;align-items:center;justify-content:center;font-size:7px;color:#73818a}.bd87-inv{grid-template-columns:110px 105px minmax(260px,1.7fr) 130px 130px}.bd87-empty{padding:22px;text-align:center;color:#7a878e;font-size:8.5px}@media(max-width:900px){.bd87-kpis{grid-template-columns:repeat(2,1fr)}.bd87{padding:9px}.bd87-top{align-items:center}.bd87-workspace{height:650px}}
    `;document.head.appendChild(s);
  }
  function hideOtherPages(){
    document.querySelector('.main-card')?.style.setProperty('display','none');
    ['kanbanPage','offersListPage','billingDashboardPageV39','billingDashboardEmptyV86','newInvoicePageV39','billablePageV58'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=true;});
  }
  function setChrome(){
    const t=document.querySelector('.page-title');if(t)t.textContent='Dashboard Fatturazione';
    const bc=document.querySelector('.breadcrumb');if(bc)bc.innerHTML='<span>⌂</span><span>›</span><strong>Dashboard Fatturazione</strong>';
    document.querySelectorAll('#appSidebar .sidebar-item').forEach(x=>x.classList.toggle('active',x.dataset.page==='billing-dashboard'));
    document.getElementById('appSidebar')?.classList.remove('open');document.getElementById('appSidebarOverlay')?.classList.remove('open');
  }
  function kpis(m){return `<div class="bd87-kpis"><div class="bd87-kpi"><span>Valore confermato</span><strong>${money(m.amount)}</strong></div><div class="bd87-kpi"><span>Fatturato</span><strong>${money(m.billed)}</strong></div><div class="bd87-kpi"><span>Residuo</span><strong>${money(m.residual)}</strong></div><div class="bd87-kpi"><span>% evaso</span><strong>${m.percent.toLocaleString('it-IT',{maximumFractionDigits:1})}%</strong></div></div>`;}
  function crumb(m){
    if(state.level==='commesse')return '<strong>Commesse</strong>';
    if(state.level==='offerte')return `<button data-nav="commesse">Commesse</button><span>›</span><strong>${esc(m.offer.commessa||'Commessa')}</strong>`;
    return `<button data-nav="commesse">Commesse</button><span>›</span><button data-nav="offerte">${esc(m.offer.commessa||'Commessa')}</button><span>›</span><strong>${esc(m.offer.code||'Offerta')}</strong><span>›</span><strong>Righe Offerta</strong>`;
  }
  function renderCommesse(m){
    const o=m.offer,status=m.billed<=.005?'Da fatturare':m.residual<=.005?'Evasa':'Parziale';
    return `${kpis(m)}<div class="bd87-table"><div class="bd87-row head bd87-commessa"><div>Commessa</div><div>Descrizione</div><div>Cliente</div><div>CP</div><div>CC</div><div>Valore</div><div>Fatturato</div><div>Residuo</div><div>% evaso</div><div>Stato</div><div></div></div><div class="bd87-row data bd87-commessa" data-open-commessa><div><strong class="bd87-code">${esc(o.commessa||'—')}</strong></div><div>${esc(o.commessaLabel||o.title||'—')}</div><div>${esc(o.client||'—')}</div><div>${esc(manager(o,'cp'))}</div><div>${esc(manager(o,'cc'))}</div><div class="bd87-money">${money(m.amount)}</div><div class="bd87-money">${money(m.billed)}</div><div class="bd87-money">${money(m.residual)}</div><div>${progress(m.percent)}</div><div>${statusPill(status)}</div><div class="bd87-arrow">›</div></div></div><div class="bd87-help"><strong>Livello Commessa.</strong> Valore, fatturato e residuo sono aggregati dalle Righe Offerta confermate.</div>`;
  }
  function renderOfferte(m){
    const o=m.offer,status=m.billed<=.005?'Da fatturare':m.residual<=.005?'Evasa':'Parziale';
    return `${kpis(m)}<div class="bd87-table"><div class="bd87-row head bd87-offer"><div>Offerta</div><div>Descrizione</div><div>Cliente</div><div>CP</div><div>CC</div><div>Importo</div><div>Fatturato</div><div>Residuo</div><div>% evaso</div><div>Stato</div><div></div></div><div class="bd87-row data bd87-offer" data-open-offer><div><strong class="bd87-code">${esc(o.code||'—')}</strong></div><div>${esc(o.title||'—')}</div><div>${esc(o.client||'—')}</div><div>${esc(manager(o,'cp'))}</div><div>${esc(manager(o,'cc'))}</div><div class="bd87-money">${money(m.amount)}</div><div class="bd87-money">${money(m.billed)}</div><div class="bd87-money">${money(m.residual)}</div><div>${progress(m.percent)}</div><div>${statusPill(status)}</div><div class="bd87-arrow">›</div></div></div><div class="bd87-help"><strong>Livello Offerta.</strong> Apri l'offerta per verificare evasione e residuo delle singole Righe Offerta.</div>`;
  }
  function renderLines(m){
    if(!state.selectedLineId||!m.lines.some(x=>x.id===state.selectedLineId))state.selectedLineId=m.lines[0]?.id||'';
    const rows=m.lines.map(x=>`<div class="bd87-row data bd87-lines" data-line-id="${esc(x.id)}"><div>${esc(x.phase||'—')}</div><div><strong>${esc(x.description)}</strong></div><div class="bd87-money">${money(x.amount)}</div><div class="bd87-money">${money(x.billed)}</div><div class="bd87-money">${money(x.residual)}</div><div>${progress(x.percent)}</div><div>${statusPill(x.status)}</div></div>`).join('');
    const selected=m.lines.find(x=>x.id===state.selectedLineId),linked=selected?linkedInvoiceRows(selected):[];
    const invRows=linked.length?linked.map(x=>`<div class="bd87-row bd87-inv"><div><strong>${esc(x.invoiceNo)}</strong></div><div>${esc(x.date)}</div><div>${esc(x.description)}</div><div class="bd87-money">${money(x.lineAmount)}</div><div class="bd87-money">${money(x.attributed)}</div></div>`).join(''):'<div class="bd87-empty">Nessuna Riga Fattura collegata alla Riga Offerta selezionata.</div>';
    return `${kpis(m)}<div class="bd87-workspace"><section class="bd87-pane"><div class="bd87-pane-head"><div><strong>Righe Offerta</strong><span>Importo, fatturato, residuo ed evasione per riga.</span></div><span>${m.lines.length} righe</span></div><div class="bd87-scroll"><div class="bd87-row head bd87-lines"><div>Fase</div><div>Riga Offerta</div><div>Importo</div><div>Fatturato</div><div>Residuo</div><div>% evaso</div><div>Stato</div></div>${rows||'<div class="bd87-empty">Nessuna Riga Offerta.</div>'}</div></section><div class="bd87-split">Righe Fattura collegate ↓</div><section class="bd87-pane"><div class="bd87-pane-head"><div><strong>Righe Fattura collegate</strong><span>${esc(selected?.description||'Seleziona una Riga Offerta')}</span></div><span>${linked.length} collegamenti</span></div><div class="bd87-scroll"><div class="bd87-row head bd87-inv"><div>Fattura</div><div>Data</div><div>Descrizione Riga Fattura</div><div>Importo riga</div><div>Attribuito</div></div>${invRows}</div></section></div>`;
  }
  function render(){
    if(!page||page.hidden)return;
    const m=metrics();
    const body=!m.loaded?'<div class="bd87-empty" style="background:#fff;border:1px dashed #cbd7dc;border-radius:8px">Nessuna offerta confermata con Righe Offerta disponibile.</div>':state.level==='commesse'?renderCommesse(m):state.level==='offerte'?renderOfferte(m):renderLines(m);
    page.innerHTML=`<div class="bd87"><div class="bd87-top"><div class="bd87-title"><strong>Dashboard Fatturazione</strong><span>Commessa → Offerta → Righe Offerta → Righe Fattura collegate.</span></div><div class="bd87-actions"><button type="button" class="bd87-btn primary" data-new-invoice>＋ Nuova fattura</button></div></div><div class="bd87-crumb">${m.loaded?crumb(m):'<strong>Commesse</strong>'}</div>${body}</div>`;
    page.querySelector('[data-open-commessa]')?.addEventListener('click',()=>{state.level='offerte';render();});
    page.querySelector('[data-open-offer]')?.addEventListener('click',()=>{state.level='righe';render();});
    page.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>{state.level=b.dataset.nav;render();}));
    page.querySelectorAll('[data-line-id]').forEach(r=>r.addEventListener('click',()=>{state.selectedLineId=r.dataset.lineId;render();}));
    page.querySelector('[data-new-invoice]')?.addEventListener('click',()=>window.DABSTER_BILLING_ENTRY_V86?.loadWorkspace?.('invoice'));
  }
  function show(){hideOtherPages();if(page)page.hidden=false;setChrome();history.replaceState(null,'','#dashboard-fatturazione');render();}
  function install(attempt=0){
    const nav=document.querySelector('#appSidebar .sidebar-nav'),main=document.querySelector('.page-shell .main-card');
    if(!nav||!main){if(attempt<240)setTimeout(()=>install(attempt+1),40);return;}
    installStyles();
    nav.querySelectorAll('[data-page="billing"]').forEach(x=>x.remove());
    let btn=nav.querySelector('[data-page="billing-dashboard"]');
    if(!btn){btn=document.createElement('button');btn.type='button';btn.className='sidebar-item';btn.dataset.page='billing-dashboard';btn.innerHTML='<span class="side-icon">€</span>Dashboard Fatturazione';const kanban=nav.querySelector('[data-page="kanban"]'),billable=nav.querySelector('[data-page="billable"]');if(kanban)kanban.insertAdjacentElement('afterend',btn);else if(billable)nav.insertBefore(btn,billable);else nav.appendChild(btn);}
    if(btn.dataset.v87!=='1'){btn.dataset.v87='1';btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();show();},true);}
    page=document.getElementById('billingDashboardLiveV87');if(!page){page=document.createElement('section');page.id='billingDashboardLiveV87';page.hidden=true;main.insertAdjacentElement('afterend',page);}
    document.addEventListener('click',e=>{const b=e.target.closest?.('#appSidebar .sidebar-item');if(b&&b.dataset.page!=='billing-dashboard'&&page)page.hidden=true;},true);
    window.addEventListener('dabster-offer-flow-change',()=>{if(page&&!page.hidden)render();});
    window.addEventListener('dabster-billing-trigger-change',()=>{if(page&&!page.hidden)render();});
    document.addEventListener('click',e=>{if(e.target.closest?.('[data-save-invoice]'))setTimeout(()=>{if(page&&!page.hidden)render();},100);},true);
    const guard=new MutationObserver(()=>{const old=nav.querySelector('[data-page="billing"]');if(old)old.remove();});guard.observe(nav,{childList:true,subtree:true});
    if(location.hash==='#dashboard-fatturazione')setTimeout(show,20);
  }
  const api={version:87,show,refresh:render,getMetrics:metrics};window.DABSTER_BILLING_DASHBOARD_V87=api;
  install();
})();