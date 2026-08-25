/* v49 - Single definitive economic engine: markup + 100€ upward rounding + validated KPIs */
(function(){
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const pct=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
  const roundUp100=n=>n>0?Math.ceil((n-1e-9)/100)*100:0;
  let timer=null;

  function isSpecialRow(row){
    return row.dataset.specialCost==='reimbursements' || row.dataset.specialCost==='suppliers';
  }

  function syncSpecialRowVisibility(row,proposal,cost){
    if(!isSpecialRow(row))return;
    const visible=Math.abs(proposal)>0.000001 || Math.abs(cost)>0.000001;
    row.hidden=!visible;
    if(visible)row.style.removeProperty('display');
    else row.style.setProperty('display','none','important');
  }

  function recalcRoundedTrade(){
    const table=document.querySelector('#tab-analisi .economic-table');
    if(!table)return;

    const tradePct=Math.max(0,Number(document.getElementById('tradePct')?.value||0));
    const tradeLabel=document.getElementById('tradePctLabel');
    if(tradeLabel)tradeLabel.textContent=tradePct===0?'0%':'+'+tradePct+'%';

    let gross=0;
    let negotiatedTotal=0;
    let directCosts=0;
    let internalSalesBase=0;

    table.querySelectorAll('.phase-row').forEach(row=>{
      const proposal=num(row.querySelector('.ae-proposal')?.value);
      const cost=num(row.querySelector('.ae-cost')?.value);

      /* Rimborsi Spese e Costi Esterni sono visibili solo quando valorizzati. */
      syncSpecialRowVisibility(row,proposal,cost);

      /* Le fasi tecniche inattive restano nel DOM solo come struttura e non contano economicamente. */
      const isManagedDynamicPhase=!!row.dataset.economicPhase;
      if(isManagedDynamicPhase&&row.dataset.economicActive!=='1'){
        const out=row.querySelector('.ae-discount');
        if(out)out.textContent=money(0);
        return;
      }

      /* TRATTATIVA:
         1. parte sempre dal TOT/proposta della singola riga;
         2. applica una MAGGIORAZIONE: proposta * (1 + percentuale/100);
         3. con percentuale > 0 arrotonda PER ECCESSO al successivo multiplo di 100 €;
         4. il totale Trattativa è la somma delle righe già arrotondate. */
      const rawNegotiated=proposal*(1+tradePct/100);
      const negotiated=tradePct===0?proposal:roundUp100(rawNegotiated);

      gross+=proposal;
      negotiatedTotal+=negotiated;
      directCosts+=cost;

      /* SPESE GENERALI:
         35% del TOT/proposta delle sole fasi operative attive.
         Rimborsi Spese e Costi Esterni sono esclusi esplicitamente dalla base. */
      const isActiveOperatingPhase=row.dataset.phaseManaged==='1' && !isSpecialRow(row);
      if(isActiveOperatingPhase)internalSalesBase+=proposal;

      const out=row.querySelector('.ae-discount');
      if(out){
        out.textContent=money(negotiated);
        out.title=tradePct===0
          ?'Nessuna maggiorazione di trattativa applicata'
          :`Valore +${tradePct}%, arrotondato per eccesso ai 100 €`;
      }
    });

    /* KPI DEFINITIVI - tutti basati sulla colonna TOT/proposta, non sulla Trattativa. */
    const mol=gross-directCosts;
    const generalExpenses=internalSalesBase*0.35;
    const mon=mol-generalExpenses;
    const profitPct=gross?mon/gross*100:0;
    const molPct=gross?mol/gross*100:0;

    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
    set('aeGross',money(gross));
    set('aeDiscountTotal',money(negotiatedTotal));
    set('aeCosts',money(directCosts));
    set('aeMol',money(mol));
    set('aeMolPct',pct(molPct));
    set('aeGeneralExpenses',money(generalExpenses));
    set('aeMon',money(mon));
    set('aeProfitPct',pct(profitPct));

    const expensesLabel=document.querySelector('#tab-analisi .kpi.expenses .kpi-label');
    if(expensesLabel){
      expensesLabel.textContent='SPESE GENERALI · 35%';
      expensesLabel.title='35% del TOT delle sole fasi operative attive; Rimborsi Spese e Costi Esterni sono esclusi';
    }
  }

  function schedule(delay=25){
    clearTimeout(timer);
    timer=setTimeout(recalcRoundedTrade,delay);
  }

  /* Several legacy modules still fire their historical economic recalculation synchronously.
     Settle the definitive result after the same event and after any queued legacy callback. */
  function settle(){
    recalcRoundedTrade();
    queueMicrotask(recalcRoundedTrade);
    setTimeout(recalcRoundedTrade,0);
    setTimeout(recalcRoundedTrade,30);
    setTimeout(recalcRoundedTrade,120);
  }

  function install(attempt=0){
    const table=document.querySelector('#tab-analisi .economic-table');
    const trade=document.getElementById('tradePct');
    if(!table||!trade){if(attempt<160)setTimeout(()=>install(attempt+1),60);return;}

    /* Direct listener works on the initial slider. */
    trade.addEventListener('input',settle);
    trade.addEventListener('change',settle);

    /* IMPORTANT: app-v7 replaces #tradePct with a cloned input during startup, which removes
       listeners attached to the original node. Delegated bubbling listeners survive that clone.
       They run after the old target listener, so the final visible value is always the markup. */
    document.addEventListener('input',e=>{
      if(e.target?.id==='tradePct'){
        settle();
        return;
      }
      if(e.target?.closest?.('#reimbursementsSection,#externalCostsSection'))schedule(40);
    },false);
    document.addEventListener('change',e=>{
      if(e.target?.id==='tradePct'){
        settle();
        return;
      }
      if(e.target?.closest?.('#reimbursementsSection,#externalCostsSection'))schedule(40);
    },false);

    /* Table and workload edits: legacy routines may run first; this delayed calculation is final. */
    table.addEventListener('input',()=>schedule(35),true);
    table.addEventListener('change',()=>schedule(35),true);
    document.getElementById('phaseWorkloadSection')?.addEventListener('input',()=>schedule(40),true);
    document.getElementById('phaseWorkloadSection')?.addEventListener('change',()=>schedule(40),true);
    document.getElementById('dimTransfer')?.addEventListener('click',()=>{schedule(120);setTimeout(recalcRoundedTrade,260);});

    document.addEventListener('click',e=>{
      if(e.target?.closest?.('#addSupplierCost,.supplier-delete,.addExternalCost,.phase-delete,#addEconomicPhase'))schedule(130);
      if(e.target?.closest?.('#prefillDemoData,#clearDemoData')){
        setTimeout(recalcRoundedTrade,350);
        setTimeout(recalcRoundedTrade,900);
        setTimeout(recalcRoundedTrade,1700);
        setTimeout(recalcRoundedTrade,2600);
      }
    },true);
    window.addEventListener('dabster-dimension-transfer',()=>{schedule(80);setTimeout(recalcRoundedTrade,180);});

    /* Phase/supplier rows can be created or removed dynamically. */
    new MutationObserver(mutations=>{
      const structuralChange=mutations.some(m=>m.type==='childList' &&
        [...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1));
      if(structuralChange)schedule(50);
    }).observe(table,{childList:true,subtree:true});

    /* Precompila/Svuota mark their final state on body: recalculate after the async procedure ends. */
    if(document.body){
      new MutationObserver(mutations=>{
        if(mutations.some(m=>m.type==='attributes'&&m.attributeName==='data-demo-seeded'))settle();
      }).observe(document.body,{attributes:true,attributeFilter:['data-demo-seeded']});
    }

    window.dabsterRecalcEconomic=recalcRoundedTrade;
    window.dabsterSettleEconomic=settle;
    recalcRoundedTrade();
    setTimeout(recalcRoundedTrade,500);
    setTimeout(recalcRoundedTrade,1800);
    setTimeout(recalcRoundedTrade,3200);
  }

  install();
})();
