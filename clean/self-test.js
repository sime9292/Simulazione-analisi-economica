import {calculateEconomic} from './economic-engine.js';

const close=(a,b,tol=.02)=>Math.abs(Number(a)-Number(b))<=tol;

export function runSelfTests(){
  const baseRows=[
    {proposal:3360,cost:1500,operating:true,active:true},
    {proposal:11760,cost:3593.75,operating:true,active:true},
    {proposal:8400,cost:4000,operating:true,active:true},
    {proposal:10080,cost:2067.307692,operating:true,active:true}
  ];
  const base=calculateEconomic({rows:baseRows,tradePct:0});
  const trade10=calculateEconomic({rows:baseRows,tradePct:10});
  const trade1=calculateEconomic({rows:baseRows,tradePct:1});
  const special=calculateEconomic({rows:[...baseRows,{proposal:140,cost:140,operating:false,special:true,active:true}],tradePct:0});
  const assertions=[
    ['gross',close(base.gross,33600)],
    ['direct costs',close(base.directCosts,11161.057692)],
    ['general expenses',close(base.generalExpenses,11760)],
    ['MON',close(base.mon,10678.942308)],
    ['profit',close(base.profitPct,31.782566)],
    ['trade +10',close(trade10.negotiatedTotal,37100)],
    ['trade +1',close(trade1.negotiatedTotal,34000)],
    ['special excluded SG',close(special.generalExpenses,11760)]
  ];
  return {ok:assertions.every(x=>x[1]),assertions:Object.fromEntries(assertions),base,trade10,trade1,special};
}
