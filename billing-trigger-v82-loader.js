/* v82 - Load existing billing trigger with authoritative Activity Domain resolver. No Kanban bridge/cache is authoritative anymore. */
(async function(){
  if(window.DABSTER_TRIGGER_V82_LOADING)return;window.DABSTER_TRIGGER_V82_LOADING=true;
  try{
    const response=await fetch('billing-trigger-v58.js?v=82-source',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    let source=await response.text();
    const oldResolver=`function activityFromKey(key){\n    const raw=String(key||''),i=raw.indexOf('::');if(i<0)return null;\n    const phase=raw.slice(0,i),name=raw.slice(i+2);\n    return [...activities.values()].find(a=>a.phaseType===phase&&norm(a.title)===norm(name))||null;\n  }`;
    const newResolver=`function activityFromKey(key){\n    const domain=window.DABSTER_ACTIVITY_DOMAIN_V82||window.DABSTER_ACTIVITY_DOMAIN;\n    const authoritative=domain?.resolveKey?.(key);\n    if(authoritative)return authoritative;\n    const raw=String(key||''),direct=activities.get(raw);if(direct)return direct;\n    const i=raw.indexOf('::');if(i<0)return null;\n    const phase=raw.slice(0,i),name=raw.slice(i+2);\n    return [...activities.values()].find(a=>a.phaseType===phase&&norm(a.title)===norm(name))||null;\n  }`;
    if(!source.includes(oldResolver))throw new Error('Resolver trigger v58 non riconosciuto.');
    source=source.replace(oldResolver,newResolver).replace('const VERSION=58;','const VERSION=82;');
    source=source.replace("window.addEventListener('hashchange',schedule);", "window.addEventListener('dabster-activity-domain-change',schedule);window.addEventListener('dabster-activity-status-change',schedule);window.addEventListener('hashchange',schedule);");
    source += '\n//# sourceURL=billing-trigger-v82-runtime.js';
    (0,eval)(source);
    if(!window.DABSTER_BILLING_TRIGGER_V58)throw new Error('Trigger v82 non inizializzato.');
    window.DABSTER_BILLING_TRIGGER_V82=window.DABSTER_BILLING_TRIGGER_V58;
    window.dispatchEvent(new CustomEvent('dabster-billing-trigger-v82-ready',{detail:{version:82}}));
  }catch(err){
    console.error('[Dabster] Errore caricamento Trigger v82',err);
    window.DABSTER_TRIGGER_V82_ERROR=String(err?.message||err);
  }
})();