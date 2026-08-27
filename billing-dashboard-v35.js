/* v35 - Dashboard Fatturazione: Commessa -> Offerta -> Riga Offerta | Riga Fattura. */
(function(){
  const OFFERS=[
    {id:'23_68:pe01:uffici',code:'pe01',commessa:'23_68',commessaTitle:'AMPLIAMENTI E ADEGUAMENTI SEDE',client:'CLIENTE TEST 23_68',projectManager:'CP',commessaManager:'RC',title:'Ampliamento e ristrutturazione di mq 850 per uffici, spogliatoi e servizi al personale',lines:[
      {id:'23_68:pe01:uffici:1',number:1,phase:'Fase 1',description:'Progettazione Preliminare per PDC',amount:7000},
      {id:'23_68:pe01:uffici:2',number:2,phase:'Fase 2',description:'Progettazione Esecutiva',amount:11500},
      {id:'23_68:pe01:uffici:3',number:3,phase:'Fase 3',description:'Direzione Lavori',amount:8000}
    ]},
    {id:'23_68:pe01:capannone',code:'pe01',commessa:'23_68',commessaTitle:'AMPLIAMENTI E ADEGUAMENTI SEDE',client:'CLIENTE TEST 23_68',projectManager:'CP',commessaManager:'RC',title:'Ampliamento con capannone a destinazione logistica per circa 3.000 mq',lines:[
      {id:'23_68:pe01:capannone:1',number:1,phase:'Fase 1',description:'Progettazione Preliminare per PDC',amount:3500},
      {id:'23_68:pe01:capannone:2',number:2,phase:'Fase 2',description:'Progettazione Esecutiva',amount:8000},
      {id:'23_68:pe01:capannone:3',number:3,phase:'Fase 3',description:'Direzione Lavori',amount:6000}
    ]},
    {id:'23_68:pe01:vvf',code:'pe01',commessa:'23_68',commessaTitle:'AMPLIAMENTI E ADEGUAMENTI SEDE',client:'CLIENTE TEST 23_68',projectManager:'CP',commessaManager:'RC',title:'Consulenza di prevenzione incendi per i due interventi e per la struttura esistente',lines:[
      {id:'23_68:pe01:vvf:1',number:1,phase:'Prevenzione incendi',description:'Parere preventivo al Comando VVF',amount:6000},
      {id:'23_68:pe01:vvf:2',number:2,phase:'Prevenzione incendi',description:'SCIA ed ottenimento del CPI finale',amount:8000}
    ]},
    {id:'23_68:pe03',code:'pe03',commessa:'23_68',commessaTitle:'AMPLIAMENTI E ADEGUAMENTI SEDE',client:'CLIENTE TEST 23_68',projectManager:'CP',commessaManager:'RC',title:'Progettazioni esecutive e modifiche impianti',lines:[
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
      {id:'442E:2',description:'Acconto (50%) Parere preventivo Comando VVF',amount:3000,allocations:[{offerLineId:'23_68:pe01:vvf:1',amount:3000}]}
    ]},
    {id:'477E',number:'477/E',date:'31/12/2024',status:'Nota / storno',lines:[
      {id:'477E:1',description:'Storno acconto (50%) Parere preventivo Comando VVF',amount:-3000,allocations:[{offerLineId:'23_68:pe01:vvf:1',amount:-3000}]}
    ]},
    {id:'478E',number:'478/E',date:'31/12/2024',status:'Emessa',lines:[
      {id:'478E:1',description:'Acconto (50%) Parere preventivo Comando VVF',amount:3000,allocations:[{offerLineId:'23_68:pe01:vvf:1',amount:3000}]}
    ]},
    {id:'313E',number:'313/E',date:'10/12/2025',status:'Emessa',lines:[
      {id:'313E:1',description:'Saldo (50%) Parere preventivo Comando VVF',amount:3000,allocations:[{offerLineId:'23_68:pe01:vvf:1',amount:3000}]},
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
      {id:'79E:1',description:'Acconto del 50% relativo alla Direzione Lavori capannone',amount:3000,allocations:[{offerLineId:'23_68:pe01:capannone:3',amount:3000}]}
    ]},
    {id:'81E',number:'81/E',date:'31/03/2026',status:'Emessa',lines:[
      {id:'81E:1',description:'Progetto di invarianza idraulica + assistenza alla D.L.',amount:4500,allocations:[{offerLineId:'23_68:pe03:8',amount:4500}]},
      {id:'81E:2',description:'Verifica e progettazione quadro elettrico compressori',amount:1500,allocations:[{offerLineId:'23_68:pe03:9',amount:1500}]}
    ]},
    {id:'238',number:'238',date:'31/07/2026',status:'Emessa',lines:[
      {id:'238:1',description:'Acconto del 50% relativo alla SCIA ed ottenimento del CPI finale',amount:4000,allocations:[{offerLineId:'23_68:pe01:vvf:2',amount:4000}]}
    ]}
  ];

  const state={level:'commesse',commessa:'',offerId:'',lineId:'',search:'',commessaResidualOnly:false,offerResidualOnly:false,lineResidualOnly:false};
  let page=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const cents=n=>Math.round((Number(n)||0)*100)/100;
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
  const pct=(part,total)=>total>0?Math.max(0,Math.min(100,Math.round(part/total*100))):0;
  const statusFor=(total,billed)=>billed<=0?'Da fatturare':billed>=total-.01?'Fatturata':'Parzialmente fatturata';
  const statusClass=s=>s==='Fatturata'?'done':s==='Parzialmente fatturata'?'partial':'todo';

  function allocationRows(){
    const out=[];
    INVOICES.forEach(invoice=>invoice.lines.forEach(invoiceLine=>(invoiceLine.allocations||[]).forEach(a=>out.push({invoice,invoiceLine,offerLineId:a.offerLineId,allocated:cents(a.amount)}))));
    return out;
  }
  function billedByLine(){
    const map=new Map();
    allocationRows().forEach(x=>map.set(x.offerLineId,cents((map.get(x.offerLineId)||0)+x.allocated)));
    return map;
  }
  function allocationsForLine(lineId){return allocationRows().filter(x=>x.offerLineId===lineId);}
  function lineStat(line,billed){
    const fact=cents(billed.get(line.id)||0),remaining=Math.max(0,cents(line.amount-fact));
    return {...line,billed:fact,remaining,percent:pct(fact,line.amount),status:statusFor(line.amount,fact)};
  }
  function offerRows(){
    const billed=billedByLine();
    return OFFERS.map(o=>{
      const lines=o.lines.map(l=>lineStat(l,billed));
      const amount=cents(lines.reduce((s,l)=>s+l.amount,0)),fact=cents(lines.reduce((s,l)=>s+l.billed,0)),remaining=Math.max(0,cents(amount-fact));
      return {...o,lines,amount,billed:fact,remaining,percent:pct(fact,amount),status:statusFor(amount,fact)};
    });
  }
  function commessaRows(){
    const map=new Map();
    offerRows().forEach(o=>{
      if(!map.has(o.commessa))map.set(o.commessa,{commessa:o.commessa,title:o.commessaTitle,client:o.client,projectManager:o.projectManager,commessaManager:o.commessaManager,offers:[],amount:0,billed:0});
      const c=map.get(o.commessa);c.offers.push(o);c.amount+=o.amount;c.billed+=o.billed;
    });
    return [...map.values()].map(c=>{const amount=cents(c.amount),billed=cents(c.billed),remaining=Math.max(0,cents(amount-billed));return {...c,amount,billed,remaining,percent:pct(billed,amount),status:statusFor(amount,billed)};});
  }
  function currentCommessa(){return commessaRows().find(c=>c.commessa===state.commessa)||null;}
  function currentOffer(){return offerRows().find(o=>o.id===state.offerId)||null;}
  function currentLine(){return currentOffer()?.lines.find(l=>l.id===state.lineId)||null;}
  function progress(n){return `<div class="b35-progress"><span>${n}%</span><div><i style="width:${n}%"></i></div></div>`;}

  function installStyles(){
    if(document.getElementById('billingDashboardStylesV35'))return;
    const s=document.createElement('style');s.id='billingDashboardStylesV35';s.textContent=`
      #billingDashboardPageV35{display:block}.b35-shell{background:#fff;border:1px solid #dde4e7;border-radius:9px;box-shadow:0 2px 8px rgba(42,57,66,.05);overflow:hidden;color:#334851}.b35-head{padding:14px 15px 11px;border-bottom:1px solid #e7ecee;background:linear-gradient(180deg,#fff,#fbfcfd)}.b35-headtop{display:flex;align-items:center;justify-content:space-between;gap:12px}.b35-title strong{display:block;font-size:16px;color:#293d47}.b35-title span{display:block;margin-top:3px;font-size:9px;color:#7a8990}.b35-chip{font-size:8px;font-weight:800;color:#ad5d31;background:#fff6ef;border:1px solid #f0d7c8;border-radius:999px;padding:4px 8px}.b35-breadcrumb{display:flex;align-items:center;gap:6px;margin-top:10px;font-size:8.5px;color:#708089}.b35-breadcrumb button{border:0;background:none;color:#df6d31;font:inherit;font-weight:800;padding:0;cursor:pointer}.b35-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:9px 15px;background:#fafbfc;border-bottom:1px solid #e6ebed}.b35-search{width:min(340px,100%);height:30px;border:1px solid #d7dfe3;border-radius:6px;padding:0 9px;font-size:9px;outline:none}.b35-check{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 9px;border:1px solid #d7dfe3;border-radius:6px;background:#fff;font-size:8.5px;font-weight:700;color:#52656e;white-space:nowrap}.b35-check input{accent-color:#ef722f}.b35-body{padding:12px 15px 15px}.b35-section{border:1px solid #dce3e6;border-radius:8px;overflow:hidden;background:#fff}.b35-sectionhead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;background:#f7f9fa;border-bottom:1px solid #e4e9eb}.b35-sectionhead strong{font-size:10px;color:#334b56}.b35-sectionhead span{font-size:8px;color:#7d8a91}.b35-tablewrap{overflow:auto}.b35-crow{display:grid;grid-template-columns:100px minmax(240px,1.5fr) minmax(130px,.85fr) 115px 115px 115px 130px 135px;min-width:1040px;min-height:43px;border-bottom:1px solid #e9edef;cursor:pointer}.b35-crow:last-child{border-bottom:0}.b35-crow>div{display:flex;align-items:center;min-width:0;padding:6px 8px;border-right:1px solid #eef1f2;font-size:8.8px}.b35-crow>div:last-child{border-right:0}.b35-crow.head{min-height:31px;background:#f1f4f5;cursor:default}.b35-crow.head>div{font-size:7.5px;font-weight:800;text-transform:uppercase;color:#65747c}.b35-crow:not(.head):hover{background:#fff9f5}.b35-code{font-size:10px;font-weight:850;color:#df6a2d}.b35-money{justify-content:flex-end;font-variant-numeric:tabular-nums;white-space:nowrap}.b35-residual{font-weight:850;color:#b85328}.b35-status{font-size:8px;font-weight:800}.b35-status.done{color:#2d7d48}.b35-status.partial{color:#dc692f}.b35-status.todo{color:#bc3d45}.b35-progress{width:100%;display:flex;flex-direction:column;gap:3px}.b35-progress>span{font-size:8px;font-weight:750}.b35-progress>div{height:4px;background:#e8ecee;border-radius:99px;overflow:hidden}.b35-progress i{display:block;height:100%;background:#ec742f}.b35-empty{padding:28px 12px;text-align:center;font-size:9px;color:#7d8990}.b35-context{display:grid;grid-template-columns:minmax(250px,1.5fr) repeat(4,minmax(110px,.7fr)) auto;align-items:center;gap:7px;padding:9px 10px;margin-bottom:10px;border:1px solid #eadfd8;border-left:4px solid #ed7431;border-radius:8px;background:#fffaf7}.b35-context-main strong{display:block;font-size:11px;color:#324953}.b35-context-main span{display:block;margin-top:2px;font-size:8px;color:#7a878e}.b35-context-kpi{padding:5px 7px;border-left:1px solid #eadfd8}.b35-context-kpi span{display:block;font-size:7px;text-transform:uppercase;color:#8b7770;font-weight:750}.b35-context-kpi strong{display:block;margin-top:2px;font-size:10px;color:#324953}.b35-context-kpi.res strong{color:#b85328}.b35-back{height:29px;border:1px solid #dbcfc8;border-radius:6px;background:#fff;color:#775d51;font-size:8.5px;font-weight:800;padding:0 9px;cursor:pointer}.b35-offerrow{display:grid;grid-template-columns:85px minmax(270px,1.65fr) 110px 110px 110px 125px 130px;min-width:960px;min-height:42px;border-bottom:1px solid #e8edef;cursor:pointer}.b35-offerrow>div{display:flex;align-items:center;min-width:0;padding:6px 8px;border-right:1px solid #eef1f2;font-size:8.6px}.b35-offerrow>div:last-child{border-right:0}.b35-offerrow.head{min-height:30px;background:#f1f4f5;cursor:default}.b35-offerrow.head>div{font-size:7.4px;font-weight:800;text-transform:uppercase;color:#65747c}.b35-offerrow:not(.head):hover{background:#fff9f5}.b35-offerrow.selected{background:#fff3eb;box-shadow:inset 3px 0 #ed722f}.b35-offerrow.selected:hover{background:#fff3eb}.b35-divider{display:flex;align-items:center;gap:8px;margin:10px 0 8px;color:#8a969b;font-size:7.5px;font-weight:800;text-transform:uppercase}.b35-divider:before,.b35-divider:after{content:'';height:1px;background:#e4e9eb;flex:1}.b35-masterdetail{display:grid;grid-template-columns:minmax(380px,.92fr) minmax(520px,1.28fr);gap:9px;min-height:390px}.b35-panel{border:1px solid #dce3e6;border-radius:8px;overflow:hidden;display:flex;flex-direction:column;min-width:0;background:#fff}.b35-panelhead{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:8px 9px;background:#f7f9fa;border-bottom:1px solid #e4e9eb}.b35-panelhead strong{display:block;font-size:9.5px;color:#344b55}.b35-panelhead span{display:block;margin-top:2px;font-size:7.8px;color:#7b8990}.b35-paneltools{padding:6px 8px;border-bottom:1px solid #e6ebed;background:#fcfdfd}.b35-paneltools .b35-check{height:26px}.b35-scroll{overflow:auto;max-height:430px;flex:1}.b35-lrow{display:grid;grid-template-columns:45px minmax(190px,1.5fr) 88px 88px 92px 58px;min-width:660px;min-height:43px;border-bottom:1px solid #e9edef;cursor:pointer}.b35-lrow>div{display:flex;align-items:center;min-width:0;padding:5px 7px;border-right:1px solid #eef1f2;font-size:8.2px}.b35-lrow>div:last-child{border-right:0}.b35-lrow.head{min-height:29px;background:#f2f4f5;cursor:default}.b35-lrow.head>div{font-size:7px;font-weight:800;text-transform:uppercase;color:#65747c}.b35-lrow:not(.head):hover{background:#fff9f5}.b35-lrow.selected{background:#fff3eb;box-shadow:inset 3px 0 #ed722f}.b35-desc{display:flex!important;flex-direction:column;align-items:flex-start!important;justify-content:center}.b35-desc strong{font-size:8.4px}.b35-desc span{font-size:7px;color:#849097;margin-top:2px}.b35-irow{display:grid;grid-template-columns:82px 75px minmax(220px,1.6fr) 105px 115px 90px;min-width:830px;min-height:42px;border-bottom:1px solid #e9edef}.b35-irow>div{display:flex;align-items:center;min-width:0;padding:5px 7px;border-right:1px solid #eef1f2;font-size:8px}.b35-irow>div:last-child{border-right:0}.b35-irow.head{min-height:29px;background:#f2f4f5}.b35-irow.head>div{font-size:7px;font-weight:800;text-transform:uppercase;color:#65747c}.b35-invnum{font-weight:850;color:#df6a2d}.b35-storno{background:#fff6f6}.b35-linesummary{display:flex;gap:14px;flex-wrap:wrap;padding:8px 9px;border-top:1px solid #e2e8ea;background:#fafbfc;font-size:8px;color:#6b7b83}.b35-linesummary strong{color:#324953}.b35-linesummary .res strong{color:#b85328}.b35-hint{margin-top:8px;padding:7px 9px;border-radius:6px;background:#f7f9fa;color:#819097;font-size:7.8px}.b35-firsthint{padding:10px 2px 0;color:#849097;font-size:8px}.b35-selected-arrow{margin-left:auto;color:#e36e31;font-weight:900}
      @media(max-width:1100px){.b35-masterdetail{grid-template-columns:1fr}.b35-scroll{max-height:330px}.b35-context{grid-template-columns:1fr 1fr 1fr}.b35-context-main{grid-column:1/-1}.b35-back{justify-self:start}}@media(max-width:720px){.b35-body{padding:8px}.b35-context{grid-template-columns:1fr 1fr}.b35-context-main{grid-column:1/-1}.b35-headtop{align-items:flex-start;flex-direction:column}.b35-controls{align-items:stretch}.b35-search{width:100%}}
    `;document.head.appendChild(s);
  }

  function commesseView(){
    let rows=commessaRows();
    const q=norm(state.search);if(q)rows=rows.filter(r=>norm([r.commessa,r.title,r.client].join(' ')).includes(q));
    if(state.commessaResidualOnly)rows=rows.filter(r=>r.remaining>.01);
    return `<div class="b35-section"><div class="b35-sectionhead"><div><strong>Commesse con offerte confermate</strong><span>Il valore della commessa è la somma degli Importi Conferma delle offerte</span></div><span>${rows.length} commessa/e</span></div><div class="b35-tablewrap"><div class="b35-crow head"><div>Commessa</div><div>Descrizione</div><div>Cliente</div><div>Confermato</div><div>Fatturato</div><div>Residuo</div><div>Avanzamento</div><div>Stato</div></div>${rows.map(r=>`<div class="b35-crow" data-commessa="${esc(r.commessa)}"><div><span class="b35-code">${esc(r.commessa)}</span></div><div><strong>${esc(r.title)}</strong></div><div>${esc(r.client)}</div><div class="b35-money">${money(r.amount)}</div><div class="b35-money">${money(r.billed)}</div><div class="b35-money b35-residual">${money(r.remaining)}</div><div>${progress(r.percent)}</div><div><span class="b35-status ${statusClass(r.status)}">${esc(r.status)}</span><span class="b35-selected-arrow">›</span></div></div>`).join('')||'<div class="b35-empty">Nessuna commessa corrisponde ai filtri.</div>'}</div></div><div class="b35-firsthint">Seleziona una commessa per entrare nel dettaglio delle offerte. Il livello Commessa resta poi visibile come riepilogo compatto.</div>`;
  }

  function contextBar(c){
    return `<div class="b35-context"><div class="b35-context-main"><strong>${esc(c.commessa)} · ${esc(c.title)}</strong><span>${esc(c.client)} · ${c.offers.length} offerte confermate</span></div><div class="b35-context-kpi"><span>Confermato</span><strong>${money(c.amount)}</strong></div><div class="b35-context-kpi"><span>Fatturato</span><strong>${money(c.billed)}</strong></div><div class="b35-context-kpi res"><span>Residuo</span><strong>${money(c.remaining)}</strong></div><div class="b35-context-kpi"><span>Avanzamento</span><strong>${c.percent}%</strong></div><button class="b35-back" id="b35ChangeCommessa" type="button">← Cambia commessa</button></div>`;
  }

  function offerSection(c){
    let rows=c.offers;
    const q=norm(state.search);if(q)rows=rows.filter(o=>norm([o.code,o.title,o.lines.map(l=>l.description).join(' ')].join(' ')).includes(q));
    if(state.offerResidualOnly)rows=rows.filter(o=>o.remaining>.01);
    return `<div class="b35-section"><div class="b35-sectionhead"><div><strong>Offerte confermate della commessa</strong><span>Seleziona un'offerta: sotto vedrai le sue righe e le relative fatture</span></div><span>${rows.length} offerte visibili</span></div><div class="b35-tablewrap"><div class="b35-offerrow head"><div>Offerta</div><div>Titolo</div><div>Confermato</div><div>Fatturato</div><div>Residuo</div><div>Avanzamento</div><div>Stato</div></div>${rows.map(o=>`<div class="b35-offerrow ${o.id===state.offerId?'selected':''}" data-offer="${esc(o.id)}"><div><span class="b35-code">${esc(o.code)}</span></div><div><strong>${esc(o.title)}</strong></div><div class="b35-money">${money(o.amount)}</div><div class="b35-money">${money(o.billed)}</div><div class="b35-money b35-residual">${money(o.remaining)}</div><div>${progress(o.percent)}</div><div><span class="b35-status ${statusClass(o.status)}">${esc(o.status)}</span>${o.id===state.offerId?'<span class="b35-selected-arrow">✓</span>':''}</div></div>`).join('')||'<div class="b35-empty">Nessuna offerta corrisponde ai filtri.</div>'}</div></div>`;
  }

  function linesPanel(){
    const o=currentOffer();
    if(!o)return `<div class="b35-panel"><div class="b35-empty"><strong>Seleziona un’offerta.</strong><br>Qui compariranno le Righe Offerta.</div></div>`;
    const rows=o.lines.filter(l=>!state.lineResidualOnly||l.remaining>.01);
    return `<div class="b35-panel"><div class="b35-panelhead"><div><strong>Righe Offerta</strong><span>${esc(o.code)} · ${esc(o.title)}</span></div><span>${o.lines.length} righe totali</span></div><div class="b35-paneltools"><label class="b35-check"><input id="b35LineResidual" type="checkbox" ${state.lineResidualOnly?'checked':''}> Solo righe con residuo &gt; 0</label></div><div class="b35-scroll"><div class="b35-lrow head"><div>Riga</div><div>Attività / descrizione</div><div>Importo</div><div>Fatturato</div><div>Residuo</div><div>Fatture</div></div>${rows.map(l=>{const n=allocationsForLine(l.id).length;return `<div class="b35-lrow ${l.id===state.lineId?'selected':''}" data-line="${esc(l.id)}"><div><strong>${l.number}</strong></div><div class="b35-desc"><strong>${esc(l.description)}</strong><span>${esc(l.phase)} · ${l.percent}% fatturato</span></div><div class="b35-money">${money(l.amount)}</div><div class="b35-money">${money(l.billed)}</div><div class="b35-money b35-residual">${money(l.remaining)}</div><div><strong>${n}</strong>${l.id===state.lineId?'<span class="b35-selected-arrow">✓</span>':''}</div></div>`;}).join('')||'<div class="b35-empty">Nessuna riga con residuo. Disattiva il filtro per vedere lo storico.</div>'}</div></div>`;
  }

  function invoicePanel(){
    const l=currentLine();
    if(!l)return `<div class="b35-panel"><div class="b35-empty"><strong>Seleziona una Riga Offerta.</strong><br>Qui compariranno esclusivamente le Righe Fattura collegate a quella riga.</div></div>`;
    const rows=allocationsForLine(l.id),allocated=cents(rows.reduce((s,x)=>s+x.allocated,0));
    return `<div class="b35-panel"><div class="b35-panelhead"><div><strong>Righe Fattura collegate</strong><span>Riga ${l.number} · ${esc(l.description)}</span></div><span>${rows.length} movimenti</span></div><div class="b35-scroll"><div class="b35-irow head"><div>Fattura</div><div>Data</div><div>Descrizione Riga Fattura</div><div>Totale Riga Fattura</div><div>Allocato a Riga Offerta</div><div>Stato</div></div>${rows.map(x=>`<div class="b35-irow ${x.allocated<0?'b35-storno':''}"><div><span class="b35-invnum">${esc(x.invoice.number)}</span></div><div>${esc(x.invoice.date)}</div><div>${esc(x.invoiceLine.description)}</div><div class="b35-money">${money(x.invoiceLine.amount)}</div><div class="b35-money"><strong>${money(x.allocated)}</strong></div><div>${esc(x.invoice.status)}</div></div>`).join('')||`<div class="b35-empty"><strong>Nessuna fattura collegata.</strong><br>Residuo ancora da fatturare: ${money(l.remaining)}</div>`}</div><div class="b35-linesummary"><span>Riga Offerta <strong>${money(l.amount)}</strong></span><span>Fatturato <strong>${money(allocated)}</strong></span><span class="res">Residuo <strong>${money(l.remaining)}</strong></span></div></div>`;
  }

  function detailView(){
    const c=currentCommessa();if(!c){state.level='commesse';return commesseView();}
    return `${contextBar(c)}${offerSection(c)}<div class="b35-divider"><span>dettaglio offerta selezionata</span></div><div class="b35-masterdetail">${linesPanel()}${invoicePanel()}</div><div class="b35-hint">Percorso dati: Commessa → Offerta → Riga Offerta → Riga Fattura. Le fatture non aumentano la larghezza della pagina: il pannello destro ha uno scroll indipendente.</div>`;
  }

  function controlsMarkup(){
    if(state.level==='commesse')return `<div class="b35-controls"><input id="b35Search" class="b35-search" value="${esc(state.search)}" placeholder="Cerca commessa, descrizione o cliente…"><label class="b35-check"><input id="b35CommessaResidual" type="checkbox" ${state.commessaResidualOnly?'checked':''}> Solo commesse con residuo &gt; 0</label></div>`;
    return `<div class="b35-controls"><input id="b35Search" class="b35-search" value="${esc(state.search)}" placeholder="Cerca offerta o attività…"><label class="b35-check"><input id="b35OfferResidual" type="checkbox" ${state.offerResidualOnly?'checked':''}> Solo offerte con residuo &gt; 0</label></div>`;
  }

  function breadcrumbMarkup(){
    if(state.level==='commesse')return `<div class="b35-breadcrumb"><strong>Dashboard Fatturazione</strong><span>›</span><span>Commesse</span></div>`;
    const o=currentOffer();return `<div class="b35-breadcrumb"><button id="b35CrumbHome" type="button">Dashboard Fatturazione</button><span>›</span><button id="b35CrumbCommessa" type="button">${esc(state.commessa)}</button>${o?`<span>›</span><strong>${esc(o.code)}</strong>`:''}</div>`;
  }

  function ensureSelections(){
    if(state.level!=='detail')return;
    const c=currentCommessa();if(!c)return;
    const visible=c.offers.filter(o=>!state.offerResidualOnly||o.remaining>.01);
    if(state.offerId&&!visible.some(o=>o.id===state.offerId)){state.offerId='';state.lineId='';}
    const o=currentOffer();if(!o){state.lineId='';return;}
    const visibleLines=o.lines.filter(l=>!state.lineResidualOnly||l.remaining>.01);
    if(state.lineId&&!visibleLines.some(l=>l.id===state.lineId))state.lineId='';
  }

  function render(){
    ensureSelections();
    page.innerHTML=`<div class="b35-shell"><div class="b35-head"><div class="b35-headtop"><div class="b35-title"><strong>Dashboard Fatturazione</strong><span>Controllo progressivo dal totale Commessa fino alla singola Riga Fattura.</span></div><span class="b35-chip">PROTOTIPO FATTURAZIONE · DATI TEST 23_68</span></div>${breadcrumbMarkup()}</div>${controlsMarkup()}<div class="b35-body">${state.level==='commesse'?commesseView():detailView()}</div></div>`;
    bind();
  }

  function bind(){
    page.querySelector('#b35Search')?.addEventListener('input',e=>{state.search=e.target.value;render();});
    page.querySelector('#b35CommessaResidual')?.addEventListener('change',e=>{state.commessaResidualOnly=e.target.checked;render();});
    page.querySelector('#b35OfferResidual')?.addEventListener('change',e=>{state.offerResidualOnly=e.target.checked;render();});
    page.querySelector('#b35LineResidual')?.addEventListener('change',e=>{state.lineResidualOnly=e.target.checked;render();});
    page.querySelectorAll('[data-commessa]').forEach(r=>r.addEventListener('click',()=>{state.commessa=r.dataset.commessa;state.level='detail';state.offerId='';state.lineId='';state.search='';render();}));
    page.querySelectorAll('[data-offer]').forEach(r=>r.addEventListener('click',()=>{state.offerId=r.dataset.offer;state.lineId='';render();}));
    page.querySelectorAll('[data-line]').forEach(r=>r.addEventListener('click',()=>{state.lineId=r.dataset.line;render();}));
    const back=()=>{state.level='commesse';state.commessa='';state.offerId='';state.lineId='';state.search='';render();};
    page.querySelector('#b35ChangeCommessa')?.addEventListener('click',back);
    page.querySelector('#b35CrumbHome')?.addEventListener('click',back);
    page.querySelector('#b35CrumbCommessa')?.addEventListener('click',()=>{state.offerId='';state.lineId='';render();});
  }

  function show(){
    document.querySelector('.main-card')?.style.setProperty('display','none');
    const kb=document.getElementById('kanbanPage');if(kb)kb.hidden=true;
    document.querySelectorAll('[id^="billingDashboardPage"]').forEach(x=>{if(x!==page)x.hidden=true;});
    page.hidden=false;
    document.querySelectorAll('.sidebar-item').forEach(x=>x.classList.toggle('active',x.dataset.page==='billing'));
    const title=document.querySelector('.page-title');if(title)title.textContent='Dashboard Fatturazione';
    const bc=document.querySelector('.breadcrumb');if(bc)bc.innerHTML='<span>⌂</span><span>›</span><strong>Dashboard Fatturazione</strong>';
    document.getElementById('appSidebar')?.classList.remove('open');document.getElementById('appSidebarOverlay')?.classList.remove('open');
    history.replaceState(null,'','#dashboard-fatturazione');render();
  }

  function install(attempt=0){
    const shell=document.querySelector('.page-shell'),main=shell?.querySelector('.main-card'),nav=document.querySelector('#appSidebar .sidebar-nav');
    if(!shell||!main||!nav){if(attempt<220)setTimeout(()=>install(attempt+1),50);return;}
    if(document.getElementById('billingDashboardPageV35')){page=document.getElementById('billingDashboardPageV35');return;}
    installStyles();
    page=document.createElement('section');page.id='billingDashboardPageV35';page.hidden=true;main.insertAdjacentElement('afterend',page);
    let btn=nav.querySelector('[data-page="billing"]');
    if(!btn){btn=document.createElement('button');btn.type='button';btn.className='sidebar-item';btn.dataset.page='billing';btn.innerHTML='<span class="side-icon">€</span>Dashboard Fatturazione';nav.appendChild(btn);}
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();show();});
    document.addEventListener('click',e=>{const b=e.target.closest?.('.sidebar-item[data-page]');if(b&&b.dataset.page!=='billing'&&page)page.hidden=true;},true);
    render();if(location.hash==='#dashboard-fatturazione')show();
  }
  install();
})();
