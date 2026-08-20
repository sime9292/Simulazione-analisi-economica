/* v14: reimbursements + supplier costs/markup + overhead only on internal hours */
(function(){
  const core=document.createElement('script');
  core.src='app-v9.js?v=14';
  core.onload=()=>waitForReady();
  document.head.appendChild(core);

  const SUPPLIER_REGISTRY=['Bimlab'];
  const REIMBURSEMENT_DEFAULTS=[
    {name:'Spese alloggio',note:'hotel / notte',unit:70,unitLabel:'€/notte',km:false,weeks:32},
    {name:'Spese viaggio auto',note:'trasferta auto',unit:0.55,unitLabel:'€/km',km:true,weeks:32},
    {name:'Spese viaggio pedaggio',note:'pedaggio',unit:0.083,unitLabel:'€/km',km:true,weeks:32},
    {name:'Spese vitto',note:'pasto / giorno',unit:50,unitLabel:'€/giorno',km:false,weeks:32}
  ];

  function waitForReady(attempt=0){
    const ready=document.getElementById('phaseWorkloadSection') && document.getElementById('externalCostsSection') && document.querySelector('#tab-analisi .economic-table');
    if(ready){setTimeout(initEnhancedCosts,180);return;}
    if(attempt<140)setTimeout(()=>waitForReady(attempt+1),60);
  }

  function initEnhancedCosts(){
    if(document.getElementById('reimbursementsSection'))return;
    const table=document.querySelector('#tab-analisi .economic-table');
    const totalRow=table?.querySelector('.total-row');
    const oldExternal=table?.querySelector('.external-row');
    const externalSection=document.getElementById('externalCostsSection');
    if(!table||!totalRow||!oldExternal||!externalSection)return;

    const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
    const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
    const pct=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    oldExternal.dataset.specialCost='reimbursements';
    oldExternal.children[0].textContent='Rimborsi Spese';
    const reimbProposal=oldExternal.querySelector('.ae-proposal');
    const reimbCost=oldExternal.querySelector('.ae-cost');
    [reimbProposal,reimbCost].forEach(i=>{if(i){i.readOnly=true;i.classList.add('computed-cost');i.title='Calcolato dalla sezione Rimborsi Spese';}});

    const supplierRow=document.createElement('div');
    supplierRow.className='economic-row phase-row external-row supplier-economic-row';
    supplierRow.dataset.specialCost='suppliers';
    supplierRow.innerHTML='<div>Costi Esterni</div><div class="money-cell"><input class="ae-proposal computed-cost" value="0,00" readonly title="Totale vendita costi esterni"><span>€</span></div><div class="computed-cell"><span class="ae-discount">0,00</span><b>€</b></div><div class="money-cell cost-cell"><input class="ae-cost computed-cost" value="0,00" readonly title="Costo fornitori"><span>€</span></div>';
    table.insertBefore(supplierRow,totalRow);

    externalSection.insertAdjacentHTML('beforebegin',`
      <section id="reimbursementsSection" class="accordion reimbursements">
        <button class="section-head" type="button"><span>↔&nbsp;&nbsp;Rimborsi Spese</span><span class="chevron">⌄</span></button>
        <div class="section-body reimbursements-body">
          <div class="reimb-intro"><div><strong>Spese di trasferta</strong><span>Inserisci frequenza e durata: il totale viene calcolato automaticamente.</span></div><span class="formula-chip">costo unitario × quantità × settimane</span></div>
          <div class="reimb-table">
            <div class="reimb-head"><span>Voce</span><span>Costo unitario</span><span>km A/R</span><span>Qtà / settimana</span><span>Settimane</span><span>Totale</span></div>
            <div id="reimbursementRows"></div>
          </div>
          <div class="reimb-footer"><span>Il totale confluisce nella riga <strong>Rimborsi Spese</strong>.</span><strong>Totale rimborsi: <b id="reimbursementTotal">0,00</b> €</strong></div>
        </div>
      </section>`);
    document.querySelector('#reimbursementsSection .section-head')?.addEventListener('click',e=>e.currentTarget.closest('.accordion').classList.toggle('open'));

    const reimbRows=document.getElementById('reimbursementRows');
    REIMBURSEMENT_DEFAULTS.forEach(item=>addReimbursementRow(item));

    function addReimbursementRow(item){
      reimbRows.insertAdjacentHTML('beforeend',`<div class="reimb-row" data-km="${item.km?'1':'0'}">
        <div class="reimb-name"><strong>${esc(item.name)}</strong><span>${esc(item.note)}</span></div>
        <label class="unit-input"><input class="reimb-unit" inputmode="decimal" value="${money(item.unit)}"><span>${esc(item.unitLabel)}</span></label>
        <label class="compact-number ${item.km?'':'disabled'}"><input class="reimb-km" type="number" min="0" step="1" value="0" ${item.km?'':'disabled'}><span>km</span></label>
        <label class="compact-number"><input class="reimb-weekqty" type="number" min="0" step="0.5" value="0"><span>x</span></label>
        <label class="compact-number"><input class="reimb-weeks" type="number" min="0" step="1" value="${item.weeks}"><span>sett.</span></label>
        <strong class="reimb-total">0,00 €</strong>
      </div>`);
      const row=reimbRows.lastElementChild;
      row.querySelectorAll('input').forEach(input=>{
        input.addEventListener('focus',()=>input.select?.());
        input.addEventListener('input',recalcReimbursements);
        if(input.classList.contains('reimb-unit'))input.addEventListener('blur',()=>{input.value=money(num(input.value));recalcReimbursements();});
      });
    }

    externalSection.querySelector('.section-head span:first-child').innerHTML='↗&nbsp;&nbsp;Costi Esterni';
    const extBody=externalSection.querySelector('.section-body');
    extBody.innerHTML=`
      <div class="supplier-intro"><div><strong>Fornitori / consulenze esterne</strong><span>Il costo alimenta i costi diretti; il totale vendita alimenta la proposta economica.</span></div><button id="addSupplierCost" class="soft-btn" type="button">＋ Aggiungi fornitore</button></div>
      <div class="supplier-table">
        <div class="supplier-head"><span>Fornitore da anagrafica</span><span>Costo</span><span>Ricarico</span><span>Totale vendita</span><span></span></div>
        <div id="supplierCostRows"></div>
      </div>
      <div class="supplier-footer"><span>Costo fornitori: <strong><b id="supplierCostTotal">0,00</b> €</strong></span><span>Totale vendita: <strong><b id="supplierSaleTotal">0,00</b> €</strong></span></div>`;

    const supplierRows=document.getElementById('supplierCostRows');
    document.getElementById('addSupplierCost')?.addEventListener('click',()=>addSupplierCost());

    function supplierPickerMarkup(){
      return `<div class="supplier-picker"><input class="supplier-name" autocomplete="off" placeholder="Cerca fornitore…"><button class="supplier-open" type="button" title="Apri anagrafica">⌄</button><div class="supplier-menu" hidden></div></div>`;
    }

    function addSupplierCost(){
      supplierRows.insertAdjacentHTML('beforeend',`<div class="supplier-row">
        ${supplierPickerMarkup()}
        <label class="money-input"><input class="supplier-cost" inputmode="decimal" value="0,00"><span>€</span></label>
        <label class="percent-input"><input class="supplier-markup" type="number" min="0" step="1" value="0"><span>%</span></label>
        <strong class="supplier-sale">0,00 €</strong>
        <button class="icon-btn danger supplier-delete" type="button">×</button>
      </div>`);
      const row=supplierRows.lastElementChild;
      setupSupplierPicker(row.querySelector('.supplier-picker'));
      row.querySelector('.supplier-cost').addEventListener('focus',e=>e.currentTarget.select());
      row.querySelector('.supplier-cost').addEventListener('input',recalcSuppliers);
      row.querySelector('.supplier-cost').addEventListener('blur',e=>{e.currentTarget.value=money(num(e.currentTarget.value));recalcSuppliers();});
      row.querySelector('.supplier-markup').addEventListener('input',recalcSuppliers);
      row.querySelector('.supplier-delete').addEventListener('click',()=>{row.remove();recalcSuppliers();});
      row.querySelector('.supplier-name').focus();
      recalcSuppliers();
    }

    function setupSupplierPicker(wrap){
      const input=wrap.querySelector('.supplier-name'),menu=wrap.querySelector('.supplier-menu'),open=wrap.querySelector('.supplier-open');
      const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
      function close(){menu.hidden=true;menu.innerHTML='';}
      function render(all=false){
        const q=norm(input.value);
        const items=SUPPLIER_REGISTRY.filter(x=>all||!q||norm(x).includes(q));
        menu.innerHTML=items.length?items.map(x=>`<button type="button">${esc(x)}</button>`).join(''):'<span class="supplier-empty">Nessun fornitore trovato</span>';
        menu.hidden=false;
        menu.querySelectorAll('button').forEach((btn,i)=>btn.addEventListener('pointerdown',ev=>{ev.preventDefault();input.value=items[i];input.classList.remove('invalid');close();}));
      }
      input.addEventListener('focus',()=>render());
      input.addEventListener('input',()=>render());
      input.addEventListener('blur',()=>setTimeout(()=>{if(input.value&&!SUPPLIER_REGISTRY.some(x=>norm(x)===norm(input.value)))input.classList.add('invalid');else input.classList.remove('invalid');close();},140));
      open.addEventListener('click',()=>{if(menu.hidden)render(true);else close();});
    }

    function recalcReimbursements(){
      let total=0;
      reimbRows.querySelectorAll('.reimb-row').forEach(row=>{
        const unit=num(row.querySelector('.reimb-unit').value);
        const qty=Number(row.querySelector('.reimb-weekqty').value||0);
        const weeks=Number(row.querySelector('.reimb-weeks').value||0);
        const isKm=row.dataset.km==='1';
        const km=isKm?Number(row.querySelector('.reimb-km').value||0):1;
        const amount=unit*km*qty*weeks;
        row.querySelector('.reimb-total').textContent=money(amount)+' €';
        total+=amount;
      });
      document.getElementById('reimbursementTotal').textContent=money(total);
      reimbProposal.value=money(total);
      reimbCost.value=money(total);
      scheduleEnhancedEconomic();
    }

    function recalcSuppliers(){
      let costTotal=0,saleTotal=0;
      supplierRows.querySelectorAll('.supplier-row').forEach(row=>{
        const cost=num(row.querySelector('.supplier-cost').value);
        const markup=Number(row.querySelector('.supplier-markup').value||0);
        const sale=cost*(1+markup/100);
        row.querySelector('.supplier-sale').textContent=money(sale)+' €';
        costTotal+=cost;saleTotal+=sale;
      });
      document.getElementById('supplierCostTotal').textContent=money(costTotal);
      document.getElementById('supplierSaleTotal').textContent=money(saleTotal);
      supplierRow.querySelector('.ae-cost').value=money(costTotal);
      supplierRow.querySelector('.ae-proposal').value=money(saleTotal);
      scheduleEnhancedEconomic();
    }

    let recalcQueued=false;
    function scheduleEnhancedEconomic(){
      if(recalcQueued)return;
      recalcQueued=true;
      setTimeout(()=>{recalcQueued=false;recalcEnhancedEconomic();},0);
    }

    function recalcEnhancedEconomic(){
      const tradePct=Number(document.getElementById('tradePct')?.value||0);
      const tradeLabel=document.getElementById('tradePctLabel');if(tradeLabel)tradeLabel.textContent=tradePct+'%';
      let gross=0,directCosts=0,internalCosts=0;
      table.querySelectorAll('.phase-row').forEach(row=>{
        const proposal=num(row.querySelector('.ae-proposal')?.value);
        const cost=num(row.querySelector('.ae-cost')?.value);
        gross+=proposal;directCosts+=cost;
        if(row.dataset.phaseManaged==='1')internalCosts+=cost;
        const tradeValue=row.querySelector('.ae-discount');
        if(tradeValue)tradeValue.textContent=money(proposal*(1-tradePct/100));
      });
      const net=gross*(1-tradePct/100);
      const generalExpenses=internalCosts*0.35;
      const mol=net-directCosts;
      const mon=mol-generalExpenses;
      const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
      set('aeGross',money(gross));set('aeDiscountTotal',money(net));set('aeCosts',money(directCosts));
      set('aeMol',money(mol));set('aeMolPct',pct(net?mol/net*100:0));set('aeGeneralExpenses',money(generalExpenses));set('aeMon',money(mon));set('aeProfitPct',pct(net?mon/net*100:0));
    }

    table.addEventListener('input',scheduleEnhancedEconomic,true);
    document.getElementById('phaseWorkloadSection')?.addEventListener('input',()=>setTimeout(scheduleEnhancedEconomic,0),true);
    new MutationObserver(scheduleEnhancedEconomic).observe(table,{subtree:true,childList:true,characterData:true});

    recalcReimbursements();
    recalcSuppliers();
    recalcEnhancedEconomic();
  }
})();
