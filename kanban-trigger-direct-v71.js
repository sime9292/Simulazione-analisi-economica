/* v71 - Direct Kanban -> Billing Trigger state bridge. Removes trigger dependence on DOM scan timing. */
(function(){
  if(window.DABSTER_KANBAN_TRIGGER_DIRECT_V71)return;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const CLOSED=new Set(['chiusa','chiuso','conclusa','concluso','completata','completato','closed','done']);
  const triggerApi=()=>window.DABSTER_BILLING_TRIGGER_V58||null;
  const canonicalStatus=status=>CLOSED.has(norm(status))?'chiusa':String(status||'');
  const sameActivity=(a,item)=>String(a?.id||'')===String(item?.id||'')||(String(a?.phaseType||'')===String(item?.phaseType||'')&&norm(a?.title)===norm(item?.title));
  function showToast(text){
    const el=document.getElementById('kbToast');if(!el||!text)return;
    el.textContent=text;el.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>el.classList.remove('show'),2800);
  }
  function linkedEvents(snapshot,item){
    return (snapshot?.events||[]).filter(e=>{
      if(e.trigger!=='activity_closed')return false;
      if(String(e.activity?.id||'')===String(item.id||''))return true;
      if(String(e.activity?.phaseType||'')===String(item.phaseType||'')&&norm(e.activity?.title)===norm(item.title))return true;
      const raw=String(e.activityKey||''),i=raw.indexOf('::');
      return i>=0&&raw.slice(0,i)===String(item.phaseType||'')&&norm(raw.slice(i+2))===norm(item.title);
    });
  }
  function syncActivity(item,attempt=0){
    if(!item?.id)return false;
    const api=triggerApi();
    if(!api?.getActivities){if(attempt<20)setTimeout(()=>syncActivity(item,attempt+1),50);return false;}
    const list=api.getActivities()||[];
    const activity=list.find(a=>sameActivity(a,item));
    if(!activity){
      window.dispatchEvent(new CustomEvent('dabster-billing-plan-ready',{detail:{reason:'kanban-direct-prime'}}));
      if(attempt<12)setTimeout(()=>syncActivity(item,attempt+1),35);
      return false;
    }
    activity.id=String(item.id||activity.id||'');
    activity.phaseType=String(item.phaseType||activity.phaseType||'');
    activity.title=String(item.title||activity.title||'');
    activity.status=canonicalStatus(item.status);
    window.dispatchEvent(new CustomEvent('dabster-billing-plan-ready',{detail:{reason:'kanban-direct-status',activity:{...activity},previousStatus:item.previousStatus||''}}));
    window.dispatchEvent(new CustomEvent('dabster-billing-trigger-change',{detail:{reason:'kanban-direct-status',activity:{...activity}}}));
    setTimeout(()=>{
      const snapshot=api.getSnapshot?.()||{};
      const linked=linkedEvents(snapshot,item);
      if(CLOSED.has(norm(item.status))&&linked.length){
        const billable=linked.reduce((s,e)=>s+Number(e.billable||0),0);
        const matured=linked.every(e=>e.matured===true||e.status==='Fatturato');
        if(matured)showToast(billable>0?`Trigger attivato · Fatturabile ${money(billable)} €`:'Trigger attivato · evento già fatturato');
      }
      window.dispatchEvent(new CustomEvent('dabster-kanban-direct-trigger-synced',{detail:{item:{...item},linked:linked.map(e=>({id:e.id,status:e.status,billable:e.billable,matured:e.matured}))}}));
    },25);
    return true;
  }
  window.addEventListener('dabster-kanban-status-change',e=>syncActivity(e.detail||{}));
  window.DABSTER_KANBAN_TRIGGER_DIRECT_V71={version:71,syncActivity};
})();
