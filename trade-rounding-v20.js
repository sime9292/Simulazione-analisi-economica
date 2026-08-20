/* v20 - Trattativa: round each negotiated row upward to the next €100 */
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
    if(tradeLabel)tradeLabel.textContent=tradePct+'%';

    let gross=0;
    let negotiatedTotal=0;
    let directCosts=0;
    let internalCosts=0;

    table.querySelectorAll('.phase-row').forEach(row=>{
      const proposal=num(row.querySelector('.ae-proposal')?.value);
      const cost=num(row.querySelector('.ae-cost')?.value);
      const rawNegotiated=proposal*(1-tradePct/100);
      /* At 0% the proposal must remain unchanged; rounding starts only when a negotiation is applied. */
      const negotiated=tradePct===0?proposal:roundUp100(rawNegotiated);

      gross+=proposal;
      negotiatedTotal+=negotiated;
      directCosts+=cost;
      if(row.dataset.phaseManaged==='1')internalCosts+=cost;

      const out=row.querySelector('.ae-discount');
      if(out){
        out.textContent=money(negotiated);
        out.title=tradePct===0?'Nessuna trattativa applicata':'Valore dopo trattativa, arrotondato per eccesso ai 100 € successivi';
      }
    });

    const generalExpenses=internalCosts*0.35;
    const mol=negotiatedTotal-directCosts;
    const mon=mol-generalExpenses;
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};

    set('aeGross',money(gross));
    set('aeDiscountTotal',money(negotiatedTotal));
    set('aeCosts',money(directCosts));
    set('aeMol',money(mol));
    set('aeMolPct',pct(negotiatedTotal?mol/negotiatedTotal*100:0));
    set('aeGeneralExpenses',money(generalExpenses));
    set('aeMon',money(mon));
    set('aeProfitPct',pct(negotiatedTotal?mon/negotiatedTotal*100:0));
  }

  function schedule(){
    clearTimeout(timer);
    /* Existing calculation may schedule its own 0ms pass; run after it. */
    timer=setTimeout(recalcRoundedTrade,25);
  }

  function install(attempt=0){
    const table=document.querySelector('#tab-analisi .economic-table');
    const trade=document.getElementById('tradePct');
    if(!table||!trade){if(attempt<160)setTimeout(()=>install(attempt+1),60);return;}

    trade.addEventListener('input',schedule);
    trade.addEventListener('change',schedule);
    table.addEventListener('input',schedule,true);
    table.addEventListener('change',schedule,true);
    document.getElementById('phaseWorkloadSection')?.addEventListener('input',schedule,true);
    document.getElementById('phaseWorkloadSection')?.addEventListener('change',schedule,true);
    document.getElementById('dimTransfer')?.addEventListener('click',()=>setTimeout(recalcRoundedTrade,80));

    /* Re-run after demo seeding and after dynamic row changes. */
    new MutationObserver(mutations=>{
      if(mutations.some(m=>[...m.addedNodes].some(n=>n.nodeType===1)))schedule();
    }).observe(table,{childList:true,subtree:true});

    recalcRoundedTrade();
    setTimeout(recalcRoundedTrade,500);
    setTimeout(recalcRoundedTrade,1800);
  }

  install();
})();
