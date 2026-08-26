/* v58 - Planning UI: seven operational phases + phase-specific activity registry */
(function(){
  const RAW_ACTIVITIES=`
ATT001|L10 Analisi Energetica|Pratiche|IM
ATT002|Progetto 37/08 IM|Pratiche|IM
ATT003|Pratica INAIL|Pratiche|IM
ATT004|Detrazione Fiscale/Conto Termico|Pratiche|IM
ATT005|Attestato Prestazione Energetica|Pratiche|IM
ATT006|Rischio Fulminazione 81-10|Pratiche|IE
ATT007|Relazione Illuminotecnica|Pratiche|IE
ATT008|Progetto 37/08 IE|Pratiche|IE
ATT009|Acustica Requisiti Passivi|Pratiche|AC
ATT010|Acustica Clima Acustico|Pratiche|AC
ATT011|Acustica Impatto Acustico|Pratiche|AC
ATT012|Elaborati Grafici Esame Progetto VVF|Pratiche|VVF
ATT013|Relazione Esame Progetto VVF|Pratiche|VVF
ATT014|Integrazione VVF|Pratiche|VVF
ATT015|Progetto Preliminare IE|Progetto Preliminare|IE
ATT016|Progetto preliminare IM|Progetto Preliminare|IM
ATT017|Elaborati grafici IM|Progetto Definitivo|IM
ATT018|Elaborati grafici IE|Progetto Definitivo|IE
ATT019|Schemi IM|Progetto Definitivo|IM
ATT020|Schemi IE|Progetto Definitivo|IE
ATT021|Quadri elettrici|Progetto Definitivo|IE
ATT022|Computo Metrico IM|Progetto Definitivo|IM
ATT023|Computo Metrico IE|Progetto Definitivo|IE
ATT024|Relazioni IM|Progetto Definitivo|IM
ATT025|Relazioni IE|Progetto Definitivo|IE
ATT026|Elaborati grafici IM|Progetto Esecutivo|IM
ATT027|Elaborati grafici IE|Progetto Esecutivo|IE
ATT028|Schemi IM|Progetto Esecutivo|IM
ATT029|Schemi IE|Progetto Esecutivo|IE
ATT030|Quadri elettrici|Progetto Esecutivo|IE
ATT031|Computo Metrico IM|Progetto Esecutivo|IM
ATT032|Computo Metrico IE|Progetto Esecutivo|IE
ATT033|Relazioni IM|Progetto Esecutivo|IM
ATT034|Relazioni IE|Progetto Esecutivo|IE
ATT035|Piano manutenzione IM|Progetto Esecutivo|IM
ATT036|Piano manutenzione IE|Progetto Esecutivo|IE
ATT037|Report Cantiere IE|Direzione Lavori|IE
ATT038|Report Cantiere IM|Direzione Lavori|IM
ATT039|Relazione Collaudo IE|Direzione Lavori|IE
ATT040|Relazione Collaudo IM|Direzione Lavori|IM
ATT041|SCIA VVF|Direzione Lavori|VVF
ATT042|Relazione Collaudo VVF|Direzione Lavori|VVF
ATT043|Collaudo Acustico|Direzione Lavori|AC
ATT044|Attestato Prestazione Energetica|Direzione Lavori|IM
ATT045|Verifica Contabilità IE|Direzione Lavori|IE
ATT046|Verifica Contabilità IM|Direzione Lavori|IM
ATT047|Validazione IM|Consulenze Varie|IM
ATT048|Validazione IE|Consulenze Varie|IE
ATT049|Due Diligence IM|Consulenze Varie|IM
ATT050|Due Diligence IE|Consulenze Varie|IE
ATT051|As Built IM|Consulenze Varie|IM
ATT052|As Built IE|Consulenze Varie|IE
ATT053|Dichiarazione Rispondenza|Consulenze Varie|IE
ATT054|Rinnovo CPI|Consulenze Varie|VVF
ATT055|Audit Energetico|Consulenze Varie|IM
ATT056|Supporto Gara IE|Consulenze Varie|IE
ATT057|Supporto Gara IM|Consulenze Varie|IM
ATT058|Adeguamento DPR 462/01|Consulenze Varie|IE
ATT060|Direzione Lavori Generica IE|Direzione Lavori|IE
ATT061|Direzione Lavori Generica IM|Direzione Lavori|IM
ATT062|Layout Architettonico|Progetto Preliminare|IM
ATT063|AGGIORNAMENTO DISEGNI|Direzione Lavori|VVF
ATT064|Diagnosi Energetica|Pratiche|IM
ATT066|Valutazione Preliminare antincendio|Pratiche|VVF
ATT067|Progetto IM|Progetto Definitivo|IM
ATT068|Progetto IE|Progetto Definitivo|IE
ATT069|marketing|Consulenze Varie|ED
ATT070|pratica ENEA|Consulenze Varie|IM
ATT071|Fattibilità energetica|Pratiche|IM
ATT072|documenti Gara IM|Consulenze Varie|IM
ATT073|documenti Gara IE|Consulenze Varie|IE
ATT074|ASSISTENZA PM|Consulenze Varie|IM
ATT075|Verifica Progetto|Consulenze Varie|IM
ATT076|As Built OE|Consulenze Varie|ED
ATT077|redazione APE|Consulenze Varie|IM
ATT078|Sopralluogo Verifica Prevenzione Incendi|Direzione Lavori|VVF
ATT079|Consulenza Generica VVF|Consulenze Varie|VVF
ATT080|ANALISI PRELIMINARE PREVENZIONE INCENDI|Progetto Preliminare|VVF
ATT081|DOCENZA REVIT|Consulenze Varie|ED
ATT082|PNRR|Pratiche|IM
ATT083|CORRISPONDENZA|Progetto Esecutivo|IM
ATT084|VdR Legionella|Pratiche|IM
ATT085|Assistenza tecnica IM|Consulenze Varie|IM
ATT086|Assistenza tecnica IE|Consulenze Varie|IE
ATT087|Assistenza tecnica OE|Consulenze Varie|ED
ATT088|SUPPORTO BIM|Progetto Esecutivo|IM
ATT089|Sopralluogo IE|Consulenze Varie|IE
ATT090|Pratica Ambientale|Pratiche|IM
ATT091|Progetto esecutivo|Progetto Esecutivo|IE
ATT092|Progetto esecutivo|Progetto Esecutivo|IM
ATT093|Elaborati grafici|Progetto Definitivo|ED
ATT094|Computo Metrico|Progetto Definitivo|ED
ATT095|Analisi energetica|Progetto Definitivo|IM
ATT096|AS BUILT IM|Consulenze Varie|IM
ATT097|AS BUILT IE|Direzione Lavori|IE
ATT098|AS BUILT IM|Direzione Lavori|IM
ATT099|AS BUILT OPERE EDILI|Direzione Lavori|ED
ATT100|Classificazione aree con pericolo espolosione AtEx|Consulenze Varie|IE
ATT101|Progetto illuminazione pubblica|Pratiche|IE
ATT102|ELABORATI GRAFICI VVF|Progetto Esecutivo|VVF
ATT103|ELABORATI VVF|Progetto Definitivo|VVF
ATT104|DIREZIONE LAVORI GENERICA|Direzione Lavori|ED
ATT105|Progetto Esecutivo Opere Edili|Progetto Esecutivo|ED
ATT106|CSP - Coordinamento sicurezza in fase progettuale|Direzione Lavori|ED
ATT107|CSE - Coordinatore sicurezza in fase esecutiva|Direzione Lavori|ED
ATT108|Pratica ATEX|Pratiche|IE
ATT109|Responsabile Impianti|Direzione Lavori|IE
ATT110|Due Diligence OE|Consulenze Varie|ED
ATT111|Ore CP o RS|Pratiche|GV
ATT112|Ore CP o RS|Progetto Preliminare|GV
ATT113|Ore CP o RS|Progetto Definitivo|GV
ATT114|Ore CP o RS|Progetto Esecutivo|GV
ATT115|Ore CP o RS|Direzione Lavori|GV
ATT116|Ore CP o RS|Consulenze Varie|GV
ATT117|FSE VVF|Pratiche|VVF
ATT118|Calcolo idraulico rete SPK IM|Progetto Esecutivo|IM
ATT119|Relazione di impatto riflessivo ENAC|Consulenze Varie|IE
ATT178|PUA|Pratiche|IM
ATT179|PUA|Pratiche|IE
ATT281|Calcoli Illuminotecnici|Progetto Esecutivo|IE
ATT319|Elaborati grafici VVF|Progetto Preliminare|VVF
ATT417|Pratica antiabbagliamento da fotovoltaico|Consulenze Varie|IE
ATT475|RELAZIONE FABBITILITA' COLONNINE RICARICA VEICOLI|Consulenze Varie|IE
ATT478|PRATICA STMG TERNA|Pratiche|IE
ATT485|Attività di supporto e consulenza al progetto|Progetto Esecutivo|VVF
ATT486|Integrazioni SCIA VVF|Direzione Lavori|VVF
ATT494|Direzione lavori antincendio|Direzione Lavori|VVF
ATT498|Relazione prevenzione incendi|Progetto Definitivo|VVF
ATT503|PROGETTO VVF|Progetto Esecutivo|VVF
ATT619|Autorizzazione paesaggistica|Pratiche|ED
ATT620|Pratica edilizia CILA|Pratiche|ED
ATT621|Pratica edilizia SCIA|Pratiche|ED
ATT622|Pratica edilizia PDC|Pratiche|ED
ATT625|Accesso agli atti|Pratiche|ED
ATT653|Modellazione BIM|Progetto Definitivo|IM
ATT654|Modellazione BIM|Progetto Definitivo|IE
ATT655|Modellazione BIM|Progetto Esecutivo|IM
ATT656|Modellazione BIM|Progetto Esecutivo|IE
ATT710|Commissioning IM|Direzione Lavori|IM
ATT711|Commissioning IE|Direzione Lavori|IE
ATT712|Commissioning VVF|Direzione Lavori|VVF
`.trim();

  const FIRE_EVALUATION_CODES=new Set(['ATT012','ATT013','ATT014','ATT066','ATT103','ATT117','ATT319','ATT498']);
  const FIRE_SCIA_CODES=new Set(['ATT041','ATT042','ATT063','ATT078','ATT486']);
  const mapCategory=(code,legacy)=>{
    if(FIRE_EVALUATION_CODES.has(code))return 'Valutazione Progetto Antincendio';
    if(FIRE_SCIA_CODES.has(code))return 'SCIA Antincendio';
    if(legacy==='Pratiche'||legacy==='Progetto Preliminare')return 'Progetto preliminare e Pratiche';
    if(legacy==='Progetto Definitivo')return 'Progetto PFTE';
    if(legacy==='Progetto Esecutivo')return 'Progetto Esecutivo';
    if(legacy==='Direzione Lavori')return 'Direzione Lavori';
    return 'Consulenze Varie';
  };

  const ACTIVITIES=RAW_ACTIVITIES.split('\n').map(line=>{
    const [code,name,legacyCategory,discipline]=line.split('|');
    return {code,name,legacyCategory,category:mapCategory(code,legacyCategory),discipline};
  });

  const PHASES=[
    {id:'preliminare',label:'Progetto preliminare e Pratiche',category:'Progetto preliminare e Pratiche'},
    {id:'definitivo',label:'Progetto PFTE',category:'Progetto PFTE'},
    {id:'valutazione_vvf',label:'Valutazione Progetto Antincendio',category:'Valutazione Progetto Antincendio'},
    {id:'esecutivo',label:'Progetto Esecutivo',category:'Progetto Esecutivo'},
    {id:'dl',label:'Direzione Lavori',category:'Direzione Lavori'},
    {id:'scia_vvf',label:'SCIA Antincendio',category:'SCIA Antincendio'},
    {id:'consulenze',label:'Consulenze varie',category:'Consulenze Varie'}
  ];

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  let root=null,activePhase='preliminare',refreshTimer=null,observer=null;

  function phaseDef(id){return PHASES.find(p=>p.id===id)||PHASES[0];}
  function phaseCards(){return root?[...root.querySelectorAll(':scope > .phase-work-card')]:[];}
  function cardPhase(card){return card?.querySelector('.phase-type-select')?.value||card?.dataset.planningPhase||'';}
  function findPhaseCard(id){return phaseCards().find(card=>cardPhase(card)===id)||null;}
  function activityField(activity){return activity?.querySelector('.activity-name')||null;}

  function resolveMeta(activity){
    const field=activityField(activity);if(!field)return null;
    const existing=ACTIVITIES.find(x=>x.code===field.dataset.activityCode);
    if(existing&&norm(existing.name)===norm(field.value))return existing;
    const phase=phaseDef(cardPhase(activity.closest('.phase-work-card')));
    const byPhase=ACTIVITIES.find(x=>x.category===phase.category&&norm(x.name)===norm(field.value));
    const any=ACTIVITIES.find(x=>norm(x.name)===norm(field.value));
    const meta=byPhase||any||null;
    if(meta){
      field.dataset.activityCode=meta.code;field.dataset.activityDiscipline=meta.discipline;field.dataset.activityCategory=meta.category;
    }else{
      field.dataset.activityCode='';field.dataset.activityDiscipline='';field.dataset.activityCategory='';
    }
    return meta;
  }

  function renderActivityIdentity(activity){
    const head=activity.querySelector('.activity-head'),field=activityField(activity);if(!head||!field)return;
    let ident=head.querySelector('.planning-activity-ident');
    if(!ident){ident=document.createElement('div');ident.className='planning-activity-ident';head.insertBefore(ident,head.firstChild);}
    const meta=resolveMeta(activity),title=String(field.value||'').trim()||'Attività da definire';
    ident.innerHTML=`<div class="planning-activity-main"><strong>${esc(meta?.code||'ATT')}</strong><span>${esc(title)}</span></div>${meta?.discipline?`<em>${esc(meta.discipline)}</em>`:''}`;
    activity.dataset.activityCode=meta?.code||field.dataset.activityCode||'';
  }

  function prepareActivity(activity){
    if(!activity)return;let field=activityField(activity);if(!field)return;
    if(field.tagName==='SELECT'){
      const model=document.createElement('input');model.type='hidden';model.className='activity-name';model.value=field.value||'';
      model.dataset.activityCode=field.dataset.activityCode||field.selectedOptions?.[0]?.dataset?.code||'';
      model.dataset.activityDiscipline=field.dataset.activityDiscipline||field.selectedOptions?.[0]?.dataset?.discipline||'';
      model.dataset.activityCategory=field.dataset.activityCategory||field.selectedOptions?.[0]?.dataset?.category||'';
      field.replaceWith(model);field=model;
    }else{field.removeAttribute('list');field.setAttribute('autocomplete','off');field.type='hidden';}
    const head=activity.querySelector('.activity-head');head?.querySelectorAll('.activity-suggest-menu,.activity-dropdown-toggle').forEach(el=>el.remove());head?.classList.remove('activity-autocomplete-wrap');
    if(activity.dataset.planningPrepared!=='1'){
      activity.dataset.planningPrepared='1';
      const sync=()=>{resolveMeta(activity);renderActivityIdentity(activity);scheduleRefresh();};
      field.addEventListener('input',sync);field.addEventListener('change',sync);
      activity.querySelector('.activity-delete')?.addEventListener('click',()=>setTimeout(scheduleRefresh,40));
    }
    renderActivityIdentity(activity);
  }

  function selectedMetas(card){
    return [...card.querySelectorAll('.activity-card')].map(activity=>{
      prepareActivity(activity);const meta=resolveMeta(activity),field=activityField(activity);
      return {activity,meta,name:field?.value||'',code:meta?.code||field?.dataset.activityCode||''};
    }).filter(x=>String(x.name).trim());
  }
  function activityIsUsed(card,item){return selectedMetas(card).some(x=>x.code===item.code||(!x.code&&norm(x.name)===norm(item.name)));}

  function setExactActivity(activity,item){
    prepareActivity(activity);const field=activityField(activity);if(!field)return;
    field.value=item.name;field.dataset.activityCode=item.code;field.dataset.activityDiscipline=item.discipline;field.dataset.activityCategory=item.category;activity.dataset.activityCode=item.code;
    field.dispatchEvent(new Event('change',{bubbles:true}));renderActivityIdentity(activity);
  }

  function addToPhase(phaseId,item){
    const card=findPhaseCard(phaseId);if(!card||activityIsUsed(card,item))return;
    const add=card.querySelector('.add-activity');if(!add)return;add.click();
    setTimeout(()=>{
      const activity=[...card.querySelectorAll('.activities .activity-card')].at(-1);if(!activity)return;
      prepareActivity(activity);const rows=activity.querySelector('.assignment-rows');if(rows)rows.innerHTML='';
      setExactActivity(activity,item);activity.classList.remove('collapsed');scheduleRefresh(10);
      setTimeout(()=>activity.scrollIntoView({behavior:'smooth',block:'nearest'}),40);
    },70);
  }

  function renderAvailable(card,phase){
    const board=card.querySelector('.planning-phase-board');if(!board)return;
    const list=board.querySelector('.planning-available-list'),count=board.querySelector('.planning-available-count');
    const items=ACTIVITIES.filter(x=>x.category===phase.category);if(count)count.textContent=`${items.length} attività`;
    list.innerHTML=items.map(item=>{
      const used=activityIsUsed(card,item);
      return `<article class="planning-available-card ${used?'used':''}" data-code="${esc(item.code)}" draggable="${used?'false':'true'}"><div class="planning-available-code">${esc(item.code)}</div><div class="planning-available-copy"><strong>${esc(item.name)}</strong><span>${esc(item.discipline)}</span></div><button type="button" class="planning-card-add" ${used?'disabled':''} title="${used?'Attività già preventivata':'Aggiungi alle attività preventivate'}">${used?'✓':'＋'}</button></article>`;
    }).join('')||'<div class="planning-empty">Nessuna attività disponibile per questa fase.</div>';
    list.querySelectorAll('.planning-available-card').forEach(el=>{
      const item=ACTIVITIES.find(x=>x.code===el.dataset.code);if(!item)return;
      el.querySelector('.planning-card-add')?.addEventListener('click',()=>addToPhase(phase.id,item));
      if(!el.classList.contains('used')){
        el.addEventListener('dragstart',e=>{e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('text/plain',JSON.stringify({phase:phase.id,code:item.code}));el.classList.add('dragging');});
        el.addEventListener('dragend',()=>el.classList.remove('dragging'));
      }
    });
  }

  function updateSelectedSummary(card){
    const board=card.querySelector('.planning-phase-board');if(!board)return;
    const selected=selectedMetas(card),empty=board.querySelector('.planning-selected-empty'),summary=board.querySelector('.planning-selected-summary');
    if(empty)empty.hidden=selected.length>0;
    const hours=card.querySelector('.phase-hours')?.textContent||'0,00',cost=card.querySelector('.phase-work-cost')?.textContent||'0,00 €';
    if(summary)summary.textContent=`${selected.length} attività · ${hours} h · ${cost}`;
  }

  function ensurePhaseBoard(card){
    if(!card||card.dataset.planningBoardReady==='1')return;
    const body=card.querySelector('.phase-card-body'),activities=body?.querySelector('.activities'),add=body?.querySelector('.add-activity');if(!body||!activities||!add)return;
    card.dataset.planningBoardReady='1';
    const board=document.createElement('div');board.className='planning-phase-board';
    board.innerHTML=`<section class="planning-column planning-available-column"><div class="planning-column-head"><div><strong>Attività disponibili</strong><span class="planning-available-count"></span></div><span class="planning-column-hint">trascina o usa +</span></div><div class="planning-available-list"></div></section><section class="planning-column planning-selected-column"><div class="planning-column-head"><div><strong>Attività preventivate</strong><span class="planning-selected-summary">0 attività · 0,00 h · 0,00 €</span></div><span class="planning-column-hint">figura + ore</span></div><div class="planning-selected-drop"></div></section>`;
    body.insertBefore(board,body.firstChild);
    const drop=board.querySelector('.planning-selected-drop');activities.classList.add('planning-selected-list');drop.appendChild(activities);
    const empty=document.createElement('div');empty.className='planning-selected-empty';empty.textContent='Trascina qui un’attività oppure premi + nella colonna a sinistra.';drop.appendChild(empty);drop.appendChild(add);
    drop.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';drop.classList.add('drag-over');});
    drop.addEventListener('dragleave',e=>{if(!drop.contains(e.relatedTarget))drop.classList.remove('drag-over');});
    drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('drag-over');try{const data=JSON.parse(e.dataTransfer.getData('text/plain')||'{}');const phase=cardPhase(card);if(data.phase!==phase)return;const item=ACTIVITIES.find(x=>x.code===data.code);if(item)addToPhase(phase,item);}catch(_e){}});
    activities.querySelectorAll('.activity-card').forEach(prepareActivity);
  }

  function renderTabs(){
    const tabs=document.getElementById('planningPhaseTabs');if(!tabs)return;
    tabs.innerHTML=PHASES.map(phase=>{const card=findPhaseCard(phase.id),count=card?selectedMetas(card).length:0;return `<button type="button" class="kanban-phase-tab ${activePhase===phase.id?'active':''}" data-phase="${phase.id}">${phase.label}<span class="count">${count}</span></button>`;}).join('');
    tabs.querySelectorAll('.kanban-phase-tab').forEach(btn=>btn.addEventListener('click',()=>{activePhase=btn.dataset.phase;refreshPlanning();}));
  }

  function refreshPlanning(){
    if(!root)return;
    phaseCards().forEach(card=>{ensurePhaseBoard(card);const id=cardPhase(card);card.dataset.planningPhase=id;card.classList.toggle('planning-active',id===activePhase);const phase=PHASES.find(p=>p.id===id);if(phase){renderAvailable(card,phase);updateSelectedSummary(card);}});
    renderTabs();
  }
  function scheduleRefresh(delay=35){clearTimeout(refreshTimer);refreshTimer=setTimeout(refreshPlanning,delay);}

  function ensurePhaseOption(select,id,label){
    if(!select)return;let option=[...select.options].find(o=>o.value===id);
    if(!option){option=document.createElement('option');option.value=id;option.textContent=label;select.appendChild(option);}else option.textContent=label;
  }

  function setPhase(card,id,label=phaseDef(id).label){
    if(!card)return;const select=card.querySelector('.phase-type-select');ensurePhaseOption(select,id,label);
    if(select&&select.value!==id){select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}));}
    card.dataset.planningPhase=id;
    const row=document.querySelector(`.economic-row[data-phase-id="${card.dataset.phaseId}"]`),input=row?.querySelector('.phase-name-input');
    if(input&&norm(input.value)!==norm(label)){input.value=label;input.dispatchEvent(new Event('input',{bubbles:true}));}
  }

  function ensureFixedPhases(){
    const cards=phaseCards();
    ['preliminare','definitivo','esecutivo','dl'].forEach((id,index)=>setPhase(cards[index],id,phaseDef(id).label));
    const extras=['valutazione_vvf','scia_vvf','consulenze'];
    const add=document.getElementById('addEconomicPhase');
    const ensureNext=index=>{
      if(index>=extras.length){PHASES.forEach(p=>{const c=findPhaseCard(p.id);if(c)ensurePhaseBoard(c);});scheduleRefresh(25);setTimeout(()=>window.dabsterEconomicPhaseController?.reconcile(),80);return;}
      const id=extras[index],def=phaseDef(id),existing=findPhaseCard(id);
      if(existing){setPhase(existing,id,def.label);ensurePhaseBoard(existing);ensureNext(index+1);return;}
      if(!add){setTimeout(()=>ensureNext(index),60);return;}
      const before=new Set(phaseCards());add.click();let attempts=0;
      const finish=()=>{
        attempts++;const created=phaseCards().find(c=>!before.has(c));
        if(created?.querySelector('.phase-type-select')){setPhase(created,id,def.label);ensurePhaseBoard(created);ensureNext(index+1);return;}
        if(attempts<40)setTimeout(finish,40);else ensureNext(index+1);
      };
      setTimeout(finish,40);
    };
    ensureNext(0);
  }

  function installStyles(){
    if(document.getElementById('planningBoardStyles'))return;
    const style=document.createElement('style');style.id='planningBoardStyles';style.textContent=`
      #phaseWorkloadSection .workload-body{padding:7px 8px 9px!important;background:#fff!important}
      #phaseWorkloadSection .workload-toolbar{margin-bottom:7px!important;padding:2px 2px 0!important}
      #phaseWorkloadSection .workload-toolbar>div strong{font-size:11px!important;color:#344653!important}
      #phaseWorkloadSection .workload-toolbar>div span{font-size:8.8px!important;color:#74818a!important}
      #planningPhaseTabs{display:flex!important;align-items:stretch!important;margin:0 -1px 8px!important;border:1px solid #e3e8eb!important;border-radius:7px 7px 0 0!important;overflow-x:auto!important;scrollbar-width:thin}
      #planningPhaseTabs .kanban-phase-tab{flex:0 0 auto!important;min-width:118px!important;padding-left:9px!important;padding-right:9px!important;white-space:nowrap!important}
      #phaseWorkCards{display:block!important}
      #phaseWorkloadSection .phase-work-card{display:none!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}
      #phaseWorkloadSection .phase-work-card.planning-active{display:block!important}
      #phaseWorkloadSection .phase-card-head{display:none!important}
      #phaseWorkloadSection .phase-card-body,#phaseWorkloadSection .phase-work-card.collapsed .phase-card-body{display:block!important;padding:0!important;background:transparent!important}
      #phaseWorkloadSection .planning-phase-board{display:grid;grid-template-columns:minmax(310px,.88fr) minmax(430px,1.32fr);gap:10px;padding:10px;background:#eef1f3;border:1px solid #dce3e7;border-radius:0 0 8px 8px}
      #phaseWorkloadSection .planning-column{min-width:0;border:1px solid #dce3e7;border-radius:7px;background:#f7f8f9;overflow:hidden}
      #phaseWorkloadSection .planning-column-head{min-height:38px;padding:5px 8px;border-bottom:1px solid #dfe5e8;background:#f1f3f5;display:flex;align-items:center;justify-content:space-between;gap:8px;color:#46545f}
      #phaseWorkloadSection .planning-column-head>div{display:flex;flex-direction:column;gap:1px;min-width:0}
      #phaseWorkloadSection .planning-column-head strong{font-size:9.5px;font-weight:750}.planning-column-head span{font-size:7.8px;color:#7a8790;white-space:nowrap}
      #phaseWorkloadSection .planning-column-hint{font-size:7.7px!important;color:#88949b!important}
      #phaseWorkloadSection .planning-available-list,#phaseWorkloadSection .planning-selected-drop{min-height:385px;max-height:485px;overflow:auto;padding:6px;display:flex;flex-direction:column;gap:6px;transition:.12s}
      #phaseWorkloadSection .planning-selected-drop.drag-over{background:#eaf4f6;outline:2px dashed #76aebb;outline-offset:-4px}
      #phaseWorkloadSection .planning-available-card{display:grid;grid-template-columns:54px minmax(0,1fr) 28px;gap:7px;align-items:center;min-height:48px;padding:6px 7px;border:1px solid #cfd9df;border-left:3px solid #7897a8;border-radius:7px;background:#fff;box-shadow:0 1px 2px rgba(29,45,57,.04);cursor:grab;user-select:none}
      #phaseWorkloadSection .planning-available-card:hover{border-color:#b7c8d1;box-shadow:0 2px 6px rgba(29,45,57,.07)}#phaseWorkloadSection .planning-available-card.dragging{opacity:.45}#phaseWorkloadSection .planning-available-card.used{opacity:.55;cursor:default;background:#f3f5f6;border-left-color:#aab5bb}
      #phaseWorkloadSection .planning-available-code{font-size:8.4px;font-weight:800;color:#567382;letter-spacing:.02em}.planning-available-copy{display:flex;flex-direction:column;gap:2px;min-width:0}#phaseWorkloadSection .planning-available-copy strong{font-size:9.6px;line-height:1.2;color:#344653;font-weight:700;white-space:normal}#phaseWorkloadSection .planning-available-copy span{font-size:7.6px;color:#6b8491;font-weight:750}
      #phaseWorkloadSection .planning-card-add{width:25px;height:25px;border:1px solid #cfdbe0;border-radius:6px;background:#fff;color:#4e7c8b;font-size:14px;line-height:1;cursor:pointer}#phaseWorkloadSection .planning-card-add:hover:not(:disabled){background:#edf7f8;border-color:#9ec2ca}#phaseWorkloadSection .planning-card-add:disabled{cursor:default;background:#eef1f2;color:#6e8780;border-color:#dce2e4}
      #phaseWorkloadSection .planning-selected-list{display:flex!important;flex-direction:column!important;gap:7px!important;margin:0!important;padding:0!important}#phaseWorkloadSection .planning-selected-empty{padding:13px 10px;border:1px dashed #d5dee3;border-radius:7px;background:#fbfcfd;color:#87929a;font-size:8.7px;line-height:1.4;text-align:center}#phaseWorkloadSection .planning-selected-empty[hidden]{display:none!important}#phaseWorkloadSection .add-activity{display:none!important}
      #phaseWorkloadSection .activity-card{border:1px solid #cfd9df!important;border-left:3px solid #7897a8!important;border-radius:7px!important;background:#fff!important;box-shadow:0 1px 2px rgba(29,45,57,.04)!important;margin:0!important;overflow:hidden!important}
      #phaseWorkloadSection .activity-head{display:grid!important;grid-template-columns:minmax(220px,1fr) auto 25px!important;gap:6px!important;align-items:center!important;min-height:43px!important;padding:5px 6px 5px 8px!important;background:#fff!important}#phaseWorkloadSection .activity-name{display:none!important}
      #phaseWorkloadSection .planning-activity-ident{min-width:0;display:flex;align-items:center;justify-content:space-between;gap:7px}#phaseWorkloadSection .planning-activity-main{min-width:0;display:flex;align-items:center;gap:7px}#phaseWorkloadSection .planning-activity-main strong{flex:0 0 auto;font-size:8.3px;color:#567382;font-weight:800}#phaseWorkloadSection .planning-activity-main span{font-size:10px;color:#344653;font-weight:750;line-height:1.2;white-space:normal}#phaseWorkloadSection .planning-activity-ident em{flex:0 0 auto;height:19px;padding:0 6px;border-radius:999px;background:#e8f2f6;color:#47718a;display:inline-flex;align-items:center;font-size:7.5px;font-style:normal;font-weight:750}
      #phaseWorkloadSection .activity-head-metrics{gap:4px!important}#phaseWorkloadSection .activity-head-metrics span{height:23px!important;padding:0 6px!important;font-size:8px!important}#phaseWorkloadSection .activity-toggle{display:none!important}
      #phaseWorkloadSection .activity-body,#phaseWorkloadSection .activity-card.collapsed .activity-body{display:block!important;padding:7px 7px 9px!important;border-top:1px solid #edf0f2!important;background:#fbfcfd!important}
      #phaseWorkloadSection .assignment-head,#phaseWorkloadSection .assignment-row{grid-template-columns:minmax(135px,1fr) 68px 76px 96px 24px!important;gap:6px!important}#phaseWorkloadSection .assignment-head{min-height:27px!important;padding:3px 0 4px!important}#phaseWorkloadSection .assignment-row{min-height:31px!important}#phaseWorkloadSection .assignment-row select,#phaseWorkloadSection .assignment-row input{height:26px!important}#phaseWorkloadSection .add-assignment{height:25px!important;margin-top:7px!important;padding:0 8px!important}
      @media(max-width:900px){#phaseWorkloadSection .planning-phase-board{min-width:780px;grid-template-columns:320px 1fr}#phaseWorkloadSection .planning-available-list,#phaseWorkloadSection .planning-selected-drop{max-height:430px}}
    `;document.head.appendChild(style);
  }

  function isModelMutationNode(node){return node instanceof HTMLElement&&(node.matches('.phase-work-card,.activity-card')||!!node.querySelector?.('.phase-work-card,.activity-card'));}

  function install(attempt=0){
    root=document.getElementById('phaseWorkCards');const section=document.getElementById('phaseWorkloadSection');
    const ready=root&&section&&root.querySelectorAll(':scope > .phase-work-card').length>=4&&root.querySelector('.phase-type-select');
    if(!ready){if(attempt<220)setTimeout(()=>install(attempt+1),50);return;}
    installStyles();
    const head=section.querySelector(':scope > .section-head span:first-child');if(head)head.innerHTML='◷&nbsp;&nbsp;Pianificazione attività e ore';
    const toolbar=section.querySelector('.workload-toolbar>div');if(toolbar)toolbar.innerHTML='<strong>Costruzione del preventivo</strong><span>Sposta le attività disponibili tra le attività preventivate e assegna figure e ore.</span>';
    if(!document.getElementById('planningPhaseTabs')){const tabs=document.createElement('div');tabs.id='planningPhaseTabs';tabs.className='kanban-phase-tabs';root.parentElement.insertBefore(tabs,root);}
    phaseCards().forEach(card=>{ensurePhaseBoard(card);card.querySelectorAll('.activity-card').forEach(prepareActivity);});
    ensureFixedPhases();
    if(observer)observer.disconnect();observer=new MutationObserver(mutations=>{
      let structural=false;mutations.forEach(m=>{if(m.type!=='childList')return;const added=[...m.addedNodes].filter(isModelMutationNode),removed=[...m.removedNodes].filter(isModelMutationNode);added.forEach(node=>{if(node.matches?.('.phase-work-card'))ensurePhaseBoard(node);if(node.matches?.('.activity-card'))prepareActivity(node);node.querySelectorAll?.('.phase-work-card').forEach(ensurePhaseBoard);node.querySelectorAll?.('.activity-card').forEach(prepareActivity);});if(added.length||removed.length)structural=true;});if(structural)scheduleRefresh(45);
    });observer.observe(root,{childList:true,subtree:true});
    section.addEventListener('input',()=>scheduleRefresh(25),true);section.addEventListener('change',()=>scheduleRefresh(25),true);section.addEventListener('click',e=>{if(e.target.closest('.activity-delete,.assignment-delete,.add-assignment,.planning-card-add'))scheduleRefresh(60);},true);
    window.DABSTER_ACTIVITY_REGISTRY=ACTIVITIES.map(x=>({...x}));window.DABSTER_PLANNING_PHASES=PHASES.map(x=>({...x}));refreshPlanning();
  }

  install();
})();
