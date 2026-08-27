/* v37 - Billing rules engine: rule -> trigger occurrence -> billable quota. PE04 simulation only. */
(function(){
  const cents=n=>Math.round(Number(n||0)*100)/100;
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate=value=>{if(!value)return '';const d=new Date(value+'T12:00:00');return Number.isNaN(d.getTime())?value:d.toLocaleDateString('it-IT');};

  const RULES=[
    {id:'advance',name:'Acconto alla sottoscrizione',scope:'all',basis:'offer_percent',percent:10,trigger:'confirmation',triggerLabel:'Conferma / sottoscrizione offerta',mode:'once',auto:true},
    {id:'prelim-delivery',name:'Saldo progettazione preliminare',scope:['preliminare'],basis:'line_percent',percent:90,trigger:'delivery',triggerLabel:'Consegna progetto / pratica preliminare',mode:'once'},
    {id:'exec-delivery',name:'Quota progetto esecutivo alla consegna',scope:['esecutivo'],basis:'line_percent',percent:60,trigger:'delivery',triggerLabel:'Consegna progetto esecutivo',mode:'once'},
    {id:'start-works',name:'Quota progetto esecutivo a inizio lavori',scope:['esecutivo'],basis:'line_percent',percent:30,trigger:'external',triggerLabel:'Inizio lavori',mode:'once'},
    {id:'dl-progress',name:'Direzione lavori · SAL progressivi',scope:['dl'],basis:'line_percent',percent:90,trigger:'progress',triggerLabel:'Avanzamento lavori certificato dal responsabile',mode:'progressive'},
    {id:'vvf-delivery',name:'Saldo prevenzione incendi / VVF',scope:['consulenze'],basis:'line_percent',percent:90,trigger:'delivery',triggerLabel:'Consegna documentazione / verbale VVF',mode:'once'}
  ];

  const state={quotas:[],modalRuleId:'',seeded:false};
  let modal=null,initialTimer=null;

  function flow(){return window.DABSTER_PE04_FLOW||null;}
  function flowSnapshot(){return flow()?.getSnapshot?.()||{offer:{code:'23_68pe04',commessa:'23_68',amount:80000},lines:[]};}
  function lines(){
    const live=flowSnapshot().lines||[];
    if(live.length)return live.map(x=>({...x,amount:Number(x.amount||0)}));
    return [
      {id:'23_68pe04:phase:preliminare',phase:'preliminare',description:'Progettazione e pratiche autorizzative',amount:20000},
      {id:'23_68pe04:phase:esecutivo',phase:'esecutivo',description:'Progettazione esecutiva impianti',amount:30000},
      {id:'23_68pe04:phase:dl',phase:'dl',description:'Direzione lavori',amount:20000},
      {id:'23_68pe04:phase:consulenze',phase:'consulenze',description:'Prevenzione incendi e assistenza VVF',amount:10000}
    ];
  }
  function offerTotal(){return cents(lines().reduce((s,l)=>s+Number(l.amount||0),0));}
  function selectedLines(rule){return rule.scope==='all'?lines():lines().filter(l=>(rule.scope||[]).includes(l.phase));}
  function ruleCap(rule){
    if(rule.basis==='offer_percent')return cents(offerTotal()*rule.percent/100);
    return cents(selectedLines(rule).reduce((s,l)=>s+Number(l.amount||0),0)*rule.percent/100);
  }
  function matured(ruleId){return cents(state.quotas.filter(q=>q.ruleId===ruleId).reduce((s,q)=>s+q.amount,0));}
  function available(rule){return Math.max(0,cents(ruleCap(rule)-matured(rule.id)));}
  function ruleById(id){return RULES.find(r=>r.id===id)||null;}

  function allocate(amount,rule){
    const selected=selectedLines(rule);if(!selected.length||amount<=0)return [];
    const total=selected.reduce((s,l)=>s+Number(l.amount||0),0);if(total<=0)return [];
    let assigned=0;
    return selected.map((l,i)=>{
      const part=i===selected.length-1?cents(amount-assigned):cents(amount*Number(l.amount||0)/total);
      assigned=cents(assigned+part);
      return {offerLineId:l.id,phase:l.phase,description:l.description,lineAmount:Number(l.amount||0),amount:part};
    });
  }

  function addQuota(rule,amount,meta={}){
    amount=Math.min(cents(amount),available(rule));if(amount<=0)return null;
    const quota={
      id:`quota-${rule.id}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      ruleId:rule.id,ruleName:rule.name,amount,
      eventDate:meta.eventDate||new Date().toISOString().slice(0,10),
      note:meta.note||'',reference:meta.reference||'',createdBy:meta.createdBy||'Utente loggato',
      createdAt:new Date().toISOString(),status:'ready',allocations:allocate(amount,rule)
    };
    state.quotas.push(quota);emit();return quota;
  }

  function seedAutomatic(){
    if(state.seeded)return;state.seeded=true;
    const advance=ruleById('advance');if(advance&&matured(advance.id)<=0)addQuota(advance,ruleCap(advance),{eventDate:'2026-08-27',note:'Generata automaticamente alla conferma dell’offerta',createdBy:'Sistema'});
  }

  function triggerType(rule){
    if(rule.trigger==='confirmation')return 'Automatico';
    if(rule.trigger==='delivery')return 'Consegna';
    if(rule.trigger==='external')return 'Evento esterno';
    if(rule.trigger==='progress')return 'SAL progressivo';
    return rule.trigger;
  }
  function ruleStatus(rule){
    const left=available(rule);if(left<=.01)return 'Coperta';
    if(rule.mode==='progressive'&&matured(rule.id)>0)return 'SAL aperti';
    if(rule.auto)return 'Automatico';
    return 'Da maturare';
  }
  function coverage(){
    const ls=lines();const byLine=new Map(ls.map(l=>[l.id,0]));
    RULES.forEach(rule=>allocate(ruleCap(rule),rule).forEach(a=>byLine.set(a.offerLineId,cents((byLine.get(a.offerLineId)||0)+a.amount))));
    return ls.map(l=>({line:l,covered:byLine.get(l.id)||0,diff:cents((byLine.get(l.id)||0)-Number(l.amount||0))}));
  }
  function snapshot(){
    const s=flowSnapshot();
    return {offer:{...s.offer,amount:offerTotal()},lines:lines(),rules:RULES.map(r=>({...r,cap:ruleCap(r),matured:matured(r.id),available:available(r),status:ruleStatus(r)})),quotas:state.quotas.map(q=>({...q,allocations:q.allocations.map(a=>({...a}))})),coverage:coverage()};
  }

  function installStyles(){
    if(document.getElementById('billingRulesV37Styles'))return;
    const s=document.createElement('style');s.id='billingRulesV37Styles';s.textContent=`
      .br37-cover{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:6px;margin-bottom:9px}.br37-cover-card{padding:7px 8px;border:1px solid #dce3e6;border-radius:7px;background:#fff}.br37-cover-card span{display:block;font-size:7.5px;color:#728089;text-transform:uppercase;font-weight:760}.br37-cover-card strong{display:block;margin-top:3px;font-size:9.2px;color:#3e5662;line-height:1.25}.br37-cover-card.ok{background:#f3f9f5;border-color:#cfe2d4}.br37-cover-card.bad{background:#fff2f2;border-color:#e8c4c7}.br37-cover-card em{display:block;margin-top:3px;font-size:8px;font-style:normal;color:#60737d}
      .br37-table{border:1px solid #d8e0e4;border-radius:7px;overflow:hidden;background:#fff}.br37-row{display:grid;grid-template-columns:minmax(175px,1.25fr) minmax(190px,1.3fr) 95px 105px 105px 105px 118px;min-height:37px}.br37-row>div{display:flex;align-items:center;min-width:0;padding:5px 7px;border-right:1px solid #e7ecee;border-bottom:1px solid #e7ecee;font-size:8.8px;color:#40545f}.br37-row>div:last-child{border-right:0}.br37-row.head{min-height:29px;background:#f2f5f6}.br37-row.head>div{font-size:7.4px;font-weight:780;text-transform:uppercase;color:#66757e}.br37-row .money{justify-content:flex-end;font-weight:750;font-variant-numeric:tabular-nums}.br37-rule{font-weight:740}.br37-state{display:inline-flex;padding:4px 7px;border-radius:999px;background:#eef2f4;color:#60717a;font-size:7.5px;font-weight:750}.br37-state.done{background:#e7f4ea;color:#356a48}.br37-state.live{background:#fff0df;color:#955c1d}.br37-note{margin-top:8px;padding:8px 9px;border:1px solid #d8e5e9;border-radius:7px;background:#eef6f8;color:#526b76;font-size:8.5px;line-height:1.4}.br37-note strong{color:#335864}
      #kanbanBillingEvents.br37-strip{border-left-color:#517f8e!important}.br37-event-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:7px}.br37-event-head strong{display:block;font-size:11px;color:#354b56}.br37-event-head span{display:block;margin-top:2px;font-size:8px;color:#738189}.br37-event-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:7px}.br37-event{border:1px solid #dce3e6;border-radius:7px;background:#fafcfc;padding:8px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:center}.br37-event.done{border-left:3px solid #68a079;background:#f7fbf8}.br37-event.progress{border-left:3px solid #6a91a0}.br37-event-copy strong{display:block;font-size:9.6px;color:#334a56}.br37-event-copy span{display:block;margin-top:3px;font-size:7.9px;line-height:1.3;color:#718089}.br37-event-copy em{display:block;margin-top:4px;font-size:8px;font-style:normal;font-weight:740;color:#526d79}.br37-event button{height:28px;padding:0 8px;border:1px solid #d08a52;border-radius:5px;background:#fff7ef;color:#8b5126;font-size:8.2px;font-weight:750;cursor:pointer;white-space:nowrap}.br37-event.progress button{border-color:#93b4bf;background:#f4fafb;color:#416977}.br37-event-check{font-size:8.2px;font-weight:760;color:#47715a;white-space:nowrap}
      .br37-modal{position:fixed;inset:0;z-index:99997;background:rgba(25,36,44,.52);display:flex;align-items:center;justify-content:center;padding:18px}.br37-modal[hidden]{display:none!important}.br37-dialog{width:min(540px,96vw);background:#fff;border:1px solid #d5dde1;border-radius:9px;overflow:hidden;box-shadow:0 20px 55px rgba(25,37,45,.28)}.br37-modal-head{padding:12px 14px;background:#f5f7f8;border-bottom:1px solid #e1e7ea}.br37-modal-head strong{display:block;font-size:13px;color:#324853}.br37-modal-head span{display:block;margin-top:2px;font-size:8.4px;color:#718089}.br37-modal-body{padding:13px;display:grid;gap:9px}.br37-modal-summary{padding:8px 9px;border:1px solid #d8e5e9;border-radius:7px;background:#eef6f8;font-size:9px;color:#4b6672}.br37-modal-summary strong{font-size:11px;color:#315765}.br37-modal-body label{display:grid;gap:4px;font-size:8.4px;font-weight:700;color:#5a6c75}.br37-modal-body input,.br37-modal-body textarea{border:1px solid #d4dde1;border-radius:6px;padding:7px 8px;font-size:10px;color:#3e535e}.br37-modal-foot{display:flex;justify-content:flex-end;gap:7px;padding:10px 13px;border-top:1px solid #e1e7ea;background:#fafbfc}.br37-modal-foot button{height:30px;padding:0 10px;border:1px solid #d1dbe0;border-radius:6px;background:#fff;color:#536670;font-size:9px;font-weight:730;cursor:pointer}.br37-modal-foot button.primary{background:#e97026;border-color:#d7651d;color:#fff}
      @media(max-width:900px){.br37-table{overflow-x:auto}.br37-row{min-width:900px}}
    `;document.head.appendChild(s);
  }

  function renderPlan(){
    const body=document.getElementById('billingPlanBody');if(!body)return;
    const snap=snapshot();
    body.innerHTML=`<div class="plan36-intro"><div><strong>Regole di fatturazione</strong><span> · il Piano non crea fatture: definisce come e quando possono nascere Quote fatturabili.</span></div><span>Copertura ${money(snap.coverage.reduce((s,x)=>s+x.covered,0))} € / ${money(offerTotal())} €</span></div>
      <div class="br37-cover">${snap.coverage.map(x=>`<div class="br37-cover-card ${Math.abs(x.diff)<=.01?'ok':'bad'}"><span>${esc(x.line.phase||'Riga offerta')}</span><strong>${esc(x.line.description||'')}</strong><em>${money(x.covered)} € coperti su ${money(x.line.amount)} € · ${Math.abs(x.diff)<=.01?'100% ✓':'differenza '+money(x.diff)+' €'}</em></div>`).join('')}</div>
      <div class="br37-table"><div class="br37-row head"><div>Regola</div><div>Condizione che la attiva</div><div>Base</div><div>Massimale</div><div>Maturato</div><div>Disponibile</div><div>Stato</div></div>${snap.rules.map(r=>`<div class="br37-row"><div class="br37-rule">${esc(r.name)}</div><div>${esc(r.triggerLabel)}</div><div>${r.basis==='offer_percent'?r.percent+'% offerta':r.percent+'% riga/e'}</div><div class="money">${money(r.cap)} €</div><div class="money">${money(r.matured)} €</div><div class="money">${money(r.available)} €</div><div><span class="br37-state ${r.available<=.01?'done':r.mode==='progressive'?'live':''}">${esc(r.status)}</span></div></div>`).join('')}</div>
      <div class="br37-note"><strong>Distinzione fondamentale:</strong> una Regola ha un massimale contrattuale; ogni avvenimento reale genera una <strong>Quota fatturabile</strong>. La regola DL può quindi produrre SAL 1, SAL 2, SAL 3… senza superare il proprio massimale.</div>`;
  }

  function renderKanbanRules(){
    const strip=document.getElementById('kanbanBillingEvents');if(!strip)return;
    strip.classList.add('br37-strip');
    const snap=snapshot();
    strip.innerHTML=`<div class="br37-event-head"><div><strong>Avvenimenti che sbloccano la fatturazione</strong><span>Un solo Kanban: qui si registra ciò che è realmente avvenuto. Non sono attività con ore/costi.</span></div><span>${esc(snap.offer?.code||'23_68pe04')}</span></div><div class="br37-event-grid">${snap.rules.map(r=>{
      const done=r.available<=.01,progress=r.mode==='progressive';
      const action=r.auto?'':progress?'Registra nuovo SAL':r.trigger==='delivery'?'Registra consegna':'Registra avvenimento';
      return `<article class="br37-event ${done?'done':''} ${progress?'progress':''}"><div class="br37-event-copy"><strong>${esc(r.name)}</strong><span>${esc(r.triggerLabel)}</span><em>Massimale ${money(r.cap)} € · maturato ${money(r.matured)} € · disponibile ${money(r.available)} €</em></div>${done?'<span class="br37-event-check">✓ coperta</span>':r.auto?'<span class="br37-event-check">automatico</span>':`<button type="button" data-br37-rule="${r.id}">${action}</button>`}</article>`;
    }).join('')}</div>`;
    strip.querySelectorAll('[data-br37-rule]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.br37Rule)));
  }

  function ensureModal(){
    if(modal)return modal;
    modal=document.createElement('div');modal.id='billingRuleModalV37';modal.className='br37-modal';modal.hidden=true;
    modal.innerHTML=`<div class="br37-dialog"><div class="br37-modal-head"><strong data-br37-title>Registra avvenimento</strong><span data-br37-sub></span></div><div class="br37-modal-body"><div class="br37-modal-summary" data-br37-summary></div><label data-br37-amount-wrap>Importo SAL da maturare<input type="number" step="0.01" min="0" data-br37-amount></label><label>Data avvenimento<input type="date" data-br37-date></label><label>Nota<textarea rows="3" data-br37-note placeholder="Es. consegna effettuata, SAL novembre, inizio lavori"></textarea></label><label>Documento / riferimento<input data-br37-ref placeholder="Verbale, protocollo, link SharePoint... (facoltativo)"></label></div><div class="br37-modal-foot"><button type="button" data-br37-cancel>Annulla</button><button type="button" class="primary" data-br37-confirm>Genera quota fatturabile</button></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-br37-cancel]').addEventListener('click',()=>modal.hidden=true);
    modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true;});
    modal.querySelector('[data-br37-confirm]').addEventListener('click',confirmModal);
    return modal;
  }
  function openModal(ruleId){
    const rule=ruleById(ruleId);if(!rule)return;state.modalRuleId=ruleId;const m=ensureModal(),left=available(rule),progress=rule.mode==='progressive';
    m.querySelector('[data-br37-title]').textContent=progress?'Registra nuovo SAL':'Registra avvenimento';
    m.querySelector('[data-br37-sub]').textContent=rule.name+' · '+triggerType(rule);
    m.querySelector('[data-br37-summary]').innerHTML=`Massimale regola <strong>${money(ruleCap(rule))} €</strong> · già maturato <strong>${money(matured(rule.id))} €</strong> · ancora disponibile <strong>${money(left)} €</strong>`;
    m.querySelector('[data-br37-amount-wrap]').hidden=!progress;
    m.querySelector('[data-br37-amount]').value=progress?String(Math.min(5000,left)):String(left);
    m.querySelector('[data-br37-date]').value=new Date().toISOString().slice(0,10);
    m.querySelector('[data-br37-note]').value='';m.querySelector('[data-br37-ref]').value='';m.hidden=false;
  }
  function confirmModal(){
    const rule=ruleById(state.modalRuleId);if(!rule)return;const m=ensureModal();
    let amount=rule.mode==='progressive'?Number(m.querySelector('[data-br37-amount]').value||0):available(rule);
    amount=cents(amount);if(amount<=0||amount>available(rule)+.01){alert(`Inserisci un importo compreso tra 0 e ${money(available(rule))} €.`);return;}
    const eventDate=m.querySelector('[data-br37-date]').value;if(!eventDate){alert('Indica la data dell’avvenimento.');return;}
    addQuota(rule,amount,{eventDate,note:m.querySelector('[data-br37-note]').value.trim(),reference:m.querySelector('[data-br37-ref]').value.trim()});m.hidden=true;
  }

  function renderAll(){renderPlan();renderKanbanRules();}
  function emit(){
    renderAll();
    window.dispatchEvent(new CustomEvent('dabster-billing-rules-change',{detail:snapshot()}));
  }

  function install(){
    installStyles();ensureModal();seedAutomatic();renderAll();
    window.addEventListener('dabster-pe04-flow-change',()=>setTimeout(renderAll,0));
    initialTimer=setInterval(renderAll,450);setTimeout(()=>{clearInterval(initialTimer);initialTimer=null;},12000);
    window.DABSTER_BILLING_RULES={version:'v37',rules:RULES,getSnapshot:snapshot,openTrigger:openModal,addQuota:(ruleId,amount,meta)=>{const r=ruleById(ruleId);return r?addQuota(r,amount,meta):null;},reset(){state.quotas=[];state.seeded=false;seedAutomatic();emit();}};
    emit();
  }

  let attempts=0;(function wait(){if(window.DABSTER_PE04_FLOW&&document.getElementById('kanbanPage')){install();return;}if(attempts++<240)setTimeout(wait,50);})();
})();
