/* v83 - Load the established Kanban source with authoritative orphan cleanup. */
(async function(){
  if(window.DABSTER_APP_V13_V83_LOADING)return;
  window.DABSTER_APP_V13_V83_LOADING=true;
  try{
    const response=await fetch('app-v13.js?v=83-source',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    let source=await response.text();

    const oldPrune="[...kanbanItems.entries()].forEach(([id,item])=>{if(item.status==='programmazione'&&!liveIds.has(id))kanbanItems.delete(id);});";
    const newPrune="[...kanbanItems.entries()].forEach(([id])=>{if(!liveIds.has(id))kanbanItems.delete(id);});";
    if(!source.includes(oldPrune))throw new Error('Regola pulizia Kanban non riconosciuta.');
    source=source.replace(oldPrune,newPrune);

    const mapDecl="const kanbanItems=new Map();";
    const mapPatch=`const kanbanItems=new Map();\n  // Test autofill/reset must start from the same empty operational state as a fresh manual offer.\n  document.addEventListener('click',e=>{\n    if(!e.target.closest?.('#dabsterEnvironmentBar [data-load],#dabsterEnvironmentBar [data-reset]'))return;\n    kanbanItems.clear();\n    if(document.getElementById('kanbanBoard'))renderKanban();\n  },true);`;
    if(!source.includes(mapDecl))throw new Error('Mappa Kanban non riconosciuta.');
    source=source.replace(mapDecl,mapPatch);

    source=source.replace('/* v46 - Sidebar + Attività Commessa Kanban + sync from confirmed offer, aligned to seven operational phases */','/* v83 - Sidebar + Attività Commessa Kanban; orphan activities are removed when absent from current Analysis */');
    source+='\n//# sourceURL=app-v13-v83-runtime.js';
    (0,eval)(source);
    window.DABSTER_APP_V13_V83_READY=true;
  }catch(err){
    console.error('[Dabster] Errore caricamento Kanban v83',err);
    window.DABSTER_APP_V13_V83_ERROR=String(err?.message||err);
    document.documentElement.classList.remove('dabster-booting');
  }
})();