/* v85 - Billing Trigger reads the authoritative Activity Domain synchronously and never drops a queued status update. */
(async function(){
  if(window.DABSTER_TRIGGER_V85_LOADING)return;window.DABSTER_TRIGGER_V85_LOADING=true;
  try{
    const response=await fetch('billing-trigger-v58.js?v=85-source',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    let source=await response.text();

    const oldVars="let observer=null,queued=false,reconError='',pendingFocusEvent='',lastReconSig='',lastBillableSig='';";
    const newVars="let observer=null,queued=false,rerun=false,reconError='',pendingFocusEvent='',lastReconSig='',lastBillableSig='';";
    if(!source.includes(oldVars))throw new Error('Variabili trigger v58 non riconosciute.');
    source=source.replace(oldVars,newVars);

    const oldResolver=`function activityFromKey(key){\n    const raw=String(key||''),i=raw.indexOf('::');if(i<0)return null;\n    const phase=raw.slice(0,i),name=raw.slice(i+2);\n    return [...activities.values()].find(a=>a.phaseType===phase&&norm(a.title)===norm(name))||null;\n  }`;
    const newResolver=`function activityFromKey(key){\n    const domain=window.DABSTER_ACTIVITY_DOMAIN_V84||window.DABSTER_ACTIVITY_DOMAIN_V82||window.DABSTER_ACTIVITY_DOMAIN;\n    const authoritative=domain?.resolveKey?.(key);\n    if(authoritative)return authoritative;\n    const raw=String(key||''),direct=activities.get(raw);if(direct)return direct;\n    const i=raw.indexOf('::');if(i<0)return null;\n    const phase=raw.slice(0,i),name=raw.slice(i+2);\n    return [...activities.values()].find(a=>a.phaseType===phase&&norm(a.title)===norm(name))||null;\n  }`;
    if(!source.includes(oldResolver))throw new Error('Resolver trigger v58 non riconosciuto.');
    source=source.replace(oldResolver,newResolver);

    const oldSchedule="function schedule(){if(queued)return;queued=true;setTimeout(()=>{queued=false;patchPlanSeed();scanKanban();installBillableMenu();enhanceKpis();enhanceDashboardRows();renderBillablePage();renderReconciliation();decoratePlanPanels();},0);}";
    const newSchedule="function schedule(){if(queued){rerun=true;return;}queued=true;setTimeout(()=>{try{const domain=window.DABSTER_ACTIVITY_DOMAIN_V84||window.DABSTER_ACTIVITY_DOMAIN_V82||window.DABSTER_ACTIVITY_DOMAIN;domain?.reconcile?.('billing-trigger-v85');patchPlanSeed();scanKanban();installBillableMenu();enhanceKpis();enhanceDashboardRows();renderBillablePage();renderReconciliation();decoratePlanPanels();}finally{queued=false;if(rerun){rerun=false;schedule();}}},0);}";
    if(!source.includes(oldSchedule))throw new Error('Schedule trigger v58 non riconosciuto.');
    source=source.replace(oldSchedule,newSchedule);

    source=source.replace("window.addEventListener('hashchange',schedule);", "window.addEventListener('dabster-activity-domain-change',schedule);window.addEventListener('dabster-activity-status-change',schedule);window.addEventListener('hashchange',schedule);");
    source=source.replace('const VERSION=58;','const VERSION=85;');
    source+='\n//# sourceURL=billing-trigger-v85-runtime.js';
    (0,eval)(source);
    if(!window.DABSTER_BILLING_TRIGGER_V58)throw new Error('Trigger v85 non inizializzato.');
    window.DABSTER_BILLING_TRIGGER_V85=window.DABSTER_BILLING_TRIGGER_V58;
    window.dispatchEvent(new CustomEvent('dabster-billing-trigger-v85-ready',{detail:{version:85}}));
  }catch(err){
    console.error('[Dabster] Errore caricamento Trigger v85',err);
    window.DABSTER_TRIGGER_V85_ERROR=String(err?.message||err);
  }
})();