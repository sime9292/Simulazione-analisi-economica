document.querySelectorAll('.section-head').forEach(btn=>{btn.addEventListener('click',()=>btn.closest('.accordion').classList.toggle('open'))});
document.querySelectorAll('.tab').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));btn.classList.add('active');document.getElementById('tab-'+btn.dataset.tab)?.classList.add('active');history.replaceState(null,'','#'+btn.dataset.tab)})});
const star=document.getElementById('star');star?.addEventListener('click',()=>{star.classList.toggle('active');star.setAttribute('aria-pressed',star.classList.contains('active')?'true':'false')});

function parseItalianNumber(v){return Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0}
function formatItalianNumber(n){return Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})}
function formatPct(n,digits=2){return Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:digits,maximumFractionDigits:digits})+'%'}
function setText(id,value){const el=document.getElementById(id);if(el)el.textContent=value}

/* Dati Offerta */
const money=[...document.querySelectorAll('.money')];const total=document.getElementById('totaleOfferta');
function recalcOffer(){const sum=money.reduce((s,i)=>s+parseItalianNumber(i.value),0);if(total)total.value=formatItalianNumber(sum)}
money.forEach(input=>{input.addEventListener('focus',()=>input.select());input.addEventListener('blur',()=>{input.value=formatItalianNumber(parseItalianNumber(input.value));recalcOffer()});input.addEventListener('input',recalcOffer)});

/* Analisi Economica */
const aeProposal=[...document.querySelectorAll('.ae-proposal')];
const aeCosts=[...document.querySelectorAll('.ae-cost')];
const aeTradeValues=[...document.querySelectorAll('.ae-discount')];
const tradePct=document.getElementById('tradePct');
const tradePctLabel=document.getElementById('tradePctLabel');
function recalcEconomic(){
  const pct=Number(tradePct?.value||0);
  if(tradePctLabel)tradePctLabel.textContent=pct+'%';
  let gross=0,costs=0;
  aeProposal.forEach((input,index)=>{
    const phaseValue=parseItalianNumber(input.value);gross+=phaseValue;
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
  setText('aeGross',formatItalianNumber(gross));setText('aeDiscountTotal',formatItalianNumber(netRevenue));setText('aeCosts',formatItalianNumber(costs));
  setText('aeMol',formatItalianNumber(mol));setText('aeMolPct',formatPct(molPct));setText('aeGeneralExpenses',formatItalianNumber(generalExpenses));setText('aeMon',formatItalianNumber(mon));setText('aeProfitPct',formatPct(profitPct));
}
[...aeProposal,...aeCosts].forEach(input=>{input.addEventListener('focus',()=>input.select());input.addEventListener('input',recalcEconomic);input.addEventListener('blur',()=>{input.value=formatItalianNumber(parseItalianNumber(input.value));recalcEconomic()})});
tradePct?.addEventListener('input',recalcEconomic);recalcEconomic();

/* Dimensionamento Opere */
const dimRows=document.getElementById('dimRows');
const dimAdd=document.getElementById('dimAdd');
const dimRounded=document.getElementById('dimRounded');
const dimRoundedReset=document.getElementById('dimRoundedReset');
const dimFeePct=document.getElementById('dimFeePct');
const dimFeePctLabel=document.getElementById('dimFeePctLabel');
const dimIeFactor=document.getElementById('dimIeFactor');
const dimTransfer=document.getElementById('dimTransfer');
const dimFlash=document.getElementById('dimFlash');
const phasePctInputs=[...document.querySelectorAll('.phase-pct')];
let dimRoundedManual=false;
let phaseValues=[0,0,0,0];

function dimRowTemplate(){
  return `<div class="dim-row dim-data">
    <div><input class="dim-desc" type="text" placeholder="Descrizione / elemento"></div>
    <div><input class="dim-mq" type="text" inputmode="decimal" value="0,00"></div>
    <div><input class="dim-mech-rate" type="text" inputmode="decimal" value="0,00"></div>
    <div><input class="dim-elec-rate" type="text" inputmode="decimal" value="0,00"></div>
    <div class="dim-read"><span class="dim-mech-total">0,00</span>&nbsp;€</div>
    <div class="dim-read elec"><span class="dim-elec-total">0,00</span>&nbsp;€</div>
    <div class="dim-read total"><span class="dim-row-total">0,00</span>&nbsp;€</div>
    <div><button class="dim-delete" type="button" title="Elimina riga">×</button></div>
  </div>`;
}

function bindDimRow(row){
  row.querySelector('.dim-delete')?.addEventListener('click',()=>{row.remove();recalcDimensioning()});
  [...row.querySelectorAll('.dim-mq,.dim-mech-rate,.dim-elec-rate')].forEach(input=>{
    input.addEventListener('focus',()=>input.select());
    input.addEventListener('input',recalcDimensioning);
    input.addEventListener('blur',()=>{input.value=formatItalianNumber(parseItalianNumber(input.value));recalcDimensioning()});
  });
}

function addDimRow(){if(!dimRows)return;dimRows.insertAdjacentHTML('beforeend',dimRowTemplate());bindDimRow(dimRows.lastElementChild);recalcDimensioning()}

dimAdd?.addEventListener('click',addDimRow);
dimRounded?.addEventListener('focus',()=>dimRounded.select());
dimRounded?.addEventListener('input',()=>{dimRoundedManual=true;recalcDimensioning()});
dimRounded?.addEventListener('blur',()=>{dimRounded.value=formatItalianNumber(parseItalianNumber(dimRounded.value));recalcDimensioning()});
dimRoundedReset?.addEventListener('click',()=>{dimRoundedManual=false;recalcDimensioning()});
dimFeePct?.addEventListener('input',recalcDimensioning);
dimIeFactor?.addEventListener('input',recalcDimensioning);
dimIeFactor?.addEventListener('blur',()=>{dimIeFactor.value=Number(parseItalianNumber(dimIeFactor.value)||1).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});recalcDimensioning()});
phasePctInputs.forEach(i=>i.addEventListener('input',recalcDimensioning));

