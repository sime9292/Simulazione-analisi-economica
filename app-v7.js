/* v7: dynamic phases + activities + professional figures/hours */
(function(){
  const core=document.createElement('script');
  core.src='app-v6.js?v=11';
  core.onload=()=>waitForCore();
  document.head.appendChild(core);

  function waitForCore(attempt=0){
    const ready=document.querySelector('#tab-analisi .economic-table') && document.querySelector('#tab-analisi .dimensioning') && document.getElementById('dimRows');
    if(ready){setTimeout(initWorkPlanning,80);return;}
    if(attempt<80)setTimeout(()=>waitForCore(attempt+1),50);
  }

  function initWorkPlanning(){
    if(document.getElementById('phaseWorkloadSection'))return;

    const roles=[
      {id:'PM',label:'PM',annual:85000},
      {id:'RS_IE',label:'RS IE',annual:65000},
      {id:'RS_IM',label:'RS IM',annual:65000},
      {id:'VVF_S',label:'VVF S',annual:65000},
      {id:'VVF_J',label:'VVF J',annual:30000},
      {id:'UT_IE_S',label:'UT IE S',annual:65000},
      {id:'UT_IM_S',label:'UT IM S',annual:65000},
      {id:'UT_IE_J',label:'UT IE J',annual:35000},
      {id:'UT_IM_J',label:'UT IM J',annual:35000}
    ];
    const rates=Object.fromEntries(roles.map(r=>[r.id,r.annual]));
    const suggestions=[
      'Analisi documentale e sopralluoghi',
      'Progettazione preliminare impianti',
      'Progettazione definitiva impianti',
      'Progettazione esecutiva impianti',
      'Direzione lavori impianti',
      'Valutazione progetto antincendio',
      'Progetto prevenzione incendi',
      'Assistenza iter autorizzativo',
      'SCIA e assistenza al collaudo'
    ];

    const itNumber=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
    const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
    const pct=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
    const hourly=roleId=>(rates[roleId]||0)/2080;
    const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

    const analysis=document.querySelector('#tab-analisi .analysis');
    const economicTable=analysis?.querySelector('.economic-table');
    const totalRow=economicTable?.querySelector('.total-row');
    const externalRow=economicTable?.querySelector('.external-row');
    if(!analysis||!economicTable||!totalRow)return;

    [...economicTable.querySelectorAll('.ae-proposal,.ae-cost')].forEach(el=>el.replaceWith(el.cloneNode(true)));
    const tradeOld=document.getElementById('tradePct');
    if(tradeOld){const clone=tradeOld.cloneNode(true);tradeOld.replaceWith(clone);}

    let phaseCounter=0;
    const phaseMap=new Map();

    const list=document.createElement('datalist');
    list.id='activitySuggestions';
    list.innerHTML=suggestions.map(x=>`<option value="${esc(x)}"></option>`).join('');
    document.body.appendChild(list);

    analysis.insertAdjacentHTML('afterend',`
      <section id="phaseWorkloadSection" class="accordion workload open">
        <button class="section-head" type="button"><span>◷&nbsp;&nbsp;Pianificazione ore per fase</span><span class="chevron">⌄</span></button>
        <div class="section-body workload-body">
          <div class="workload-toolbar">
            <div><strong>Attività e ore previste</strong><span>Le ore alimentano automaticamente il costo interno della fase.</span></div>
            <button id="toggleRoleRates" class="soft-btn" type="button">⚙ Costi figure</button>
          </div>
          <div id="roleRatesPanel" class="role-rates-panel" hidden>
            <div class="role-rates-head"><span>Figura</span><span>Costo annuo</span><span>Costo orario</span></div>
            <div id="roleRatesRows"></div>
            <div class="role-rates-note">Costo orario = costo annuo / 2.080 ore.</div>
          </div>
          <div id="phaseWorkCards" class="phase-work-cards"></div>
        </div>
      </section>
      <section id="externalCostsSection" class="accordion extcosts">
        <button class="section-head" type="button"><span>↗&nbsp;&nbsp;Costi Esterni</span><span class="chevron">⌄</span></button>
        <div class="section-body extcosts-body">
          <div id="externalCostRows" class="external-cost-rows"></div>
          <div class="external-cost-footer"><button id="addExternalCost" class="soft-btn" type="button">＋ Aggiungi costo esterno</button><strong>Totale esterni: <span id="externalCostTotal">0,00</span> €</strong></div>
        </div>
      </section>`);

    document.querySelectorAll('#phaseWorkloadSection .section-head,#externalCostsSection .section-head').forEach(btn=>btn.addEventListener('click',()=>btn.closest('.accordion').classList.toggle('open')));

    const cards=document.getElementById('phaseWorkCards');
    const roleRatesRows=document.getElementById('roleRatesRows');
    roleRatesRows.innerHTML=roles.map(r=>`<div class="role-rate-row" data-role="${r.id}"><span>${r.label}</span><label><input class="role-annual" inputmode="decimal" value="${money(r.annual)}"><b>€</b></label><strong class="role-hourly">${money(r.annual/2080)} €/h</strong></div>`).join('');
    roleRatesRows.querySelectorAll('.role-annual').forEach(input=>{
      input.addEventListener('focus',()=>input.select());
      input.addEventListener('input',()=>{
        const row=input.closest('.role-rate-row');rates[row.dataset.role]=itNumber(input.value);row.querySelector('.role-hourly').textContent=money(hourly(row.dataset.role))+' €/h';recalcAllWork();
      });
      input.addEventListener('blur',()=>{input.value=money(itNumber(input.value));});
    });
    document.getElementById('toggleRoleRates').addEventListener('click',()=>{const p=document.getElementById('roleRatesPanel');p.hidden=!p.hidden;});

    function roleOptions(selected='PM'){
      return roles.map(r=>`<option value="${r.id}" ${r.id===selected?'selected':''}>${r.label}</option>`).join('');
    }

    function activityTemplate(name=''){
      return `<div class="activity-card">
        <div class="activity-head">
          <input class="activity-name" list="activitySuggestions" value="${esc(name)}" placeholder="Nome attività">
          <div class="activity-head-metrics"><span><b class="activity-hours">0,00</b> h</span><span><b class="activity-cost">0,00</b> €</span></div>
          <button class="icon-btn activity-toggle" type="button" title="Espandi/comprimi">⌃</button>
          <button class="icon-btn danger activity-delete" type="button" title="Elimina attività">×</button>
        </div>
        <div class="activity-body">
          <div class="assignment-head"><span>Figura professionale</span><span>Ore</span><span>€/h</span><span>Costo</span><span></span></div>
          <div class="assignment-rows"></div>
          <button class="add-assignment soft-btn" type="button">＋ Aggiungi figura</button>
        </div>
      </div>`;
    }

    function assignmentTemplate(role='PM',hours=0){
      return `<div class="assignment-row"><select class="assignment-role">${roleOptions(role)}</select><input class="assignment-hours" type="number" min="0" step="0.5" value="${hours}"><span class="assignment-rate">${money(hourly(role))}</span><strong class="assignment-cost">0,00</strong><button class="icon-btn danger assignment-delete" type="button">×</button></div>`;
    }

    function defaultActivityFor(name,index){
      const n=name.toLowerCase();
      if(n.includes('prelim'))return 'Progettazione preliminare impianti';
      if(n.includes('definit'))return 'Progettazione definitiva impianti';
      if(n.includes('esecut'))return 'Progettazione esecutiva impianti';
      if(n.includes('direzione')||n==='dl')return 'Direzione lavori impianti';
      return index===0?'Analisi documentale e sopralluoghi':'';
    }

    function decoratePhaseRow(row,index){
      if(row.dataset.phaseManaged==='1')return row.dataset.phaseId;
      const id='phase-'+(++phaseCounter);
      row.dataset.phaseManaged='1';row.dataset.phaseId=id;
      const nameCell=row.children[0];
      const original=(nameCell.textContent||`Fase ${phaseCounter}`).trim();
      nameCell.innerHTML=`<div class="phase-name-editor"><input class="phase-name-input" value="${esc(original)}"><button class="icon-btn danger phase-delete" type="button" title="Elimina fase">×</button></div>`;
      const cost=row.querySelector('.ae-cost');
      if(cost){cost.readOnly=true;cost.title='Calcolato dalle ore previste';cost.classList.add('computed-cost');}
      phaseMap.set(id,{row});
      createPhaseCard(id,original,index);
      bindPhaseRow(row);
      return id;
    }

    function bindPhaseRow(row){
      const id=row.dataset.phaseId;
      const nameInput=row.querySelector('.phase-name-input');
      nameInput.addEventListener('input',()=>{const title=document.querySelector(`.phase-work-card[data-phase-id="${id}"] .phase-card-title`);if(title)title.textContent=nameInput.value||'Fase senza nome';});
      row.querySelector('.phase-delete').addEventListener('click',()=>{
        if(!confirm('Eliminare questa fase e tutte le attività/ore collegate?'))return;
        document.querySelector(`.phase-work-card[data-phase-id="${id}"]`)?.remove();phaseMap.delete(id);row.remove();recalcEconomicDynamic();
      });
      bindEconomicInput(row.querySelector('.ae-proposal'));
    }

    function createPhaseCard(id,name,index){
      cards.insertAdjacentHTML('beforeend',`<article class="phase-work-card" data-phase-id="${id}">
        <header class="phase-card-head">
          <button class="phase-collapse" type="button" aria-label="Apri/chiudi">⌄</button>
          <div><strong class="phase-card-title">${esc(name)}</strong><span class="phase-card-sub">Pianificazione attività e risorse</span></div>
          <label class="weeks-field">Settimane <input class="phase-weeks" type="number" min="0" step="0.5" value="4"></label>
          <div class="phase-card-metrics"><span>Ore <b class="phase-hours">0,00</b></span><span>Costo <b class="phase-work-cost">0,00 €</b></span></div>
        </header>
        <div class="phase-card-body"><div class="activities"></div><button class="add-activity soft-btn" type="button">＋ Aggiungi attività</button></div>
      </article>`);
      const card=cards.lastElementChild;
      card.querySelector('.phase-collapse').addEventListener('click',()=>card.classList.toggle('collapsed'));
      card.querySelector('.add-activity').addEventListener('click',()=>addActivity(card,''));
      addActivity(card,defaultActivityFor(name,index));
    }

    function addActivity(card,name=''){
      const container=card.querySelector('.activities');container.insertAdjacentHTML('beforeend',activityTemplate(name));const activity=container.lastElementChild;
      activity.querySelector('.activity-delete').addEventListener('click',()=>{activity.remove();recalcAllWork();});
      activity.querySelector('.activity-toggle').addEventListener('click',()=>activity.classList.toggle('collapsed'));
      activity.querySelector('.add-assignment').addEventListener('click',()=>addAssignment(activity));
      addAssignment(activity,'PM',0);
      recalcAllWork();
    }

    function addAssignment(activity,role='PM',hours=0){
      const rows=activity.querySelector('.assignment-rows');rows.insertAdjacentHTML('beforeend',assignmentTemplate(role,hours));const row=rows.lastElementChild;
      row.querySelector('.assignment-role').addEventListener('change',()=>recalcAllWork());
      row.querySelector('.assignment-hours').addEventListener('input',()=>recalcAllWork());
      row.querySelector('.assignment-delete').addEventListener('click',()=>{row.remove();recalcAllWork();});
    }

    function recalcAllWork(){
      document.querySelectorAll('.phase-work-card').forEach(card=>{
        let phaseHours=0,phaseCost=0;
        card.querySelectorAll('.activity-card').forEach(activity=>{
          let aHours=0,aCost=0;
          activity.querySelectorAll('.assignment-row').forEach(row=>{
            const role=row.querySelector('.assignment-role').value;
            const h=Number(row.querySelector('.assignment-hours').value||0);
            const rate=hourly(role),cost=h*rate;
            row.querySelector('.assignment-rate').textContent=money(rate);
            row.querySelector('.assignment-cost').textContent=money(cost);
            aHours+=h;aCost+=cost;
          });
          activity.querySelector('.activity-hours').textContent=money(aHours);
          activity.querySelector('.activity-cost').textContent=money(aCost);
          phaseHours+=aHours;phaseCost+=aCost;
        });
        card.querySelector('.phase-hours').textContent=money(phaseHours);
        card.querySelector('.phase-work-cost').textContent=money(phaseCost)+' €';
        const phaseId=card.dataset.phaseId;
        const row=phaseMap.get(phaseId)?.row;
        const costInput=row?.querySelector('.ae-cost');
        if(costInput)costInput.value=money(phaseCost);
      });
      recalcEconomicDynamic();
    }

    function bindEconomicInput(input){
      if(!input||input.dataset.dynamicBound==='1')return;
      input.dataset.dynamicBound='1';
      input.addEventListener('focus',()=>input.select());
      input.addEventListener('input',recalcEconomicDynamic);
      input.addEventListener('blur',()=>{input.value=money(itNumber(input.value));recalcEconomicDynamic();});
    }

    function recalcEconomicDynamic(){
      const trade=document.getElementById('tradePct');
      const tradePct=Number(trade?.value||0);
      const label=document.getElementById('tradePctLabel');if(label)label.textContent=tradePct+'%';
      let gross=0,costs=0;
      economicTable.querySelectorAll('.phase-row').forEach(row=>{
        const proposal=itNumber(row.querySelector('.ae-proposal')?.value);gross+=proposal;
        costs+=itNumber(row.querySelector('.ae-cost')?.value);
        const computed=row.querySelector('.ae-discount');if(computed)computed.textContent=money(proposal*(1-tradePct/100));
      });
      const net=gross*(1-tradePct/100),general=0,mol=net-costs,mon=mol-general;
      const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
      set('aeGross',money(gross));set('aeDiscountTotal',money(net));set('aeCosts',money(costs));set('aeMol',money(mol));set('aeMolPct',pct(net?mol/net*100:0));set('aeGeneralExpenses',money(general));set('aeMon',money(mon));set('aeProfitPct',pct(net?mon/net*100:0));
    }

    [...economicTable.querySelectorAll('.phase-row:not(.external-row)')].forEach((row,index)=>decoratePhaseRow(row,index));
    bindEconomicInput(externalRow?.querySelector('.ae-proposal'));
    bindEconomicInput(externalRow?.querySelector('.ae-cost'));

    const summaryActions=document.createElement('div');summaryActions.className='phase-summary-actions';summaryActions.innerHTML='<button id="addEconomicPhase" class="soft-btn" type="button">＋ Aggiungi fase</button><span>Nome, proposta e costi restano sincronizzati con la pianificazione ore.</span>';
    economicTable.insertAdjacentElement('afterend',summaryActions);
    document.getElementById('addEconomicPhase').addEventListener('click',()=>{
      const row=document.createElement('div');row.className='economic-row phase-row';
      row.innerHTML='<div></div><div class="money-cell"><input class="ae-proposal" value="0,00"><span>€</span></div><div class="computed-cell"><span class="ae-discount">0,00</span><b>€</b></div><div class="money-cell cost-cell"><input class="ae-cost computed-cost" value="0,00" readonly><span>€</span></div>';
      economicTable.insertBefore(row,externalRow||totalRow);
      decoratePhaseRow(row,phaseMap.size);
      recalcEconomicDynamic();
    });

    const trade=document.getElementById('tradePct');trade?.addEventListener('input',recalcEconomicDynamic);
    document.getElementById('dimTransfer')?.addEventListener('click',()=>setTimeout(recalcEconomicDynamic,0));

    const externalRows=document.getElementById('externalCostRows');
    function addExternalCost(desc='',amount=0){
      externalRows.insertAdjacentHTML('beforeend',`<div class="external-cost-row"><input class="external-cost-desc" value="${esc(desc)}" placeholder="Descrizione costo esterno"><label><input class="external-cost-amount" inputmode="decimal" value="${money(amount)}"><b>€</b></label><button class="icon-btn danger external-cost-delete" type="button">×</button></div>`);
      const row=externalRows.lastElementChild;const amountInput=row.querySelector('.external-cost-amount');
      amountInput.addEventListener('focus',()=>amountInput.select());amountInput.addEventListener('input',recalcExternal);amountInput.addEventListener('blur',()=>{amountInput.value=money(itNumber(amountInput.value));recalcExternal();});
      row.querySelector('.external-cost-delete').addEventListener('click',()=>{row.remove();recalcExternal();});
    }
    function recalcExternal(){
      let total=0;externalRows.querySelectorAll('.external-cost-amount').forEach(i=>total+=itNumber(i.value));
      document.getElementById('externalCostTotal').textContent=money(total);
      const target=externalRow?.querySelector('.ae-cost');if(target)target.value=money(total);
      recalcEconomicDynamic();
    }
    document.getElementById('addExternalCost').addEventListener('click',()=>addExternalCost());

    recalcAllWork();recalcExternal();recalcEconomicDynamic();
  }
})();
