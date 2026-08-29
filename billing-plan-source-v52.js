/* v55 - Invoice source choice appears only after a specific offer is selected and only when a Billing Plan exists. */
(function(){
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  let mode='lines',observer=null;

  function planApi(){return window.DABSTER_BILLING_PLAN_V47||window.DABSTER_BILLING_PLAN_V46||null;}
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

  function installStyles(){if(document.getElementById('billingPlanSourceV55Styles'))return;const s=document.createElement('style');s.id='billingPlanSourceV55Styles';s.textContent=`
    .bp55-source-choice{display:flex;align-items:center;gap:7px;margin:8px 9px;padding:5px 6px;border:1px solid #d8e1e5;border-radius:7px;background:#f5f8f9;width:max-content;max-width:calc(100% - 18px)}.bp55-source-label{padding-left:3px;color:#687b84;font-size:7.7px;font-weight:780}.bp55-source-choice button{height:26px;padding:0 9px;border:0;border-radius:5px;background:transparent;color:#657680;font-size:8px;font-weight:760;cursor:pointer;white-space:nowrap}.bp55-source-choice button.active{background:#fff;color:#315b6b;box-shadow:0 1px 3px rgba(33,58,68,.12)}
    .bp52-plan-panel{padding:0 9px 9px}.bp52-plan-note{margin-bottom:7px;padding:6px 8px;border:1px solid #dce5e8;border-radius:6px;background:#f8fbfc;color:#6c7e87;font-size:7.8px;line-height:1.35}.bp52-plan-table{border:1px solid #d8e1e5;border-radius:7px;overflow:hidden;background:#fff}.bp52-plan-row{display:grid;grid-template-columns:minmax(125px,1.05fr) minmax(170px,1.45fr) 110px 105px 105px;min-height:38px}.bp52-plan-row>div{display:flex;align-items:center;min-width:0;padding:6px 7px;border-right:1px solid #e7ecee;border-bottom:1px solid #e7ecee;font-size:8.2px;color:#40555f}.bp52-plan-row>div:last-child{border-right:0;justify-content:center}.bp52-plan-row.head{min-height:28px;background:#f2f5f6}.bp52-plan-row.head>div{font-size:7px;font-weight:800;text-transform:uppercase;color:#697981}.bp52-event{font-weight:780;color:#34515e}.bp52-money{justify-content:flex-end!important;font-weight:800;font-variant-numeric:tabular-nums}.bp52-use{height:25px;padding:0 8px;border:1px solid #d16a27;border-radius:5px;background:#e97026;color:#fff;font-size:7.6px;font-weight:780;cursor:pointer}.bp52-use:disabled{opacity:.4;cursor:not-allowed}.bp52-invalid{color:#a05c62!important;background:#fff8f8}
    @media(max-width:720px){.bp55-source-choice{gap:3px}.bp55-source-label{display:none}.bp52-plan-row{grid-template-columns:minmax(0,1.2fr) minmax(0,1.35fr) 92px 90px}.bp52-plan-row>div:nth-child(3){display:none}.bp52-plan-row.head>div:nth-child(3){display:none}}
  `;document.head.appendChild(s);}

  function renderPlanPanel(panel){
    const rows=planRows();
    panel.innerHTML=`<div class="bp52-plan-note"><strong>Piano di fatturazione.</strong> Seleziona la quota da portare in fattura. Le allocazioni alle Righe Offerta restano interne; la fattura viene emessa solo quando premi Salva fattura.</div><div class="bp52-plan-table"><div class="bp52-plan-row head"><div>Evento</div><div>Base</div><div>Trigger</div><div>Importo</div><div></div></div>${rows.map(r=>`<div class="bp52-plan-row ${r.valid?'':'bp52-invalid'}"><div class="bp52-event">${esc(r.eventLabel||'Evento piano')}</div><div>${esc(baseLabel(r))}</div><div>${esc(triggerLabel(r))}</div><div class="bp52-money">${money(r.calculatedAmount||r.amount||0)} €</div><div><button type="button" class="bp52-use" data-bp52-use="${esc(r.id)}" ${r.valid?'':'disabled'}>Aggiungi</button></div></div>`).join('')}</div>`;
    panel.querySelectorAll('[data-bp52-use]').forEach(btn=>btn.addEventListener('click',()=>window.DABSTER_PLAN_TO_INVOICE_V51?.openPlanEvent?.(btn.dataset.bp52Use)));
  }

  function applyMode(section,source,panel,choice){
    const hasPlan=planRows().length>0,selected=offerSelected(source),showChoice=selected&&hasPlan;
    choice.hidden=!showChoice;
    if(!showChoice){source.hidden=false;panel.hidden=true;return;}
    const plan=mode==='plan';source.hidden=plan;panel.hidden=!plan;
    choice.querySelectorAll('[data-bp55-mode]').forEach(b=>b.classList.toggle('active',b.dataset.bp55Mode===mode));
    if(plan)renderPlanPanel(panel);
  }

  function installIntoInvoice(){
    const page=document.getElementById('newInvoicePageV39');if(!page||page.hidden)return false;
    const section=page.querySelector('.ni39-section.source'),source=section?.querySelector('#ni39Source');if(!section||!source)return false;
    let choice=section.querySelector(':scope > .bp55-source-choice');
    if(!choice){
      section.querySelector(':scope > .bp52-switch')?.remove();
      choice=document.createElement('div');choice.className='bp55-source-choice';
      choice.innerHTML='<span class="bp55-source-label">Fattura da:</span><button type="button" data-bp55-mode="plan">Da Piano</button><button type="button" data-bp55-mode="lines">Da Righe Offerta</button>';
      section.insertBefore(choice,source);
      choice.querySelectorAll('[data-bp55-mode]').forEach(btn=>btn.addEventListener('click',()=>{mode=btn.dataset.bp55Mode;applyMode(section,source,panel,choice);}));
    }
    let panel=section.querySelector(':scope > .bp52-plan-panel');if(!panel){panel=document.createElement('div');panel.className='bp52-plan-panel';source.insertAdjacentElement('afterend',panel);}
    applyMode(section,source,panel,choice);return true;
  }

  function scheduleInstall(){setTimeout(installIntoInvoice,0);setTimeout(installIntoInvoice,35);setTimeout(installIntoInvoice,120);}
  function install(){
    installStyles();observer=new MutationObserver(mutations=>{if(mutations.some(m=>m.type==='childList'||(m.type==='attributes'&&m.attributeName==='hidden')))scheduleInstall();});observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
    window.addEventListener('hashchange',scheduleInstall);window.addEventListener('dabster-billing-plan-ready',scheduleInstall);window.addEventListener('dabster-offer-flow-change',scheduleInstall);
    document.addEventListener('click',e=>{if(e.target.closest?.('[data-new-invoice], [data-page="billing"], [data-cancel-invoice], [data-src-commessa], [data-src-offer], [data-src-nav]'))scheduleInstall();},true);
    const api={setMode(next){mode=next==='plan'?'plan':'lines';scheduleInstall();},refresh:scheduleInstall};window.DABSTER_BILLING_PLAN_SOURCE_V55=api;window.DABSTER_BILLING_PLAN_SOURCE_V54=api;window.DABSTER_BILLING_PLAN_SOURCE_V53=api;window.DABSTER_BILLING_PLAN_SOURCE_V52=api;
    let tries=0;const timer=setInterval(()=>{if(installIntoInvoice()||++tries>100)clearInterval(timer);},50);scheduleInstall();
  }
  install();
})();