/* v56 - Nuova fattura: Righe Offerta sempre visibili, Piano sotto come precompilazione assistita. */
(function(){
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let observer=null;

  function planApi(){return window.DABSTER_BILLING_PLAN_V47||window.DABSTER_BILLING_PLAN_V46||null;}
  function bridgeApi(){return window.DABSTER_PLAN_TO_INVOICE_V52||window.DABSTER_PLAN_TO_INVOICE_V51||null;}
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

  function installStyles(){if(document.getElementById('billingPlanSourceV56Styles'))return;const s=document.createElement('style');s.id='billingPlanSourceV56Styles';s.textContent=`
    .bp56-plan{margin:0 9px 9px;border:1px solid #d9e2e5;border-radius:7px;background:#fbfcfc;overflow:hidden}.bp56-plan[hidden]{display:none!important}
    .bp56-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 8px;border-bottom:1px solid #e1e7e9;background:#f4f7f8}.bp56-head strong{display:block;font-size:9px;color:#3d5662}.bp56-head span{display:block;margin-top:2px;font-size:7.3px;color:#78858c}.bp56-head-total{font-size:8px!important;font-weight:780;color:#526d78!important;white-space:nowrap}
    .bp56-note{padding:6px 8px;border-bottom:1px solid #e6ebed;background:#fff;color:#6d7d85;font-size:7.6px;line-height:1.35}.bp56-note strong{color:#405d69}
    .bp56-row{display:grid;grid-template-columns:minmax(125px,1.05fr) minmax(155px,1.25fr) 110px 105px 118px;min-height:37px}.bp56-row>div{display:flex;align-items:center;min-width:0;padding:6px 7px;border-right:1px solid #e8edef;border-bottom:1px solid #e8edef;font-size:8.1px;color:#415761}.bp56-row>div:last-child{border-right:0;justify-content:center}.bp56-row:last-child>div{border-bottom:0}.bp56-row.head{min-height:27px;background:#f7f9fa}.bp56-row.head>div{font-size:6.9px;font-weight:800;text-transform:uppercase;color:#6c7a82}.bp56-event{font-weight:780;color:#344f5b!important}.bp56-money{justify-content:flex-end!important;font-weight:800;font-variant-numeric:tabular-nums}.bp56-invalid{background:#fff8f8}.bp56-apply{height:25px;padding:0 8px;border:1px solid #c9d7dc;border-radius:5px;background:#fff;color:#426675;font-size:7.5px;font-weight:780;cursor:pointer;white-space:nowrap}.bp56-apply:hover:not(:disabled){background:#edf6f8;border-color:#b8ced6}.bp56-apply.applied{background:#edf7f0;border-color:#c5ddcc;color:#477255}.bp56-apply:disabled{opacity:.62;cursor:not-allowed}
    .bp56-empty{padding:9px;color:#7b878d;font-size:8px}.bp56-plan + *{margin-top:0}
    @media(max-width:720px){.bp56-head{align-items:flex-start}.bp56-row{grid-template-columns:minmax(0,1.2fr) minmax(0,1.15fr) 92px 105px}.bp56-row>div:nth-child(3){display:none}.bp56-row.head>div:nth-child(3){display:none}.bp56-note{font-size:7.3px}}
  `;document.head.appendChild(s);}

  function renderPanel(panel){
    const snap=planSnapshot(),rows=planRows(),bridge=bridgeApi();
    panel.innerHTML=`<div class="bp56-head"><div><strong>Piano di fatturazione</strong><span>Supporto alla compilazione delle Righe Offerta selezionate.</span></div><span class="bp56-head-total">${money(snap.allocated||snap.planned||0)} € pianificati</span></div><div class="bp56-note"><strong>Applica</strong> precompila gli importi “Da fatturare” nelle Righe Offerta sopra. Puoi modificarli manualmente prima di creare le Righe Fattura.</div>${rows.length?`<div class="bp56-row head"><div>Evento</div><div>Base</div><div>Trigger</div><div>Importo</div><div></div></div>${rows.map(r=>{const done=!!bridge?.isApplied?.(r.id);return `<div class="bp56-row ${r.valid?'':'bp56-invalid'}"><div class="bp56-event">${esc(r.eventLabel||'Evento piano')}</div><div>${esc(baseLabel(r))}</div><div>${esc(triggerLabel(r))}</div><div class="bp56-money">${money(r.calculatedAmount||r.amount||0)} €</div><div><button type="button" class="bp56-apply ${done?'applied':''}" data-bp56-apply="${esc(r.id)}" ${!r.valid||done?'disabled':''}>${done?'Applicato ✓':'Applica'}</button></div></div>`;}).join('')}`:`<div class="bp56-empty">Nessuna quota disponibile nel Piano di fatturazione.</div>`}`;
    panel.querySelectorAll('[data-bp56-apply]').forEach(btn=>btn.addEventListener('click',()=>bridgeApi()?.applyPlanEvent?.(btn.dataset.bp56Apply)));
  }

  function installIntoInvoice(){
    const page=document.getElementById('newInvoicePageV39');if(!page||page.hidden)return false;
    const section=page.querySelector('.ni39-section.source'),source=section?.querySelector('#ni39Source');if(!section||!source)return false;
    source.hidden=false;
    section.querySelector(':scope > .bp55-source-choice')?.remove();
    section.querySelector(':scope > .bp52-switch')?.remove();
    let panel=section.querySelector(':scope > .bp56-plan');
    if(!panel){section.querySelector(':scope > .bp52-plan-panel')?.remove();panel=document.createElement('div');panel.className='bp56-plan';source.insertAdjacentElement('afterend',panel);}
    const show=offerSelected(source)&&planRows().length>0;panel.hidden=!show;if(show)renderPanel(panel);return true;
  }

  function scheduleInstall(){setTimeout(installIntoInvoice,0);setTimeout(installIntoInvoice,35);setTimeout(installIntoInvoice,120);}
  function install(){
    installStyles();observer=new MutationObserver(mutations=>{if(mutations.some(m=>m.type==='childList'||(m.type==='attributes'&&m.attributeName==='hidden')))scheduleInstall();});observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
    window.addEventListener('hashchange',scheduleInstall);window.addEventListener('dabster-billing-plan-ready',scheduleInstall);window.addEventListener('dabster-offer-flow-change',scheduleInstall);window.addEventListener('dabster-plan-applied-to-lines',scheduleInstall);
    document.addEventListener('click',e=>{if(e.target.closest?.('[data-new-invoice], [data-page="billing"], [data-cancel-invoice], [data-src-commessa], [data-src-offer], [data-src-nav], [data-add-selected]'))scheduleInstall();},true);
    const api={refresh:scheduleInstall};window.DABSTER_BILLING_PLAN_SOURCE_V56=api;window.DABSTER_BILLING_PLAN_SOURCE_V55=api;window.DABSTER_BILLING_PLAN_SOURCE_V54=api;window.DABSTER_BILLING_PLAN_SOURCE_V53=api;window.DABSTER_BILLING_PLAN_SOURCE_V52=api;
    let tries=0;const timer=setInterval(()=>{if(installIntoInvoice()||++tries>100)clearInterval(timer);},50);scheduleInstall();
  }
  install();
})();