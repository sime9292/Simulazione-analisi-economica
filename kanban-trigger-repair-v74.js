/* v74 - Live repair: synchronize visible Kanban card state into Billing Trigger activity refs. */
(function(){
  if(window.DABSTER_KANBAN_TRIGGER_REPAIR_V74)return;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const CLOSED=new Set(['chiusa','chiuso','conclusa','concluso','completata','completato','closed','done']);
  let busy=false,lastWarn='';

  const triggerApi=()=>window.DABSTER_BILLING_TRIGGER_V58||null;
  const planApi=()=>window.DABSTER_BILLING_PLAN_V47||window.DABSTER_BILLING_PLAN_V46||null;
  const canonical=s=>CLOSED.has(norm(s))?'chiusa':String(s||'');

  function activePhase(){return String(document.querySelector('.kanban-phase-tab.active')?.dataset.phase||'');}
  function visibleCards(){
    const phase=activePhase();if(!phase)return [];
    return [...document.querySelectorAll('#kanbanBoard .kanban-list[data-status] .kanban-card[data-id]')].map(card=>({
      id:String(card.dataset.id||''),phaseType:phase,
      title:String(card.querySelector('.kanban-card-title')?.textContent||'').trim(),
      status:canonical(card.closest('.kanban-list[data-status]')?.dataset.status||'')
    })).filter(x=>x.id&&x.title);
  }
  function same(a,c){return String(a?.id||'')===c.id||(String(a?.phaseType||'')===c.phaseType&&norm(a?.title)===norm(c.title));}
  function planActivityKey(row){return String(row?.activityKey||'');}
  function keyParts(key){const i=key.indexOf('::');return i<0?['','']:[key.slice(0,i),key.slice(i+2)];}
  function cardForKey(key,cards){const [phase,name]=keyParts(key);return cards.find(c=>c.phaseType===phase&&norm(c.title)===norm(name))||null;}
  function showWarn(text){
    if(text===lastWarn)return;lastWarn=text;
    let el=document.getElementById('v74TriggerDiagnostic');
    if(!el){el=document.createElement('div');el.id='v74TriggerDiagnostic';el.style.cssText='position:fixed;right:10px;bottom:10px;z-index:99999;max-width:360px;padding:7px 9px;border:1px solid #e0b9a1;border-radius:7px;background:#fff7f1;color:#8a4d28;font:700 10px/1.35 Arial,sans-serif;box-shadow:0 3px 14px rgba(0,0,0,.10)';document.body.appendChild(el);}
    el.textContent=text;el.hidden=!text;
  }
  function clearWarn(){lastWarn='';const el=document.getElementById('v74TriggerDiagnostic');if(el)el.hidden=true;}
  function pokeTrigger(){
    window.dispatchEvent(new CustomEvent('dabster-billing-plan-ready',{detail:{reason:'kanban-live-repair-v74'}}));
    const marker=document.createElement('span');marker.hidden=true;marker.dataset.v74='1';document.body.appendChild(marker);marker.remove();
  }
  function sync(){
    if(busy)return;busy=true;
    try{
      const api=triggerApi(),plan=planApi();if(!api?.getActivities||!api?.getSnapshot||!plan?.getSnapshot){busy=false;return;}
      const cards=visibleCards();if(!cards.length){busy=false;return;}
      let activities=api.getActivities()||[],changed=false,missing=false;
      for(const card of cards){
        const a=activities.find(x=>same(x,card));
        if(a){
          if(a.phaseType!==card.phaseType||a.title!==card.title||a.status!==card.status){a.phaseType=card.phaseType;a.title=card.title;a.status=card.status;changed=true;}
        }else missing=true;
      }
      if(changed||missing)pokeTrigger();
      setTimeout(()=>{
        const snap=api.getSnapshot?.()||{events:[]};
        const rows=plan.getSnapshot?.()?.rows||[];
        const closedRows=rows.filter(r=>r.valid&&r.trigger==='activity_closed'&&cardForKey(planActivityKey(r),cards)?.status==='chiusa');
        const failed=closedRows.filter(r=>{
          const e=(snap.events||[]).find(x=>String(x.id)===String(r.id));
          return !e?.matured;
        });
        const badge=document.querySelector('#appSidebar [data-page="billable"] .v58-side-badge');
        if(!failed.length){clearWarn();if(badge){const count=Number(snap.count||0);if(badge.textContent!==String(count))badge.textContent=String(count);}window.dispatchEvent(new CustomEvent('dabster-billing-trigger-change',{detail:{reason:'kanban-live-repair-v74',summary:snap}}));}
        else showWarn(`Attività chiusa ma trigger non maturato: ${failed.map(r=>r.eventLabel||r.id).join(', ')}. Card e Piano sono collegati; problema interno Trigger.`);
        busy=false;
      },45);
    }catch(err){busy=false;console.error('[Dabster v74] trigger repair',err);}
  }

  window.addEventListener('dabster-kanban-status-change',()=>setTimeout(sync,10));
  window.addEventListener('dabster-kanban-model-change',()=>setTimeout(sync,10));
  window.addEventListener('dabster-billing-plan-ready',e=>{if(e.detail?.reason!=='kanban-live-repair-v74')setTimeout(sync,10);});
  document.addEventListener('click',e=>{if(e.target.closest?.('.kb-move,.kanban-phase-tab,#appSidebar [data-page="kanban"]'))setTimeout(sync,30);},true);
  const observer=new MutationObserver(()=>setTimeout(sync,20));
  observer.observe(document.documentElement,{childList:true,subtree:true});
  const timer=setInterval(sync,250);
  window.DABSTER_KANBAN_TRIGGER_REPAIR_V74={version:74,sync,stop:()=>{clearInterval(timer);observer.disconnect();}};
  setTimeout(sync,300);
})();
