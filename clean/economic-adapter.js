import {calculateEconomic} from './economic-engine.js';
import {money,numberFromItalian} from './domain.js';

export function installEconomicAdapter(store){
  let timer=null,installed=false;
  const table=()=>document.querySelector('#tab-analisi .economic-table');
  const special=row=>row?.dataset.specialCost==='reimbursements'||row?.dataset.specialCost==='suppliers';

  function phaseCard(row){
    const phaseId=row?.dataset.phaseId||'';
    const phase=row?.dataset.economicPhase||'';
    return [...document.querySelectorAll('#phaseWorkCards > .phase-work-card')].find(card=>{
      if(phaseId&&card.dataset.phaseId===phaseId)return true;
      const id=card.querySelector('.phase-type-select')?.value||card.dataset.planningPhase||'';
      return phase&&id===phase;
    })||null;
  }

  function hours(row){
    const card=phaseCard(row);if(!card)return 0;
    return [...card.querySelectorAll('.assignment-hours')].reduce((sum,input)=>sum+Math.max(0,numberFromItalian(input.value)),0);
  }

  function ensureHoursColumn(root){
    if(!root)return;
    const head=root.querySelector('.economic-head');
    if(head&&!head.querySelector('.economic-hours-head')){
      const cell=document.createElement('div');cell.className='numeric economic-hours-head';cell.textContent='ORE TOTALI';head.appendChild(cell);
    }
    root.querySelectorAll('.economic-row:not(.economic-head):not(.total-row)').forEach(row=>{
      if(row.querySelector('.economic-hours-cell'))return;
      const cell=document.createElement('div');cell.className='economic-hours-cell';row.appendChild(cell);
    });
    const total=root.querySelector('.total-row');
    if(total&&!total.querySelector('.economic-hours-total')){
      const cell=document.createElement('div');cell.className='economic-hours-cell economic-hours-total';total.appendChild(cell);
    }
  }

  function collect(){
    const root=table();if(!root)return {rows:[],tradePct:0};
    ensureHoursColumn(root);
    const rows=[...root.querySelectorAll('.phase-row')].map(row=>{
      const proposal=numberFromItalian(row.querySelector('.ae-proposal')?.value);
      const cost=numberFromItalian(row.querySelector('.ae-cost')?.value);
      const managed=!!row.dataset.economicPhase;
      const active=managed?row.dataset.economicActive==='1':true;
      const isSpecial=special(row);
      const visibleSpecial=!isSpecial||Math.abs(proposal)>1e-6||Math.abs(cost)>1e-6;
      if(isSpecial){row.hidden=!visibleSpecial;row.style.toggleProperty?.('display',visibleSpecial?'':'none');if(visibleSpecial)row.style.removeProperty('display');else row.style.setProperty('display','none','important');}
      return {
        key:row.dataset.economicPhase||row.dataset.specialCost||row.dataset.phaseId||'',
        row,
        proposal,cost,
        active:active&&visibleSpecial,
        operating:row.dataset.phaseManaged==='1'&&!isSpecial,
        special:isSpecial,
        hours:isSpecial?0:hours(row)
      };
    });
    return {rows,tradePct:Math.max(0,Number(document.getElementById('tradePct')?.value||0))};
  }

  function render(result){
    result.rows.forEach(r=>{
      const row=r.row;if(!row)return;
      const out=row.querySelector('.ae-discount');if(out){out.textContent=money(r.negotiated);out.title=result.tradePct===0?'Nessuna maggiorazione di trattativa':`+${result.tradePct}% · arrotondato per eccesso ai 100 €`;}
      const hoursCell=row.querySelector('.economic-hours-cell');if(hoursCell)hoursCell.textContent=r.special?'—':`${Number(r.hours||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})} h`;
    });
    const totalHours=table()?.querySelector('.economic-hours-total');if(totalHours)totalHours.textContent=`${Number(result.totalHours||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})} h`;
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
    set('aeGross',money(result.gross));set('aeDiscountTotal',money(result.negotiatedTotal));set('aeCosts',money(result.directCosts));
    set('aeMol',money(result.mol));set('aeMolPct',`${result.molPct.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})}%`);
    set('aeGeneralExpenses',money(result.generalExpenses));set('aeMon',money(result.mon));set('aeProfitPct',`${result.profitPct.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})}%`);
    const tradeLabel=document.getElementById('tradePctLabel');if(tradeLabel)tradeLabel.textContent=result.tradePct?`+${result.tradePct}%`:'0%';
    const expenseLabel=document.querySelector('#tab-analisi .kpi.expenses .kpi-label');if(expenseLabel){expenseLabel.textContent='SPESE GENERALI · 35%';expenseLabel.title='35% della proposta delle sole fasi operative attive';}
    const profit=document.querySelector('#tab-analisi .kpi.profit');if(profit){profit.classList.toggle('profit-good',result.profitPct>=25);profit.classList.toggle('profit-low',result.profitPct<25);}
  }

  function recalc(){
    const input=collect();
    const result=calculateEconomic(input);
    render(result);
    store.patch('analysis',{economic:{...result,rows:result.rows.map(({row,...rest})=>rest)}},'analysis:economic');
    window.dispatchEvent(new CustomEvent('dabster-economic-change',{detail:store.getState().analysis.economic}));
    return result;
  }
  function schedule(delay=25){clearTimeout(timer);timer=setTimeout(recalc,delay);}
  function settle(){recalc();queueMicrotask(recalc);setTimeout(recalc,30);}

  function bind(){
    if(installed)return;installed=true;
    const root=table();if(!root)return;
    root.addEventListener('input',()=>schedule(20),true);root.addEventListener('change',()=>schedule(20),true);
    document.getElementById('phaseWorkloadSection')?.addEventListener('input',()=>schedule(30),true);
    document.getElementById('phaseWorkloadSection')?.addEventListener('change',()=>schedule(30),true);
    document.addEventListener('input',e=>{if(e.target?.closest?.('#reimbursementsSection,#externalCostsSection'))schedule(25);},true);
    document.addEventListener('change',e=>{if(e.target?.closest?.('#reimbursementsSection,#externalCostsSection'))schedule(25);},true);
    new MutationObserver(ms=>{if(ms.some(m=>m.type==='childList'))schedule(30);}).observe(root,{childList:true,subtree:true});
    window.addEventListener('dabster-analysis-phases-change',()=>settle());
  }

  bind();
  window.dabsterRecalcEconomic=recalc;
  window.dabsterSettleEconomic=settle;
  recalc();
  return {recalc,settle,schedule};
}
