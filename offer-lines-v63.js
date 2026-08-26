/* v63 - Offer lines bridge: Analisi Economica -> Righe Offerta -> Confermata snapshot. */
(function(){
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cents=n=>Math.round(Number(n||0)*100)/100;
  let source='proposal';
  let frozen=false;
  let lineSeq=0;
  let syncTimer=null;
  let previousStatus='';

  function statusSelect(){
    return [...document.querySelectorAll('#tab-dati label.field')]
      .find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith('stato'))
      ?.querySelector('select')||null;
  }

  function offerCode(){
    const holder=[...document.querySelectorAll('#tab-dati label.field')]
      .find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith('codice'));
    return String(holder?.querySelector('input')?.value||'offerta-corrente').trim()||'offerta-corrente';
  }

  function economicTable(){return document.querySelector('#tab-analisi .economic-table');}
  function phaseRows(){
    return [...(economicTable()?.querySelectorAll('.phase-row[data-economic-phase]')||[])];
  }
  function activePhaseRows(){return phaseRows().filter(row=>row.dataset.economicActive==='1'&&!row.hidden);}
  function phaseLabel(row){return String(row.querySelector('.economic-phase-label')?.textContent||row.children[0]?.textContent||row.dataset.economicPhase||'Fase').trim();}
  function selectedAmount(row,kind=source){
    return kind==='trade'?num(row?.querySelector('.ae-discount')?.textContent):num(row?.querySelector('.ae-proposal')?.value);
  }
  function phaseCatalog(activeOnly=false){
    const rows=activeOnly?activePhaseRows():phaseRows();
    return rows.map(row=>({id:row.dataset.economicPhase,label:phaseLabel(row),row})).filter(x=>x.id);
  }
  function activePhaseIds(){return new Set(phaseCatalog(true).map(x=>x.id));}

  function specialEconomicRow(type){return economicTable()?.querySelector(`.phase-row[data-special-cost="${type}"]`)||null;}

  function reimbursementEntries(){
    return [...document.querySelectorAll('#reimbursementRows .reimb-row')].map(row=>({
      type:'reimbursements',row,phase:row.querySelector('.cost-phase-select')?.value||'',
      cost:num(row.querySelector('.reimb-total')?.textContent),
      sale:num(row.querySelector('.reimb-total')?.textContent)
    })).filter(x=>Math.abs(x.cost)>0.000001||Math.abs(x.sale)>0.000001);
  }

  function supplierEntries(){
    return [...document.querySelectorAll('#supplierCostRows .supplier-row')].map(row=>({
      type:'suppliers',row,phase:row.querySelector('.cost-phase-select')?.value||'',
      cost:num(row.querySelector('.supplier-cost')?.value),
      sale:num(row.querySelector('.supplier-sale')?.textContent)
    })).filter(x=>Math.abs(x.cost)>0.000001||Math.abs(x.sale)>0.000001);
  }

  function allocateAggregate(type,entries,kind){
    const result=new Map();
    const econ=specialEconomicRow(type);
    if(!econ||!entries.length)return result;
    const total=selectedAmount(econ,kind);
    const valid=entries.filter(x=>x.phase&&x.sale>0);
    const weightTotal=valid.reduce((s,x)=>s+x.sale,0);
    if(!weightTotal)return result;
    let assigned=0;
    valid.forEach((entry,index)=>{
      let part=index===valid.length-1?cents(total-assigned):cents(total*entry.sale/weightTotal);
      assigned=cents(assigned+part);
      result.set(entry.phase,cents((result.get(entry.phase)||0)+part));
    });
    return result;
  }

  function mergeMaps(target,sourceMap){sourceMap.forEach((v,k)=>target.set(k,cents((target.get(k)||0)+v)));return target;}

  function economicState(kind=source){
    window.dabsterRecalcEconomic?.();
    const phases=activePhaseRows().map(row=>({
      id:row.dataset.economicPhase,label:phaseLabel(row),row,
      proposal:num(row.querySelector('.ae-proposal')?.value),
      amount:selectedAmount(row,kind),
      directCost:num(row.querySelector('.ae-cost')?.value)
    }));
    const reimb=reimbursementEntries(),suppliers=supplierEntries();
    const specialSale=new Map();
    mergeMaps(specialSale,allocateAggregate('reimbursements',reimb,kind));
    mergeMaps(specialSale,allocateAggregate('suppliers',suppliers,kind));
    const specialCost=new Map();
    [...reimb,...suppliers].forEach(x=>{if(x.phase)specialCost.set(x.phase,cents((specialCost.get(x.phase)||0)+x.cost));});
    const target=cents(phases.reduce((s,p)=>s+p.amount,0)+selectedAmount(specialEconomicRow('reimbursements'),kind)+selectedAmount(specialEconomicRow('suppliers'),kind));
    phases.forEach(p=>{
      p.specialSale=specialSale.get(p.id)||0;
      p.specialCost=specialCost.get(p.id)||0;
      p.generalExpenses=cents(p.proposal*0.35);
      p.offerAmount=cents(p.amount+p.specialSale);
      p.totalCost=cents(p.directCost+p.specialCost+p.generalExpenses);
    });
    return {kind,phases,target,reimb,suppliers,specialSale,specialCost};
  }

  function installStyles(){
    if(document.getElementById('offerLinesV63Styles'))return;
    const s=document.createElement('style');s.id='offerLinesV63Styles';s.textContent=`
      #offerLinesSection{margin-top:10px!important;border-left-color:#6d8998!important}
      #offerLinesSection>.section-head{background:linear-gradient(90deg,#f2f6f8,#fafcfd)!important;color:#354b57!important}
      #offerLinesSection .section-body{padding:12px 13px 13px!important;background:#fbfcfd!important}
      .offer-lines-top{display:grid;grid-template-columns:minmax(300px,1fr) auto;gap:12px;align-items:center;margin-bottom:9px}
      .offer-source-box{display:flex;align-items:center;gap:7px;min-width:0}
      .offer-source-box>span{font-size:9px;font-weight:750;color:#5b6a73;white-space:nowrap}
      .offer-source-choice{display:flex;align-items:center;gap:5px;height:29px;padding:0 9px;border:1px solid #d8e0e4;border-radius:6px;background:#fff;font-size:9.5px;color:#40545f;cursor:pointer}
      .offer-source-choice:has(input:checked){border-color:#dd9b64;background:#fff7f0;color:#884a1f;box-shadow:0 0 0 2px rgba(224,116,36,.07)}
      .offer-source-choice strong{font-size:10px;font-variant-numeric:tabular-nums}
      .offer-lines-actions{display:flex;align-items:center;gap:6px;justify-content:flex-end}
      .offer-lines-btn{height:29px;padding:0 10px;border:1px solid #cfd9de;border-radius:6px;background:#fff;color:#48606b;font-size:9.5px;font-weight:700;cursor:pointer}
      .offer-lines-btn:hover{background:#f5f8f9}.offer-lines-btn.primary{border-color:#86aab7;color:#315c6b;background:#f7fbfc}
      .offer-lines-btn:disabled{opacity:.45;cursor:not-allowed}
      .offer-lines-status{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:9px}
      .offer-lines-kpi{min-height:47px;padding:7px 9px;border:1px solid #dce3e7;border-radius:7px;background:#fff;display:flex;flex-direction:column;justify-content:center;gap:2px}
      .offer-lines-kpi span{font-size:7.8px;font-weight:750;color:#71808a;text-transform:uppercase;letter-spacing:.02em}
      .offer-lines-kpi strong{font-size:12px;color:#314650;font-variant-numeric:tabular-nums}.offer-lines-kpi.diff.ok{background:#f2f8f4;border-color:#cfe3d5}.offer-lines-kpi.diff.ok strong{color:#356449}.offer-lines-kpi.diff.bad{background:#fff4f4;border-color:#ebc9cb}.offer-lines-kpi.diff.bad strong{color:#9b4248}
      .offer-lines-table{border:1px solid #d8e0e4;border-radius:7px;overflow:hidden;background:#fff}
      .offer-line-row{display:grid;grid-template-columns:minmax(150px,.9fr) minmax(250px,1.8fr) 56px 120px 120px 30px;min-height:34px;align-items:stretch}
      .offer-line-row>div{min-width:0;display:flex;align-items:center;padding:4px 7px;border-right:1px solid #e7ebed;border-bottom:1px solid #e7ebed}.offer-line-row>div:last-child{border-right:0;justify-content:center;padding:0}.offer-line-row:last-child>div{border-bottom:0}
      .offer-line-head{min-height:31px;background:#f3f6f7;font-size:8px;font-weight:750;color:#596872;text-transform:uppercase;letter-spacing:.02em}.offer-line-head>div:nth-child(n+3){justify-content:center;text-align:center}
      .offer-line-phase{font-size:9.8px;font-weight:700;color:#3a5260}.offer-line-phase select{width:100%;height:25px;border:1px solid #d8e0e4;border-radius:5px;background:#fff;font-size:9.2px;color:#3d525e}
      .offer-line-desc{width:100%;height:25px;border:1px solid transparent;border-radius:5px;background:transparent;padding:0 5px;font-size:10px;color:#334650}.offer-line-desc:hover{border-color:#e1e6e9;background:#fafcfd}.offer-line-desc:focus{outline:none;border-color:#70a6b8;background:#fff;box-shadow:0 0 0 2px rgba(83,145,163,.09)}
      .offer-line-qty{width:100%;text-align:center;color:#5e6e77;font-size:9.5px;font-weight:700}
      .offer-line-amount{width:100%;height:25px;border:1px solid #dbe2e6;border-radius:5px;background:#fff;text-align:center;font-size:10px;font-weight:700;color:#314650;font-variant-numeric:tabular-nums}.offer-line-amount:focus{outline:none;border-color:#70a6b8;box-shadow:0 0 0 2px rgba(83,145,163,.09)}
      .offer-line-cost{width:100%;text-align:center;font-size:9.5px;color:#667780;font-variant-numeric:tabular-nums}.offer-line-cost[title]{cursor:help}.offer-line-delete{width:23px;height:23px;border:0;border-radius:4px;background:transparent;color:#a05a5f;font-size:15px;cursor:pointer}.offer-line-delete:hover{background:#fff0f1}.offer-line-delete.generated{visibility:hidden}
      .offer-lines-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px;font-size:8.7px;color:#6d7a82}.offer-lines-foot strong{color:#40545e}.offer-lines-warning{font-weight:700;color:#a14c51!important}.offer-lines-frozen{color:#47705a!important}
      #offerLinesSection[data-frozen="1"] .offer-line-row:not(.offer-line-head){background:#fafbfc}#offerLinesSection[data-frozen="1"] input,#offerLinesSection[data-frozen="1"] select{background:#f5f7f8!important;color:#5d6971!important}
      .cost-phase-cell{display:flex;align-items:center;min-width:0}.cost-phase-select{width:100%;min-width:0;height:25px;border:1px solid #d8e0e4;border-radius:5px;background:#fff;padding:0 5px;font-size:8.7px;color:#40545f}.cost-phase-select.invalid{border-color:#d99095;background:#fff5f5}
      #reimbursementsSection .reimb-head,#reimbursementsSection .reimb-row{grid-template-columns:minmax(155px,1.25fr) minmax(100px,.72fr) minmax(72px,.5fr) minmax(90px,.62fr) minmax(82px,.56fr) minmax(95px,.68fr) minmax(145px,.9fr)!important}
      #externalCostsSection .supplier-head,#externalCostsSection .supplier-row{grid-template-columns:minmax(180px,1.3fr) minmax(95px,.65fr) minmax(78px,.5fr) minmax(105px,.7fr) minmax(145px,.9fr) 28px!important}
      @media(max-width:900px){.offer-lines-table{overflow-x:auto}.offer-line-row{min-width:820px}.offer-lines-top{grid-template-columns:1fr}.offer-lines-actions{justify-content:flex-start}.offer-lines-status{grid-template-columns:1fr 1fr 1fr}}
    `;document.head.appendChild(s);
  }

  function installSection(){
    if(document.getElementById('offerLinesSection'))return document.getElementById('offerLinesSection');
    const tab=document.getElementById('tab-dati');if(!tab)return null;
    const amounts=tab.querySelector('.accordion.amounts');
    const notes=tab.querySelector('.accordion.notes');
    const section=document.createElement('section');section.id='offerLinesSection';section.className='accordion open';
    section.innerHTML=`
      <button class="section-head" type="button"><span>▤&nbsp;&nbsp;Righe Offerta</span><span class="chevron">⌄</span></button>
      <div class="section-body">
        <div class="offer-lines-top">
          <div class="offer-source-box"><span>IMPORTI DA ANALISI</span>
            <label class="offer-source-choice"><input type="radio" name="offerAmountSource" value="proposal" checked> Proposta <strong data-source-proposal>0,00 €</strong></label>
            <label class="offer-source-choice"><input type="radio" name="offerAmountSource" value="trade"> Trattativa <strong data-source-trade>0,00 €</strong></label>
          </div>
          <div class="offer-lines-actions"><button type="button" id="offerLinesReset" class="offer-lines-btn">↺ Allinea da analisi</button><button type="button" id="offerLineAdd" class="offer-lines-btn primary">＋ Aggiungi riga</button></div>
        </div>
        <div class="offer-lines-status">
          <div class="offer-lines-kpi"><span>Totale analisi scelto</span><strong id="offerLinesTarget">0,00 €</strong></div>
          <div class="offer-lines-kpi"><span>Totale righe offerta</span><strong id="offerLinesTotal">0,00 €</strong></div>
          <div class="offer-lines-kpi diff ok" id="offerLinesDiffCard"><span>Differenza</span><strong id="offerLinesDiff">0,00 €</strong></div>
        </div>
        <div class="offer-lines-table">
          <div class="offer-line-row offer-line-head"><div>Fase</div><div>Descrizione riga</div><div>Qtà</div><div>Importo €</div><div>Costo fase*</div><div></div></div>
          <div id="offerLineRows"></div>
        </div>
        <div class="offer-lines-foot"><span>* Costo fase interno: ore + costi attribuiti + spese generali 35%. Non compare nel documento cliente.</span><strong id="offerLinesMessage">Le righe devono coincidere con il totale scelto dell’Analisi Economica.</strong></div>
      </div>`;
    if(amounts)amounts.insertAdjacentElement('afterend',section);else if(notes)tab.insertBefore(section,notes);else tab.appendChild(section);
    section.querySelector('.section-head')?.addEventListener('click',()=>section.classList.toggle('open'));
    section.querySelectorAll('input[name="offerAmountSource"]').forEach(r=>r.addEventListener('change',()=>{
      if(frozen)return;source=r.value==='trade'?'trade':'proposal';syncGenerated({forceAmounts:true});syncAll();
    }));
    document.getElementById('offerLineAdd')?.addEventListener('click',()=>{if(!frozen){addManualLine();syncAll();}});
    document.getElementById('offerLinesReset')?.addEventListener('click',()=>{if(!frozen){syncGenerated({forceAmounts:true});syncAll();}});
    return section;
  }

  function currentPhaseOptions(selected='',activeOnly=true){
    const items=phaseCatalog(activeOnly);return `<option value="">Assegna fase…</option>`+items.map(p=>`<option value="${esc(p.id)}" ${p.id===selected?'selected':''}>${esc(p.label)}</option>`).join('');
  }

  function ensureCostPhaseSelectors(){
    const active=activePhaseIds();
    const reimbHead=document.querySelector('#reimbursementsSection .reimb-head');
    if(reimbHead&&!reimbHead.querySelector('.cost-phase-head')){const x=document.createElement('span');x.className='cost-phase-head';x.textContent='Fase';reimbHead.appendChild(x);}
    document.querySelectorAll('#reimbursementRows .reimb-row').forEach(row=>{
      let select=row.querySelector('.cost-phase-select');
      if(!select){const cell=document.createElement('div');cell.className='cost-phase-cell';cell.innerHTML='<select class="cost-phase-select"></select>';row.appendChild(cell);select=cell.firstElementChild;select.addEventListener('change',()=>{select.classList.remove('invalid');scheduleSync(20);});}
      const keep=select.value;select.innerHTML=currentPhaseOptions(keep,true);if(keep&&active.has(keep))select.value=keep;else if(keep)select.value='';
    });

    const supplierHead=document.querySelector('#externalCostsSection .supplier-head');
    if(supplierHead&&!supplierHead.querySelector('.cost-phase-head')){const blank=supplierHead.lastElementChild;const x=document.createElement('span');x.className='cost-phase-head';x.textContent='Fase';supplierHead.insertBefore(x,blank||null);}
    document.querySelectorAll('#supplierCostRows .supplier-row').forEach(row=>{
      let select=row.querySelector('.cost-phase-select');
      if(!select){const cell=document.createElement('div');cell.className='cost-phase-cell';cell.innerHTML='<select class="cost-phase-select"></select>';const del=row.querySelector('.supplier-delete');row.insertBefore(cell,del||null);select=cell.firstElementChild;select.addEventListener('change',()=>{select.classList.remove('invalid');scheduleSync(20);});}
      const keep=select.value;select.innerHTML=currentPhaseOptions(keep,true);if(keep&&active.has(keep))select.value=keep;else if(keep)select.value='';
    });
  }

  function rowElement(id){return [...document.querySelectorAll('#offerLineRows .offer-line-row')].find(r=>r.dataset.lineId===id)||null;}

  function buildGeneratedLine(phase){
    const row=document.createElement('div');row.className='offer-line-row';row.dataset.lineId='phase:'+phase.id;row.dataset.kind='generated';row.dataset.phase=phase.id;
    row.innerHTML=`<div class="offer-line-phase"><span>${esc(phase.label)}</span></div><div><input class="offer-line-desc" value="${esc(phase.label)}"></div><div><span class="offer-line-qty">1</span></div><div><input class="offer-line-amount" inputmode="decimal" value="${money(phase.offerAmount)}"></div><div><span class="offer-line-cost">${money(phase.totalCost)} €</span></div><div><button type="button" class="offer-line-delete generated">×</button></div>`;
    const amount=row.querySelector('.offer-line-amount');amount.addEventListener('focus',()=>amount.select());amount.addEventListener('input',()=>{row.dataset.manualAmount='1';scheduleSync(0);});amount.addEventListener('blur',()=>{amount.value=money(num(amount.value));syncAll();});
    row.querySelector('.offer-line-desc').addEventListener('input',()=>scheduleSync(0));
    return row;
  }

  function addManualLine(seed={}){
    const root=document.getElementById('offerLineRows');if(!root)return null;
    const id=seed.id||'manual:'+(++lineSeq);
    const row=document.createElement('div');row.className='offer-line-row';row.dataset.lineId=id;row.dataset.kind='manual';
    row.innerHTML=`<div class="offer-line-phase"><select class="offer-line-phase-select">${currentPhaseOptions(seed.phase||'',true)}</select></div><div><input class="offer-line-desc" placeholder="Descrizione commerciale" value="${esc(seed.description||'')}"></div><div><span class="offer-line-qty">1</span></div><div><input class="offer-line-amount" inputmode="decimal" value="${money(seed.amount||0)}"></div><div><span class="offer-line-cost">—</span></div><div><button type="button" class="offer-line-delete" title="Elimina riga">×</button></div>`;
    root.appendChild(row);
    row.querySelector('.offer-line-phase-select').addEventListener('change',()=>scheduleSync(0));
    row.querySelector('.offer-line-desc').addEventListener('input',()=>scheduleSync(0));
    const amount=row.querySelector('.offer-line-amount');amount.addEventListener('focus',()=>amount.select());amount.addEventListener('input',()=>scheduleSync(0));amount.addEventListener('blur',()=>{amount.value=money(num(amount.value));syncAll();});
    row.querySelector('.offer-line-delete').addEventListener('click',()=>{row.remove();syncAll();});
    return row;
  }

  function syncGenerated({forceAmounts=false}={}){
    const root=document.getElementById('offerLineRows');if(!root||frozen)return;
    ensureCostPhaseSelectors();
    const state=economicState(source);const active=new Set(state.phases.map(p=>p.id));
    [...root.querySelectorAll('.offer-line-row[data-kind="generated"]')].forEach(row=>{if(!active.has(row.dataset.phase))row.remove();});
    state.phases.forEach(phase=>{
      let row=rowElement('phase:'+phase.id);
      if(!row){row=buildGeneratedLine(phase);root.appendChild(row);}
      row.dataset.phase=phase.id;
      row.querySelector('.offer-line-phase span').textContent=phase.label;
      const amount=row.querySelector('.offer-line-amount');if(forceAmounts||row.dataset.manualAmount!=='1'){amount.value=money(phase.offerAmount);if(forceAmounts)delete row.dataset.manualAmount;}
      const cost=row.querySelector('.offer-line-cost');cost.textContent=money(phase.totalCost)+' €';cost.title=`Ore/interne ${money(phase.directCost)} € · Costi attribuiti ${money(phase.specialCost)} € · Spese generali ${money(phase.generalExpenses)} €`;
    });
    root.querySelectorAll('.offer-line-row[data-kind="manual"] .offer-line-phase-select').forEach(select=>{
      const keep=select.value;select.innerHTML=currentPhaseOptions(keep,true);if(keep&&active.has(keep))select.value=keep;else if(keep)select.value='';
    });
  }

  function lines(){
    return [...document.querySelectorAll('#offerLineRows .offer-line-row')].map(row=>({
      id:row.dataset.lineId,kind:row.dataset.kind,phase:row.dataset.kind==='generated'?row.dataset.phase:(row.querySelector('.offer-line-phase-select')?.value||''),
      description:String(row.querySelector('.offer-line-desc')?.value||'').trim(),qty:1,amount:cents(num(row.querySelector('.offer-line-amount')?.value))
    }));
  }

  function unassignedCosts(state){
    const active=activePhaseIds();return [...state.reimb,...state.suppliers].filter(x=>x.cost>0&&(!x.phase||!active.has(x.phase)));
  }

  function validation(){
    const state=economicState(source);const all=lines();const total=cents(all.reduce((s,x)=>s+x.amount,0));const diff=cents(total-state.target);
    const missingPhase=all.filter(x=>x.kind==='manual'&&!x.phase);
    const missingDesc=all.filter(x=>!x.description);
    const costs=unassignedCosts(state);
    const valid=Math.abs(diff)<=0.01&&!missingPhase.length&&!missingDesc.length&&!costs.length&&all.length>0;
    return {state,all,total,diff,missingPhase,missingDesc,costs,valid};
  }

  function updateComputedOffer(total){
    const target=document.getElementById('totaleOfferta');if(target){target.value=money(total);target.dispatchEvent(new Event('input',{bubbles:true}));}
  }

  function renderValidation(){
    const v=validation();
    const proposal=economicState('proposal').target,trade=economicState('trade').target;
    const section=document.getElementById('offerLinesSection');
    const proposalLabel=section?.querySelector('[data-source-proposal]');if(proposalLabel)proposalLabel.textContent=money(proposal)+' €';
    const tradeLabel=section?.querySelector('[data-source-trade]');if(tradeLabel)tradeLabel.textContent=money(trade)+' €';
    const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text;};
    set('offerLinesTarget',money(v.state.target)+' €');set('offerLinesTotal',money(v.total)+' €');set('offerLinesDiff',(v.diff>0?'+':'')+money(v.diff)+' €');
    const card=document.getElementById('offerLinesDiffCard');if(card){card.classList.toggle('ok',Math.abs(v.diff)<=0.01);card.classList.toggle('bad',Math.abs(v.diff)>0.01);}
    document.querySelectorAll('.cost-phase-select').forEach(s=>s.classList.remove('invalid'));
    v.costs.forEach(x=>x.row.querySelector('.cost-phase-select')?.classList.add('invalid'));
    const msg=document.getElementById('offerLinesMessage');
    if(msg){
      msg.className='';
      if(frozen){msg.className='offer-lines-frozen';msg.textContent='Offerta confermata · righe e analisi congelate.';}
      else if(v.costs.length){msg.className='offer-lines-warning';msg.textContent='Assegna una fase ai Rimborsi/Costi esterni valorizzati.';}
      else if(v.missingPhase.length){msg.className='offer-lines-warning';msg.textContent='Ogni riga manuale deve essere associata a una fase.';}
      else if(v.missingDesc.length){msg.className='offer-lines-warning';msg.textContent='Completa la descrizione di tutte le righe offerta.';}
      else if(Math.abs(v.diff)>0.01){msg.className='offer-lines-warning';msg.textContent='Totale righe diverso dall’Analisi Economica: la conferma è bloccata.';}
      else{msg.textContent='Totale verificato · offerta pronta per la conferma.';}
    }
    updateComputedOffer(v.total);
    window.DABSTER_OFFER_LINES={amountSource:source,target:v.state.target,total:v.total,difference:v.diff,valid:v.valid,lines:v.all,frozen,snapshot:window.DABSTER_CONFIRMED_OFFER||null,sync:syncAll};
    window.dispatchEvent(new CustomEvent('dabster-offer-lines-change',{detail:window.DABSTER_OFFER_LINES}));
    return v;
  }

  function syncAll(){
    clearTimeout(syncTimer);ensureCostPhaseSelectors();syncGenerated();renderValidation();
  }
  function scheduleSync(delay=45){clearTimeout(syncTimer);syncTimer=setTimeout(syncAll,delay);}

  function snapshot(){
    const v=validation();return {offerCode:offerCode(),confirmedAt:new Date().toISOString(),amountSource:source,target:v.state.target,total:v.total,lines:v.all.map(x=>({...x})),phaseCosts:v.state.phases.map(p=>({phase:p.id,label:p.label,directCost:p.directCost,attributedCosts:p.specialCost,generalExpenses:p.generalExpenses,totalCost:p.totalCost})),valid:v.valid};
  }

  function lockElement(el){
    if(!el||el.dataset.offerLocked==='1')return;el.dataset.offerLocked='1';el.dataset.offerWasDisabled=el.disabled?'1':'0';if(!el.disabled)el.disabled=true;
  }

  function freezeOffer(){
    if(frozen)return true;
    const v=validation();if(!v.valid)return false;
    frozen=true;window.DABSTER_CONFIRMED_OFFER=snapshot();document.body.dataset.offerFrozen='1';
    const section=document.getElementById('offerLinesSection');if(section)section.dataset.frozen='1';
    section?.querySelectorAll('input,select,button:not(.section-head)').forEach(lockElement);
    document.querySelectorAll('#tab-analisi input,#tab-analisi select,#tab-analisi textarea').forEach(lockElement);
    document.querySelectorAll('#tab-analisi .dim-add,#tab-analisi .dim-delete,#tab-analisi .dim-rounded-reset,#tab-analisi .dim-transfer,#tab-analisi .planning-card-add,#tab-analisi .add-assignment,#tab-analisi .assignment-delete,#tab-analisi .activity-delete,#tab-analisi .add-activity,#tab-analisi .supplier-delete,#tab-analisi #addSupplierCost').forEach(lockElement);
    document.querySelectorAll('.cost-phase-select').forEach(lockElement);
    renderValidation();window.dispatchEvent(new CustomEvent('dabster-offer-confirmed',{detail:window.DABSTER_CONFIRMED_OFFER}));return true;
  }

  function prototypeUnlock(){
    frozen=false;delete window.DABSTER_CONFIRMED_OFFER;delete document.body.dataset.offerFrozen;
    document.getElementById('offerLinesSection')?.removeAttribute('data-frozen');
    document.querySelectorAll('[data-offer-locked="1"]').forEach(el=>{if(el.dataset.offerWasDisabled!=='1')el.disabled=false;delete el.dataset.offerLocked;delete el.dataset.offerWasDisabled;});
    syncAll();
  }

  function bindStatus(){
    const status=statusSelect();if(!status)return;previousStatus=status.value;
    status.addEventListener('change',e=>{
      const next=norm(status.value);
      if(next==='confermata'&&!frozen){
        syncAll();const v=validation();
        if(!v.valid){
          e.preventDefault();e.stopImmediatePropagation();status.value=previousStatus;
          const msg=document.getElementById('offerLinesMessage');if(msg){msg.className='offer-lines-warning';msg.textContent='Conferma bloccata: sistema Righe Offerta e imputazione costi.';}
          document.querySelector('.tab[data-tab="dati"]')?.click();document.getElementById('offerLinesSection')?.scrollIntoView({behavior:'smooth',block:'center'});return;
        }
        freezeOffer();
      }
      previousStatus=status.value;
    },true);
  }

  function bindWatchers(){
    const table=economicTable();table?.addEventListener('input',()=>scheduleSync(80),true);table?.addEventListener('change',()=>scheduleSync(80),true);
    document.getElementById('phaseWorkloadSection')?.addEventListener('input',()=>scheduleSync(100),true);
    document.getElementById('phaseWorkloadSection')?.addEventListener('change',()=>scheduleSync(100),true);
    document.addEventListener('input',e=>{if(e.target?.closest?.('#reimbursementsSection,#externalCostsSection'))scheduleSync(100);},true);
    document.addEventListener('change',e=>{if(e.target?.closest?.('#reimbursementsSection,#externalCostsSection'))scheduleSync(100);},true);
    document.addEventListener('click',e=>{
      if(e.target.closest('#addSupplierCost,.supplier-delete,#dimTransfer,.planning-card-add,.activity-delete,.assignment-delete,.add-assignment'))scheduleSync(180);
      if(e.target.closest('#clearDemoData'))prototypeUnlock();
    },true);
    window.addEventListener('dabster-dimension-transfer',()=>scheduleSync(180));
    const costRoots=[document.getElementById('reimbursementRows'),document.getElementById('supplierCostRows')].filter(Boolean);
    costRoots.forEach(root=>new MutationObserver(()=>{ensureCostPhaseSelectors();scheduleSync(120);}).observe(root,{childList:true,subtree:true}));
  }

  function install(attempt=0){
    const ready=document.getElementById('tab-dati')&&economicTable()&&document.getElementById('analysisSubtabs')&&phaseRows().length>=7&&document.getElementById('reimbursementsSection')&&document.getElementById('externalCostsSection');
    if(!ready){if(attempt<260)setTimeout(()=>install(attempt+1),60);return;}
    installStyles();installSection();ensureCostPhaseSelectors();syncGenerated({forceAmounts:true});syncAll();bindStatus();bindWatchers();
    setTimeout(syncAll,500);setTimeout(syncAll,1600);
  }

  install();
})();