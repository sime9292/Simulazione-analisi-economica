document.querySelectorAll('.section-head').forEach(btn=>{btn.addEventListener('click',()=>btn.closest('.accordion').classList.toggle('open'))});
document.querySelectorAll('.tab').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));btn.classList.add('active');document.getElementById('tab-'+btn.dataset.tab)?.classList.add('active');history.replaceState(null,'','#'+btn.dataset.tab)})});
const star=document.getElementById('star');star?.addEventListener('click',()=>{star.classList.toggle('active');star.setAttribute('aria-pressed',star.classList.contains('active')?'true':'false')});
function parseItalianNumber(v){return Number(String(v).replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0}
function formatItalianNumber(n){return Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})}
function formatPct(n){return Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+'%'}
const money=[...document.querySelectorAll('.money')];const total=document.getElementById('totaleOfferta');
function recalcOffer(){const sum=money.reduce((s,i)=>s+parseItalianNumber(i.value),0);if(total)total.value=formatItalianNumber(sum)}
money.forEach(input=>{input.addEventListener('focus',()=>input.select());input.addEventListener('blur',()=>{input.value=formatItalianNumber(parseItalianNumber(input.value));recalcOffer()});input.addEventListener('input',recalcOffer)});

const aeProposal=[...document.querySelectorAll('.ae-proposal')];
const aeCosts=[...document.querySelectorAll('.ae-cost')];
const aeTradeValues=[...document.querySelectorAll('.ae-discount')];
const tradePct=document.getElementById('tradePct');
const tradePctLabel=document.getElementById('tradePctLabel');
function setText(id,value){const el=document.getElementById(id);if(el)el.textContent=value}
function recalcEconomic(){
  const pct=Number(tradePct?.value||0);
  if(tradePctLabel)tradePctLabel.textContent=pct+'%';
  let gross=0,costs=0;
  aeProposal.forEach((input,index)=>{
    const phaseValue=parseItalianNumber(input.value);
    gross+=phaseValue;
    const afterTrade=phaseValue*(1-pct/100);
    if(aeTradeValues[index])aeTradeValues[index].textContent=formatItalianNumber(afterTrade);
  });
  aeCosts.forEach(input=>costs+=parseItalianNumber(input.value));
  const netRevenue=gross*(1-pct/100);
  const generalExpenses=0;
  const mol=netRevenue-costs;
  const mon=mol-generalExpenses;
  const molPct=netRevenue!==0?mol/netRevenue*100:0;
  const profitPct=netRevenue!==0?mon/netRevenue*100:0;
  setText('aeGross',formatItalianNumber(gross));
  setText('aeDiscountTotal',formatItalianNumber(netRevenue));
  setText('aeCosts',formatItalianNumber(costs));
  setText('aeNetRevenue',formatItalianNumber(netRevenue));
  setText('aeMol',formatItalianNumber(mol));
  setText('aeMolPct',formatPct(molPct));
  setText('aeGeneralExpenses',formatItalianNumber(generalExpenses));
  setText('aeMon',formatItalianNumber(mon));
  setText('aeProfitPct',formatPct(profitPct));
}
[...aeProposal,...aeCosts].forEach(input=>{input.addEventListener('focus',()=>input.select());input.addEventListener('input',recalcEconomic);input.addEventListener('blur',()=>{input.value=formatItalianNumber(parseItalianNumber(input.value));recalcEconomic()})});
tradePct?.addEventListener('input',recalcEconomic);
recalcEconomic();

/* Ridimensionamento colonne Analisi Economica */
function initColumnResizers(){
  const table=document.querySelector('.economic-table');
  const headCells=[...document.querySelectorAll('.economic-head>div')];
  const handles=[...document.querySelectorAll('.col-resizer')];
  if(!table||headCells.length<4||!handles.length)return;
  const mins=[150,85,105,110];
  let widths=null;
  function captureWidths(){widths=headCells.slice(0,4).map(c=>c.getBoundingClientRect().width);widths.forEach((w,i)=>table.style.setProperty(`--ae-col${i+1}`,`${w}px`))}
  handles.forEach(handle=>{
    handle.addEventListener('pointerdown',e=>{
      e.preventDefault();
      if(!widths)captureWidths();
      const index=Number(handle.dataset.col)-1;
      const startX=e.clientX;
      const startA=widths[index];
      const startB=widths[index+1];
      handle.classList.add('dragging');
      handle.setPointerCapture?.(e.pointerId);
      const move=ev=>{
        let delta=ev.clientX-startX;
        const minDelta=mins[index]-startA;
        const maxDelta=startB-mins[index+1];
        delta=Math.max(minDelta,Math.min(maxDelta,delta));
        widths[index]=startA+delta;
        widths[index+1]=startB-delta;
        table.style.setProperty(`--ae-col${index+1}`,`${widths[index]}px`);
        table.style.setProperty(`--ae-col${index+2}`,`${widths[index+1]}px`);
      };
      const up=ev=>{
        handle.classList.remove('dragging');
        handle.releasePointerCapture?.(ev.pointerId);
        handle.removeEventListener('pointermove',move);
        handle.removeEventListener('pointerup',up);
        handle.removeEventListener('pointercancel',up);
      };
      handle.addEventListener('pointermove',move);
      handle.addEventListener('pointerup',up);
      handle.addEventListener('pointercancel',up);
    });
    handle.addEventListener('dblclick',()=>{
      widths=null;
      for(let i=1;i<=4;i++)table.style.removeProperty(`--ae-col${i}`);
    });
  });
}
initColumnResizers();

function openHashTab(){const wanted=(location.hash||'').replace('#','');if(!wanted)return;const btn=document.querySelector(`.tab[data-tab="${wanted}"]`);if(btn)btn.click()}
openHashTab();
