/* v84 - Authoritative Activity Domain loader: purge activities absent from current Analysis and expose reset(). */
(async function(){
  if(window.DABSTER_ACTIVITY_DOMAIN_V84_LOADING)return;
  window.DABSTER_ACTIVITY_DOMAIN_V84_LOADING=true;
  try{
    const response=await fetch('activity-domain-v82.js?v=84-source',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    let source=await response.text();

    const oldPrune=`[...activities.entries()].forEach(([id,item])=>{\n      if(seen.has(id))return;\n      if(item.status==='analisi'||item.status==='programmazione')activities.delete(id);\n      else activities.set(id,{...item,analysisPresent:false});\n    });`;
    const newPrune=`[...activities.entries()].forEach(([id])=>{\n      if(!seen.has(id))activities.delete(id);\n    });`;
    if(!source.includes(oldPrune))throw new Error('Pulizia Activity Domain v82 non riconosciuta.');
    source=source.replace(oldPrune,newPrune);

    const oldApi=`const api={version:82,reconcile,schedule,getActivities,getActivity,resolveKey,legacyKey,setStatus,isOfferConfirmed:offerConfirmed};`;
    const newApi=`function reset(reason='reset'){\n    activities.clear();lastSignature='';\n    window.dispatchEvent(new CustomEvent('dabster-activity-domain-change',{detail:{reason,activities:[]}}));\n    return [];\n  }\n\n  const api={version:84,reconcile,schedule,getActivities,getActivity,resolveKey,legacyKey,setStatus,reset,isOfferConfirmed:offerConfirmed};`;
    if(!source.includes(oldApi))throw new Error('API Activity Domain v82 non riconosciuta.');
    source=source.replace(oldApi,newApi);
    source=source.replace('/* v82 - Authoritative Activity Domain. Analysis creates stable IDs; Kanban owns operational status; billing reads this domain. */','/* v84 - Authoritative Activity Domain. Current Analysis is authoritative; stale/orphan activities are purged. */');
    source+='\n//# sourceURL=activity-domain-v84-runtime.js';
    (0,eval)(source);
    window.DABSTER_ACTIVITY_DOMAIN_V84=window.DABSTER_ACTIVITY_DOMAIN_V82||window.DABSTER_ACTIVITY_DOMAIN;
    if(!window.DABSTER_ACTIVITY_DOMAIN_V84?.reset)throw new Error('Activity Domain v84 non inizializzato.');
    window.dispatchEvent(new CustomEvent('dabster-activity-domain-v84-ready',{detail:{version:84}}));
  }catch(err){
    console.error('[Dabster] Errore Activity Domain v84',err);
    window.DABSTER_ACTIVITY_DOMAIN_V84_ERROR=String(err?.message||err);
  }
})();