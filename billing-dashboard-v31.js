/* v31 - User-friendly billing dashboard: Commessa -> Offerta -> Righe Offerta -> Fatture collegate. */
(function(){
  const FIXTURE_OFFERS=[
    {code:'26_082pe01',commessa:'26_082',commessaTitle:'RINNOVO CPI BORGO MACHETTO',title:'Rinnovo CPI Borgo Machetto',client:'ID PROGETTI',projectManager:'LEA',commessaManager:'GEA',confirmed:true,lines:[
      {id:'26_082pe01:preliminare',phase:'Progetto preliminare e Pratiche',description:'Analisi preliminare e pratiche VVF',amount:4000},
      {id:'26_082pe01:esecutivo',phase:'Progetto Esecutivo',description:'Elaborati e progetto prevenzione incendi',amount:5000},
      {id:'26_082pe01:dl',phase:'Direzione Lavori',description:'Direzione lavori antincendio',amount:3000}
    ]},
    {code:'26_082pe02',commessa:'26_082',commessaTitle:'RINNOVO CPI BORGO MACHETTO',title:'Integrazione servizi antincendio',client:'ID PROGETTI',projectManager:'LEA',commessaManager:'GEA',confirmed:true,lines:[
      {id:'26_082pe02:vpf',phase:'Valutazione Progetto Antincendio',description:'Valutazione progetto antincendio',amount:6000}
    ]},
    {code:'26_083pe01',commessa:'26_083',commessaTitle:'CONSULENZA ANTINCENDIO GENERALI L. C. VERONA',title:'Consulenza antincendio generali',client:'ARCADE',projectManager:'LUM',commessaManager:'GEA',confirmed:true,lines:[
      {id:'26_083pe01:consulenze',phase:'Consulenze varie',description:'Consulenza antincendio generale',amount:5100}
    ]},
    {code:'26_065pe01',commessa:'26_065',commessaTitle:'PROGETTO MECCANICO ED ELETTRICO ABITAZIONE GRAZIOLI',title:'Progetto impianti abitazione Grazioli',client:'SQUARANTO ASSOCIATI',projectManager:'BAS',commessaManager:'GEA',confirmed:true,lines:[
      {id:'26_065pe01:pfte',phase:'Progetto PFTE',description:'Progettazione impianti meccanici',amount:6000},
      {id:'26_065pe01:esecutivo',phase:'Progetto Esecutivo',description:'Progettazione impianti elettrici',amount:5800}
    ]},
    {code:'26_078pe01',commessa:'26_078',commessaTitle:'AMPLIAMENTO STAZIONE CENTRALE AV BOLOGNA',title:'Ampliamento stazione centrale AV Bologna',client:'NET ENGINEERING S.r.l.',projectManager:'MAG',commessaManager:'GEA',confirmed:true,lines:[
      {id:'26_078pe01:consulenze',phase:'Consulenze varie',description:'Assistenza tecnica impianti',amount:2000}
    ]},
    {code:'26_129pe01',commessa:'26_129',commessaTitle:'RIQUALIFICAZIONE FUNZIONALE CANTINA CAVALCHINA',title:'Riqualificazione funzionale Cantina Cavalchina',client:'PIONA FRANCO',projectManager:'REA',commessaManager:'GEA',confirmed:true,lines:[
      {id:'26_129pe01:preliminare',phase:'Progetto preliminare e Pratiche',description:'Fattibilità energetica',amount:800},
      {id:'26_129pe01:esecutivo',phase:'Progetto Esecutivo',description:'Progetto esecutivo impianti',amount:1200}
    ]}
  ];
  const FIXTURE_INVOICES=[
    {id:'FT-101-2026',number:'FT 101/2026',date:'12/05/2026',status:'Emessa',total:5100,allocations:[
      {offerLineId:'26_083pe01:consulenze',amount:5100}
    ]},
    {id:'FT-114-2026',number:'FT 114/2026',date:'18/06/2026',status:'Emessa',total:8500,allocations:[
      {offerLineId:'26_082pe01:preliminare',amount:4000},
      {offerLineId:'26_082pe01:esecutivo',amount:2500},
      {offerLineId:'26_065pe01:pfte',amount:2000}
    ]},
    {id:'FT-120-2026',number:'FT 120/2026',date:'02/07/2026',status:'Emessa',total:3500,allocations:[
      {offerLineId:'26_082pe01:esecutivo',amount:1500},
      {offerLineId:'26_082pe01:dl',amount:1000},
      {offerLineId:'26_129pe01:esecutivo',amount:1000}
    ]},
    {id:'FT-126-2026',number:'FT 126/2026',date:'28/07/2026',status:'Emessa',total:2200,allocations:[
      {offerLineId:'26_065pe01:pfte',amount:2200}
    ]}
  ];

  const state={level:'commesse',commessaFilter:'',offerCode:'',invoiceId:'',search:'',client:'',pm:'',status:'',residualOnly:true,expanded:new Set(),returnOffer:''};
  let root=null,page=null,installed=false;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const cents=n=>Math.round((Number(n)||0)*100)/100;
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
  const pct=(part,total)=>total>0?Math.min(100,Math.max(0,Math.round(part/total*100))):0;
  const unique=a=>[...new Set(a.filter(Boolean))];

  function fieldValue(label){
    const f=[...document.querySelectorAll('#tab-dati label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)));
    const el=f?.querySelector('input,select,textarea');return el?.value||'';
  }
  function currentStatus(){return norm(fieldValue('Stato'));}
  function liveOffer(){
    if(currentStatus()!=='confermata')return null;
    const source=window.DABSTER_CONFIRMED_OFFER;
    const lines=(source?.lines||window.DABSTER_OFFER_LINES?.lines||[]).map((line,i)=>({
      id:line.id||line.offerLineId||`${fieldValue('Codice')||'offerta'}:live:${i+1}`,
      phase:line.phase||line.category||'Fase',description:line.description||`Riga ${i+1}`,amount:cents(line.amount||line.confirmedAmount||0)
    })).filter(x=>x.amount>0);
    if(!lines.length)return null;
    const commessaRaw=fieldValue('Commessa')||'Commessa corrente';
    const split=commessaRaw.split(' - '),commessa=split.shift()||commessaRaw,commessaTitle=split.join(' - ')||commessaRaw;
    return {code:fieldValue('Codice')||source?.offerCode||'Offerta corrente',commessa,commessaTitle,title:fieldValue('Titolo')||source?.title||'Offerta corrente',client:fieldValue('Cliente')||'Cliente corrente',projectManager:fieldValue('Referente tecnico')||'—',commessaManager:'—',confirmed:true,lines};
  }
  function offers(){
    const rows=FIXTURE_OFFERS.map(o=>({...o,lines:o.lines.map(l=>({...l}))}));
    const live=liveOffer();if(live){const idx=rows.findIndex(x=>x.code===live.code);if(idx>=0)rows[idx]=live;else rows.unshift(live);}return rows.filter(x=>x.confirmed);
  }
  function invoices(){
    const rows=FIXTURE_INVOICES.map(i=>({...i,allocations:i.allocations.map(a=>({...a}))}));
    const live=window.DABSTER_STORE?.getState?.().billing?.invoices||[];
    live.forEach((inv,index)=>{
      if(rows.some(x=>x.id===inv.id))return;
      const allocations=(inv.allocations||[]).map(a=>({offerLineId:a.offerLineId,amount:cents(a.amount)}));
      rows.push({id:inv.id||`LIVE-${index}`,number:inv.number||inv.id||`Fattura ${index+1}`,date:inv.date||'—',status:inv.status||'Emessa',total:cents(inv.total||allocations.reduce((s,a)=>s+a.amount,0)),allocations});
    });
    return rows;
  }
  function lineIndex(){const map=new Map();offers().forEach(o=>o.lines.forEach(line=>map.set(line.id,{offer:o,line})));return map;}
  function billedMap(){const map=new Map();invoices().forEach(inv=>inv.allocations.forEach(a=>map.set(a.offerLineId,cents((map.get(a.offerLineId)||0)+a.amount))));return map;}
  function lineStats(offer,line,billed=billedMap()){
    const amount=cents(line.amount),fact=cents(billed.get(line.id)||0),remaining=Math.max(0,cents(amount-fact));
    return {...line,offerCode:offer.code,amount,billed:fact,remaining,percent:pct(fact,amount),status:statusFor(amount,fact)};
  }
  function offerStats(offer,billed=billedMap()){
    const lines=offer.lines.map(line=>lineStats(offer,line,billed));
    const amount=cents(lines.reduce((s,x)=>s+x.amount,0)),fact=cents(lines.reduce((s,x)=>s+x.billed,0)),remaining=Math.max(0,cents(amount-fact));
    return {...offer,lines,amount,billed:fact,remaining,percent:pct(fact,amount),status:statusFor(amount,fact)};
  }
  function commessaStats(){
    const billed=billedMap(),map=new Map();
    offers().map(o=>offerStats(o,billed)).forEach(o=>{
      if(!map.has(o.commessa))map.set(o.commessa,{commessa:o.commessa,title:o.commessaTitle,client:o.client,projectManagers:[],commessaManagers:[],offers:[],amount:0,billed:0});
      const x=map.get(o.commessa);x.offers.push(o);x.projectManagers.push(o.projectManager);x.commessaManagers.push(o.commessaManager);x.amount+=o.amount;x.billed+=o.billed;
    });
    return [...map.values()].map(x=>({...x,projectManager:unique(x.projectManagers).join(', ')||'—',commessaManager:unique(x.commessaManagers).join(', ')||'—',amount:cents(x.amount),billed:cents(x.billed),remaining:Math.max(0,cents(x.amount-x.billed)),percent:pct(x.billed,x.amount),status:statusFor(x.amount,x.billed)}));
  }
  function statusFor(total,billed){if(total<=0||billed<=0)return 'Da fatturare';if(billed>=total-.01)return 'Fatturata';return 'Parzialmente fatturata';}
  function statusClass(value){return value==='Fatturata'?'done':value==='Parzialmente fatturata'?'partial':'todo';}
  function progress(value){return `<div class="bd-progress"><span>${value}%</span><div><i style="width:${value}%"></i></div></div>`;}

  function installStyles(){
    if(document.getElementById('billingDashboardStyles'))return;
    const s=document.createElement('style');s.id='billingDashboardStyles';s.textContent=`
      #billingDashboardPage{display:block;margin-top:0}.bd-shell{background:#fff;border:1px solid #dfe5e8;border-radius:9px;box-shadow:0 2px 7px rgba(34,50,60,.05);overflow:hidden}.bd-head{padding:14px 15px 10px;border-bottom:1px solid #edf0f2;background:linear-gradient(180deg,#fff,#fbfcfd)}.bd-head-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.bd-title{display:flex;flex-direction:column;gap:3px}.bd-title strong{font-size:16px;color:#293b46}.bd-title span{font-size:9px;color:#78858d}.bd-demo-chip{padding:4px 7px;border:1px solid #f1d7c7;border-radius:999px;background:#fff6ef;color:#b35c28;font-size:8px;font-weight:750;white-space:nowrap}.bd-levels{display:flex;gap:5px;margin-top:11px}.bd-level{height:31px;padding:0 13px;border:1px solid #d5dde1;border-radius:6px;background:#fff;color:#596973;font-size:9px;font-weight:750;cursor:pointer}.bd-level.active{border-color:#ee7430;background:#f8732d;color:#fff;box-shadow:0 1px 3px rgba(238,116,48,.18)}.bd-context{display:inline-flex;align-items:center;gap:5px;margin-left:3px;padding:4px 7px;border-radius:999px;background:#f1f4f6;color:#536772;font-size:8px;font-weight:700}.bd-context button{border:0;background:transparent;color:#8b5c49;cursor:pointer;padding:0}
      .bd-controls{display:grid;grid-template-columns:minmax(210px,1.2fr) 145px 145px 150px auto;gap:7px;align-items:end;padding:9px 15px;border-bottom:1px solid #e8edef;background:#fafbfc}.bd-field{display:flex;flex-direction:column;gap:3px;min-width:0}.bd-field span{font-size:7.5px;text-transform:uppercase;font-weight:750;color:#7a8790}.bd-field input,.bd-field select{height:29px;border:1px solid #d9e0e4;border-radius:5px;background:#fff;padding:0 8px;font-size:9.2px;color:#344853;outline:none}.bd-field input:focus,.bd-field select:focus{border-color:#9fb8c3;box-shadow:0 0 0 2px rgba(112,154,171,.1)}.bd-residual{height:29px;display:inline-flex;align-items:center;gap:6px;padding:0 9px;border:1px solid #d9e0e4;border-radius:5px;background:#fff;color:#40545f;font-size:8.7px;font-weight:700;white-space:nowrap;cursor:pointer}.bd-residual input{accent-color:#ef742f}.bd-body{padding:0 15px 13px}.bd-table-wrap{overflow:auto;border:1px solid #dce3e6;border-radius:7px;margin-top:11px;background:#fff}.bd-table{min-width:970px}.bd-row{display:grid;grid-template-columns:105px minmax(205px,1.45fr) minmax(130px,.85fr) 95px 100px 112px 112px 120px 130px;min-height:40px;border-bottom:1px solid #e7ebed}.bd-row:last-child{border-bottom:0}.bd-row>div{display:flex;align-items:center;min-width:0;padding:6px 8px;border-right:1px solid #edf0f2;font-size:8.8px;color:#354852}.bd-row>div:last-child{border-right:0}.bd-row.head{position:sticky;top:0;z-index:2;min-height:31px;background:#f1f3f5}.bd-row.head>div{font-size:7.5px;font-weight:800;color:#5f6e77;text-transform:uppercase}.bd-link{border:0;background:none;padding:0;color:#e56829;font:inherit;font-weight:800;text-align:left;cursor:pointer}.bd-link:hover{text-decoration:underline}.bd-primary{font-weight:700;color:#324854}.bd-muted{font-size:7.7px;color:#77858d}.bd-money{justify-content:flex-end;font-variant-numeric:tabular-nums;white-space:nowrap}.bd-status{font-size:8px;font-weight:780;line-height:1.25}.bd-status.done{color:#2d7a45}.bd-status.partial{color:#e56727}.bd-status.todo{color:#be3b43}.bd-progress{width:100%;display:flex;flex-direction:column;gap:3px}.bd-progress>span{font-size:8px;font-weight:700}.bd-progress>div{height:4px;background:#e6eaec;border-radius:999px;overflow:hidden}.bd-progress i{display:block;height:100%;background:#ef702d;border-radius:inherit}.bd-table-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 2px 0;color:#66757e;font-size:8.5px}.bd-totals{display:flex;gap:14px;flex-wrap:wrap}.bd-totals strong{color:#324954}.bd-empty{padding:28px;text-align:center;color:#7e8a91;font-size:9px}.bd-back{height:28px;padding:0 9px;border:1px solid #d7dfe3;border-radius:5px;background:#fff;color:#52656f;font-size:8.8px;font-weight:700;cursor:pointer}
      .bd-summary{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:7px;padding:11px 15px 0}.bd-kpi{min-height:55px;padding:8px 9px;border:1px solid #dde4e7;border-radius:7px;background:#fff;display:flex;flex-direction:column;justify-content:center;gap:3px}.bd-kpi span{font-size:7.4px;text-transform:uppercase;color:#79868e;font-weight:750}.bd-kpi strong{font-size:12px;color:#304550;font-variant-numeric:tabular-nums}.bd-kpi.status strong{font-size:10px}.bd-detail-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 15px 0}.bd-detail-title{display:flex;flex-direction:column;gap:2px}.bd-detail-title strong{font-size:12px;color:#304550}.bd-detail-title span{font-size:8.4px;color:#77858d}.bd-lines{margin:10px 15px 0;border:1px solid #dce3e6;border-radius:7px;overflow:hidden}.bd-line{display:grid;grid-template-columns:31px 155px minmax(230px,1.3fr) 105px 105px 105px 115px 120px;min-height:38px;border-bottom:1px solid #e7ebed}.bd-line:last-child{border-bottom:0}.bd-line>div{display:flex;align-items:center;min-width:0;padding:5px 7px;border-right:1px solid #edf0f2;font-size:8.7px;color:#354852}.bd-line>div:last-child{border-right:0}.bd-line.head{min-height:30px;background:#f1f3f5}.bd-line.head>div{font-size:7.4px;text-transform:uppercase;font-weight:800;color:#5f6e77}.bd-expand{width:20px;height:20px;border:1px solid #d7dfe3;border-radius:4px;background:#fff;color:#55707d;cursor:pointer}.bd-allocation-box{grid-column:1/-1;padding:7px 9px 9px!important;display:block!important;background:#fafcfd;border-right:0!important}.bd-alloc-list{border:1px solid #e1e6e9;border-radius:6px;overflow:hidden;background:#fff}.bd-alloc{display:grid;grid-template-columns:130px 90px 130px minmax(140px,1fr);min-height:30px;border-bottom:1px solid #edf0f2}.bd-alloc:last-child{border-bottom:0}.bd-alloc>div{display:flex;align-items:center;padding:4px 7px;font-size:8.2px;border-right:1px solid #edf0f2}.bd-alloc>div:last-child{border-right:0}.bd-alloc strong{font-variant-numeric:tabular-nums}.bd-invoices{margin:12px 15px 15px}.bd-section-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}.bd-section-title strong{font-size:10.5px;color:#344954}.bd-section-title span{font-size:8px;color:#7a8790}.bd-invoice-table{border:1px solid #dce3e6;border-radius:7px;overflow:hidden}.bd-invoice-row{display:grid;grid-template-columns:130px 90px 125px 145px 1fr 90px;min-height:34px;border-bottom:1px solid #e7ebed}.bd-invoice-row:last-child{border-bottom:0}.bd-invoice-row>div{display:flex;align-items:center;padding:5px 7px;border-right:1px solid #edf0f2;font-size:8.5px;color:#354852;min-width:0}.bd-invoice-row>div:last-child{border-right:0}.bd-invoice-row.head{min-height:29px;background:#f1f3f5}.bd-invoice-row.head>div{font-size:7.3px;text-transform:uppercase;font-weight:800;color:#5f6e77}.bd-invoice-detail{margin:11px 15px 15px;border:1px solid #dce3e6;border-radius:7px;overflow:hidden}.bd-invoice-alloc-row{display:grid;grid-template-columns:105px 120px 155px minmax(220px,1fr) 130px;min-height:36px;border-bottom:1px solid #e7ebed}.bd-invoice-alloc-row:last-child{border-bottom:0}.bd-invoice-alloc-row>div{display:flex;align-items:center;padding:5px 7px;border-right:1px solid #edf0f2;font-size:8.5px;color:#354852}.bd-invoice-alloc-row>div:last-child{border-right:0}.bd-invoice-alloc-row.head{min-height:29px;background:#f1f3f5}.bd-invoice-alloc-row.head>div{font-size:7.3px;text-transform:uppercase;font-weight:800;color:#5f6e77}.bd-source-note{padding:0 15px 12px;color:#89949a;font-size:7.6px}
      @media(max-width:1050px){.bd-controls{grid-template-columns:1fr 1fr 1fr}.bd-residual{justify-self:start}.bd-summary{grid-template-columns:repeat(3,minmax(120px,1fr))}}@media(max-width:720px){.bd-head-top{flex-direction:column}.bd-controls{grid-template-columns:1fr}.bd-summary{grid-template-columns:repeat(2,minmax(120px,1fr))}.bd-body{padding-left:8px;padding-right:8px}.bd-lines,.bd-invoices,.bd-invoice-detail{margin-left:8px;margin-right:8px}}
    `;document.head.appendChild(s);
  }

  function installPage(){
    const shell=document.querySelector('.page-shell'),main=shell?.querySelector('.main-card');if(!shell||!main)return false;
    page=document.createElement('section');page.id='billingDashboardPage';page.hidden=true;main.insertAdjacentElement('afterend',page);return true;
  }
  function installSidebar(){
    const nav=document.querySelector('#appSidebar .sidebar-nav');if(!nav)return false;
    if(!nav.querySelector('[data-page="billing"]')){
      const btn=document.createElement('button');btn.type='button';btn.className='sidebar-item';btn.dataset.page='billing';btn.innerHTML='<span class="side-icon">€</span>Dashboard Fatturazione';nav.appendChild(btn);
      btn.addEventListener('click',()=>showBilling('commesse'));
    }
    document.addEventListener('click',e=>{const btn=e.target.closest?.('.sidebar-item[data-page]');if(btn&&btn.dataset.page!=='billing'&&page)page.hidden=true;},true);
    return true;
  }
  function hideOtherPages(){const main=document.querySelector('.main-card'),kanban=document.getElementById('kanbanPage');if(main)main.style.display='none';if(kanban)kanban.hidden=true;}
  function showBilling(level=state.level){
    state.level=level;hideOtherPages();if(page)page.hidden=false;
    document.querySelectorAll('.sidebar-item').forEach(x=>x.classList.toggle('active',x.dataset.page==='billing'));
    const title=document.querySelector('.page-title');if(title)title.textContent='Dashboard Fatturazione';
    render();document.getElementById('appSidebar')?.classList.remove('open');document.getElementById('appSidebarOverlay')?.classList.remove('open');history.replaceState(null,'','#dashboard-fatturazione');
  }

  function filterHeader(rows){
    const clients=unique(rows.map(x=>x.client)).sort(),pms=unique(rows.map(x=>x.projectManager).flatMap(x=>String(x||'').split(', '))).sort();
    return `<div class="bd-controls">
      <label class="bd-field"><span>Cerca</span><input id="bdSearch" value="${esc(state.search)}" placeholder="Codice, titolo, cliente…"></label>
      <label class="bd-field"><span>Cliente</span><select id="bdClient"><option value="">Tutti</option>${clients.map(x=>`<option ${state.client===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
      <label class="bd-field"><span>Capo progetto</span><select id="bdPm"><option value="">Tutti</option>${pms.map(x=>`<option ${state.pm===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
      <label class="bd-field"><span>Stato</span><select id="bdStatus"><option value="">Tutti</option>${['Da fatturare','Parzialmente fatturata','Fatturata'].map(x=>`<option ${state.status===x?'selected':''}>${x}</option>`).join('')}</select></label>
      <label class="bd-residual"><input id="bdResidual" type="checkbox" ${state.residualOnly?'checked':''}> Mostra solo residuo &gt; 0</label>
    </div>`;
  }
  function bindFilters(){
    const search=page.querySelector('#bdSearch'),client=page.querySelector('#bdClient'),pm=page.querySelector('#bdPm'),status=page.querySelector('#bdStatus'),res=page.querySelector('#bdResidual');
    search?.addEventListener('input',()=>{state.search=search.value;renderBodyOnly();});client?.addEventListener('change',()=>{state.client=client.value;render();});pm?.addEventListener('change',()=>{state.pm=pm.value;render();});status?.addEventListener('change',()=>{state.status=status.value;render();});res?.addEventListener('change',()=>{state.residualOnly=res.checked;render();});
  }
  function passFilters(x){
    if(state.residualOnly&&x.remaining<=.01)return false;if(state.client&&x.client!==state.client)return false;if(state.pm&&!String(x.projectManager||'').split(', ').includes(state.pm))return false;if(state.status&&x.status!==state.status)return false;
    const hay=norm([x.commessa,x.code,x.title,x.commessaTitle,x.client,x.projectManager,x.commessaManager].join(' '));return !state.search||hay.includes(norm(state.search));
  }
  function header(level,context=''){
    return `<div class="bd-head"><div class="bd-head-top"><div class="bd-title"><strong>${level==='detail'?'Dettaglio fatturazione offerta':level==='invoice'?'Dettaglio fattura':'Dashboard Fatturazione'}</strong><span>Valori derivati dalle allocazioni delle fatture sulle righe offerta confermate.</span></div><span class="bd-demo-chip">Simulazione dati fatturazione</span></div>${level==='commesse'||level==='offerte'?`<div class="bd-levels"><button class="bd-level ${level==='commesse'?'active':''}" data-level="commesse">▤ Commesse</button><button class="bd-level ${level==='offerte'?'active':''}" data-level="offerte">▱ Offerte</button>${context||''}</div>`:''}</div>`;
  }

  function filteredCommesse(){return commessaStats().filter(passFilters);}
  function filteredOffers(){let rows=offers().map(o=>offerStats(o));if(state.commessaFilter)rows=rows.filter(x=>x.commessa===state.commessaFilter);return rows.filter(passFilters);}
  function totalFoot(rows){const amount=cents(rows.reduce((s,x)=>s+x.amount,0)),billed=cents(rows.reduce((s,x)=>s+x.billed,0)),remaining=cents(rows.reduce((s,x)=>s+x.remaining,0));return `<div class="bd-table-foot"><span>${rows.length} risultato/i</span><div class="bd-totals"><span>Confermato <strong>${money(amount)}</strong></span><span>Fatturato <strong>${money(billed)}</strong></span><span>Residuo <strong>${money(remaining)}</strong></span></div></div>`;}
  function renderCommesse(){
    const all=commessaStats(),rows=filteredCommesse();
    page.innerHTML=`<div class="bd-shell">${header('commesse')}${filterHeader(all)}<div class="bd-body"><div class="bd-table-wrap"><div class="bd-table"><div class="bd-row head"><div>Cod. commessa</div><div>Commessa</div><div>Cliente</div><div>Capo progetto</div><div>Capo commessa</div><div>Valore confermato</div><div>Fatturato</div><div>Residuo</div><div>% / Stato</div></div><div id="bdRows">${commessaRows(rows)}</div></div></div>${totalFoot(rows)}</div><div class="bd-source-note">Nel prototipo sono presenti dati dimostrativi; le offerte reali confermate della sessione vengono aggiunte automaticamente quando disponibili.</div></div>`;
    bindFilters();bindCommon();
  }
  function commessaRows(rows){return rows.length?rows.map(x=>`<div class="bd-row"><div><button class="bd-link" data-commessa="${esc(x.commessa)}">${esc(x.commessa)}</button></div><div><div><div class="bd-primary">${esc(x.title)}</div><div class="bd-muted">${x.offers.length} offerta/e confermata/e</div></div></div><div>${esc(x.client)}</div><div>${esc(x.projectManager)}</div><div>${esc(x.commessaManager)}</div><div class="bd-money">${money(x.amount)}</div><div class="bd-money">${money(x.billed)}</div><div class="bd-money">${money(x.remaining)}</div><div><div style="width:100%">${progress(x.percent)}<span class="bd-status ${statusClass(x.status)}">${x.status}</span></div></div></div>`).join(''):'<div class="bd-empty">Nessuna commessa corrisponde ai filtri selezionati.</div>';}
  function renderOffers(){
    const all=offers().map(o=>offerStats(o)),rows=filteredOffers();
    const ctx=state.commessaFilter?`<span class="bd-context">Commessa ${esc(state.commessaFilter)} <button id="bdClearCommessa" title="Rimuovi filtro">×</button></span>`:'';
    page.innerHTML=`<div class="bd-shell">${header('offerte',ctx)}${filterHeader(all)}<div class="bd-body"><div class="bd-table-wrap"><div class="bd-table"><div class="bd-row head"><div>Cod. offerta</div><div>Offerta</div><div>Cliente</div><div>Capo progetto</div><div>Capo commessa</div><div>Valore confermato</div><div>Fatturato</div><div>Residuo</div><div>% / Stato</div></div><div id="bdRows">${offerRows(rows)}</div></div></div>${totalFoot(rows)}</div><div class="bd-source-note">Sono incluse esclusivamente offerte in stato Confermata.</div></div>`;
    bindFilters();bindCommon();page.querySelector('#bdClearCommessa')?.addEventListener('click',()=>{state.commessaFilter='';render();});
  }
  function offerRows(rows){return rows.length?rows.map(x=>`<div class="bd-row"><div><button class="bd-link" data-offer="${esc(x.code)}">${esc(x.code)}</button></div><div><div><div class="bd-primary">${esc(x.title)}</div><div class="bd-muted">${esc(x.commessa)} · ${x.lines.length} riga/e</div></div></div><div>${esc(x.client)}</div><div>${esc(x.projectManager)}</div><div>${esc(x.commessaManager)}</div><div class="bd-money">${money(x.amount)}</div><div class="bd-money">${money(x.billed)}</div><div class="bd-money">${money(x.remaining)}</div><div><div style="width:100%">${progress(x.percent)}<span class="bd-status ${statusClass(x.status)}">${x.status}</span></div></div></div>`).join(''):'<div class="bd-empty">Nessuna offerta confermata corrisponde ai filtri selezionati.</div>';}

  function renderBodyOnly(){
    if(state.level==='commesse'){const box=page.querySelector('#bdRows'),rows=filteredCommesse();if(box)box.innerHTML=commessaRows(rows);}
    else if(state.level==='offerte'){const box=page.querySelector('#bdRows'),rows=filteredOffers();if(box)box.innerHTML=offerRows(rows);}bindRowLinks();
  }
  function bindCommon(){page.querySelectorAll('[data-level]').forEach(btn=>btn.addEventListener('click',()=>{state.level=btn.dataset.level;if(state.level==='commesse')state.commessaFilter='';state.search='';state.client='';state.pm='';state.status='';render();}));bindRowLinks();}
  function bindRowLinks(){
    page.querySelectorAll('[data-commessa]').forEach(btn=>btn.addEventListener('click',()=>{state.commessaFilter=btn.dataset.commessa;state.level='offerte';state.search='';state.client='';state.pm='';state.status='';render();}));
    page.querySelectorAll('[data-offer]').forEach(btn=>btn.addEventListener('click',()=>{state.offerCode=btn.dataset.offer;state.returnOffer=btn.dataset.offer;state.level='detail';state.expanded.clear();render();}));
  }

  function offerInvoiceRows(offer){
    const ids=new Set(offer.lines.map(x=>x.id));return invoices().map(inv=>{const allocations=inv.allocations.filter(a=>ids.has(a.offerLineId));return {...inv,offerAllocated:cents(allocations.reduce((s,a)=>s+a.amount,0)),offerAllocations:allocations};}).filter(x=>x.offerAllocated>0);
  }
  function allocationsForLine(lineId){return invoices().map(inv=>{const amount=cents(inv.allocations.filter(a=>a.offerLineId===lineId).reduce((s,a)=>s+a.amount,0));return {...inv,allocated:amount};}).filter(x=>x.allocated>0);}
  function renderDetail(){
    const offer=offers().find(x=>x.code===state.offerCode);if(!offer){state.level='offerte';render();return;}const stats=offerStats(offer),lines=stats.lines.filter(x=>!state.residualOnly||x.remaining>.01).filter(x=>!state.search||norm(`${x.phase} ${x.description}`).includes(norm(state.search))).filter(x=>!state.status||x.status===state.status),invs=offerInvoiceRows(offer);
    page.innerHTML=`<div class="bd-shell">${header('detail')}<div class="bd-detail-head"><button class="bd-back" id="bdBackOffers">‹ Torna alle offerte</button><div class="bd-detail-title"><strong>${esc(stats.code)} · ${esc(stats.title)}</strong><span>${esc(stats.commessa)} · ${esc(stats.client)}</span></div></div><div class="bd-summary"><div class="bd-kpi"><span>Valore confermato</span><strong>${money(stats.amount)}</strong></div><div class="bd-kpi"><span>Fatturato</span><strong>${money(stats.billed)}</strong></div><div class="bd-kpi"><span>Residuo</span><strong>${money(stats.remaining)}</strong></div><div class="bd-kpi"><span>% fatturato</span><strong>${stats.percent}%</strong></div><div class="bd-kpi status"><span>Stato</span><strong class="bd-status ${statusClass(stats.status)}">${stats.status}</strong></div></div><div class="bd-controls"><label class="bd-field"><span>Cerca nelle righe</span><input id="bdSearch" value="${esc(state.search)}" placeholder="Fase o descrizione…"></label><label class="bd-field"><span>Stato riga</span><select id="bdStatus"><option value="">Tutti</option>${['Da fatturare','Parzialmente fatturata','Fatturata'].map(x=>`<option ${state.status===x?'selected':''}>${x}</option>`).join('')}</select></label><label class="bd-residual"><input id="bdResidual" type="checkbox" ${state.residualOnly?'checked':''}> Mostra solo residuo &gt; 0</label></div><div class="bd-section-title" style="padding:10px 15px 0"><strong>Righe Offerta</strong><span>Clicca ▾ per vedere le fatture che hanno movimentato la riga.</span></div><div class="bd-lines"><div class="bd-line head"><div></div><div>Fase</div><div>Descrizione</div><div>Importo riga</div><div>Fatturato</div><div>Residuo</div><div>% fatturato</div><div>Stato</div></div><div id="bdLineRows">${detailLineRows(lines)}</div></div><div class="bd-invoices"><div class="bd-section-title"><strong>Fatture collegate all'offerta</strong><span>${invs.length} fattura/e</span></div><div class="bd-invoice-table"><div class="bd-invoice-row head"><div>Fattura</div><div>Data</div><div>Totale fattura</div><div>Allocato a offerta</div><div>Righe interessate</div><div>Stato</div></div>${invs.length?invs.map(inv=>`<div class="bd-invoice-row"><div><button class="bd-link" data-invoice="${esc(inv.id)}">${esc(inv.number)}</button></div><div>${esc(inv.date)}</div><div class="bd-money">${money(inv.total)}</div><div class="bd-money">${money(inv.offerAllocated)}</div><div>${inv.offerAllocations.length} riga/e</div><div>${esc(inv.status)}</div></div>`).join(''):'<div class="bd-empty">Nessuna fattura collegata.</div>'}</div></div><div class="bd-source-note">Il fatturato dell'offerta è la somma degli importi allocati alle sue righe, anche quando una fattura comprende offerte di commesse diverse.</div></div>`;
    page.querySelector('#bdBackOffers')?.addEventListener('click',()=>{state.level='offerte';state.search='';state.status='';render();});
    const search=page.querySelector('#bdSearch'),status=page.querySelector('#bdStatus'),res=page.querySelector('#bdResidual');search?.addEventListener('input',()=>{state.search=search.value;renderDetailLinesOnly();});status?.addEventListener('change',()=>{state.status=status.value;render();});res?.addEventListener('change',()=>{state.residualOnly=res.checked;render();});bindDetailLinks();
  }
  function detailLineRows(lines){return lines.length?lines.map(x=>{
    const allocs=allocationsForLine(x.id),open=state.expanded.has(x.id);return `<div class="bd-line"><div><button class="bd-expand" data-expand="${esc(x.id)}" title="Fatture collegate">${open?'▴':'▾'}</button></div><div>${esc(x.phase)}</div><div><div><div class="bd-primary">${esc(x.description)}</div><div class="bd-muted">${allocs.length} fattura/e collegata/e</div></div></div><div class="bd-money">${money(x.amount)}</div><div class="bd-money">${money(x.billed)}</div><div class="bd-money">${money(x.remaining)}</div><div>${progress(x.percent)}</div><div><span class="bd-status ${statusClass(x.status)}">${x.status}</span></div>${open?`<div class="bd-allocation-box"><div class="bd-alloc-list">${allocs.length?allocs.map(inv=>`<div class="bd-alloc"><div><button class="bd-link" data-invoice="${esc(inv.id)}">${esc(inv.number)}</button></div><div>${esc(inv.date)}</div><div><span class="bd-muted">Allocato a questa riga</span>&nbsp;<strong>${money(inv.allocated)}</strong></div><div><span class="bd-muted">Totale fattura</span>&nbsp;${money(inv.total)}</div></div>`).join(''):'<div class="bd-empty">Nessuna fattura ancora allocata a questa riga.</div>'}</div></div>`:''}</div>`;
  }).join(''):'<div class="bd-empty">Nessuna riga offerta corrisponde ai filtri selezionati.</div>';}
  function renderDetailLinesOnly(){const offer=offers().find(x=>x.code===state.offerCode);if(!offer)return;const rows=offerStats(offer).lines.filter(x=>!state.residualOnly||x.remaining>.01).filter(x=>!state.search||norm(`${x.phase} ${x.description}`).includes(norm(state.search))).filter(x=>!state.status||x.status===state.status);const box=page.querySelector('#bdLineRows');if(box)box.innerHTML=detailLineRows(rows);bindDetailLinks();}
  function bindDetailLinks(){
    page.querySelectorAll('[data-expand]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.expand;if(state.expanded.has(id))state.expanded.delete(id);else state.expanded.add(id);renderDetailLinesOnly();}));
    page.querySelectorAll('[data-invoice]').forEach(btn=>btn.addEventListener('click',()=>{state.invoiceId=btn.dataset.invoice;state.returnOffer=state.offerCode;state.level='invoice';render();}));
  }

  function renderInvoice(){
    const inv=invoices().find(x=>x.id===state.invoiceId);if(!inv){state.level='detail';render();return;}const idx=lineIndex(),allocs=inv.allocations.map(a=>{const hit=idx.get(a.offerLineId);return hit?{...a,offer:hit.offer,line:hit.line}:null;}).filter(Boolean),allocated=cents(allocs.reduce((s,a)=>s+a.amount,0)),comms=unique(allocs.map(x=>x.offer.commessa)),offs=unique(allocs.map(x=>x.offer.code));
    page.innerHTML=`<div class="bd-shell">${header('invoice')}<div class="bd-detail-head"><button class="bd-back" id="bdBackInvoice">‹ Torna all'offerta</button><div class="bd-detail-title"><strong>${esc(inv.number)}</strong><span>${esc(inv.date)} · ${esc(inv.status)}</span></div></div><div class="bd-summary"><div class="bd-kpi"><span>Totale fattura</span><strong>${money(inv.total)}</strong></div><div class="bd-kpi"><span>Totale allocato</span><strong>${money(allocated)}</strong></div><div class="bd-kpi"><span>Commesse coinvolte</span><strong>${comms.length}</strong></div><div class="bd-kpi"><span>Offerte coinvolte</span><strong>${offs.length}</strong></div><div class="bd-kpi status"><span>Stato</span><strong>${esc(inv.status)}</strong></div></div><div class="bd-section-title" style="padding:12px 15px 0"><strong>Allocazioni della fattura</strong><span>Ogni importo è attribuito a una specifica riga offerta.</span></div><div class="bd-invoice-detail"><div class="bd-invoice-alloc-row head"><div>Commessa</div><div>Offerta</div><div>Fase</div><div>Riga offerta</div><div>Importo allocato</div></div>${allocs.map(a=>`<div class="bd-invoice-alloc-row"><div>${esc(a.offer.commessa)}</div><div><button class="bd-link" data-offer="${esc(a.offer.code)}">${esc(a.offer.code)}</button></div><div>${esc(a.line.phase)}</div><div>${esc(a.line.description)}</div><div class="bd-money"><strong>${money(a.amount)}</strong></div></div>`).join('')}</div><div class="bd-source-note">Una stessa fattura può allocare importi su offerte appartenenti anche a commesse diverse. La dashboard aggrega sempre partendo da queste allocazioni.</div></div>`;
    page.querySelector('#bdBackInvoice')?.addEventListener('click',()=>{state.offerCode=state.returnOffer;state.level='detail';render();});page.querySelectorAll('[data-offer]').forEach(btn=>btn.addEventListener('click',()=>{state.offerCode=btn.dataset.offer;state.returnOffer=btn.dataset.offer;state.level='detail';state.expanded.clear();render();}));
  }

  function breadcrumb(){
    const b=document.querySelector('.breadcrumb');if(!b)return;
    if(state.level==='commesse')b.innerHTML='<span>⌂</span><span>›</span><strong>Dashboard Fatturazione</strong><span>›</span><span>Commesse</span>';
    else if(state.level==='offerte')b.innerHTML=`<span>⌂</span><span>›</span><span>Dashboard Fatturazione</span><span>›</span><strong>Offerte${state.commessaFilter?' · '+esc(state.commessaFilter):''}</strong>`;
    else if(state.level==='detail')b.innerHTML=`<span>⌂</span><span>›</span><span>Dashboard Fatturazione</span><span>›</span><span>${esc(state.commessaFilter||offers().find(x=>x.code===state.offerCode)?.commessa||'Offerte')}</span><span>›</span><strong>${esc(state.offerCode)}</strong>`;
    else b.innerHTML=`<span>⌂</span><span>›</span><span>Dashboard Fatturazione</span><span>›</span><strong>${esc(invoices().find(x=>x.id===state.invoiceId)?.number||'Fattura')}</strong>`;
  }
  function render(){if(!page)return;breadcrumb();if(state.level==='commesse')renderCommesse();else if(state.level==='offerte')renderOffers();else if(state.level==='detail')renderDetail();else renderInvoice();}

  function install(attempt=0){
    if(installed)return;root=document.querySelector('.page-shell');const sidebar=document.getElementById('appSidebar');if(!root||!sidebar){if(attempt<220)setTimeout(()=>install(attempt+1),50);return;}
    installStyles();if(!installPage()||!installSidebar())return;installed=true;
    window.addEventListener('dabster-clean-ready',()=>{if(!page.hidden)render();});document.addEventListener('change',e=>{if(e.target?.closest?.('#tab-dati')&&!page.hidden)setTimeout(render,60);},true);
    if(location.hash==='#dashboard-fatturazione')showBilling('commesse');
    window.DABSTER_BILLING_DASHBOARD={show:showBilling,render,getState:()=>({...state,expanded:[...state.expanded]})};
  }
  install();
})();
