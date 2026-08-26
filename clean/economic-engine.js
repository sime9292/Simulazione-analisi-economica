import {cents,roundUp100} from './domain.js';

export function calculateEconomic({rows=[],tradePct=0,generalExpensesRate=.35}={}){
  const trade=Math.max(0,Number(tradePct||0));
  let gross=0,negotiatedTotal=0,directCosts=0,operatingSales=0,totalHours=0;

  const calculatedRows=rows.map(row=>{
    const active=row.active!==false;
    const proposal=active?Number(row.proposal||0):0;
    const cost=active?Number(row.cost||0):0;
    const negotiated=active?(trade===0?proposal:roundUp100(proposal*(1+trade/100))):0;
    const hours=active?Math.max(0,Number(row.hours||0)):0;

    gross+=proposal;
    negotiatedTotal+=negotiated;
    directCosts+=cost;
    totalHours+=hours;
    if(active&&row.operating===true&&row.special!==true)operatingSales+=proposal;

    return {...row,active,proposal:cents(proposal),cost:cents(cost),negotiated:cents(negotiated),hours:cents(hours)};
  });

  gross=cents(gross);
  negotiatedTotal=cents(negotiatedTotal);
  directCosts=cents(directCosts);
  operatingSales=cents(operatingSales);
  const mol=cents(gross-directCosts);
  const generalExpenses=cents(operatingSales*generalExpensesRate);
  const mon=cents(mol-generalExpenses);
  const molPct=gross?mol/gross*100:0;
  const profitPct=gross?mon/gross*100:0;

  return {
    tradePct:trade,
    rows:calculatedRows,
    gross,
    negotiatedTotal,
    directCosts,
    operatingSales,
    generalExpenses,
    mol,
    mon,
    molPct,
    profitPct,
    totalHours:cents(totalHours)
  };
}
