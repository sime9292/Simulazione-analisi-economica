/* v77 - Load billing-trigger-v58 after replacing activity resolution with authoritative Kanban state. */
(function(){
  if(window.DABSTER_TRIGGER_RUNTIME_V77)return;
  window.DABSTER_TRIGGER_RUNTIME_V77={version:77,status:'loading'};
  const src='billing-trigger-v58.js?v=77-source';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const fail=err=>{
    window.DABSTER_TRIGGER_RUNTIME_V77.status='error';
    window.DABSTER_TRIGGER_RUNTIME_V77.error=String(err?.message||err||'Errore Trigger v77');
    console.error('[Dabster v77] trigger runtime patch failed',err);
    window.dispatchEvent(new CustomEvent('dabster-trigger-v77-error',{detail:{error:window.DABSTER_TRIGGER_RUNTIME_V77.error}}));
  };
  fetch(src,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.text();}).then(code=>{
    const start=code.indexOf('  function activityFromKey(key){');
    const end=code.indexOf('\n  function billedForEvent',start);
    if(start<0||end<0)throw new Error('activityFromKey non trovata nel Trigger sorgente.');
    const replacement=`  function activityFromKey(key){\n    const raw=String(key||''),i=raw.indexOf('::');if(i<0)return null;\n    const phase=raw.slice(0,i),name=raw.slice(i+2);\n    const activePhase=String(document.querySelector('.kanban-phase-tab.active')?.dataset.phase||'');\n    if(activePhase===phase){\n      const card=[...document.querySelectorAll('#kanbanBoard .kanban-list[data-status] .kanban-card[data-id]')].find(c=>norm(String(c.querySelector('.kanban-card-title')?.textContent||''))===norm(name));\n      if(card){\n        const live={id:String(card.dataset.id||''),phaseType:phase,title:String(card.querySelector('.kanban-card-title')?.textContent||'').trim(),status:String(card.closest('.kanban-list[data-status]')?.dataset.status||'')};\n        if(live.id)activities.set(live.id,live);\n        return live;\n      }\n    }\n    return [...activities.values()].find(a=>a.phaseType===phase&&norm(a.title)===norm(name))||null;\n  }`;
    const patched=code.slice(0,start)+replacement+code.slice(end)+'\n//# sourceURL=billing-trigger-v77-runtime.js';
    window.DABSTER_TRIGGER_RUNTIME_V77.originalBytes=code.length;
    window.DABSTER_TRIGGER_RUNTIME_V77.patchedBytes=patched.length;
    (0,eval)(patched);
    if(!window.DABSTER_BILLING_TRIGGER_V58)throw new Error('Trigger eseguito senza API DABSTER_BILLING_TRIGGER_V58.');
    window.DABSTER_TRIGGER_RUNTIME_V77.status='ready';
    window.DABSTER_TRIGGER_RUNTIME_V77.patched=true;
    window.dispatchEvent(new CustomEvent('dabster-trigger-v77-ready',{detail:{version:77}}));
  }).catch(fail);
})();