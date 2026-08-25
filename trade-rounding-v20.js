/* v47 - Trattativa markup + definitive KPIs, excluding inactive dynamic phase rows */
(function(){
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const pct=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
  const roundUp100=n=>n>0?Math.ceil((n-1e-9)/100)*100:0;
  let timer=null;

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
      /* Managed phase rows stay in the DOM as technical containers, but only active phases
         are visible and economically countable. Special rows (rimborsi/esterni) are always handled. */
      const isManagedDynamicPhase=!!row.dataset.economicPhase;
      if(isManagedDynamicPhase&&row.dataset.economicActive!=='1'){
        const out=row.querySelector('.ae-discount');if(out)out.textContent=money(0);
        return;
      }

      const proposal=num(row.querySelector('.ae-proposal')?.value);
      const cost=num(row.querySelector('.ae-cost')?.value);
      const rawNegotiated=proposal*(1+tradePct/100);
      const negotiated=tradePct===0?proposal:roundUp100(rawNegotiated);

      gross+=proposal;
      negotiatedTotal+=negotiated;
      directCosts+=cost;

      /* SPESE GENERALI SU VENDITA ORE INT. = 35% del TOT delle sole fasi operative attive. */
      if(row.dataset.phaseManaged==='1')internalSalesBase+=proposal;

      const out=row.querySelector('.ae-discount');
      if(out){
        out.textContent=money(negotiated);
        out.title=tradePct===0
          ?'Nessuna maggiorazione di trattativa applicata'
          :`Valore con maggiorazione del ${tradePct}%, arrotondato per eccesso ai 100 € successivi`;
      }
    });

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
      expensesLabel.textContent='SPESE GENERALI SU VENDITA ORE INT. · 35%';
      expensesLabel.title='35% del TOT delle fasi operative attive, esclusi Rimborsi Spese e Costi Esterni';
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
