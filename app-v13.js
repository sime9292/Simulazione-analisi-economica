/* v16 - Sidebar + Attività Commessa Kanban + sync from confirmed offer */
(function(){
  const core=document.createElement('script');
  core.src='app-v12.js?v=16';
  core.onload=()=>waitForApp();
  document.head.appendChild(core);

  const PHASE_TYPES=[
    {id:'preliminare',label:'Progetto Preliminare'},
    {id:'definitivo',label:'Progetto Definitivo'},
    {id:'esecutivo',label:'Progetto Esecutivo'},
    {id:'dl',label:'Direzione Lavori'},
    {id:'consulenze',label:'Consulenze varie'}
  ];
  const STATUS_COLUMNS=[
    {id:'available',label:'Attività disponibili'},
    {id:'programmazione',label:'Attività in programmazione'},
    {id:'lavorazione',label:'Attività in lavorazione'},
    {id:'chiusa',label:'Attività chiuse'}
  ];

  let activitySeq=0;
  let currentPhase='preliminare';
  let offerConfirmed=false;
  let syncTimer=null;
  let toastTimer=null;
  const kanbanItems=new Map();

  function waitForApp(attempt=0){
    const ready=document.querySelector('#tab-analisi .economic-table') && document.getElementById('phaseWorkloadSection') && document.querySelector('.phase-work-card');
    if(ready){setTimeout(initKanban,180);return;}
    if(attempt<160)setTimeout(()=>waitForApp(attempt+1),60);
  }

  function initKanban(){
    if(document.getElementById('kanbanPage'))return;
    installSidebar();
    installKanbanPage();
    installPhaseTypeSelectors();
    installStatusTransfer();
    watchPlanningChanges();
    renderKanban();
    if(location.hash==='#attivita-commessa')showPage('kanban');
  }

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function normalize(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
  function num(v){return Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;}
  function fmt(n){return Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:0,maximumFractionDigits:1});}
  function uid(){return 'offer-act-'+Date.now().toString(36)+'-'+(++activitySeq);}

  function inferPhaseType(name){
    const n=normalize(name);
    if(n.includes('prelim'))return 'preliminare';
    if(n.includes('definit'))return 'definitivo';
    if(n.includes('esecut'))return 'esecutivo';
    if(n.includes('direzione')||n==='dl'||n.includes('lavori'))return 'dl';
    return 'consulenze';
  }

  function getCommessaLabel(){
    const labels=[...document.querySelectorAll('#tab-dati label.field')];
    const field=labels.find(x=>normalize(x.querySelector(':scope > span')?.textContent).startsWith('commessa'));
    return field?.querySelector('select')?.value || 'Commessa corrente';
  }

  function installSidebar(){
    document.body.insertAdjacentHTML('beforeend',`
      <div id="appSidebarOverlay" class="app-sidebar-overlay"></div>
      <aside id="appSidebar" class="app-sidebar" aria-label="Navigazione">
        <div class="sidebar-brand">dabster · gestionale</div>
        <nav class="sidebar-nav">
          <button class="sidebar-item active" data-page="offer" type="button"><span class="side-icon">▣</span>Offerta</button>
          <button class="sidebar-item" data-page="kanban" type="button"><span class="side-icon">▦</span>Attività Commessa</button>
        </nav>
        <div class="sidebar-foot">Simulazione flusso offerta → attività commessa</div>
      </aside>`);
    const sidebar=document.getElementById('appSidebar'),overlay=document.getElementById('appSidebarOverlay');
    const open=()=>{sidebar.classList.add('open');overlay.classList.add('open');};
    const close=()=>{sidebar.classList.remove('open');overlay.classList.remove('open');};
    document.querySelector('.topbar .top-icon')?.addEventListener('click',e=>{e.preventDefault();open();});
    overlay.addEventListener('click',close);
    sidebar.querySelectorAll('.sidebar-item').forEach(btn=>btn.addEventListener('click',()=>{showPage(btn.dataset.page);close();}));
  }

  function installKanbanPage(){
    const shell=document.querySelector('.page-shell');
    const mainCard=shell?.querySelector('.main-card');
    if(!shell||!mainCard)return;
    mainCard.insertAdjacentHTML('afterend',`
      <section id="kanbanPage" class="kanban-page" hidden>
        <div class="kanban-shell">
          <div class="kanban-top">
            <div class="kanban-title-wrap"><strong>Attività Commessa</strong><span id="kanbanCommessaLabel">${esc(getCommessaLabel())}</span></div>
            <div id="kanbanSyncPill" class="sync-pill">In attesa di conferma offerta</div>
          </div>
          <div id="kanbanPhaseTabs" class="kanban-phase-tabs"></div>
          <div class="kanban-board-wrap"><div id="kanbanBoard" class="kanban-board"></div></div>
        </div>
      </section>
      <div id="kbToast" class="kb-toast"></div>`);
  }

  function showPage(page){
    const mainCard=document.querySelector('.main-card'),kanban=document.getElementById('kanbanPage');
    const title=document.querySelector('.page-title'),breadcrumb=document.querySelector('.breadcrumb');
    document.querySelectorAll('.sidebar-item').forEach(x=>x.classList.toggle('active',x.dataset.page===page));
    if(page==='kanban'){
      if(mainCard)mainCard.style.display='none';if(kanban)kanban.hidden=false;
      if(title)title.textContent='Attività Commessa';
      if(breadcrumb)breadcrumb.innerHTML='<span>⌂</span><span>›</span><span>Commesse</span><span>›</span><strong>Attività</strong>';
      document.getElementById('kanbanCommessaLabel').textContent=getCommessaLabel();
      renderKanban();history.replaceState(null,'','#attivita-commessa');
    }else{
      if(mainCard)mainCard.style.display='';if(kanban)kanban.hidden=true;
      if(title)title.textContent='Offerta';
      if(breadcrumb)breadcrumb.innerHTML='<span>⌂</span><span>›</span><span>Offerte</span><span>›</span><strong>Dettaglio</strong>';
      history.replaceState(null,'','#analisi');
    }
  }

  function installPhaseTypeSelectors(){
    const root=document.getElementById('phaseWorkCards');
    if(!root)return;
    const prepare=card=>{
      if(card.dataset.phaseTypeReady==='1')return;
      card.dataset.phaseTypeReady='1';
      const head=card.querySelector('.phase-card-head');
      const weeks=head?.querySelector('.weeks-field');
      const title=card.querySelector('.phase-card-title')?.textContent||'';
      if(!head||!weeks)return;
      const label=document.createElement('label');label.className='phase-type-field';
      label.innerHTML=`<span>Tipo</span><select class="phase-type-select">${PHASE_TYPES.map(p=>`<option value="${p.id}" ${p.id===inferPhaseType(title)?'selected':''}>${p.label}</option>`).join('')}</select>`;
      head.insertBefore(label,weeks);
      label.querySelector('select').addEventListener('change',scheduleSync);
    };
    root.querySelectorAll('.phase-work-card').forEach(prepare);
    new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(node=>{
      if(!(node instanceof HTMLElement))return;
      if(node.matches('.phase-work-card'))prepare(node);
      node.querySelectorAll?.('.phase-work-card').forEach(prepare);
    }))).observe(root,{childList:true,subtree:true});
  }

  function findStatusSelect(){
    const labels=[...document.querySelectorAll('#tab-dati label.field')];
    const field=labels.find(x=>normalize(x.querySelector(':scope > span')?.textContent).startsWith('stato'));
    return field?.querySelector('select')||null;
  }

  function installStatusTransfer(){
    const status=findStatusSelect();if(!status)return;
    if(![...status.options].some(o=>normalize(o.value||o.textContent)==='confermata'))status.add(new Option('Confermata','Confermata'));
    const update=()=>{
      offerConfirmed=normalize(status.value)==='confermata';
      updateSyncPill();
      if(offerConfirmed){syncKanbanFromOffer();showToast('Offerta confermata · attività trasferite in programmazione');}
    };
    status.addEventListener('change',update);update();
  }

  function updateSyncPill(){
    const pill=document.getElementById('kanbanSyncPill');if(!pill)return;
    pill.classList.toggle('live',offerConfirmed);
    pill.textContent=offerConfirmed?'Sincronizzazione con offerta attiva':'In attesa di conferma offerta';
  }

  function watchPlanningChanges(){
    const root=document.getElementById('phaseWorkloadSection');if(!root)return;
    root.addEventListener('input',scheduleSync,true);root.addEventListener('change',scheduleSync,true);
    root.addEventListener('click',e=>{
      if(e.target.closest('.add-activity,.activity-delete,.assignment-delete,.add-assignment,.phase-delete,#addEconomicPhase'))setTimeout(scheduleSync,40);
    },true);
  }

  function scheduleSync(){
    if(!offerConfirmed)return;
    clearTimeout(syncTimer);syncTimer=setTimeout(syncKanbanFromOffer,120);
  }

  function collectOfferActivities(){
    const out=[];
    document.querySelectorAll('.phase-work-card').forEach(phase=>{
      const phaseType=phase.querySelector('.phase-type-select')?.value||inferPhaseType(phase.querySelector('.phase-card-title')?.textContent||'');
      phase.querySelectorAll('.activity-card').forEach(activity=>{
        const title=activity.querySelector('.activity-name')?.value?.trim();
        if(!title)return;
        if(!activity.dataset.syncId)activity.dataset.syncId=uid();
        const assignments=[...activity.querySelectorAll('.assignment-row')].map((row,index)=>{
          const sel=row.querySelector('.assignment-role');
          return {key:(sel?.value||'role')+'-'+index,roleId:sel?.value||'',roleLabel:sel?.selectedOptions?.[0]?.textContent||'Figura',hours:Number(row.querySelector('.assignment-hours')?.value||0)};
        });
        out.push({sourceId:activity.dataset.syncId,phaseType,title,plannedHours:assignments.reduce((s,x)=>s+x.hours,0),assignments});
      });
    });
    return out;
  }

  function syncKanbanFromOffer(){
    if(!offerConfirmed)return;
    const sources=collectOfferActivities();
    const liveIds=new Set(sources.map(x=>x.sourceId));
    sources.forEach(src=>{
      const existing=kanbanItems.get(src.sourceId);
      if(!existing){
        kanbanItems.set(src.sourceId,{...src,status:'programmazione',startDate:'',endDate:'',stopped:false,work:src.assignments.map(a=>({...a,user:'',notes:'',done:false}))});
      }else if(existing.status==='programmazione'){
        const prior=new Map((existing.work||[]).map(x=>[x.key,x]));
        existing.phaseType=src.phaseType;existing.title=src.title;existing.plannedHours=src.plannedHours;existing.assignments=src.assignments;
        existing.work=src.assignments.map(a=>({...a,user:prior.get(a.key)?.user||'',notes:prior.get(a.key)?.notes||'',done:prior.get(a.key)?.done||false}));
      }
    });
    [...kanbanItems.entries()].forEach(([id,item])=>{if(item.status==='programmazione'&&!liveIds.has(id))kanbanItems.delete(id);});
    const firstWithItems=PHASE_TYPES.find(p=>[...kanbanItems.values()].some(i=>i.phaseType===p.id));
    if(firstWithItems && ![...kanbanItems.values()].some(i=>i.phaseType===currentPhase))currentPhase=firstWithItems.id;
    renderKanban();
  }

  function renderKanban(){
    const tabs=document.getElementById('kanbanPhaseTabs'),board=document.getElementById('kanbanBoard');if(!tabs||!board)return;
    tabs.innerHTML=PHASE_TYPES.map(p=>{
      const count=[...kanbanItems.values()].filter(i=>i.phaseType===p.id).length;
      return `<button type="button" class="kanban-phase-tab ${currentPhase===p.id?'active':''}" data-phase="${p.id}">${p.label}<span class="count">${count}</span></button>`;
    }).join('');
    tabs.querySelectorAll('.kanban-phase-tab').forEach(btn=>btn.addEventListener('click',()=>{currentPhase=btn.dataset.phase;renderKanban();}));

    board.innerHTML=STATUS_COLUMNS.map(col=>{
      const count=[...kanbanItems.values()].filter(i=>i.phaseType===currentPhase&&i.status===col.id).length;
      return `<section class="kanban-column"><div class="kanban-column-head"><span>${col.label}</span><span class="kb-count">${count}</span></div><div class="kanban-list" data-status="${col.id}"></div></section>`;
    }).join('');
    STATUS_COLUMNS.forEach(col=>{
      const list=board.querySelector(`.kanban-list[data-status="${col.id}"]`);
      const items=[...kanbanItems.values()].filter(i=>i.phaseType===currentPhase&&i.status===col.id);
      if(!items.length){list.innerHTML=`<div class="kanban-empty">${col.id==='available'?'Le attività dell’offerta confermata vengono inserite direttamente in programmazione.':'Nessuna attività in questo stato.'}</div>`;}
      else items.forEach(item=>list.appendChild(makeKanbanCard(item)));
      setupDropZone(list,col.id);
    });
  }

  function makeKanbanCard(item){
    const el=document.createElement('article');el.className='kanban-card';el.draggable=true;el.dataset.id=item.sourceId;
    const users=(item.work||[]).filter(x=>x.user?.trim()).length;
    const role=(item.assignments||[])[0]?.roleLabel||'—';
    const idx=['programmazione','lavorazione','chiusa'].indexOf(item.status);
    el.innerHTML=`<div class="kanban-card-title">${esc(item.title)}</div>
      <div class="kanban-card-line"><span>Durata prevista</span><strong>${fmt(item.plannedHours)} ore</strong></div>
      <div class="kanban-card-line"><span>Durata rilevata</span><strong>0 ore</strong></div>
      <div class="kanban-card-meta"><span class="kanban-role-chip">${esc(role)}</span><span class="kanban-card-icons">▣ ${(item.work||[]).length} lavorazione/i · ♟ ${users} utente/i</span><span class="kanban-card-status-actions">${idx>0?'<button class="kb-move prev" type="button" title="Stato precedente">‹</button>':''}${idx>=0&&idx<2?'<button class="kb-move next" type="button" title="Stato successivo">›</button>':''}</span></div>`;
    let suppressClick=false;
    el.addEventListener('click',e=>{if(e.target.closest('.kb-move'))return;if(suppressClick){suppressClick=false;return;}openActivityModal(item);});
    el.querySelector('.prev')?.addEventListener('click',e=>{e.stopPropagation();moveItem(item,-1);});
    el.querySelector('.next')?.addEventListener('click',e=>{e.stopPropagation();moveItem(item,1);});
    el.addEventListener('dragstart',e=>{el.classList.add('dragging');e.dataTransfer.setData('text/plain',item.sourceId);e.dataTransfer.effectAllowed='move';});
    el.addEventListener('dragend',()=>el.classList.remove('dragging'));

    el.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse'||e.target.closest('button'))return;
      const sx=e.clientX,sy=e.clientY;let dragged=false,targetStatus=null,lastX=sx,lastY=sy;
      const move=ev=>{
        lastX=ev.clientX;lastY=ev.clientY;
        if(!dragged&&Math.hypot(ev.clientX-sx,ev.clientY-sy)>12){dragged=true;el.classList.add('touch-dragging');}
        if(!dragged)return;
        document.querySelectorAll('.kanban-list.drag-over').forEach(x=>x.classList.remove('drag-over'));
        const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.kanban-list');
        if(target&&target.dataset.status!=='available'){target.classList.add('drag-over');targetStatus=target.dataset.status;}else targetStatus=null;
      };
      const up=()=>{
        el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);
        document.querySelectorAll('.kanban-list.drag-over').forEach(x=>x.classList.remove('drag-over'));
        if(dragged){el.classList.remove('touch-dragging');suppressClick=true;if(targetStatus&&targetStatus!==item.status){item.status=targetStatus;renderKanban();}}
      };
      el.setPointerCapture?.(e.pointerId);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
    });
    return el;
  }

  function setupDropZone(list,status){
    list.addEventListener('dragover',e=>{if(status==='available')return;e.preventDefault();list.classList.add('drag-over');});
    list.addEventListener('dragleave',e=>{if(!list.contains(e.relatedTarget))list.classList.remove('drag-over');});
    list.addEventListener('drop',e=>{
      if(status==='available')return;e.preventDefault();list.classList.remove('drag-over');
      const id=e.dataTransfer.getData('text/plain'),item=kanbanItems.get(id);if(item&&item.status!==status){item.status=status;renderKanban();}
    });
  }

  function moveItem(item,delta){
    const flow=['programmazione','lavorazione','chiusa'];const i=flow.indexOf(item.status);const next=flow[i+delta];if(next){item.status=next;renderKanban();}
  }

  function openActivityModal(item){
    document.querySelector('.kb-modal-overlay')?.remove();
    const work=(item.work||[]);
    document.body.insertAdjacentHTML('beforeend',`<div class="kb-modal-overlay"><div class="kb-modal" role="dialog" aria-modal="true">
      <div class="kb-modal-head"><span>Dettaglio attività - ${esc(item.title)}</span><button type="button" class="kb-modal-close">×</button></div>
      <div class="kb-modal-body">
        <div class="kb-date-grid"><label class="kb-field">Data inizio<input class="kb-start" type="date" value="${esc(item.startDate||'')}"></label><label class="kb-field">Data fine<input class="kb-end" type="date" value="${esc(item.endDate||'')}"></label></div>
        <label class="kb-field">Stato<select class="kb-status"><option value="programmazione" ${item.status==='programmazione'?'selected':''}>In programmazione</option><option value="lavorazione" ${item.status==='lavorazione'?'selected':''}>In lavorazione</option><option value="chiusa" ${item.status==='chiusa'?'selected':''}>Chiusa</option></select></label>
        <div class="kb-work-list">${work.length?work.map((w,i)=>workMarkup(w,i)).join(''):'<div class="kanban-empty">Nessuna figura/ora prevista nell’analisi economica.</div>'}</div>
        <div class="kb-modal-stop"><label class="kb-check"><input class="kb-stopped" type="checkbox" ${item.stopped?'checked':''}>Attività stoppata</label></div>
      </div>
      <div class="kb-modal-actions"><button class="kb-btn kb-cancel" type="button">Chiudi</button><button class="kb-btn primary kb-save" type="button">Aggiorna</button></div>
    </div></div>`);
    const overlay=document.querySelector('.kb-modal-overlay'),modal=overlay.querySelector('.kb-modal');
    const close=()=>overlay.remove();
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});modal.querySelector('.kb-modal-close').addEventListener('click',close);modal.querySelector('.kb-cancel').addEventListener('click',close);
    modal.querySelectorAll('.kb-work-toggle').forEach(btn=>btn.addEventListener('click',()=>btn.closest('.kb-work-entry').classList.toggle('collapsed')));
    modal.querySelector('.kb-save').addEventListener('click',()=>{
      item.startDate=modal.querySelector('.kb-start').value;item.endDate=modal.querySelector('.kb-end').value;item.status=modal.querySelector('.kb-status').value;item.stopped=modal.querySelector('.kb-stopped').checked;
      modal.querySelectorAll('.kb-work-entry').forEach((entry,i)=>{if(item.work[i]){item.work[i].user=entry.querySelector('.kb-user').value;item.work[i].notes=entry.querySelector('.kb-notes').value;item.work[i].done=entry.querySelector('.kb-done').checked;}});
      renderKanban();close();
    });
  }

  function workMarkup(w,index){
    return `<section class="kb-work-entry"><div class="kb-work-head"><strong>Lavorazione ${index+1} · ${esc(w.roleLabel)}</strong><span>${fmt(w.hours)} ore previste <button class="kb-work-toggle" type="button">⌄</button></span></div><div class="kb-work-body">
      <label class="kb-field">Utente associato<input class="kb-user" value="${esc(w.user||'')}" placeholder="Seleziona / scrivi utente"></label>
      <label class="kb-field">Durata prevista<div class="kb-readonly-hours">${fmt(w.hours)} &nbsp; Ore</div></label>
      <label class="kb-field">Note<textarea class="kb-notes" placeholder="Note lavorazione">${esc(w.notes||'')}</textarea></label>
      <label class="kb-check"><input class="kb-done" type="checkbox" ${w.done?'checked':''}>Attività terminata</label>
    </div></section>`;
  }

  function showToast(text){
    const el=document.getElementById('kbToast');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2400);
  }
})();