function recalcDimensioning(){
  if(!dimRows)return;
  let mqTotal=0,mechTotal=0,elecTotal=0;
  [...dimRows.querySelectorAll('.dim-data')].forEach(row=>{
    const mq=parseItalianNumber(row.querySelector('.dim-mq')?.value);
    const mechRate=parseItalianNumber(row.querySelector('.dim-mech-rate')?.value);
    const elecRate=parseItalianNumber(row.querySelector('.dim-elec-rate')?.value);
    const mech=mq*mechRate,elec=mq*elecRate,total=mech+elec;
    mqTotal+=mq;mechTotal+=mech;elecTotal+=elec;
    row.querySelector('.dim-mech-total').textContent=formatItalianNumber(mech);
    row.querySelector('.dim-elec-total').textContent=formatItalianNumber(elec);
    row.querySelector('.dim-row-total').textContent=formatItalianNumber(total);
  });
  const calcTotal=mechTotal+elecTotal;
  setText('dimMqTotal',formatItalianNumber(mqTotal));setText('dimMechGrand',formatItalianNumber(mechTotal));setText('dimElecGrand',formatItalianNumber(elecTotal));setText('dimCalcGrand',formatItalianNumber(calcTotal));setText('dimCalcBox',formatItalianNumber(calcTotal));
  if(dimRounded&&!dimRoundedManual)dimRounded.value=formatItalianNumber(calcTotal);
  const rounded=dimRounded?parseItalianNumber(dimRounded.value):calcTotal;
  const scale=calcTotal>0?rounded/calcTotal:1;
  const mechRounded=mechTotal*scale;
  const elecRounded=elecTotal*scale;
  const feePct=Number(dimFeePct?.value||7);
  if(dimFeePctLabel)dimFeePctLabel.textContent=Number(feePct).toLocaleString('it-IT',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
  const ieFactor=Math.max(0,parseItalianNumber(dimIeFactor?.value)||1);
  const shares=phasePctInputs.map(i=>Number(i.value||0));
  const shareTotal=shares.reduce((a,b)=>a+b,0);
  const check=document.getElementById('phaseTotalCheck');
  setText('phaseTotalPct',Number(shareTotal).toLocaleString('it-IT',{maximumFractionDigits:1})+'%');
  check?.classList.toggle('invalid',Math.abs(shareTotal-100)>0.01);
  const phaseResultEls=[...document.querySelectorAll('.phase-result-value')];
  const phaseEffEls=[...document.querySelectorAll('.phase-effective-value')];
  phaseValues=shares.map((share,index)=>{
    const effectivePct=feePct*share/100;
    if(phaseEffEls[index])phaseEffEls[index].textContent=Number(effectivePct).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
    const mechFee=mechRounded*effectivePct/100;
    const elecFee=elecRounded*effectivePct/100*ieFactor;
    const phaseTotal=mechFee+elecFee;
    if(phaseResultEls[index])phaseResultEls[index].textContent=formatItalianNumber(phaseTotal);
    return phaseTotal;
  });
  const proposalTotal=phaseValues.reduce((a,b)=>a+b,0);
  setText('dimProposalTotal',formatItalianNumber(proposalTotal));
  if(dimTransfer)dimTransfer.disabled=Math.abs(shareTotal-100)>0.01;
}

dimTransfer?.addEventListener('click',()=>{
  const targets=[...document.querySelectorAll('.ae-proposal')].slice(0,4);
  targets.forEach((input,index)=>{input.value=formatItalianNumber(phaseValues[index]||0)});
  recalcEconomic();
  if(dimFlash){dimFlash.classList.add('show');setTimeout(()=>dimFlash.classList.remove('show'),1600)}
});

if(dimRows){for(let i=0;i<3;i++)addDimRow();recalcDimensioning()}

/* Ridimensionamento colonne Analisi Economica */
function initColumnResizers(){
  const table=document.querySelector('.economic-table');const headCells=[...document.querySelectorAll('.economic-head>div')];const handles=[...document.querySelectorAll('.col-resizer')];if(!table||headCells.length<4||!handles.length)return;
  const mins=[150,85,105,110];let widths=null;
  function captureWidths(){widths=headCells.slice(0,4).map(c=>c.getBoundingClientRect().width);widths.forEach((w,i)=>table.style.setProperty(`--ae-col${i+1}`,`${w}px`))}
  handles.forEach(handle=>{handle.addEventListener('pointerdown',e=>{e.preventDefault();if(!widths)captureWidths();const index=Number(handle.dataset.col)-1,startX=e.clientX,startA=widths[index],startB=widths[index+1];handle.classList.add('dragging');handle.setPointerCapture?.(e.pointerId);
    const move=ev=>{let delta=ev.clientX-startX;delta=Math.max(mins[index]-startA,Math.min(startB-mins[index+1],delta));widths[index]=startA+delta;widths[index+1]=startB-delta;table.style.setProperty(`--ae-col${index+1}`,`${widths[index]}px`);table.style.setProperty(`--ae-col${index+2}`,`${widths[index+1]}px`)};
    const up=ev=>{handle.classList.remove('dragging');handle.releasePointerCapture?.(ev.pointerId);handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',up)};
    handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',up)});
    handle.addEventListener('dblclick',()=>{widths=null;for(let i=1;i<=4;i++)table.style.removeProperty(`--ae-col${i}`)})});
}
initColumnResizers();
function openHashTab(){const wanted=(location.hash||'').replace('#','');if(!wanted)return;const btn=document.querySelector(`.tab[data-tab="${wanted}"]`);if(btn)btn.click()}
openHashTab();
