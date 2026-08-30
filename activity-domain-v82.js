/* v82 - Authoritative Activity Domain. Analysis creates stable IDs; Kanban owns operational status; billing reads this domain. */
(function(){
  if(window.DABSTER_ACTIVITY_DOMAIN_V82)return;
  const activities=new Map();
  let seq=0,queued=false,lastSignature='';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const clone=v=>JSON.parse(JSON.stringify(v));
  const validStatuses=new Set(['analisi','programmazione','lavorazione','chiusa']);

  function field(label){
    return [...document.querySelectorAll('#tab-dati label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))||null;
  }
  function offerStatus(){return String(field('Stato')?.querySelector('select')?.value||window.DABSTER_OFFER_FLOW?.getSnapshot?.()?.offer?.status||'');}
  function offerConfirmed(){return norm(offerStatus())==='confermata';}
  function offerCode(){return String(field('Codice')?.querySelector('input,select,textarea')?.value||window.DABSTER_OFFER_FLOW?.getSnapshot?.()?.offer?.code||'draft').trim()||'draft';}
  function uid(phase){return `act-${offerCode().replace(/[^a-zA-Z0-9_-]/g,'_')}-${phase||'fase'}-${Date.now().toString(36)}-${++seq}`;}
  function phaseOf(card){return String(card?.querySelector('.phase-type-select')?.value||card?.dataset.planningPhase||'');}

  function assignmentsOf(activity){
    return [...activity.querySelectorAll('.assignment-row')].map((row,index)=>{
      const sel=row.querySelector('.assignment-role');
      return {key:(sel?.value||'role')+'-'+index,roleId:sel?.value||'',roleLabel:sel?.selectedOptions?.[0]?.textContent||'Figura',hours:Number(row.querySelector('.assignment-hours')?.value||0)};
    });
  }

  function ensureAnalysisIds(){
    document.querySelectorAll('#phaseWorkCards > .phase-work-card').forEach(phaseCard=>{
      const phase=phaseOf(phaseCard);
      phaseCard.querySelectorAll('.activity-card').forEach(activity=>{
        const title=String(activity.querySelector('.activity-name')?.value||'').trim();
        if(!title)return;
        if(!activity.dataset.syncId)activity.dataset.syncId=uid(phase);
        activity.dataset.activityId=activity.dataset.syncId;
      });
    });
  }

  function collectAnalysis(){
    ensureAnalysisIds();
    const seen=new Set(),confirmed=offerConfirmed();
    document.querySelectorAll('#phaseWorkCards > .phase-work-card').forEach(phaseCard=>{
      const phase=phaseOf(phaseCard);
      phaseCard.querySelectorAll('.activity-card').forEach(activity=>{
        const title=String(activity.querySelector('.activity-name')?.value||'').trim();if(!title)return;
        const id=String(activity.dataset.syncId||activity.dataset.activityId||'');if(!id)return;
        seen.add(id);
        const prev=activities.get(id),assignments=assignmentsOf(activity);
        let status=prev?.status|| (confirmed?'programmazione':'analisi');
        if(status==='analisi'&&confirmed)status='programmazione';
        activities.set(id,{
          ...(prev||{}),id,sourceId:id,phaseType:phase,title,status,
          plannedHours:assignments.reduce((s,x)=>s+Number(x.hours||0),0),assignments,
          analysisPresent:true,updatedAt:Date.now()
        });
      });
    });
    [...activities.entries()].forEach(([id,item])=>{
      if(seen.has(id))return;
      if(item.status==='analisi'||item.status==='programmazione')activities.delete(id);
      else activities.set(id,{...item,analysisPresent:false});
    });
  }

  function scanKanban(){
    const board=document.getElementById('kanbanBoard');if(!board)return;
    const activePhase=String(document.querySelector('.kanban-phase-tab.active')?.dataset.phase||'');
    board.querySelectorAll('.kanban-list[data-status] .kanban-card[data-id]').forEach(card=>{
      const id=String(card.dataset.id||'');if(!id)return;
      const status=String(card.closest('.kanban-list')?.dataset.status||'');
      const title=String(card.querySelector('.kanban-card-title')?.textContent||'').trim();
      const prev=activities.get(id)||{id,sourceId:id,phaseType:activePhase,title,status:'programmazione',analysisPresent:false};
      const previousStatus=prev.status;
      const next={...prev,id,sourceId:id,phaseType:activePhase||prev.phaseType,title:title||prev.title,status:validStatuses.has(status)?status:prev.status,kanbanPresent:true,updatedAt:Date.now()};
      activities.set(id,next);
      if(previousStatus!==next.status){
        window.dispatchEvent(new CustomEvent('dabster-activity-status-change',{detail:{activity:clone(next),activityId:id,previousStatus,status:next.status,source:'kanban'}}));
      }
    });
  }

  function signature(){
    return JSON.stringify([...activities.values()].sort((a,b)=>a.id.localeCompare(b.id)).map(a=>[a.id,a.phaseType,a.title,a.status,a.plannedHours,a.analysisPresent!==false]));
  }
  function reconcile(reason='sync'){
    collectAnalysis();scanKanban();
    const sig=signature();
    if(sig!==lastSignature){
      lastSignature=sig;
      window.dispatchEvent(new CustomEvent('dabster-activity-domain-change',{detail:{reason,activities:getActivities()}}));
    }
    return getActivities();
  }
  function schedule(reason='dom'){
    if(queued)return;queued=true;setTimeout(()=>{queued=false;reconcile(reason);},0);
  }

  function getActivities(){return [...activities.values()].map(clone);}
  function getActivity(id){const item=activities.get(String(id||''));return item?clone(item):null;}
  function resolveKey(key){
    const raw=String(key||'').trim();if(!raw)return null;
    const direct=activities.get(raw);if(direct)return clone(direct);
    const i=raw.indexOf('::');
    if(i>=0){
      const phase=raw.slice(0,i),name=raw.slice(i+2);
      const match=[...activities.values()].find(a=>String(a.phaseType)===String(phase)&&norm(a.title)===norm(name));
      if(match)return clone(match);
    }
    const byTitle=[...activities.values()].filter(a=>norm(a.title)===norm(raw));
    return byTitle.length===1?clone(byTitle[0]):null;
  }
  function legacyKey(id){const a=activities.get(String(id||''));return a?`${a.phaseType}::${norm(a.title)}`:'';}
  function setStatus(id,status,source='api'){
    const key=String(id||''),item=activities.get(key);if(!item||!validStatuses.has(status))return false;
    const previousStatus=item.status;if(previousStatus===status)return true;
    activities.set(key,{...item,status,updatedAt:Date.now()});
    const next=getActivity(key);
    window.dispatchEvent(new CustomEvent('dabster-activity-status-change',{detail:{activity:next,activityId:key,previousStatus,status,source}}));
    window.dispatchEvent(new CustomEvent('dabster-activity-domain-change',{detail:{reason:'status',activities:getActivities()}}));
    return true;
  }

  const api={version:82,reconcile,schedule,getActivities,getActivity,resolveKey,legacyKey,setStatus,isOfferConfirmed:offerConfirmed};
  window.DABSTER_ACTIVITY_DOMAIN_V82=api;
  window.DABSTER_ACTIVITY_DOMAIN=api;

  document.addEventListener('input',e=>{if(e.target.closest?.('#phaseWorkloadSection'))schedule('analysis-input');},true);
  document.addEventListener('change',e=>{if(e.target.closest?.('#phaseWorkloadSection')||e.target===field('Stato')?.querySelector('select'))schedule('analysis-change');},true);
  document.addEventListener('click',e=>{if(e.target.closest?.('.add-activity,.activity-delete,.add-assignment,.assignment-delete,.kb-move,.kb-save,.kanban-phase-tab'))setTimeout(()=>schedule('ui-action'),30);},true);
  window.addEventListener('dabster-offer-flow-change',()=>schedule('offer'));
  window.addEventListener('hashchange',()=>schedule('route'));
  new MutationObserver(()=>schedule('mutation')).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(()=>{if(!document.hidden)reconcile('heartbeat');},400);
  reconcile('install');
})();