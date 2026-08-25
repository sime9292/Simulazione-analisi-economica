/* v48 - Trattativa markup + 100€ upward rounding + definitive KPIs + hide empty special rows */
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
    const tradePct=Number(document.getElementById('tradePct')?.value||0);
    const tradeLabel=document.getElementById('tradePctLabel');
    if(tradeLabel)tradeLabel.textContent=tradePct===0?'0%':'+'+tradePct+'%';

    let gross=0;
    let negotiatedTotal=0;
    let directCosts=0;
    let internalSalesBase=0;

    table.querySelectorAll('.phase-row').forEach(row=>{
      const proposal=num(row.querySelector('.ae-proposal')?.value);
      const cost=num(row.querySelector('.ae-cost')?.value);

      /* Rimborsi Spese e Costi Esterni compaiono nella sintesi solo quando hanno un valore. */
      syncSpecialRowVisibility(row,proposal,cost);

      /* Le fasi tecniche restano nel DOM, ma se non sono attive non partecipano a nessun totale. */
      const isManagedDynamicPhase=!!row.dataset.economicPhase;
      if(isManagedDynamicPhase&&row.dataset.economicActive!=='1'){
        const out=row.querySelector('.ae-discount');if(out)out.textContent=money(0);
        return;
      }

      /* TRATTATIVA = maggiorazione percentuale sulla singola riga.
         Con percentuale > 0, il risultato viene sempre arrotondato per eccesso ai 100 €.
         Il totale Trattativa è la somma dei valori di riga già arrotondati. */
      const rawNegotiated=proposal*(1+tradePct/100);
      const negotiated=tradePct===0?proposal:roundUp100(rawNegotiated);

      gross+=proposal;
      negotiatedTotal+=negotiated;
      directCosts+=cost;

      /* SPESE GENERALI = 35% del TOT/proposta delle sole fasi operative attive.
         Sono esclusi in modo esplicito Rimborsi Spese e Costi Esterni. */
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

    /* I KPI restano basati sul TOT/proposta, non sulla colonna Trattativa. */
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

  function install(attempt=0){
    const table=document.querySelector('#tab-analisi .economic-table');
    const trade=document.getElementById('tradePct');
    if(!table||!trade){if(attempt<160)setTimeout(()=>install(attempt+1),60);return;}

    trade.addEventListener('input',()=>schedule());
    trade.addEventListener('change',()=>schedule());
    table.addEventListener('input',()=>schedule(),true);
    table.addEventListener('change',()=>schedule(),true);
    document.getElementById('phaseWorkloadSection')?.addEventListener('input',()=>schedule(),true);
    document.getElementById('phaseWorkloadSection')?.addEventListener('change',()=>schedule(),true);
    document.getElementById('dimTransfer')?.addEventListener('click',()=>schedule(90));

    document.addEventListener('input',e=>{
      if(e.target?.closest?.('#reimbursementsSection,#externalCostsSection'))schedule(40);
    },true);
    document.addEventListener('change',e=>{
      if(e.target?.closest?.('#reimbursementsSection,#externalCostsSection'))schedule(40);
    },true);
    document.addEventListener('click',e=>{
      if(e.target?.closest?.('#addSupplierCost,.supplier-delete,.addExternalCost,.phase-delete,#addEconomicPhase'))schedule(100);
    },true);
    window.addEventListener('dabster-dimension-transfer',()=>schedule(45));

    new MutationObserver(mutations=>{
      const structuralChange=mutations.some(m=>m.type==='childList' &&
        [...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1));
      if(structuralChange)schedule(40);
    }).observe(table,{childList:true,subtree:true});

    window.dabsterRecalcEconomic=recalcRoundedTrade;
    recalcRoundedTrade();
    setTimeout(recalcRoundedTrade,500);
    setTimeout(recalcRoundedTrade,1800);
  }

  install();
})();
