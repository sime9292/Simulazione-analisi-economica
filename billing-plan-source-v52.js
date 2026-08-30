/* v57 - Nuova fattura: Righe Offerta sempre visibili, Piano sotto; Applica usa direttamente il workspace fatturazione. */
(function(){
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let observer=null,installQueued=false,lastMessage='';
  const applied=new Set();

  function planApi(){return window.DABSTER_BILLING_PLAN_V47||window.DABSTER_BILLING_PLAN_V46||null;}
  function billingApi(){return window.DABSTER_BILLING_V40||window.DABSTER_BILLING_V39||null;}
  function planSnapshot(){try{return planApi()?.getSnapshot?.()||{rows:[]};}catch{return {rows:[]};}}
  function planContext(){try{return planApi()?.getContext?.()||{lines:[]};}catch{return {lines:[]};}}
  function planRows(){return (planSnapshot().rows||[]).filter(r=>Number(r.calculatedAmount||r.amount||0)>0);}
  function baseLabel(row){if(row.baseType==='offer')return 'Totale offerta';const line=(planContext().lines||[]).find(x=>String(x.id)===String(row.baseRef));return line?.description||'Riga Offerta';}
  function triggerLabel(row){return row.trigger==='activity_closed'?'Attività conclusa':'Offerta confermata';}
  function offerSelected(source){
    if(!source)return false;
    if(source.querySelector('[data-src-check],[data-src-amount]'))return true;
    const crumb=source.querySelector('.bw39-breadcrumb');
    return [...(crumb?.querySelectorAll('strong')||[])].some(x=>String(x.textContent||'').trim()==='Righe Offerta');
  }
  function enrichedAllocations(row){
    const ctx=planContext();
    return (row.allocations||[]).map(a=>{
      const line=(ctx.lines||[]).find(x=>String(x.id)===String(a.lineId));
      return {lineId:a.lineId,amount:Number(a.amount||0),phase:line?.phase||a.phase||''};
    });
  }

  function installStyles(){if(document.getElementById('billingPlanSourceV57Styles'))return;const s=document.createElement('style');s.id='billingPlanSourceV57Styles';s.textContent=`
    .bp56-plan{margin:0 9px 9px;border:1px solid #d9e2e5;border-radius:7px;background:#fbfcfc;overflow:hidden}.bp56-plan[hidden]{display:none!important}
    .bp56-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 8px;border-bottom:1px solid #e1e7e9;background:#f4f7f8}.bp56-head strong{display:block;font-size:9px;color:#3d5662}.bp56-head span{display:block;margin-top:2px;font-size:7.3px;color:#78858c}.bp56-head-total{font-size:8px!important;font-weight:780;color:#526d78!important;white-space:nowrap}
    .bp56-note{padding:6px 8px;border-bottom:1px solid #e6ebed;background:#fff;color:#6d7d85;font-size:7.6px;line-height:1.35}.bp56-note strong{color:#405d69}.bp57-message{padding:6px 8px;border-bottom:1px solid #dce6e9;background:#eef7f9;color:#416573;font-size:7.8px;font-weight:720}.bp57-message.error{background:#fff3f3;border-color:#ecc9cc;color:#984c53}.bp57-message[hidden]{display:none!important}
    .bp56-row{display:grid;grid-template-columns:minmax(125px,1.05fr) minmax(155px,1.25fr) 110px 105px 118px;min-height:37px}.bp56-row>div{display:flex;align-items:center;min-width:0;padding:6px 7px;border-right:1px solid #e8edef;border-bottom:1px solid #e8edef;font-size:8.1px;color:#415761}.bp56-row>div:last-child{border-right:0;justify-content:center}.bp56-row:last-child>div{border-bottom:0}.bp56-row.head{min-height:27px;background:#f7f9fa}.bp56-row.head>div{font-size:6.9px;font-weight:800;text-transform:uppercase;color:#6c7a82}.bp56-event{font-weight:780;color:#344f5b!important}.bp56-money{justify-content:flex-end!important;font-weight:800;font-variant-numeric:tabular-nums}.bp56-invalid{background:#fff8f8}.bp56-apply{height:25px;padding:0 8px;border:1px solid #c9d7dc;border-radius:5px;background:#fff;color:#426675;font-size:7.5px;font-weight:780;cursor:pointer;white-space:nowrap}.bp56-apply:hover:not(:disabled){background:#edf6f8;border-color:#b8ced6}.bp56-apply.applied{background:#edf7f0;border-color:#c5ddcc;color:#477255}.bp56-apply:disabled{opacity:.62;cursor:not-allowed}.bp56-empty{padding:9px;color:#7b878d;font-size:8px}
    @media(max-width:720px){.bp56-head{align-items:flex-start}.bp56-row{grid-template-columns:minmax(0,1.2fr) minmax(0,1.15fr) 92px 105px}.bp56-row>div:nth-child(3){display:none}.bp56-row.head>div:nth-child(3){display:none}.bp56-note{font-size:7.3px}}
  `;document.head.appendChild(s);}

  function setMessage(text,error=false){lastMessage=text||'';const box=document.querySelector('#newInvoicePageV39 .bp57-message');if(box){box.textContent=lastMessage;box.classList.toggle('error',!!error);box.hidden=!lastMessage;}}

  function applyRow(rowId){
    const row=planRows().find(r=>String(r.id)===String(rowId));
    if(!row||!row.valid){setMessage('Completa la regola del Piano prima di applicarla.',true);return;}
    if(applied.has(row.id))return;
    const billing=billingApi();
    if(!billing?.applySourceAllocations){setMessage('Workspace fatturazione non aggiornato: funzione di applicazione non disponibile.',true);return;}
    const allocations=enrichedAllocations(row);
    if(!allocations.length){setMessage('La quota del Piano non contiene allocazioni verso le Righe Offerta.',true);return;}
    const result=billing.applySourceAllocations(allocations,{mode:'add',message:`Applicato dal Piano: ${row.eventLabel||'Quota Piano'} · ${money(row.calculatedAmount||row.amount||0)} €`});
    if(!result?.ok){setMessage(result?.error||'Impossibile applicare la quota del Piano.',true);return;}
    applied.add(row.id);
    const selections=billing.getSourceSelections?.()||[];
    const expected=result.selections||[];
    const verified=expected.every(x=>selections.some(s=>String(s.key)===String(x.lineId)&&Math.abs(Number(s.value||0)-Number(x.value||0))<0.01));
    if(!verified){setMessage('La quota è stata ricevuta ma la tabella non ha mantenuto gli importi. Segnalazione tecnica attiva.',true);console.error('[Dabster v57] verifica selezioni fallita',{row,result,selections});}
    else setMessage(`Applicato: ${row.eventLabel||'Quota Piano'} · ${money(row.calculatedAmount||row.amount||0)} €. Gli importi restano modificabili manualmente.`,false);
    scheduleInstall();
  }

  function renderPanel(panel){
    const snap=planSnapshot(),rows=planRows();
    panel.innerHTML=`<div class="bp56-head"><div><strong>Piano di fatturazione</strong><span>Supporto alla compilazione delle Righe Offerta selezionate.</span></div><span class="bp56-head-total">${money(snap.allocated||snap.planned||0)} € pianificati</span></div><div class="bp56-note"><strong>Applica</strong> precompila gli importi “Da fatturare” nelle Righe Offerta sopra. Puoi modificarli manualmente prima di creare le Righe Fattura.</div><div class="bp57-message" ${lastMessage?'':'hidden'}>${esc(lastMessage)}</div>${rows.length?`<div class="bp56-row head"><div>Evento</div><div>Base</div><div>Trigger</div><div>Importo</div><div></div></div>${rows.map(r=>{const done=applied.has(r.id);return `<div class="bp56-row ${r.valid?'':'bp56-invalid'}"><div class="bp56-event">${esc(r.eventLabel||'Evento piano')}</div><div>${esc(baseLabel(r))}</div><div>${esc(triggerLabel(r))}</div><div class="bp56-money">${money(r.calculatedAmount||r.amount||0)} €</div><div><button type="button" class="bp56-apply ${done?'applied':''}" data-bp57-apply="${esc(r.id)}" ${!r.valid||done?'disabled':''}>${done?'Applicato ✓':'Applica'}</button></div></div>`;}).join('')}`:`<div class="bp56-empty">Nessuna quota disponibile nel Piano di fatturazione.</div>`}`;
    panel.querySelectorAll('[data-bp57-apply]').forEach(btn=>btn.addEventListener('click',()=>applyRow(btn.dataset.bp57Apply)));
  }

  function installIntoInvoice(){
    const page=document.getElementById('newInvoicePageV39');if(!page||page.hidden)return false;
    const section=page.querySelector('.ni39-section.source'),source=section?.querySelector('#ni39Source');if(!section||!source)return false;
    source.hidden=false;
    section.querySelector(':scope > .bp55-source-choice')?.remove();section.querySelector(':scope > .bp52-switch')?.remove();section.querySelector(':scope > .bp52-plan-panel')?.remove();
    let panel=section.querySelector(':scope > .bp56-plan');if(!panel){panel=document.createElement('div');panel.className='bp56-plan';source.insertAdjacentElement('afterend',panel);}
    const show=offerSelected(source)&&planRows().length>0;panel.hidden=!show;if(show)renderPanel(panel);return true;
  }

  function scheduleInstall(){if(installQueued)return;installQueued=true;setTimeout(()=>{installQueued=false;installIntoInvoice();},0);setTimeout(installIntoInvoice,60);}
  function install(){
    installStyles();observer=new MutationObserver(mutations=>{if(mutations.some(m=>m.type==='childList'||(m.type==='attributes'&&m.attributeName==='hidden')))scheduleInstall();});observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
    window.addEventListener('hashchange',scheduleInstall);window.addEventListener('dabster-billing-plan-ready',scheduleInstall);window.addEventListener('dabster-offer-flow-change',scheduleInstall);
    document.addEventListener('click',e=>{if(e.target.closest?.('[data-new-invoice], [data-page="billing"], [data-cancel-invoice], [data-src-commessa], [data-src-offer], [data-src-nav], [data-add-selected]'))scheduleInstall();},true);
    const api={refresh:scheduleInstall,applyRow};window.DABSTER_BILLING_PLAN_SOURCE_V57=api;window.DABSTER_BILLING_PLAN_SOURCE_V56=api;window.DABSTER_BILLING_PLAN_SOURCE_V55=api;window.DABSTER_BILLING_PLAN_SOURCE_V54=api;window.DABSTER_BILLING_PLAN_SOURCE_V53=api;window.DABSTER_BILLING_PLAN_SOURCE_V52=api;
    let tries=0;const timer=setInterval(()=>{if(installIntoInvoice()||++tries>100)clearInterval(timer);},50);scheduleInstall();
  }
  install();
})();