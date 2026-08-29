/* v54 - New invoice source switcher: Offer Lines or Billing Plan, shared by manual and Test. */
(function(){
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  let mode='lines',observer=null;

  function planApi(){return window.DABSTER_BILLING_PLAN_V47||window.DABSTER_BILLING_PLAN_V46||null;}
  function planSnapshot(){try{return planApi()?.getSnapshot?.()||{rows:[]};}catch{return {rows:[]};}}
  function planContext(){try{return planApi()?.getContext?.()||{lines:[]};}catch{return {lines:[]};}}
  function baseLabel(row){if(row.baseType==='offer')return 'Totale offerta';const line=(planContext().lines||[]).find(x=>String(x.id)===String(row.baseRef));return line?.description||'Riga Offerta';}
  function triggerLabel(row){return row.trigger==='activity_closed'?'Attività conclusa':'Offerta confermata';}

  function installStyles(){if(document.getElementById('billingPlanSourceV54Styles'))return;const s=document.createElement('style');s.id='billingPlanSourceV54Styles';s.textContent=`
    .bp52-switch{display:flex;align-items:center;gap:4px;margin:8px 9px;padding:3px;border:1px solid #d8e1e5;border-radius:7px;background:#f5f8f9;width:max-content;max-width:calc(100% - 18px)}.bp52-switch button{height:26px;padding:0 9px;border:0;border-radius:5px;background:transparent;color:#657680;font-size:8px;font-weight:760;cursor:pointer}.bp52-switch button.active{background:#fff;color:#315b6b;box-shadow:0 1px 3px rgba(33,58,68,.12)}
    .bp52-plan-panel{padding:0 9px 9px}.bp52-plan-note{margin-bottom:7px;padding:6px 8px;border:1px solid #dce5e8;border-radius:6px;background:#f8fbfc;color:#6c7e87;font-size:7.8px;line-height:1.35}.bp52-plan-table{border:1px solid #d8e1e5;border-radius:7px;overflow:hidden;background:#fff}.bp52-plan-row{display:grid;grid-template-columns:minmax(125px,1.05fr) minmax(170px,1.45fr) 110px 105px 105px;min-height:38px}.bp52-plan-row>div{display:flex;align-items:center;min-width:0;padding:6px 7px;border-right:1px solid #e7ecee;border-bottom:1px solid #e7ecee;font-size:8.2px;color:#40555f}.bp52-plan-row>div:last-child{border-right:0;justify-content:center}.bp52-plan-row.head{min-height:28px;background:#f2f5f6}.bp52-plan-row.head>div{font-size:7px;font-weight:800;text-transform:uppercase;color:#697981}.bp52-event{font-weight:780;color:#34515e}.bp52-money{justify-content:flex-end!important;font-weight:800;font-variant-numeric:tabular-nums}.bp52-use{height:25px;padding:0 8px;border:1px solid #d16a27;border-radius:5px;background:#e97026;color:#fff;font-size:7.6px;font-weight:780;cursor:pointer}.bp52-use:disabled{opacity:.4;cursor:not-allowed}.bp52-invalid{color:#a05c62!important;background:#fff8f8}
    @media(max-width:720px){.bp52-plan-row{grid-template-columns:minmax(0,1.2fr) minmax(0,1.35fr) 92px 90px}.bp52-plan-row>div:nth-child(3){display:none}.bp52-plan-row.head>div:nth-child(3){display:none}}
  `;document.head.appendChild(s);}

  function renderPlanPanel(panel){
    const rows=planSnapshot().rows||[];
    panel.innerHTML=`<div class="bp52-plan-note"><strong>Piano di fatturazione.</strong> Seleziona la quota da portare in fattura. Il sistema mantiene le allocazioni interne alle Righe Offerta; la fattura resta modificabile e viene emessa solo quando premi Salva fattura.</div>${rows.length?`<div class="bp52-plan-table"><div class="bp52-plan-row head"><div>Evento</div><div>Base</div><div>Trigger</div><div>Importo</div><div></div></div>${rows.map(r=>`<div class="bp52-plan-row ${r.valid?'':'bp52-invalid'}"><div class="bp52-event">${esc(r.eventLabel||'Evento piano')}</div><div>${esc(baseLabel(r))}</div><div>${esc(triggerLabel(r))}</div><div class="bp52-money">${money(r.calculatedAmount||r.amount||0)} €</div><div><button type="button" class="bp52-use" data-bp52-use="${esc(r.id)}" ${r.valid?'':'disabled'}>Aggiungi</button></div></div>`).join('')}</div>`:`<div class="ni39-empty">Nessuna regola nel Piano di fatturazione.</div>`}`;
    panel.querySelectorAll('[data-bp52-use]').forEach(btn=>btn.addEventListener('click',()=>window.DABSTER_PLAN_TO_INVOICE_V51?.openPlanEvent?.(btn.dataset.bp52Use)));
  }

  function applyMode(section){
    const source=section.querySelector('#ni39Source'),panel=section.querySelector('.bp52-plan-panel');if(!source||!panel)return;
    const plan=mode==='plan';source.hidden=plan;panel.hidden=!plan;
    section.querySelectorAll('[data-bp52-mode]').forEach(b=>b.classList.toggle('active',b.dataset.bp52Mode===mode));
    if(plan)renderPlanPanel(panel);
  }

  function installIntoInvoice(){
    const page=document.getElementById('newInvoicePageV39');if(!page||page.hidden)return false;
    const section=page.querySelector('.ni39-section.source'),source=section?.querySelector('#ni39Source');if(!section||!source)return false;
    let sw=section.querySelector(':scope > .bp52-switch');
    if(!sw){sw=document.createElement('div');sw.className='bp52-switch';sw.innerHTML='<button type="button" data-bp52-mode="lines">Righe Offerta</button><button type="button" data-bp52-mode="plan">Piano di fatturazione</button>';section.insertBefore(sw,source);sw.querySelectorAll('[data-bp52-mode]').forEach(btn=>btn.addEventListener('click',()=>{mode=btn.dataset.bp52Mode;applyMode(section);}));}
    let panel=section.querySelector(':scope > .bp52-plan-panel');if(!panel){panel=document.createElement('div');panel.className='bp52-plan-panel';source.insertAdjacentElement('afterend',panel);}
    applyMode(section);return true;
  }

  function scheduleInstall(){setTimeout(installIntoInvoice,0);setTimeout(installIntoInvoice,40);setTimeout(installIntoInvoice,140);}
  function install(){
    installStyles();observer=new MutationObserver(mutations=>{if(mutations.some(m=>m.type==='childList'||(m.type==='attributes'&&m.attributeName==='hidden')))scheduleInstall();});observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
    window.addEventListener('hashchange',scheduleInstall);window.addEventListener('dabster-billing-plan-ready',scheduleInstall);window.addEventListener('dabster-offer-flow-change',scheduleInstall);
    document.addEventListener('click',e=>{if(e.target.closest?.('[data-new-invoice], [data-page="billing"], [data-cancel-invoice]'))scheduleInstall();},true);
    const api={setMode(next){mode=next==='plan'?'plan':'lines';scheduleInstall();},refresh:scheduleInstall};window.DABSTER_BILLING_PLAN_SOURCE_V54=api;window.DABSTER_BILLING_PLAN_SOURCE_V53=api;window.DABSTER_BILLING_PLAN_SOURCE_V52=api;
    let tries=0;const timer=setInterval(()=>{if(installIntoInvoice()||++tries>100)clearInterval(timer);},50);scheduleInstall();
  }
  install();
})();