import {PHASES,cents,money,normalize,numberFromItalian,phaseCategory,confirmationCategoryLabel} from './domain.js';

export function installOfferWorkflow(store,billingDomain){
  let manualSeq=0,confirmedInitialized=false,confirmationSeeded=false,timer=null;
  const phaseMap=new Map(PHASES.map(p=>[p.id,p]));

  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function field(label,scope='#tab-dati'){
    const key=normalize(label);
    return qsa(`${scope} label.field`).find(x=>normalize(x.querySelector(':scope > span')?.textContent).startsWith(key))||null;
  }
  function statusSelect(){return field('Stato')?.querySelector('select')||null;}
  function currentStatus(){return normalize(statusSelect()?.value);}
  function isConfirmed(){return currentStatus()==='confermata';}
  function isAnalysisLocked(){return ['completata','inviata','confermata'].includes(currentStatus());}
  function offerCode(){return String(field('Codice')?.querySelector('input')?.value||'offerta').trim()||'offerta';}
  function offerTitle(){return String(field('Titolo')?.querySelector('input')?.value||'').trim();}
  function officialOfferInput(){return document.getElementById('totaleOfferta');}

  function ensureStatusOptions(){
    const s=statusSelect();if(!s)return;
    ['In lavorazione','Completata','Inviata','Confermata'].forEach(label=>{
      if(![...s.options].some(o=>normalize(o.value||o.textContent)===normalize(label)))s.add(new Option(label,label));
    });
  }

  function makeOfficialOfferEditable(){
    const old=officialOfferInput();if(!old||old.dataset.cleanManual==='1')return;
    const clone=old.cloneNode(true);
    clone.disabled=false;clone.readOnly=false;clone.dataset.cleanManual='1';clone.classList.add('clean-offer-amount');
    old.replaceWith(clone);
    const holder=clone.closest('.money-control');holder?.classList.remove('disabled');
    const label=clone.closest('label.field')?.querySelector(':scope > span');
    if(label){label.innerHTML='Importo offerta * <em>(inserito dall’utente)</em>';}
    clone.addEventListener('focus',()=>clone.select());
    clone.addEventListener('blur',()=>{clone.value=money(numberFromItalian(clone.value));syncStore();});
    clone.addEventListener('input',()=>schedule(0));
  }

  function installStyles(){
    if(document.getElementById('cleanOfferWorkflowStyles'))return;
    const s=document.createElement('style');s.id='cleanOfferWorkflowStyles';s.textContent=`
      #confirmationAmountsSection[hidden],#offerLinesSection[hidden]{display:none!important}
      .clean-offer-amount{background:#fff!important;color:#2f424d!important;font-weight:700!important}
      #confirmationAmountsSection,#offerLinesSection{margin-top:10px!important}
      #confirmationAmountsSection{border-left-color:#d07a32!important}#confirmationAmountsSection>.section-head{background:linear-gradient(90deg,#fff5eb,#fffaf6)!important;color:#654a36!important}
      #confirmationAmountsSection .section-body,#offerLinesSection .section-body{padding:11px 13px 12px!important}
      .clean-confirm-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.clean-confirm-total{margin-top:9px;min-height:39px;padding:7px 10px;border:1px solid #ead8c7;border-radius:7px;background:#fff7ef;display:flex;align-items:center;justify-content:space-between}.clean-confirm-total span{font-size:8px;font-weight:750;color:#756253;text-transform:uppercase}.clean-confirm-total strong{font-size:13px;color:#784921;font-variant-numeric:tabular-nums}
      #offerLinesSection{border-left-color:#6d8998!important}#offerLinesSection>.section-head{background:linear-gradient(90deg,#f2f6f8,#fafcfd)!important;color:#354b57!important}
      .clean-lines-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:9px}.clean-lines-kpi{min-height:45px;padding:7px 9px;border:1px solid #dce3e7;border-radius:7px;background:#fff;display:flex;flex-direction:column;justify-content:center;gap:2px}.clean-lines-kpi span{font-size:7.7px;font-weight:750;color:#71808a;text-transform:uppercase}.clean-lines-kpi strong{font-size:12px;color:#314650;font-variant-numeric:tabular-nums}.clean-lines-kpi.ok{background:#f2f8f4;border-color:#cfe3d5}.clean-lines-kpi.bad{background:#fff4f4;border-color:#ebc9cb}.clean-lines-kpi.bad strong{color:#9b4248}
      .clean-lines-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}.clean-lines-hint{font-size:8.7px;color:#687780}.clean-lines-actions{display:flex;gap:6px}.clean-lines-btn{height:29px;padding:0 10px;border:1px solid #cfd9de;border-radius:6px;background:#fff;color:#48606b;font-size:9.3px;font-weight:700;cursor:pointer}.clean-lines-btn.primary{border-color:#86aab7;color:#315c6b;background:#f7fbfc}
      .clean-lines-table{border:1px solid #d8e0e4;border-radius:7px;overflow:hidden;background:#fff}.clean-line{display:grid;grid-template-columns:minmax(165px,.95fr) minmax(280px,1.9fr) 130px 32px;min-height:35px}.clean-line>div{display:flex;align-items:center;min-width:0;padding:4px 7px;border-right:1px solid #e7ebed;border-bottom:1px solid #e7ebed}.clean-line>div:last-child{border-right:0;justify-content:center;padding:0}.clean-line:last-child>div{border-bottom:0}.clean-line.head{min-height:30px;background:#f3f6f7;font-size:8px;font-weight:750;color:#596872;text-transform:uppercase}.clean-line.head>div:nth-child(3){justify-content:center}.clean-line-phase{font-size:9.6px;font-weight:700;color:#3b5260}.clean-line select,.clean-line input{width:100%;height:25px;border:1px solid #dbe2e6;border-radius:5px;background:#fff;padding:0 6px;font-size:9.7px;color:#334650}.clean-line .clean-line-amount{text-align:center;font-weight:700;font-variant-numeric:tabular-nums}.clean-line-delete{width:23px;height:23px;border:0;border-radius:4px;background:transparent;color:#a05a5f;font-size:15px;cursor:pointer}.clean-line[data-generated="1"] .clean-line-delete{visibility:hidden}
      .clean-lines-foot{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:8px;font-size:8.6px;color:#6c7a82}.clean-lines-message{font-weight:700}.clean-lines-message.ready{color:#39704e}.clean-lines-message.warning{color:#a14c51}.clean-category-checks{display:flex;gap:8px;flex-wrap:wrap}.clean-category-check{padding:3px 6px;border-radius:10px;background:#f2f5f6;color:#697781;font-size:7.7px}.clean-category-check.bad{background:#fff0f0;color:#9a4950}
      #analysisSubtabImpianti[data-clean-locked="1"]{position:relative}#analysisSubtabImpianti[data-clean-locked="1"] .economic-summary-title::after{content:' · analisi congelata';color:#976a43;font-weight:650}
      .cost-phase-cell{display:flex;align-items:center;min-width:0}.cost-phase-select{width:100%;height:25px;border:1px solid #d8e0e4;border-radius:5px;background:#fff;padding:0 5px;font-size:8.6px;color:#40545f}.cost-phase-select.invalid{border-color:#d99095;background:#fff5f5}
      #reimbursementsSection .reimb-head,#reimbursementsSection .reimb-row{grid-template-columns:minmax(155px,1.25fr) minmax(100px,.72fr) minmax(72px,.5fr) minmax(90px,.62fr) minmax(82px,.56fr) minmax(95px,.68fr) minmax(145px,.9fr)!important}
      #externalCostsSection .supplier-head,#externalCostsSection .supplier-row{grid-template-columns:minmax(180px,1.3fr) minmax(95px,.65fr) minmax(78px,.5fr) minmax(105px,.7fr) minmax(145px,.9fr) 28px!important}
      @media(max-width:900px){.clean-lines-table{overflow-x:auto}.clean-line{min-width:700px}.clean-lines-summary,.clean-confirm-grid{grid-template-columns:repeat(3,minmax(130px,1fr))}.clean-lines-top{align-items:flex-start;flex-direction:column}}
    `;document.head.appendChild(s);
  }

  function ensureConfirmationSection(){
    let section=document.getElementById('confirmationAmountsSection');if(section)return section;
    const tab=document.getElementById('tab-dati'),notes=tab?.querySelector('.accordion.notes');if(!tab)return null;
    section=document.createElement('section');section.id='confirmationAmountsSection';section.className='accordion open';section.hidden=true;
    section.innerHTML=`<button class="section-head" type="button"><span>€&nbsp;&nbsp;Importo Conferma</span><span class="chevron">⌄</span></button><div class="section-body"><div class="clean-confirm-grid"><label class="field"><span>Consulenza</span><div class="money-control"><input id="confirmationConsulting" inputmode="decimal" value="0,00"><span>€</span></div></label><label class="field"><span>Progetti</span><div class="money-control"><input id="confirmationProjects" inputmode="decimal" value="0,00"><span>€</span></div></label><label class="field"><span>Direzione lavori</span><div class="money-control"><input id="confirmationDirection" inputmode="decimal" value="0,00"><span>€</span></div></label></div><div class="clean-confirm-total"><span>Totale conferma</span><strong id="confirmationTotal">0,00 €</strong></div></div>`;
    if(notes)tab.insertBefore(section,notes);else tab.appendChild(section);
    section.querySelector('.section-head')?.addEventListener('click',()=>section.classList.toggle('open'));
    qsa('input',section).forEach(input=>{input.addEventListener('focus',()=>input.select());input.addEventListener('input',()=>{confirmationSeeded=true;schedule(0);});input.addEventListener('blur',()=>{input.value=money(numberFromItalian(input.value));sync();});});
    return section;
  }

  function ensureLinesSection(){
    let section=document.getElementById('offerLinesSection');if(section)return section;
    const tab=document.getElementById('tab-dati'),confirm=ensureConfirmationSection(),notes=tab?.querySelector('.accordion.notes');if(!tab)return null;
    section=document.createElement('section');section.id='offerLinesSection';section.className='accordion open';section.hidden=true;
    section.innerHTML=`<button class="section-head" type="button"><span>▤&nbsp;&nbsp;Righe Offerta</span><span class="chevron">⌄</span></button><div class="section-body"><div class="clean-lines-top"><span class="clean-lines-hint">Una riga per fase dell’Analisi. Gli importi possono essere adattati alla conferma del cliente.</span><div class="clean-lines-actions"><button id="cleanResetLines" class="clean-lines-btn" type="button">↺ Riprendi analisi</button><button id="cleanAddLine" class="clean-lines-btn primary" type="button">＋ Aggiungi riga</button></div></div><div class="clean-lines-summary"><div class="clean-lines-kpi"><span>Totale conferma</span><strong id="cleanConfirmTotal">0,00 €</strong></div><div class="clean-lines-kpi"><span>Totale righe</span><strong id="cleanLinesTotal">0,00 €</strong></div><div id="cleanDiffCard" class="clean-lines-kpi"><span>Differenza</span><strong id="cleanLinesDiff">0,00 €</strong></div></div><div class="clean-lines-table"><div class="clean-line head"><div>Fase</div><div>Descrizione riga</div><div>Importo €</div><div></div></div><div id="cleanOfferLineRows"></div></div><div class="clean-lines-foot"><div id="cleanCategoryChecks" class="clean-category-checks"></div><strong id="cleanLinesMessage" class="clean-lines-message">Compila Importo Conferma e verifica le righe.</strong></div></div>`;
    if(confirm)confirm.insertAdjacentElement('afterend',section);else if(notes)tab.insertBefore(section,notes);else tab.appendChild(section);
    section.querySelector('.section-head')?.addEventListener('click',()=>section.classList.toggle('open'));
    section.querySelector('#cleanAddLine')?.addEventListener('click',()=>{if(isConfirmed()){addManualLine();sync();}});
    section.querySelector('#cleanResetLines')?.addEventListener('click',()=>{if(isConfirmed()){rebuildGenerated(true);sync();}});
    return section;
  }

  function activeAnalysisPhases(){
    return qsa('#tab-analisi .economic-table .phase-row[data-economic-phase]').filter(row=>row.dataset.economicActive==='1'&&!row.hidden).map(row=>({
      id:row.dataset.economicPhase,
      label:String(row.querySelector('.economic-phase-label')?.textContent||phaseMap.get(row.dataset.economicPhase)?.label||row.children[0]?.textContent||'Fase').trim(),
      row
    }));
  }

  function specialEntries(){
    const reimb=qsa('#reimbursementRows .reimb-row').map(row=>({phase:row.querySelector('.cost-phase-select')?.value||'',sale:numberFromItalian(row.querySelector('.reimb-total')?.textContent),cost:numberFromItalian(row.querySelector('.reimb-total')?.textContent)})).filter(x=>x.sale||x.cost);
    const suppliers=qsa('#supplierCostRows .supplier-row').map(row=>({phase:row.querySelector('.cost-phase-select')?.value||'',sale:numberFromItalian(row.querySelector('.supplier-sale')?.textContent),cost:numberFromItalian(row.querySelector('.supplier-cost')?.value)})).filter(x=>x.sale||x.cost);
    return {reimb,suppliers};
  }

  function aggregateSpecialSales(){
    const map=new Map();const entries=specialEntries();
    [...entries.reimb,...entries.suppliers].forEach(x=>{if(x.phase)map.set(x.phase,cents((map.get(x.phase)||0)+x.sale));});
    return map;
  }

  function analysisAmountFor(row){
    const trade=Math.max(0,Number(document.getElementById('tradePct')?.value||0));
    return trade>0?numberFromItalian(row.querySelector('.ae-discount')?.textContent):numberFromItalian(row.querySelector('.ae-proposal')?.value);
  }

  function generatedSeed(phase,specialSales){
    return {id:`${offerCode()}:phase:${phase.id}`,phase:phase.id,category:phaseCategory(phase.id),description:phase.label,amount:cents(analysisAmountFor(phase.row)+(specialSales.get(phase.id)||0)),generated:true};
  }

  function phaseOptions(selected=''){
    return PHASES.map(p=>`<option value="${esc(p.id)}" ${p.id===selected?'selected':''}>${esc(p.label)}</option>`).join('');
  }

  function lineNode(data){
    const row=document.createElement('div');row.className='clean-line';row.dataset.lineId=data.id;row.dataset.generated=data.generated?'1':'0';row.dataset.phase=data.phase||'';
    const phaseCell=data.generated?`<span class="clean-line-phase">${esc(phaseMap.get(data.phase)?.label||data.phase)}</span>`:`<select class="clean-line-phase-select">${phaseOptions(data.phase)}</select>`;
    row.innerHTML=`<div>${phaseCell}</div><div><input class="clean-line-desc" value="${esc(data.description||'')}"></div><div><input class="clean-line-amount" inputmode="decimal" value="${money(data.amount||0)}"></div><div><button class="clean-line-delete" type="button" title="Elimina">×</button></div>`;
    const amount=row.querySelector('.clean-line-amount');amount.addEventListener('focus',()=>amount.select());amount.addEventListener('input',()=>{if(data.generated)row.dataset.manualAmount='1';schedule(0);});amount.addEventListener('blur',()=>{amount.value=money(numberFromItalian(amount.value));sync();});
    row.querySelector('.clean-line-desc')?.addEventListener('input',()=>schedule(0));
    row.querySelector('.clean-line-phase-select')?.addEventListener('change',e=>{row.dataset.phase=e.target.value;schedule(0);});
    row.querySelector('.clean-line-delete')?.addEventListener('click',()=>{if(!billingDomain.canDeleteOfferLine(row.dataset.lineId)){alert('Questa riga è già utilizzata in fatturazione e non può essere eliminata.');return;}row.remove();sync();});
    return row;
  }

  function rebuildGenerated(force=false){
    if(!isConfirmed())return;
    const root=document.getElementById('cleanOfferLineRows');if(!root)return;
    const phases=activeAnalysisPhases(),active=new Set(phases.map(x=>x.id)),sales=aggregateSpecialSales();
    qsa('.clean-line[data-generated="1"]',root).forEach(row=>{if(!active.has(row.dataset.phase)&&billingDomain.canDeleteOfferLine(row.dataset.lineId))row.remove();});
    phases.forEach(phase=>{
      const seed=generatedSeed(phase,sales);let row=qsa('.clean-line',root).find(x=>x.dataset.lineId===seed.id);
      if(!row){row=lineNode(seed);root.appendChild(row);}
      const desc=row.querySelector('.clean-line-desc');if(desc&&!desc.value.trim())desc.value=seed.description;
      const amount=row.querySelector('.clean-line-amount');if(amount&&(force||row.dataset.manualAmount!=='1')){amount.value=money(seed.amount);if(force)delete row.dataset.manualAmount;}
    });
  }

  function addManualLine(seed={}){
    const root=document.getElementById('cleanOfferLineRows');if(!root)return;
    const phase=seed.phase||activeAnalysisPhases()[0]?.id||PHASES[0].id;
    const data={id:seed.id||`${offerCode()}:manual:${++manualSeq}`,phase,category:phaseCategory(phase),description:seed.description||'',amount:seed.amount||0,generated:false};
    root.appendChild(lineNode(data));
  }

  function readLines(){
    return qsa('#cleanOfferLineRows .clean-line').map(row=>{
      const phase=row.dataset.generated==='1'?row.dataset.phase:(row.querySelector('.clean-line-phase-select')?.value||row.dataset.phase||'');
      return {id:row.dataset.lineId,phase,category:phaseCategory(phase),description:String(row.querySelector('.clean-line-desc')?.value||'').trim(),amount:cents(numberFromItalian(row.querySelector('.clean-line-amount')?.value)),generated:row.dataset.generated==='1'};
    });
  }

  function confirmationValues(){
    const consulting=cents(numberFromItalian(document.getElementById('confirmationConsulting')?.value));
    const projects=cents(numberFromItalian(document.getElementById('confirmationProjects')?.value));
    const direction=cents(numberFromItalian(document.getElementById('confirmationDirection')?.value));
    return {consulting,projects,direction,total:cents(consulting+projects+direction)};
  }

  function seedConfirmation(){
    if(confirmationSeeded)return;
    const values={consulting:numberFromItalian(field('Consulenza')?.querySelector('input')?.value),projects:numberFromItalian(field('Progetti')?.querySelector('input')?.value),direction:numberFromItalian(field('Direzione lavori')?.querySelector('input')?.value)};
    const refs={consulting:'confirmationConsulting',projects:'confirmationProjects',direction:'confirmationDirection'};
    Object.entries(values).forEach(([key,value])=>{const input=document.getElementById(refs[key]);if(input)input.value=money(value);});
    confirmationSeeded=true;
  }

  function ensureCostPhaseSelectors(){
    const options=()=>'<option value="">Assegna fase…</option>'+PHASES.map(p=>`<option value="${esc(p.id)}">${esc(p.label)}</option>`).join('');
    const rh=qs('#reimbursementsSection .reimb-head');if(rh&&!rh.querySelector('.cost-phase-head')){const x=document.createElement('span');x.className='cost-phase-head';x.textContent='Fase';rh.appendChild(x);}
    qsa('#reimbursementRows .reimb-row').forEach(row=>{if(row.querySelector('.cost-phase-select'))return;const cell=document.createElement('div');cell.className='cost-phase-cell';cell.innerHTML=`<select class="cost-phase-select">${options()}</select>`;row.appendChild(cell);cell.firstElementChild.addEventListener('change',()=>schedule(0));});
    const sh=qs('#externalCostsSection .supplier-head');if(sh&&!sh.querySelector('.cost-phase-head')){const x=document.createElement('span');x.className='cost-phase-head';x.textContent='Fase';sh.insertBefore(x,sh.lastElementChild||null);}
    qsa('#supplierCostRows .supplier-row').forEach(row=>{if(row.querySelector('.cost-phase-select'))return;const cell=document.createElement('div');cell.className='cost-phase-cell';cell.innerHTML=`<select class="cost-phase-select">${options()}</select>`;row.insertBefore(cell,row.querySelector('.supplier-delete')||null);cell.firstElementChild.addEventListener('change',()=>schedule(0));});
  }

  function missingCostAllocations(){
    const entries=specialEntries();return [...entries.reimb,...entries.suppliers].filter(x=>x.cost>0&&!x.phase);
  }

  function categoryTotals(lines){
    const totals={consulting:0,projects:0,direction:0};
    lines.forEach(line=>totals[line.category]=cents((totals[line.category]||0)+line.amount));return totals;
  }

  function validate(){
    const confirmation=confirmationValues(),lines=readLines(),lineTotal=cents(lines.reduce((s,x)=>s+x.amount,0)),diff=cents(lineTotal-confirmation.total),categories=categoryTotals(lines);
    const categoryDiffs={consulting:cents(categories.consulting-confirmation.consulting),projects:cents(categories.projects-confirmation.projects),direction:cents(categories.direction-confirmation.direction)};
    const missingDescription=lines.filter(x=>!x.description),missingPhase=lines.filter(x=>!x.phase),unassignedCosts=missingCostAllocations();
    const categoryValid=Object.values(categoryDiffs).every(x=>Math.abs(x)<=.01);
    const valid=isConfirmed()&&lines.length>0&&Math.abs(diff)<=.01&&categoryValid&&!missingDescription.length&&!missingPhase.length&&!unassignedCosts.length;
    return {confirmation,lines,lineTotal,diff,categories,categoryDiffs,categoryValid,missingDescription,missingPhase,unassignedCosts,valid};
  }

  function renderValidation(v){
    const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text;};
    set('confirmationTotal',money(v.confirmation.total)+' €');set('cleanConfirmTotal',money(v.confirmation.total)+' €');set('cleanLinesTotal',money(v.lineTotal)+' €');set('cleanLinesDiff',(v.diff>0?'+':'')+money(v.diff)+' €');
    const card=document.getElementById('cleanDiffCard');if(card){card.classList.toggle('ok',Math.abs(v.diff)<=.01);card.classList.toggle('bad',Math.abs(v.diff)>.01);}
    qsa('.cost-phase-select').forEach(s=>s.classList.remove('invalid'));if(v.unassignedCosts.length)qsa('.cost-phase-select').filter(s=>!s.value).forEach(s=>s.classList.add('invalid'));
    const cats=document.getElementById('cleanCategoryChecks');if(cats)cats.innerHTML=['consulting','projects','direction'].map(key=>`<span class="clean-category-check ${Math.abs(v.categoryDiffs[key])>.01?'bad':''}">${confirmationCategoryLabel(key)} ${Math.abs(v.categoryDiffs[key])<=.01?'✓':(v.categoryDiffs[key]>0?'+':'')+money(v.categoryDiffs[key])+' €'}</span>`).join('');
    const msg=document.getElementById('cleanLinesMessage');if(msg){msg.className='clean-lines-message';if(v.valid){msg.classList.add('ready');msg.textContent='Quadratura completa · pronta per fatturazione.';}else{msg.classList.add('warning');if(v.unassignedCosts.length)msg.textContent='Assegna una fase ai costi valorizzati.';else if(v.missingDescription.length)msg.textContent='Completa le descrizioni delle righe.';else if(Math.abs(v.diff)>.01)msg.textContent='Il totale righe deve coincidere con il Totale conferma.';else if(!v.categoryValid)msg.textContent='Il totale coincide, ma la ripartizione Consulenza / Progetti / DL non corrisponde.';else msg.textContent='Completa Importo Conferma e Righe Offerta.';}}
  }

  function syncStore(v=validate()){
    store.patch('offer',{status:statusSelect()?.value||'',sentAmount:cents(numberFromItalian(officialOfferInput()?.value)),code:offerCode(),title:offerTitle()},'offer:workflow');
    store.patch('confirmation',v.confirmation,'confirmation:update');
    store.replace('offerLines',v.lines,'offer-lines:update');
    store.patch('billing',{ready:v.valid},'billing:readiness');
    window.DABSTER_OFFER_LINES={lines:v.lines,total:v.lineTotal,confirmationTotal:v.confirmation.total,difference:v.diff,categoryDiffs:v.categoryDiffs,readyForInvoicing:v.valid,sync,resetPostConfirmation};
    if(isConfirmed()){
      window.DABSTER_CONFIRMED_OFFER={offerCode:offerCode(),sentAmount:cents(numberFromItalian(officialOfferInput()?.value)),confirmation:v.confirmation,lines:v.lines.map(x=>({...x})),analysis:store.snapshot().analysis,readyForInvoicing:v.valid};
    }
  }

  function sync(){
    clearTimeout(timer);ensureCostPhaseSelectors();
    if(isConfirmed()){seedConfirmation();rebuildGenerated(false);}
    const v=validate();renderValidation(v);syncStore(v);return v;
  }
  function schedule(delay=30){clearTimeout(timer);timer=setTimeout(sync,delay);}

  function setPostConfirmationVisibility(on){const c=ensureConfirmationSection(),l=ensureLinesSection();if(c)c.hidden=!on;if(l)l.hidden=!on;}

  function lockAnalysis(locked){
    const panel=document.getElementById('analysisSubtabImpianti');if(!panel)return;panel.dataset.cleanLocked=locked?'1':'0';
    qsa('input,select,textarea,button',panel).forEach(el=>{
      if(el.closest('#analysisSubtabs'))return;
      if(locked){if(el.dataset.cleanLocked==='1')return;el.dataset.cleanLocked='1';el.dataset.cleanWasDisabled=el.disabled?'1':'0';if(!el.disabled)el.disabled=true;}
      else if(el.dataset.cleanLocked==='1'){if(el.dataset.cleanWasDisabled!=='1')el.disabled=false;delete el.dataset.cleanLocked;delete el.dataset.cleanWasDisabled;}
    });
  }

  function initializeConfirmed(){
    setPostConfirmationVisibility(true);seedConfirmation();ensureCostPhaseSelectors();
    if(!confirmedInitialized){rebuildGenerated(true);confirmedInitialized=true;}
    sync();
  }

  function syncStatusState(){
    ensureStatusOptions();makeOfficialOfferEditable();
    const confirmed=isConfirmed(),locked=isAnalysisLocked();
    lockAnalysis(locked);setPostConfirmationVisibility(confirmed);
    store.patch('analysis',{locked},'analysis:lock');
    if(confirmed)initializeConfirmed();else syncStore(validate());
  }

  function resetPostConfirmation(){
    confirmedInitialized=false;confirmationSeeded=false;manualSeq=0;delete window.DABSTER_CONFIRMED_OFFER;
    ['confirmationConsulting','confirmationProjects','confirmationDirection'].forEach(id=>{const x=document.getElementById(id);if(x)x.value='0,00';});
    const root=document.getElementById('cleanOfferLineRows');if(root)root.innerHTML='';setPostConfirmationVisibility(false);sync();
  }

  function bind(){
    ensureStatusOptions();makeOfficialOfferEditable();installStyles();ensureConfirmationSection();ensureLinesSection();ensureCostPhaseSelectors();
    statusSelect()?.addEventListener('change',()=>{syncStatusState();if(isConfirmed()){document.querySelector('.tab[data-tab="dati"]')?.click();setTimeout(()=>document.getElementById('confirmationAmountsSection')?.scrollIntoView({behavior:'smooth',block:'center'}),80);}},true);
    document.addEventListener('input',e=>{if(e.target?.closest?.('#reimbursementsSection,#externalCostsSection'))schedule(40);},true);
    document.addEventListener('change',e=>{if(e.target?.closest?.('#reimbursementsSection,#externalCostsSection'))schedule(40);},true);
    [document.getElementById('reimbursementRows'),document.getElementById('supplierCostRows')].filter(Boolean).forEach(root=>new MutationObserver(()=>{ensureCostPhaseSelectors();schedule(60);}).observe(root,{childList:true,subtree:false}));
    window.addEventListener('dabster-economic-change',()=>{if(isConfirmed()&&!confirmedInitialized)initializeConfirmed();else schedule(40);});
    syncStatusState();sync();
  }

  bind();
  return {sync,resetPostConfirmation,validate,initializeConfirmed};
}
