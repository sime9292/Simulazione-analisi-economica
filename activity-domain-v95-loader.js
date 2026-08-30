/* v95 - Activity Domain: Analysis owns activity identity/phase/title; Kanban may update status only. */
(async function(){
  if(window.DABSTER_ACTIVITY_DOMAIN_V95_LOADING)return;
  window.DABSTER_ACTIVITY_DOMAIN_V95_LOADING=true;
  try{
    const response=await fetch('activity-domain-v82.js?v=95-source',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    let source=await response.text();

    const oldPrune=`[...activities.entries()].forEach(([id,item])=>{\n      if(seen.has(id))return;\n      if(item.status==='analisi'||item.status==='programmazione')activities.delete(id);\n      else activities.set(id,{...item,analysisPresent:false});\n    });`;
    const newPrune=`[...activities.entries()].forEach(([id])=>{\n      if(!seen.has(id))activities.delete(id);\n    });`;
    if(!source.includes(oldPrune))throw new Error('Pulizia Activity Domain v82 non riconosciuta.');
    source=source.replace(oldPrune,newPrune);

    const oldScan=`function scanKanban(){\n    const board=document.getElementById('kanbanBoard');if(!board)return;\n    const activePhase=String(document.querySelector('.kanban-phase-tab.active')?.dataset.phase||'');\n    board.querySelectorAll('.kanban-list[data-status] .kanban-card[data-id]').forEach(card=>{\n      const id=String(card.dataset.id||'');if(!id)return;\n      const status=String(card.closest('.kanban-list')?.dataset.status||'');\n      const title=String(card.querySelector('.kanban-card-title')?.textContent||'').trim();\n      const prev=activities.get(id)||{id,sourceId:id,phaseType:activePhase,title,status:'programmazione',analysisPresent:false};\n      const previousStatus=prev.status;\n      const next={...prev,id,sourceId:id,phaseType:activePhase||prev.phaseType,title:title||prev.title,status:validStatuses.has(status)?status:prev.status,kanbanPresent:true,updatedAt:Date.now()};\n      activities.set(id,next);\n      if(previousStatus!==next.status){\n        window.dispatchEvent(new CustomEvent('dabster-activity-status-change',{detail:{activity:clone(next),activityId:id,previousStatus,status:next.status,source:'kanban'}}));\n      }\n    });\n  }`;
    const newScan=`function scanKanban(){\n    const board=document.getElementById('kanbanBoard');if(!board)return;\n    board.querySelectorAll('.kanban-list[data-status] .kanban-card[data-id]').forEach(card=>{\n      const id=String(card.dataset.id||'');if(!id)return;\n      const status=String(card.closest('.kanban-list')?.dataset.status||'');\n      const prev=activities.get(id);\n      // Analysis is authoritative for identity, phase and title. Kanban owns operational status only.\n      if(!prev)return;\n      const previousStatus=prev.status;\n      const next={...prev,id,sourceId:id,status:validStatuses.has(status)?status:prev.status,kanbanPresent:true,updatedAt:Date.now()};\n      activities.set(id,next);\n      if(previousStatus!==next.status){\n        window.dispatchEvent(new CustomEvent('dabster-activity-status-change',{detail:{activity:clone(next),activityId:id,previousStatus,status:next.status,source:'kanban'}}));\n      }\n    });\n  }`;
    if(!source.includes(oldScan))throw new Error('scanKanban Activity Domain v82 non riconosciuto.');
    source=source.replace(oldScan,newScan);

    const oldApi=`const api={version:82,reconcile,schedule,getActivities,getActivity,resolveKey,legacyKey,setStatus,isOfferConfirmed:offerConfirmed};`;
    const newApi=`function reset(reason='reset'){\n    activities.clear();lastSignature='';\n    window.dispatchEvent(new CustomEvent('dabster-activity-domain-change',{detail:{reason,activities:[]}}));\n    return [];\n  }\n\n  const api={version:95,reconcile,schedule,getActivities,getActivity,resolveKey,legacyKey,setStatus,reset,isOfferConfirmed:offerConfirmed};`;
    if(!source.includes(oldApi))throw new Error('API Activity Domain v82 non riconosciuta.');
    source=source.replace(oldApi,newApi);
    source=source.replace('/* v82 - Authoritative Activity Domain. Analysis creates stable IDs; Kanban owns operational status; billing reads this domain. */','/* v95 - Authoritative Activity Domain. Analysis owns identity/phase/title; Kanban owns operational status only. */');
    source+='\n//# sourceURL=activity-domain-v95-runtime.js';
    (0,eval)(source);

    const api=window.DABSTER_ACTIVITY_DOMAIN_V82||window.DABSTER_ACTIVITY_DOMAIN;
    if(!api?.reset||api.version!==95)throw new Error('Activity Domain v95 non inizializzato.');
    window.DABSTER_ACTIVITY_DOMAIN_V95=api;
    // Backward-compatible alias: billing-trigger-v85 resolves V84 first.
    window.DABSTER_ACTIVITY_DOMAIN_V84=api;
    window.DABSTER_ACTIVITY_DOMAIN=api;
    window.dispatchEvent(new CustomEvent('dabster-activity-domain-v95-ready',{detail:{version:95}}));
  }catch(err){
    console.error('[Dabster] Errore Activity Domain v95',err);
    window.DABSTER_ACTIVITY_DOMAIN_V95_ERROR=String(err?.message||err);
  }
})();