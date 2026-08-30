/* v53 - Shared bridge: Piano di fatturazione -> precompila Righe Offerta in Nuova fattura. Observer idempotente. */
(function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
  let preparing=false,testBillingPrepared=false,observer=null,decorateQueued=false;
  const applied=new Set();

  async function waitFor(fn,loops=260,delay=40){for(let i=0;i<loops;i++){const v=fn();if(v)return v;await sleep(delay);}return null;}
  function planApi(){return window.DABSTER_BILLING_PLAN_V47||null;}
  function planRow(id){return planApi()?.getSnapshot?.().rows?.find(x=>x.id===id)||null;}
  function showFailure(message){
    const el=document.querySelector('#billingPlanBody .bp51-message');
    if(el){if(el.textContent!==message)el.textContent=message;el.hidden=false;}else alert(message);
  }
  function clearFailure(){const el=document.querySelector('#billingPlanBody .bp51-message');if(el){if(el.textContent)el.textContent='';el.hidden=true;}}

  async function ensureBillingWorkspace(){
    const entry=await waitFor(()=>window.DABSTER_BILLING_ENTRY_V44?.loadWorkspace&&window.DABSTER_BILLING_ENTRY_V44||window.DABSTER_BILLING_ENTRY_V43?.loadWorkspace&&window.DABSTER_BILLING_ENTRY_V43||window.DABSTER_BILLING_ENTRY_V42?.loadWorkspace&&window.DABSTER_BILLING_ENTRY_V42||window.DABSTER_BILLING_ENTRY_V41?.loadWorkspace&&window.DABSTER_BILLING_ENTRY_V41);
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
    if(document.querySelector('#newInvoicePageV39 [data-src-check]'))return true;
    document.querySelector('#newInvoicePageV39 [data-src-commessa]')?.click();
    document.querySelector('#newInvoicePageV39 [data-src-offer]')?.click();
    return !!document.querySelector('#newInvoicePageV39 [data-src-check]');
  }
  function findSourceCheck(lineId){return [...document.querySelectorAll('#newInvoicePageV39 [data-src-check]')].find(x=>x.dataset.srcCheck===lineId)||null;}
  function findSourceAmount(lineId){return [...document.querySelectorAll('#newInvoicePageV39 [data-src-amount]')].find(x=>x.dataset.srcAmount===lineId)||null;}

  async function applyPlanEvent(rowId){
    if(preparing||applied.has(rowId))return;preparing=true;clearFailure();
    try{
      const row=planRow(rowId);if(!row||!row.valid)throw new Error('Completa la regola del Piano prima di applicarla.');
      if(!row.allocations?.length||Number(row.calculatedAmount||0)<=0)throw new Error('La regola non contiene un importo fatturabile.');
      const billing=await ensureBillingWorkspace(),metrics=billing.getOfferMetrics?.();
      if(!navigateToOfferLines())throw new Error('Righe Offerta non disponibili nella Nuova fattura.');

      const targets=[];
      for(const a of row.allocations){
        const line=metrics?.lines?.find(x=>x.id===a.lineId);
        if(!line)throw new Error('Una Riga Offerta collegata al Piano non è più disponibile.');
        const current=num(findSourceAmount(a.lineId)?.value),next=Math.round((current+Number(a.amount||0))*100)/100;
        if(next>Number(line.available||0)+.01)throw new Error(`Residuo insufficiente sulla Riga Offerta “${line.description}”.`);
        targets.push({lineId:a.lineId,current,next});
      }

      for(const t of targets){
        let cb=findSourceCheck(t.lineId);if(!cb||cb.disabled)throw new Error('Riga Offerta non selezionabile nella fattura.');
        if(!cb.checked){cb.checked=true;cb.dispatchEvent(new Event('change',{bubbles:true}));await sleep(5);}
        const amount=findSourceAmount(t.lineId);if(!amount)throw new Error('Importo Riga Offerta non disponibile.');
        amount.value=money(t.next);amount.dispatchEvent(new Event('change',{bubbles:true}));await sleep(5);
      }

      applied.add(rowId);
      window.dispatchEvent(new CustomEvent('dabster-plan-applied-to-lines',{detail:{id:row.id,label:row.eventLabel||'Quota Piano di fatturazione',amount:Number(row.calculatedAmount||0),allocations:row.allocations.map(x=>({...x}))}}));
    }catch(err){showFailure(err?.message||String(err));}
    finally{preparing=false;decoratePlan();window.DABSTER_BILLING_PLAN_SOURCE_V56?.refresh?.();}
  }

  function decoratePlan(){
    const api=planApi(),body=document.getElementById('billingPlanBody');if(!api||!body)return;
    if(!body.querySelector('.bp51-message')){const m=document.createElement('div');m.className='bp51-message';m.hidden=true;body.prepend(m);}
    const snap=api.getSnapshot?.();
    body.querySelectorAll('.bp47-row').forEach(el=>{
      const row=snap?.rows?.find(x=>x.id===el.dataset.rowId),slot=el.querySelector('.bp47-remove');if(!row||!slot)return;
      let btn=slot.querySelector('.bp51-invoice');
      if(!btn){btn=document.createElement('button');btn.type='button';btn.className='bp51-invoice';btn.textContent='€';slot.insertBefore(btn,slot.firstChild);btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();applyPlanEvent(el.dataset.rowId);});}
      const done=applied.has(row.id),disabled=preparing||!row.valid||done,text=done?'✓':'€',title=done?'Quota già applicata alle Righe Offerta':(row.valid?'Precompila le Righe Offerta in Nuova fattura':'Completa la regola prima di fatturare');
      if(btn.disabled!==disabled)btn.disabled=disabled;
      if(btn.textContent!==text)btn.textContent=text;
      if(btn.title!==title)btn.title=title;
    });
  }
  function queueDecorate(){
    if(decorateQueued)return;decorateQueued=true;
    const run=()=>{decorateQueued=false;decoratePlan();};
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(run);else setTimeout(run,0);
  }
  function installStyles(){if(document.getElementById('billingPlanInvoiceV52Styles'))return;const s=document.createElement('style');s.id='billingPlanInvoiceV52Styles';s.textContent=`
    #billingPlanBody .bp47-head,#billingPlanBody .bp47-row{grid-template-columns:minmax(135px,1.18fr) minmax(120px,1fr) 58px 90px 112px minmax(145px,1.12fr) 56px!important}
    #billingPlanBody .bp47-remove{display:flex;align-items:center;justify-content:center;gap:3px!important;padding-left:2px!important;padding-right:2px!important}
    .bp51-invoice{width:24px;height:24px;border:1px solid #bed1d8;border-radius:5px;background:#eef7f9;color:#376576;font-size:10px;font-weight:800;cursor:pointer}.bp51-invoice:hover:not(:disabled){background:#dff0f4}.bp51-invoice:disabled{opacity:.48;cursor:not-allowed}
    .bp51-message{margin:0 0 6px;padding:6px 8px;border:1px solid #edc7ca;border-radius:6px;background:#fff3f3;color:#9a474e;font-size:8px;font-weight:700}.bp51-message[hidden]{display:none!important}
    @media(max-width:1050px){#billingPlanBody .bp47-head,#billingPlanBody .bp47-row{grid-template-columns:minmax(122px,1.12fr) minmax(105px,.95fr) 52px 80px 102px minmax(122px,1fr) 54px!important}}
    @media(max-width:760px){#billingPlanBody .bp47-row{grid-template-columns:minmax(0,1.15fr) minmax(0,1fr) 58px 82px!important}.bp47-remove{min-width:54px}}
  `;document.head.appendChild(s);}

  function clearApplied(){if(!applied.size)return;applied.clear();window.DABSTER_BILLING_PLAN_SOURCE_V56?.refresh?.();decoratePlan();}
  async function install(){
    installStyles();await waitFor(()=>window.DABSTER_BILLING_PLAN_V47&&document.getElementById('billingPlanBody'));
    const body=document.getElementById('billingPlanBody');if(body){observer=new MutationObserver(queueDecorate);observer.observe(body,{childList:true,subtree:true});}
    window.addEventListener('dabster-billing-plan-ready',()=>setTimeout(queueDecorate,20));window.addEventListener('dabster-offer-flow-change',()=>setTimeout(queueDecorate,40));
    document.addEventListener('click',e=>{if(e.target.closest?.('[data-save-invoice],[data-cancel-invoice]'))setTimeout(clearApplied,0);},true);
    const api={applyPlanEvent,openPlanEvent:applyPlanEvent,isApplied:id=>applied.has(id),getAppliedIds:()=>[...applied],clearApplied};
    window.DABSTER_PLAN_TO_INVOICE_V53=api;window.DABSTER_PLAN_TO_INVOICE_V52=api;window.DABSTER_PLAN_TO_INVOICE_V51=api;decoratePlan();
  }
  install();
})();