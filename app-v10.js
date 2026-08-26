/* clean-v2 compatibility: reimbursements + supplier inputs only. Economic formulas live in /clean/economic-engine.js. */
(function(){
  const core=document.createElement('script');core.src='app-v9.js?v=clean2';core.onload=()=>waitForReady();document.head.appendChild(core);
  const SUPPLIERS=['Bimlab'];
  const REIMBURSEMENTS=[
    {name:'Spese alloggio',note:'hotel / notte',unit:70,unitLabel:'€/notte',km:false,weeks:32},
    {name:'Spese viaggio auto',note:'trasferta auto',unit:.55,unitLabel:'€/km',km:true,weeks:32},
    {name:'Spese viaggio pedaggio',note:'pedaggio',unit:.083,unitLabel:'€/km',km:true,weeks:32},
    {name:'Spese vitto',note:'pasto / giorno',unit:50,unitLabel:'€/giorno',km:false,weeks:32}
  ];
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function waitForReady(attempt=0){
    const ready=document.getElementById('phaseWorkloadSection')&&document.getElementById('externalCostsSection')&&document.querySelector('#tab-analisi .economic-table');
    if(ready){init();return;}if(attempt<180)setTimeout(()=>waitForReady(attempt+1),45);
  }
  function notify(){window.dabsterRecalcEconomic?.();window.dispatchEvent(new CustomEvent('dabster-costs-change'));}

  function init(){
    if(document.getElementById('reimbursementsSection'))return;
    const table=document.querySelector('#tab-analisi .economic-table'),totalRow=table?.querySelector('.total-row'),oldExternal=table?.querySelector('.external-row'),external=document.getElementById('externalCostsSection');
    if(!table||!totalRow||!oldExternal||!external)return;

    oldExternal.dataset.specialCost='reimbursements';oldExternal.children[0].textContent='Rimborsi Spese';
    const reimbProposal=oldExternal.querySelector('.ae-proposal'),reimbCost=oldExternal.querySelector('.ae-cost');
    [reimbProposal,reimbCost].forEach(i=>{if(i){i.readOnly=true;i.classList.add('computed-cost');i.title='Calcolato dalla sezione Rimborsi Spese';}});

    const supplierEconomic=document.createElement('div');supplierEconomic.className='economic-row phase-row external-row supplier-economic-row';supplierEconomic.dataset.specialCost='suppliers';
    supplierEconomic.innerHTML='<div>Costi Esterni</div><div class="money-cell"><input class="ae-proposal computed-cost" value="0,00" readonly title="Totale vendita costi esterni"><span>€</span></div><div class="computed-cell"><span class="ae-discount">0,00</span><b>€</b></div><div class="money-cell cost-cell"><input class="ae-cost computed-cost" value="0,00" readonly title="Costo fornitori"><span>€</span></div>';
    table.insertBefore(supplierEconomic,totalRow);

    external.insertAdjacentHTML('beforebegin',`<section id="reimbursementsSection" class="accordion reimbursements"><button class="section-head" type="button"><span>↔&nbsp;&nbsp;Rimborsi Spese</span><span class="chevron">⌄</span></button><div class="section-body reimbursements-body"><div class="reimb-intro"><div><strong>Spese di trasferta</strong><span>Costi previsti della commessa. Vanno attribuiti internamente a una fase.</span></div><span class="formula-chip">costo unitario × quantità × settimane</span></div><div class="reimb-table"><div class="reimb-head"><span>Voce</span><span>Costo unitario</span><span>km A/R</span><span>Qtà / settimana</span><span>Settimane</span><span>Totale</span></div><div id="reimbursementRows"></div></div><div class="reimb-footer"><span>Non genera una riga commerciale autonoma.</span><strong>Totale rimborsi: <b id="reimbursementTotal">0,00</b> €</strong></div></div></section>`);
    document.querySelector('#reimbursementsSection .section-head')?.addEventListener('click',e=>e.currentTarget.closest('.accordion').classList.toggle('open'));
    REIMBURSEMENTS.forEach(addReimbursementRow);

    external.querySelector('.section-head span:first-child').innerHTML='↗&nbsp;&nbsp;Costi Esterni';
    const body=external.querySelector('.section-body');body.innerHTML=`<div class="supplier-intro"><div><strong>Fornitori / consulenze esterne</strong><span>Costo e ricarico vengono considerati dall’Analisi; la voce va attribuita a una fase.</span></div><button id="addSupplierCost" class="soft-btn" type="button">＋ Aggiungi fornitore</button></div><div class="supplier-table"><div class="supplier-head"><span>Fornitore da anagrafica</span><span>Costo</span><span>Ricarico</span><span>Totale vendita</span><span></span></div><div id="supplierCostRows"></div></div><div class="supplier-footer"><span>Costo fornitori: <strong><b id="supplierCostTotal">0,00</b> €</strong></span><span>Totale vendita: <strong><b id="supplierSaleTotal">0,00</b> €</strong></span></div>`;
    document.getElementById('addSupplierCost')?.addEventListener('click',addSupplierRow);
    recalcReimbursements();recalcSuppliers();
  }

  function addReimbursementRow(item){
    const root=document.getElementById('reimbursementRows');if(!root)return;
    root.insertAdjacentHTML('beforeend',`<div class="reimb-row" data-km="${item.km?'1':'0'}"><div class="reimb-name"><strong>${esc(item.name)}</strong><span>${esc(item.note)}</span></div><label class="unit-input"><input class="reimb-unit" inputmode="decimal" value="${money(item.unit)}"><span>${esc(item.unitLabel)}</span></label><label class="compact-number ${item.km?'':'disabled'}"><input class="reimb-km" type="number" min="0" step="1" value="0" ${item.km?'':'disabled'}><span>km</span></label><label class="compact-number"><input class="reimb-weekqty" type="number" min="0" step="0.5" value="0"><span>x</span></label><label class="compact-number"><input class="reimb-weeks" type="number" min="0" step="1" value="${item.weeks}"><span>sett.</span></label><strong class="reimb-total">0,00 €</strong></div>`);
    const row=root.lastElementChild;row.querySelectorAll('input').forEach(input=>{input.addEventListener('focus',()=>input.select?.());input.addEventListener('input',recalcReimbursements);if(input.classList.contains('reimb-unit'))input.addEventListener('blur',()=>{input.value=money(num(input.value));recalcReimbursements();});});
  }

  function recalcReimbursements(){
    const root=document.getElementById('reimbursementRows');if(!root)return;let total=0;
    root.querySelectorAll('.reimb-row').forEach(row=>{const unit=num(row.querySelector('.reimb-unit')?.value),qty=Number(row.querySelector('.reimb-weekqty')?.value||0),weeks=Number(row.querySelector('.reimb-weeks')?.value||0),km=row.dataset.km==='1'?Number(row.querySelector('.reimb-km')?.value||0):1,amount=unit*km*qty*weeks;row.querySelector('.reimb-total').textContent=money(amount)+' €';total+=amount;});
    const totalText=document.getElementById('reimbursementTotal');if(totalText)totalText.textContent=money(total);
    const econ=document.querySelector('.phase-row[data-special-cost="reimbursements"]');if(econ){econ.querySelector('.ae-proposal').value=money(total);econ.querySelector('.ae-cost').value=money(total);}notify();
  }

  function pickerMarkup(){return '<div class="supplier-picker"><input class="supplier-name" autocomplete="off" placeholder="Cerca fornitore…"><button class="supplier-open" type="button" title="Apri anagrafica">⌄</button><div class="supplier-menu" hidden></div></div>';}
  function addSupplierRow(){
    const root=document.getElementById('supplierCostRows');if(!root)return;
    root.insertAdjacentHTML('beforeend',`<div class="supplier-row">${pickerMarkup()}<label class="money-input"><input class="supplier-cost" inputmode="decimal" value="0,00"><span>€</span></label><label class="percent-input"><input class="supplier-markup" type="number" min="0" step="1" value="0"><span>%</span></label><strong class="supplier-sale">0,00 €</strong><button class="icon-btn danger supplier-delete" type="button">×</button></div>`);
    const row=root.lastElementChild;setupPicker(row.querySelector('.supplier-picker'));row.querySelector('.supplier-cost').addEventListener('focus',e=>e.currentTarget.select());row.querySelector('.supplier-cost').addEventListener('input',recalcSuppliers);row.querySelector('.supplier-cost').addEventListener('blur',e=>{e.currentTarget.value=money(num(e.currentTarget.value));recalcSuppliers();});row.querySelector('.supplier-markup').addEventListener('input',recalcSuppliers);row.querySelector('.supplier-delete').addEventListener('click',()=>{row.remove();recalcSuppliers();});row.querySelector('.supplier-name').focus();recalcSuppliers();
  }

  function setupPicker(wrap){
    const input=wrap.querySelector('.supplier-name'),menu=wrap.querySelector('.supplier-menu'),open=wrap.querySelector('.supplier-open'),norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const close=()=>{menu.hidden=true;menu.innerHTML='';};
    const render=(all=false)=>{const q=norm(input.value),items=SUPPLIERS.filter(x=>all||!q||norm(x).includes(q));menu.innerHTML=items.length?items.map(x=>`<button type="button">${esc(x)}</button>`).join(''):'<span class="supplier-empty">Nessun fornitore trovato</span>';menu.hidden=false;menu.querySelectorAll('button').forEach((b,i)=>b.addEventListener('pointerdown',ev=>{ev.preventDefault();input.value=items[i];input.classList.remove('invalid');close();}));};
    input.addEventListener('focus',()=>render());input.addEventListener('input',()=>render());input.addEventListener('blur',()=>setTimeout(()=>{input.classList.toggle('invalid',!!input.value&&!SUPPLIERS.some(x=>norm(x)===norm(input.value)));close();},140));open.addEventListener('click',()=>menu.hidden?render(true):close());
  }

  function recalcSuppliers(){
    const root=document.getElementById('supplierCostRows');if(!root)return;let cost=0,sale=0;
    root.querySelectorAll('.supplier-row').forEach(row=>{const c=num(row.querySelector('.supplier-cost')?.value),markup=Number(row.querySelector('.supplier-markup')?.value||0),s=c*(1+markup/100);row.querySelector('.supplier-sale').textContent=money(s)+' €';cost+=c;sale+=s;});
    const ct=document.getElementById('supplierCostTotal'),st=document.getElementById('supplierSaleTotal');if(ct)ct.textContent=money(cost);if(st)st.textContent=money(sale);
    const econ=document.querySelector('.phase-row[data-special-cost="suppliers"]');if(econ){econ.querySelector('.ae-cost').value=money(cost);econ.querySelector('.ae-proposal').value=money(sale);}notify();
  }
})();
