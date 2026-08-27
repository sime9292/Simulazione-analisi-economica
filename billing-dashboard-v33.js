/* v33 - Dashboard Fatturazione Versione B: Offerte sopra, Righe Offerta + Righe Fattura sotto. */
(function(){
  const OFFERS=[
    {id:'23_68:pe01:uffici',code:'pe01',commessa:'23_68',title:'Ampliamento e ristrutturazione di mq 850 per uffici, spogliatoi e servizi al personale',client:'CLIENTE TEST 23_68',projectManager:'CP',commessaManager:'RC',lines:[
      {id:'23_68:pe01:uffici:1',number:1,phase:'Fase 1',description:'Progettazione Preliminare per PDC',amount:7000},
      {id:'23_68:pe01:uffici:2',number:2,phase:'Fase 2',description:'Progettazione Esecutiva',amount:11500},
      {id:'23_68:pe01:uffici:3',number:3,phase:'Fase 3',description:'Direzione Lavori',amount:8000}
    ]},
    {id:'23_68:pe01:capannone',code:'pe01',commessa:'23_68',title:'Ampliamento con capannone a destinazione logistica per circa 3.000 mq',client:'CLIENTE TEST 23_68',projectManager:'CP',commessaManager:'RC',lines:[
      {id:'23_68:pe01:capannone:1',number:1,phase:'Fase 1',description:'Progettazione Preliminare per PDC',amount:3500},
      {id:'23_68:pe01:capannone:2',number:2,phase:'Fase 2',description:'Progettazione Esecutiva',amount:8000},
      {id:'23_68:pe01:capannone:3',number:3,phase:'Fase 3',description:'Direzione Lavori',amount:6000}
    ]},
    {id:'23_68:pe01:vvf',code:'pe01',commessa:'23_68',title:'Consulenza di prevenzione incendi per i due interventi e per la struttura esistente',client:'CLIENTE TEST 23_68',projectManager:'CP',commessaManager:'RC',lines:[
      {id:'23_68:pe01:vvf:1',number:1,phase:'Prevenzione incendi',description:'Parere preventivo al Comando VVF',amount:6000},
      {id:'23_68:pe01:vvf:2',number:2,phase:'Prevenzione incendi',description:'SCIA ed ottenimento del CPI finale',amount:8000}
    ]},
    {id:'23_68:pe03',code:'pe03',commessa:'23_68',title:'Progettazioni esecutive e modifiche impianti',client:'CLIENTE TEST 23_68',projectManager:'CP',commessaManager:'RC',lines:[
      {id:'23_68:pe03:1',number:1,phase:'Progetto Esecutivo',description:'Progettazione esecutiva impianti elettrici e di illuminazione',amount:1500},
      {id:'23_68:pe03:2',number:2,phase:'Progetto Esecutivo',description:'Progetto esecutivo spostamento caldaie zona produzione',amount:2200},
      {id:'23_68:pe03:3',number:3,phase:'Progetto Esecutivo',description:'Progetto di invarianza idraulica + assistenza alla D.L.',amount:7000},
      {id:'23_68:pe03:4',number:4,phase:'Progetto Esecutivo',description:'Progetto esecutivo capannone con modifica impianti',amount:3000},
      {id:'23_68:pe03:5',number:5,phase:'Progetto Esecutivo',description:'Progetto esecutivo destratificatori capannone produzione',amount:1500},
      {id:'23_68:pe03:6',number:6,phase:'Pratiche',description:'Richiesta PDC uffici passati da circa 850 mq a circa 1.200 mq',amount:10000},
      {id:'23_68:pe03:7',number:7,phase:'Progetto Esecutivo',description:'Progetto esecutivo uffici versione finale (28/11/2025)',amount:17000},
      {id:'23_68:pe03:8',number:8,phase:'Progetto Esecutivo',description:'Progetto esecutivo rilevazione fumi generale',amount:6700},
      {id:'23_68:pe03:9',number:9,phase:'Progetto Esecutivo',description:'Verifica e progettazione quadro elettrico compressori',amount:1500},
      {id:'23_68:pe03:10',number:10,phase:'Direzione Lavori',description:'Adeguamento Direzione Lavori',amount:4400},
      {id:'23_68:pe03:11',number:11,phase:'Prevenzione incendi',description:'Nuova VP di allineamento VVF',amount:6000}
    ]}
  ];

  const INVOICES=[
    {id:'523E',number:'523/E',date:'30/11/2023',status:'Emessa',lines:[
      {id:'523E:1',description:'Fase 1 - Progettazione Preliminare per PDC - ampliamento uffici',amount:7000,allocations:[{offerLineId:'23_68:pe01:uffici:1',amount:7000}]},
      {id:'523E:2',description:'Fase 2 - Progettazione Esecutiva - ampliamento uffici',amount:11500,allocations:[{offerLineId:'23_68:pe01:uffici:2',amount:11500}]}
    ]},
    {id:'404E',number:'404/E',date:'28/11/2024',status:'Emessa',lines:[
      {id:'404E:1',description:'Fase 1 - Progettazione preliminare per PDC relativo al capannone',amount:3500,allocations:[{offerLineId:'23_68:pe01:capannone:1',amount:3500}]}
    ]},
    {id:'442E',number:'442/E',date:'20/12/2024',status:'Emessa',lines:[
      {id:'442E:1',description:'Fase 2 - Progettazione Esecutiva capannone a destinazione logistica',amount:8000,allocations:[{offerLineId:'23_68:pe01:capannone:2',amount:8000}]},
      {id:'442E:2',description:'Acconto 50% Parere preventivo Comando VVF',amount:3000,allocations:[{offerLineId:'23_68:pe01:vvf:1',amount:3000}]}
    ]},
    {id:'477E',number:'477/E',date:'31/12/2024',status:'Nota / storno',lines:[
      {id:'477E:1',description:'Storno acconto 50% Parere preventivo Comando VVF',amount:-3000,allocations:[{offerLineId:'23_68:pe01:vvf:1',amount:-3000}]}
    ]},
    {id:'478E',number:'478/E',date:'31/12/2024',status:'Emessa',lines:[
      {id:'478E:1',description:'Acconto 50% Parere preventivo Comando VVF',amount:3000,allocations:[{offerLineId:'23_68:pe01:vvf:1',amount:3000}]}
    ]},
    {id:'313E',number:'313/E',date:'10/12/2025',status:'Emessa',lines:[
      {id:'313E:1',description:'Saldo 50% Parere preventivo Comando VVF',amount:3000,allocations:[{offerLineId:'23_68:pe01:vvf:1',amount:3000}]},
      {id:'313E:2',description:'Progettazione esecutiva impianti elettrici e di illuminazione',amount:1500,allocations:[{offerLineId:'23_68:pe03:1',amount:1500}]},
      {id:'313E:3',description:'Progetto esecutivo destratificatori capannone produzione',amount:1500,allocations:[{offerLineId:'23_68:pe03:5',amount:1500}]}
    ]},
    {id:'312E',number:'312/E',date:'10/12/2025',status:'Emessa',lines:[
      {id:'312E:1',description:'Progetto esecutivo spostamento caldaie zona produzione',amount:2200,allocations:[{offerLineId:'23_68:pe03:2',amount:2200}]},
      {id:'312E:2',description:'Progetto di invarianza idraulica + assistenza alla D.L.',amount:7000,allocations:[{offerLineId:'23_68:pe03:3',amount:7000}]},
      {id:'312E:3',description:'Progetto esecutivo capannone con modifica impianti',amount:3000,allocations:[{offerLineId:'23_68:pe03:4',amount:3000}]},
      {id:'312E:4',description:'Nuovo PDC uffici passati da circa 850 mq a circa 1.200 mq',amount:10000,allocations:[{offerLineId:'23_68:pe03:6',amount:10000}]},
      {id:'312E:5',description:'Progetto esecutivo uffici versione finale',amount:17000,allocations:[{offerLineId:'23_68:pe03:7',amount:17000}]}
    ]},
    {id:'79E',number:'79/E',date:'31/03/2026',status:'Emessa',lines:[
      {id:'79E:1',description:'Acconto 50% relativo alla Direzione Lavori capannone',amount:3000,allocations:[{offerLineId:'23_68:pe01:capannone:3',amount:3000}]}
    ]},
    {id:'81E',number:'81/E',date:'31/03/2026',status:'Emessa',lines:[
      {id:'81E:1',description:'Progetto di invarianza idraulica + assistenza alla D.L.',amount:4500,allocations:[{offerLineId:'23_68:pe03:8',amount:4500}]},
      {id:'81E:2',description:'Verifica e progettazione quadro elettrico compressori',amount:1500,allocations:[{offerLineId:'23_68:pe03:9',amount:1500}]}
    ]},
    {id:'238',number:'238',date:'31/07/2026',status:'Emessa',lines:[
      {id:'238:1',description:'Acconto 50% relativo alla SCIA ed ottenimento del CPI finale',amount:4000,allocations:[{offerLineId:'23_68:pe01:vvf:2',amount:4000}]}
    ]}
  ];

  const state={offerId:'23_68:pe01:uffici',lineId:'23_68:pe01:uffici:3',search:'',offerResidualOnly:true,lineResidualOnly:true};
  let page=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cents=n=>Math.round((Number(n)||0)*100)/100;
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
  const pct=(a,b)=>b>0?Math.max(0,Math.min(100,Math.round(a/b*100))):0;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

  function allocations(){
    const out=[];
    INVOICES.forEach(inv=>inv.lines.forEach(il=>(il.allocations||[]).forEach(a=>out.push({invoice:inv,invoiceLine:il,offerLineId:a.offerLineId,allocated:cents(a.amount)}))));
    return out;
  }
  function billedMap(){const m=new Map();allocations().forEach(x=>m.set(x.offerLineId,cents((m.get(x.offerLineId)||0)+x.allocated)));return m;}
  function statusFor(total,billed){if(billed<=0)return 'Da fatturare';if(billed>=total-.01)return 'Fatturata';return 'Parziale';}
  function lineStats(offer,line,bm){const billed=cents(bm.get(line.id)||0),remaining=Math.max(0,cents(line.amount-billed));return {...line,billed,remaining,percent:pct(billed,line.amount),status:statusFor(line.amount,billed)};}
  function offerStats(offer,bm){const lines=offer.lines.map(l=>lineStats(offer,l,bm));const amount=cents(lines.reduce((s,l)=>s+l.amount,0)),billed=cents(lines.reduce((s,l)=>s+l.billed,0)),remaining=Math.max(0,cents(amount-billed));return {...offer,lines,amount,billed,remaining,percent:pct(billed,amount),status:statusFor(amount,billed)};}
  function offerRows(){const bm=billedMap();return OFFERS.map(o=>offerStats(o,bm));}
  function allocationsForLine(id){return allocations().filter(x=>x.offerLineId===id);}
  function totalInvoice(inv){return cents(inv.lines.reduce((s,l)=>s+l.amount,0));}
  function currentOffer(){return offerRows().find(o=>o.id===state.offerId)||offerRows()[0];}
  function currentLine(){const o=currentOffer();return o.lines.find(l=>l.id===state.lineId)||o.lines[0];}

  function installStyles(){
    if(document.getElementById('billingDashboardStylesV33'))return;
    const s=document.createElement('style');s.id='billingDashboardStylesV33';s.textContent=`
      #billingDashboardPageV33{display:block}.b33-shell{background:#fff;border:1px solid #dde4e7;border-radius:9px;box-shadow:0 2px 8px rgba(36,53,62,.06);overflow:hidden}.b33-head{padding:13px 15px 11px;border-bottom:1px solid #e7ecef;background:linear-gradient(#fff,#fbfcfd)}.b33-headtop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.b33-title strong{display:block;font-size:16px;color:#2d414b}.b33-title span{font-size:8.6px;color:#78858d}.b33-chip{font-size:8px;font-weight:800;padding:5px 8px;border-radius:999px;background:#fff4ed;color:#b55c2c;border:1px solid #f1d1bf;white-space:nowrap}.b33-kpis{display:grid;grid-template-columns:repeat(4,minmax(110px,1fr));gap:7px;margin-top:11px}.b33-kpi{border:1px solid #e0e6e9;border-radius:6px;padding:7px 9px;background:#fff}.b33-kpi span{display:block;font-size:7px;text-transform:uppercase;color:#7a878f;font-weight:800}.b33-kpi strong{display:block;margin-top:2px;font-size:11px;color:#324852}.b33-controls{display:flex;gap:8px;align-items:center;padding:9px 15px;border-bottom:1px solid #e8edef;background:#fafbfc}.b33-search{height:29px;min-width:240px;flex:1;border:1px solid #d8e0e4;border-radius:5px;padding:0 9px;font-size:9px}.b33-check{height:29px;display:inline-flex;align-items:center;gap:6px;padding:0 9px;border:1px solid #d8e0e4;border-radius:5px;background:#fff;font-size:8.5px;font-weight:700;color:#4c626d;white-space:nowrap}.b33-check input{accent-color:#ed702e}.b33-section{padding:10px 15px 0}.b33-sectionhead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px}.b33-sectionhead strong{font-size:10px;color:#344b56}.b33-sectionhead span{font-size:8px;color:#7a8790}.b33-offerwrap{border:1px solid #dce4e7;border-radius:7px;overflow:auto;max-height:210px}.b33-offertable{min-width:960px}.b33-offerrow{display:grid;grid-template-columns:85px minmax(280px,1.65fr) 112px 112px 112px 125px 100px;min-height:39px;border-bottom:1px solid #e8edef;cursor:pointer}.b33-offerrow:last-child{border-bottom:0}.b33-offerrow>div{display:flex;align-items:center;padding:6px 8px;border-right:1px solid #edf1f3;font-size:8.7px;color:#354a54;min-width:0}.b33-offerrow>div:last-child{border-right:0}.b33-offerrow.head{min-height:30px;background:#f1f3f5;cursor:default;position:sticky;top:0;z-index:2}.b33-offerrow.head>div{font-size:7.3px;text-transform:uppercase;font-weight:800;color:#61717a}.b33-offerrow.selected{background:#fff6f0;box-shadow:inset 3px 0 #ef742f}.b33-offerrow:not(.head):hover{background:#fffaf7}.b33-code{font-weight:850;color:#d9652b}.b33-money{justify-content:flex-end!important;font-variant-numeric:tabular-nums;white-space:nowrap}.b33-status{font-size:8px;font-weight:800}.b33-status.done{color:#2d7d48}.b33-status.partial{color:#d9682e}.b33-status.todo{color:#b54148}.b33-progress{width:100%;display:flex;align-items:center;gap:6px}.b33-progress span{font-size:8px;font-weight:800;min-width:28px}.b33-progress div{height:4px;background:#e7ebed;border-radius:999px;flex:1;overflow:hidden}.b33-progress i{display:block;height:100%;background:#ef742f}.b33-divider{margin:11px 15px 0;border-top:1px solid #e1e7ea;position:relative}.b33-divider span{position:absolute;left:50%;transform:translate(-50%,-50%);top:0;background:#fff;padding:0 9px;font-size:7px;color:#929da3;text-transform:uppercase;font-weight:800;letter-spacing:.06em}.b33-masterdetail{display:grid;grid-template-columns:minmax(420px,.92fr) minmax(500px,1.08fr);gap:9px;padding:11px 15px 15px;min-height:365px}.b33-panel{border:1px solid #dce4e7;border-radius:7px;overflow:hidden;background:#fff;display:flex;flex-direction:column;min-width:0}.b33-panelhead{padding:8px 10px;border-bottom:1px solid #e4e9ec;background:#fafbfc;display:flex;justify-content:space-between;align-items:flex-start;gap:8px}.b33-panelhead strong{display:block;font-size:10px;color:#334a55}.b33-panelhead span{display:block;font-size:7.8px;color:#7b8991;margin-top:2px}.b33-panelcontrols{padding:6px 9px;border-bottom:1px solid #e9edef;background:#fff}.b33-scroll{overflow:auto;max-height:315px;min-height:245px}.b33-linerow{display:grid;grid-template-columns:42px minmax(180px,1fr) 92px 92px 92px 70px;min-height:45px;border-bottom:1px solid #ebeff1;cursor:pointer}.b33-linerow>div{display:flex;align-items:center;padding:6px 7px;border-right:1px solid #eff2f4;font-size:8.3px;color:#354a54;min-width:0}.b33-linerow>div:last-child{border-right:0}.b33-linerow.head{min-height:29px;background:#f2f4f5;cursor:default;position:sticky;top:0;z-index:1}.b33-linerow.head>div{font-size:7px;font-weight:800;text-transform:uppercase;color:#61717a}.b33-linerow.selected{background:#f4f9fb;box-shadow:inset 3px 0 #6e9aaa}.b33-linerow:not(.head):hover{background:#f8fbfc}.b33-desc{display:block!important}.b33-desc strong{display:block;font-size:8.5px}.b33-desc span{display:block;font-size:7.3px;color:#7f8c93;margin-top:2px}.b33-invrow{display:grid;grid-template-columns:72px 74px minmax(210px,1fr) 105px 105px 82px;min-height:48px;border-bottom:1px solid #ebeff1}.b33-invrow>div{display:flex;align-items:center;padding:6px 7px;border-right:1px solid #eff2f4;font-size:8.2px;color:#354a54;min-width:0}.b33-invrow>div:last-child{border-right:0}.b33-invrow.head{min-height:29px;background:#f2f4f5;position:sticky;top:0;z-index:1}.b33-invrow.head>div{font-size:7px;font-weight:800;text-transform:uppercase;color:#61717a}.b33-invnum{font-weight:850;color:#d9652b}.b33-storno{background:#fff7f7}.b33-empty{padding:30px 18px;text-align:center;color:#829097;font-size:8.8px}.b33-line-summary{display:flex;gap:12px;flex-wrap:wrap;padding:7px 9px;border-top:1px solid #e4e9ec;background:#fafbfc;font-size:7.8px;color:#667780}.b33-line-summary strong{color:#304852}.b33-hint{padding:0 15px 11px;color:#87939a;font-size:7.5px}
      @media(max-width:1100px){.b33-masterdetail{grid-template-columns:1fr}.b33-scroll{max-height:260px}.b33-kpis{grid-template-columns:repeat(2,1fr)}}@media(max-width:720px){.b33-headtop{flex-direction:column}.b33-controls{align-items:stretch;flex-direction:column}.b33-search{width:100%;min-width:0}.b33-kpis{grid-template-columns:1fr 1fr}.b33-section,.b33-masterdetail{padding-left:8px;padding-right:8px}.b33-masterdetail{min-height:0}}
    `;document.head.appendChild(s);
  }

  function statusClass(s){return s==='Fatturata'?'done':s==='Parziale'?'partial':'todo';}
  function progress(n){return `<div class="b33-progress"><span>${n}%</span><div><i style="width:${n}%"></i></div></div>`;}

  function filteredOffers(){
    const q=norm(state.search);
    return offerRows().filter(o=>(!state.offerResidualOnly||o.remaining>.01)&&(!q||norm([o.code,o.title,o.client].join(' ')).includes(q)));
  }
  function ensureSelection(){
    const os=filteredOffers();
    if(!os.some(o=>o.id===state.offerId)){state.offerId=os[0]?.id||'';state.lineId='';}
    const o=currentOffer();
    const ls=o?.lines.filter(l=>!state.lineResidualOnly||l.remaining>.01)||[];
    if(!ls.some(l=>l.id===state.lineId))state.lineId=ls[0]?.id||o?.lines[0]?.id||'';
  }

  function headerMarkup(){
    const all=offerRows(),amount=cents(all.reduce((s,o)=>s+o.amount,0)),billed=cents(all.reduce((s,o)=>s+o.billed,0)),remaining=cents(all.reduce((s,o)=>s+o.remaining,0));
    return `<div class="b33-head"><div class="b33-headtop"><div class="b33-title"><strong>Dashboard Fatturazione</strong><span>Versione B · seleziona un'offerta, poi una riga per vedere le righe fattura collegate.</span></div><span class="b33-chip">SIMULAZIONE · COMMESSA 23_68</span></div><div class="b33-kpis"><div class="b33-kpi"><span>Offerte confermate</span><strong>${all.length}</strong></div><div class="b33-kpi"><span>Valore confermato</span><strong>${money(amount)}</strong></div><div class="b33-kpi"><span>Fatturato</span><strong>${money(billed)}</strong></div><div class="b33-kpi"><span>Residuo da fatturare</span><strong>${money(remaining)}</strong></div></div></div>`;
  }

  function offersMarkup(){
    const rows=filteredOffers();
    return `<div class="b33-section"><div class="b33-sectionhead"><div><strong>1 · Offerte confermate</strong><span>Commessa 23_68 · ${rows.length} offerte visibili</span></div><span>Clicca un'offerta per aggiornare il dettaglio sotto</span></div><div class="b33-offerwrap"><div class="b33-offertable"><div class="b33-offerrow head"><div>Offerta</div><div>Titolo</div><div>Confermato</div><div>Fatturato</div><div>Residuo</div><div>Avanzamento</div><div>Stato</div></div>${rows.map(o=>`<div class="b33-offerrow ${o.id===state.offerId?'selected':''}" data-offer="${esc(o.id)}"><div><span class="b33-code">${esc(o.code)}</span></div><div><strong>${esc(o.title)}</strong></div><div class="b33-money">${money(o.amount)}</div><div class="b33-money">${money(o.billed)}</div><div class="b33-money"><strong>${money(o.remaining)}</strong></div><div>${progress(o.percent)}</div><div><span class="b33-status ${statusClass(o.status)}">${esc(o.status)}</span></div></div>`).join('')||'<div class="b33-empty">Nessuna offerta corrisponde ai filtri.</div>'}</div></div></div>`;
  }

  function linesMarkup(){
    const o=currentOffer();
    if(!o)return '<div class="b33-empty">Seleziona un’offerta.</div>';
    const rows=o.lines.filter(l=>!state.lineResidualOnly||l.remaining>.01);
    return `<div class="b33-panel"><div class="b33-panelhead"><div><strong>2 · Righe Offerta</strong><span>${esc(o.code)} · ${esc(o.title)}</span></div><span>${o.lines.length} righe totali</span></div><div class="b33-panelcontrols"><label class="b33-check"><input id="b33LineResidual" type="checkbox" ${state.lineResidualOnly?'checked':''}> Mostra solo residuo &gt; 0</label></div><div class="b33-scroll"><div class="b33-linerow head"><div>Riga</div><div>Attività / descrizione</div><div>Importo</div><div>Fatturato</div><div>Residuo</div><div>Fatture</div></div>${rows.map(l=>{const count=allocationsForLine(l.id).length;return `<div class="b33-linerow ${l.id===state.lineId?'selected':''}" data-line="${esc(l.id)}"><div><strong>${l.number}</strong></div><div class="b33-desc"><strong>${esc(l.description)}</strong><span>${esc(l.phase)} · ${l.percent}% fatturato</span></div><div class="b33-money">${money(l.amount)}</div><div class="b33-money">${money(l.billed)}</div><div class="b33-money"><strong>${money(l.remaining)}</strong></div><div><strong>${count}</strong></div></div>`;}).join('')||'<div class="b33-empty">Nessuna riga con residuo. Disattiva il filtro per vedere lo storico completo.</div>'}</div></div>`;
  }

  function invoiceMarkup(){
    const o=currentOffer(),l=currentLine();
    if(!o||!l)return `<div class="b33-panel"><div class="b33-empty">Seleziona una Riga Offerta per vedere le fatture collegate.</div></div>`;
    const rows=allocationsForLine(l.id);
    const allocTotal=cents(rows.reduce((s,x)=>s+x.allocated,0));
    return `<div class="b33-panel"><div class="b33-panelhead"><div><strong>3 · Righe Fattura collegate</strong><span>Riga ${l.number} · ${esc(l.description)}</span></div><span>${rows.length} movimenti</span></div><div class="b33-scroll"><div class="b33-invrow head"><div>Fattura</div><div>Data</div><div>Descrizione riga fattura</div><div>Totale riga fattura</div><div>Allocato a riga offerta</div><div>Stato</div></div>${rows.map(x=>`<div class="b33-invrow ${x.allocated<0?'b33-storno':''}"><div><span class="b33-invnum">${esc(x.invoice.number)}</span></div><div>${esc(x.invoice.date)}</div><div>${esc(x.invoiceLine.description)}</div><div class="b33-money">${money(x.invoiceLine.amount)}</div><div class="b33-money"><strong>${money(x.allocated)}</strong></div><div>${esc(x.invoice.status)}</div></div>`).join('')||`<div class="b33-empty"><strong>Nessuna fattura collegata.</strong><br>Questa Riga Offerta ha ancora ${money(l.remaining)} da fatturare.</div>`}</div><div class="b33-line-summary"><span>Importo Riga Offerta <strong>${money(l.amount)}</strong></span><span>Allocato/Fatturato <strong>${money(allocTotal)}</strong></span><span>Residuo <strong>${money(l.remaining)}</strong></span></div></div>`;
  }

  function render(){
    ensureSelection();
    page.innerHTML=`<div class="b33-shell">${headerMarkup()}<div class="b33-controls"><input id="b33Search" class="b33-search" value="${esc(state.search)}" placeholder="Cerca offerta o descrizione…"><label class="b33-check"><input id="b33OfferResidual" type="checkbox" ${state.offerResidualOnly?'checked':''}> Mostra solo offerte con residuo &gt; 0</label></div>${offersMarkup()}<div class="b33-divider"><span>dettaglio offerta selezionata</span></div><div class="b33-masterdetail">${linesMarkup()}${invoiceMarkup()}</div><div class="b33-hint">La tabella di destra non cresce in larghezza con il numero di fatture: scorre verticalmente e mantiene distinti Totale Riga Fattura e Importo Allocato alla Riga Offerta.</div></div>`;
    bind();
  }

  function bind(){
    page.querySelector('#b33Search')?.addEventListener('input',e=>{state.search=e.target.value;render();});
    page.querySelector('#b33OfferResidual')?.addEventListener('change',e=>{state.offerResidualOnly=e.target.checked;render();});
    page.querySelector('#b33LineResidual')?.addEventListener('change',e=>{state.lineResidualOnly=e.target.checked;render();});
    page.querySelectorAll('[data-offer]').forEach(r=>r.addEventListener('click',()=>{state.offerId=r.dataset.offer;state.lineId='';render();}));
    page.querySelectorAll('[data-line]').forEach(r=>r.addEventListener('click',()=>{state.lineId=r.dataset.line;render();}));
  }

  function show(){
    document.querySelector('.main-card')?.style.setProperty('display','none');
    const kb=document.getElementById('kanbanPage');if(kb)kb.hidden=true;
    const old=document.getElementById('billingDashboardPage');if(old)old.hidden=true;
    page.hidden=false;
    document.querySelectorAll('.sidebar-item').forEach(x=>x.classList.toggle('active',x.dataset.page==='billing'));
    const title=document.querySelector('.page-title');if(title)title.textContent='Dashboard Fatturazione';
    const bc=document.querySelector('.breadcrumb');if(bc)bc.innerHTML='<span>⌂</span><span>›</span><span>Fatturazione</span><span>›</span><strong>Commessa 23_68</strong>';
    document.getElementById('appSidebar')?.classList.remove('open');document.getElementById('appSidebarOverlay')?.classList.remove('open');
    history.replaceState(null,'','#dashboard-fatturazione');render();
  }

  function install(attempt=0){
    const shell=document.querySelector('.page-shell'),main=shell?.querySelector('.main-card'),nav=document.querySelector('#appSidebar .sidebar-nav');
    if(!shell||!main||!nav){if(attempt<220)setTimeout(()=>install(attempt+1),50);return;}
    installStyles();
    page=document.createElement('section');page.id='billingDashboardPageV33';page.hidden=true;main.insertAdjacentElement('afterend',page);
    let btn=nav.querySelector('[data-page="billing"]');
    if(!btn){btn=document.createElement('button');btn.type='button';btn.className='sidebar-item';btn.dataset.page='billing';btn.innerHTML='<span class="side-icon">€</span>Dashboard Fatturazione';nav.appendChild(btn);}
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();show();});
    document.addEventListener('click',e=>{const b=e.target.closest?.('.sidebar-item[data-page]');if(b&&b.dataset.page!=='billing'&&page)page.hidden=true;},true);
    render();if(location.hash==='#dashboard-fatturazione')show();
  }
  install();
})();
