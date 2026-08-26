/* v50 - Single definitive economic engine: markup + 100€ upward rounding + validated KPIs + phase hours */
(function(){
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const pct=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
  const roundUp100=n=>n>0?Math.ceil((n-1e-9)/100)*100:0;
  let timer=null;

  function isSpecialRow(row){
    return row.dataset.specialCost==='reimbursements' || row.dataset.specialCost==='suppliers';
  }

  function installHoursStyles(){
    if(document.getElementById('economicHoursV50Styles'))return;
    const style=document.createElement('style');
    style.id='economicHoursV50Styles';
    style.textContent=`
      html body #tab-analisi #analysisSubtabImpianti .economic-table .economic-row{
        grid-template-columns:var(--ae-col1,minmax(190px,1.18fr)) var(--ae-col2,minmax(100px,.66fr)) var(--ae-col3,minmax(105px,.68fr)) var(--ae-col4,minmax(100px,.66fr)) minmax(90px,.52fr)!important;
      }
      html body #tab-analisi #analysisSubtabImpianti .economic-table .economic-hours-head{
        display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;
        background:#f0f4f6!important;color:#4c606b!important;font-weight:750!important;
      }
      html body #tab-analisi #analysisSubtabImpianti .economic-table .economic-hours-cell{
        display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;
        background:#f7fafb!important;color:#3f5661!important;font-size:12px!important;font-weight:650!important;
        font-variant-numeric:tabular-nums!important;white-space:nowrap!important;
      }
      html body #tab-analisi #analysisSubtabImpianti .economic-table .total-row .economic-hours-total{
        background:#eaf0f2!important;color:#334a55!important;font-weight:780!important;
      }
      @media(max-width:900px){
        html body #tab-analisi #analysisSubtabImpianti .economic-table{min-width:720px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureHoursColumn(table){
    if(!table)return;
    installHoursStyles();

    const head=table.querySelector('.economic-head');
    if(head&&!head.querySelector('.economic-hours-head')){
      const cell=document.createElement('div');
      cell.className='numeric economic-hours-head';
      cell.textContent='ORE TOTALI';
      head.appendChild(cell);
    }

    table.querySelectorAll('.economic-row:not(.economic-head):not(.total-row)').forEach(row=>{
      if(row.querySelector('.economic-hours-cell'))return;
      const cell=document.createElement('div');
      cell.className='economic-hours-cell';
      cell.textContent=isSpecialRow(row)?'—':'0,00 h';
      row.appendChild(cell);
    });

    const totalRow=table.querySelector('.total-row');
    if(totalRow&&!totalRow.querySelector('.economic-hours-total')){
      const cell=document.createElement('div');
      cell.className='economic-hours-cell economic-hours-total';
      cell.textContent='0,00 h';
      totalRow.appendChild(cell);
    }
  }

  function cardForEconomicRow(row){
    if(!row)return null;
    const phaseId=row.dataset.phaseId||'';
    const economicPhase=row.dataset.economicPhase||'';
    return [...document.querySelectorAll('#phaseWorkCards > .phase-work-card')].find(card=>{
      if(phaseId&&card.dataset.phaseId===phaseId)return true;
      if(!economicPhase)return false;
      const phase=(card.querySelector('.phase-type-select')?.value)||card.dataset.planningPhase||'';
      return phase===economicPhase;
    })||null;
  }

  function cardHours(card){
    if(!card)return 0;
    return [...card.querySelectorAll('.assignment-hours')].reduce((sum,input)=>sum+Math.max(0,num(input.value)),0);
  }

  function syncHoursColumn(table){
    ensureHoursColumn(table);
    let totalHours=0;

    table.querySelectorAll('.economic-row:not(.economic-head):not(.total-row)').forEach(row=>{
      const cell=row.querySelector('.economic-hours-cell');
      if(!cell)return;
      if(isSpecialRow(row)){
        cell.textContent='—';
        cell.title='Riga senza ore interne';
        return;
      }

      const card=cardForEconomicRow(row);
      const hours=cardHours(card);
      cell.textContent=hours.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+' h';
      cell.title='Somma delle ore delle figure professionali previste per questa fase';

      const managed=!!row.dataset.economicPhase;
      const active=managed?row.dataset.economicActive==='1':!row.hidden;
      if(active)totalHours+=hours;
    });

    const total=table.querySelector('.economic-hours-total');
    if(total){
      total.textContent=totalHours.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+' h';
      total.title='Ore totali previste sulle fasi attive';
    }
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
    ensureHoursColumn(table);

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

      syncSpecialRowVisibility(row,proposal,cost);

      const isManagedDynamicPhase=!!row.dataset.economicPhase;
      if(isManagedDynamicPhase&&row.dataset.economicActive!=='1'){
        const out=row.querySelector('.ae-discount');
        if(out)out.textContent=money(0);
        return;
      }

      const rawNegotiated=proposal*(1+tradePct/100);
      const negotiated=tradePct===0?proposal:roundUp100(rawNegotiated);

      gross+=proposal;
      negotiatedTotal+=negotiated;
      directCosts+=cost;

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
    syncHoursColumn(table);

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

    ensureHoursColumn(table);
    trade.addEventListener('input',settle);
    trade.addEventListener('change',settle);

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

    new MutationObserver(mutations=>{
      const structuralChange=mutations.some(m=>m.type==='childList' &&
        [...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1));
      if(structuralChange)schedule(50);
    }).observe(table,{childList:true,subtree:true});

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

/* v55 UI experiment loader: compact draggable hours control + cleaner economic units. */
(function(){
  if(document.querySelector('script[data-dabster-ui-polish="55"]'))return;
  const script=document.createElement('script');
  script.dataset.dabsterUiPolish='55';
  script.src='ui-polish-v55.js?v=55';
  document.head.appendChild(script);
})();

/* v59 planning layout loader: seven fixed phase tabs + visual separator below sticky economics. */
(function(){
  if(document.querySelector('script[data-dabster-planning-layout="59"]'))return;
  const script=document.createElement('script');
  script.dataset.dabsterPlanningLayout='59';
  script.src='planning-layout-v59.js?v=59';
  document.head.appendChild(script);
})();