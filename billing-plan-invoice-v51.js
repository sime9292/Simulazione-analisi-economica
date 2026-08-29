/* v51 - Shared bridge: Piano di fatturazione -> existing manual Nuova fattura workflow. */
(function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  let preparing=false,lastPlanInfo=null,testBillingPrepared=false,observer=null;

  async function waitFor(fn,loops=260,delay=40){for(let i=0;i<loops;i++){const v=fn();if(v)return v;await sleep(delay);}return null;}
  function planApi(){return window.DABSTER_BILLING_PLAN_V47||null;}
  function planRow(id){return planApi()?.getSnapshot?.().rows?.find(x=>x.id===id)||null;}
  function sourceInput(kind,value){return [...document.querySelectorAll(`[data-${kind}]`)].find(x=>x.dataset[kind.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]===value)||null;}
  function draftIds(){return new Set([...document.querySelectorAll('#newInvoicePageV39 [data-draft-desc]')].map(x=>x.dataset.draftDesc));}
  function showFailure(message){
    const el=document.querySelector('#billingPlanBody .bp51-message');
    if(el){el.textContent=message;el.hidden=false;}
    else alert(message);
  }
  function clearFailure(){const el=document.querySelector('#billingPlanBody .bp51-message');if(el){el.textContent='';el.hidden=true;}}

  async function ensureBillingWorkspace(){
    const entry=await waitFor(()=>window.DABSTER_BILLING_ENTRY_V41?.loadWorkspace&&window.DABSTER_BILLING_ENTRY_V41);
    if(!entry)throw new Error('Workspace fatturazione non disponibile.');
    await entry.loadWorkspace('invoice');
    const api=await waitFor(()=>window.DABSTER_BILLING_V39?.showInvoice&&document.getElementById('newInvoicePageV39')&&window.DABSTER_BILLING_V39);
    if(!api)throw new Error('Nuova fattura non disponibile.');
    if(sessionStorage.getItem('dabster.environment.v44')==='test'&&!testBillingPrepared){
      const model=api.getModel?.();if(Array.isArray(model?.invoices))model.invoices.splice(0,model.invoices.length);
      testBillingPrepared=true;
    }
    api.showInvoice();await sleep(20);return api;
  }

  function navigateToOfferLines(){
    document.querySelector('#newInvoicePageV39 [data-src-commessa]')?.click();
    document.querySelector('#newInvoicePageV39 [data-src-offer]')?.click();
    return !!document.querySelector('#newInvoicePageV39 [data-src-check]');
  }
  function clearSourceSelections(){
    for(let guard=0;guard<40;guard++){
      const cb=[...document.querySelectorAll('#newInvoicePageV39 [data-src-check]')].find(x=>x.checked);
      if(!cb)return;cb.checked=false;cb.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }
  function findSourceCheck(lineId){return [...document.querySelectorAll('#newInvoicePageV39 [data-src-check]')].find(x=>x.dataset.srcCheck===lineId)||null;}
  function findSourceAmount(lineId){return [...document.querySelectorAll('#newInvoicePageV39 [data-src-amount]')].find(x=>x.dataset.srcAmount===lineId)||null;}

  function renameNewDraft(before,label){
    const after=draftIds(),created=[...after].filter(id=>!before.has(id));if(!created.length)return;
    const target=created.at(-1),input=[...document.querySelectorAll('#newInvoicePageV39 [data-draft-desc]')].find(x=>x.dataset.draftDesc===target);
    if(input){input.value=label||input.value;input.dispatchEvent(new Event('change',{bubbles:true}));}
  }
  function groupNewDraft(before,label){
    let current=[...draftIds()].filter(id=>!before.has(id));
    if(current.length<=1){renameNewDraft(before,label);return;}
    for(const id of current){
      const cb=[...document.querySelectorAll('#newInvoicePageV39 [data-draft-check]')].find(x=>x.dataset.draftCheck===id);
      if(cb&&!cb.checked){cb.checked=true;cb.dispatchEvent(new Event('change',{bubbles:true}));}
    }
    document.querySelector('#newInvoicePageV39 [data-group-draft]')?.click();
    renameNewDraft(before,label);
  }

  async function openPlanEvent(rowId){
    if(preparing)return;preparing=true;clearFailure();
    try{
      const row=planRow(rowId);if(!row||!row.valid)throw new Error('Completa la regola del Piano prima di portarla in fattura.');
      if(!row.allocations?.length||Number(row.calculatedAmount||0)<=0)throw new Error('La regola non contiene un importo fatturabile.');
      const billing=await ensureBillingWorkspace(),metrics=billing.getOfferMetrics?.();
      for(const a of row.allocations){
        const line=metrics?.lines?.find(x=>x.id===a.lineId);
        if(!line)throw new Error('Una Riga Offerta collegata al Piano non è più disponibile.');
        if(Number(a.amount||0)>Number(line.available||0)+.01)throw new Error(`Residuo insufficiente sulla Riga Offerta “${line.description}”.`);
      }
      if(!navigateToOfferLines())throw new Error('Righe Offerta non disponibili nella Nuova fattura.');
      clearSourceSelections();const before=draftIds();
      for(const a of row.allocations){
        const cb=findSourceCheck(a.lineId);if(!cb||cb.disabled)throw new Error('Riga Offerta non selezionabile nella fattura.');
        cb.checked=true;cb.dispatchEvent(new Event('change',{bubbles:true}));
        const amount=findSourceAmount(a.lineId);if(!amount)throw new Error('Importo Riga Offerta non disponibile.');
        amount.value=money(a.amount);amount.dispatchEvent(new Event('change',{bubbles:true}));
      }
      const add=document.querySelector('#newInvoicePageV39 [data-add-selected]');if(!add||add.disabled)throw new Error('Impossibile aggiungere la quota del Piano alla fattura.');
      add.click();await sleep(20);groupNewDraft(before,row.eventLabel||'Quota Piano di fatturazione');
      lastPlanInfo={id:row.id,label:row.eventLabel||'Quota Piano di fatturazione',amount:Number(row.calculatedAmount||0)};decorateInvoiceOrigin();
    }catch(err){showFailure(err?.message||String(err));}
    finally{preparing=false;decoratePlan();}
  }

  function decorateInvoiceOrigin(){
    if(!lastPlanInfo)return;const section=document.querySelector('#newInvoicePageV39 .ni39-section.source');if(!section)return;
    let note=section.querySelector('.bp51-origin-note');if(!note){note=document.createElement('div');note.className='bp51-origin-note';section.querySelector('.ni39-section-head')?.insertAdjacentElement('afterend',note);}
    note.innerHTML=`Origine corrente: <strong>Piano di fatturazione</strong> · ${lastPlanInfo.label} · <strong>${money(lastPlanInfo.amount)} €</strong>`;
  }

  function decoratePlan(){
    const api=planApi(),body=document.getElementById('billingPlanBody');if(!api||!body)return;
    if(!body.querySelector('.bp51-message')){const m=document.createElement('div');m.className='bp51-message';m.hidden=true;body.prepend(m);}
    const snap=api.getSnapshot?.();
    body.querySelectorAll('.bp47-row').forEach(el=>{
      const row=snap?.rows?.find(x=>x.id===el.dataset.rowId),slot=el.querySelector('.bp47-remove');if(!row||!slot)return;
      let btn=slot.querySelector('.bp51-invoice');if(!btn){btn=document.createElement('button');btn.type='button';btn.className='bp51-invoice';btn.textContent='€';slot.insertBefore(btn,slot.firstChild);btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openPlanEvent(el.dataset.rowId);});}
      btn.disabled=preparing||!row.valid;btn.title=row.valid?'Porta questa quota in Nuova fattura':'Completa la regola prima di fatturare';
    });
  }
  function installStyles(){if(document.getElementById('billingPlanInvoiceV51Styles'))return;const s=document.createElement('style');s.id='billingPlanInvoiceV51Styles';s.textContent=`
    #billingPlanBody .bp47-head,#billingPlanBody .bp47-row{grid-template-columns:minmax(135px,1.18fr) minmax(120px,1fr) 58px 90px 112px minmax(145px,1.12fr) 56px!important}
    #billingPlanBody .bp47-remove{display:flex;align-items:center;justify-content:center;gap:3px!important;padding-left:2px!important;padding-right:2px!important}
    .bp51-invoice{width:24px;height:24px;border:1px solid #bed1d8;border-radius:5px;background:#eef7f9;color:#376576;font-size:10px;font-weight:800;cursor:pointer}.bp51-invoice:hover:not(:disabled){background:#dff0f4}.bp51-invoice:disabled{opacity:.35;cursor:not-allowed}
    .bp51-message{margin:0 0 6px;padding:6px 8px;border:1px solid #edc7ca;border-radius:6px;background:#fff3f3;color:#9a474e;font-size:8px;font-weight:700}.bp51-message[hidden]{display:none!important}
    .bp51-origin-note{padding:6px 10px;border-bottom:1px solid #e2e8ea;background:#f4fafb;color:#52707c;font-size:8px}.bp51-origin-note strong{color:#315d6c}
    @media(max-width:1050px){#billingPlanBody .bp47-head,#billingPlanBody .bp47-row{grid-template-columns:minmax(122px,1.12fr) minmax(105px,.95fr) 52px 80px 102px minmax(122px,1fr) 54px!important}}
    @media(max-width:760px){#billingPlanBody .bp47-row{grid-template-columns:minmax(0,1.15fr) minmax(0,1fr) 58px 82px!important}.bp47-remove{min-width:54px}}
  `;document.head.appendChild(s);}

  async function install(){
    installStyles();await waitFor(()=>window.DABSTER_BILLING_PLAN_V47&&document.getElementById('billingPlanBody'));
    const body=document.getElementById('billingPlanBody');if(body){observer=new MutationObserver(()=>decoratePlan());observer.observe(body,{childList:true,subtree:true});}
    const invoiceRoot=document.documentElement;new MutationObserver(()=>decorateInvoiceOrigin()).observe(invoiceRoot,{childList:true,subtree:true});
    window.addEventListener('dabster-billing-plan-ready',()=>setTimeout(decoratePlan,20));window.addEventListener('dabster-offer-flow-change',()=>setTimeout(decoratePlan,40));decoratePlan();
    window.DABSTER_PLAN_TO_INVOICE_V51={openPlanEvent};
  }
  install();
})();
