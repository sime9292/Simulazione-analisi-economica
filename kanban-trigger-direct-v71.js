/* v73 - Direct Kanban -> Billing Trigger bridge with activity-key repair and forced rescan. */
(function(){
  if(window.DABSTER_KANBAN_TRIGGER_DIRECT_V73)return;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const CLOSED=new Set(['chiusa','chiuso','conclusa','concluso','completata','completato','closed','done']);
  const triggerApi=()=>window.DABSTER_BILLING_TRIGGER_V58||null;
  const planApi=()=>window.DABSTER_BILLING_PLAN_V47||null;
  const canonicalStatus=status=>CLOSED.has(norm(status))?'chiusa':String(status||'');

  function showToast(text,error=false){
    const el=document.getElementById('kbToast');if(!el||!text)return;
    el.textContent=text;el.classList.add('show');el.dataset.triggerError=error?'1':'0';
    clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>{el.classList.remove('show');delete el.dataset.triggerError;},3200);
  }
  function keyParts(key){
    const raw=String(key||''),i=raw.indexOf('::');
    return i<0?{phase:'',name:''}:{phase:raw.slice(0,i),name:raw.slice(i+2)};
  }
  function currentPlanRows(){try{return planApi()?.getSnapshot?.()?.rows||[];}catch{return [];}}
  function currentPlanContext(){try{return planApi()?.getContext?.()||{lines:[]};}catch{return {lines:[]};}}
  function targetPlanRow(item){
    const rows=currentPlanRows().filter(r=>r.trigger==='activity_closed');
    if(!rows.length)return null;
    const exact=rows.find(r=>{const k=keyParts(r.activityKey);return k.phase===String(item.phaseType||'')&&norm(k.name)===norm(item.title);});
    if(exact)return exact;
    const ctx=currentPlanContext();
    const byBase=rows.find(r=>{
      if(r.baseType!=='line')return false;
      const line=(ctx.lines||[]).find(l=>String(l.id)===String(r.baseRef));
      return String(line?.phase||'')===String(item.phaseType||'');
    });
    if(byBase)return byBase;
    return rows.find(r=>norm(keyParts(r.activityKey).name)===norm(item.title))||null;
  }
  function canonicalItem(item){
    const row=targetPlanRow(item),parts=keyParts(row?.activityKey);
    return {...item,phaseType:parts.phase||String(item.phaseType||''),title:parts.name||String(item.title||''),planEventId:row?.id||''};
  }
  function sameActivity(a,item){
    if(String(a?.id||'')&&String(a?.id||'')===String(item?.id||''))return true;
    if(norm(a?.title)===norm(item?.title)&&String(a?.phaseType||'')===String(item?.phaseType||''))return true;
    return norm(a?.title)===norm(item?.title);
  }
  function forceTriggerScan(item){
    const tab=[...document.querySelectorAll('.kanban-phase-tab')].find(x=>String(x.dataset.phase||'')===String(item.phaseType||''));
    if(tab&&!tab.classList.contains('active'))tab.click();
    else if(tab)tab.click();
    const board=document.getElementById('kanbanBoard');
    if(board){const marker=document.createElement('i');marker.hidden=true;marker.dataset.triggerPrime='73';board.appendChild(marker);marker.remove();}
    window.dispatchEvent(new CustomEvent('dabster-billing-plan-ready',{detail:{reason:'kanban-v73-force-scan'}}));
  }
  function linkedEvents(snapshot,item){
    return (snapshot?.events||[]).filter(e=>{
      if(e.trigger!=='activity_closed')return false;
      if(item.planEventId&&String(e.id)===String(item.planEventId))return true;
      const k=keyParts(e.activityKey);
      return k.phase===String(item.phaseType||'')&&norm(k.name)===norm(item.title);
    });
  }
  function updateSidebarFromSnapshot(snapshot){
    const badge=document.querySelector('#appSidebar [data-page="billable"] .v58-side-badge');
    if(badge)badge.textContent=String(Number(snapshot?.count||0));
  }
  function syncActivity(rawItem,attempt=0){
    if(!rawItem?.id)return false;
    const api=triggerApi();
    if(!api?.getActivities){if(attempt<30)setTimeout(()=>syncActivity(rawItem,attempt+1),50);return false;}
    const item=canonicalItem(rawItem);
    const list=api.getActivities()||[];
    let activity=list.find(a=>sameActivity(a,item));
    if(!activity){
      forceTriggerScan(item);
      if(attempt<24)setTimeout(()=>syncActivity(rawItem,attempt+1),55);
      else showToast('Trigger non agganciato all’attività · verifica collegamento Piano',true);
      return false;
    }
    activity.id=String(item.id||activity.id||'');
    activity.phaseType=String(item.phaseType||activity.phaseType||'');
    activity.title=String(item.title||activity.title||'');
    activity.status=canonicalStatus(item.status);
    window.dispatchEvent(new CustomEvent('dabster-billing-plan-ready',{detail:{reason:'kanban-v73-status',activity:{...activity},previousStatus:item.previousStatus||''}}));
    window.dispatchEvent(new CustomEvent('dabster-billing-trigger-change',{detail:{reason:'kanban-v73-status',activity:{...activity}}}));
    setTimeout(()=>{
      const snapshot=api.getSnapshot?.()||{};
      updateSidebarFromSnapshot(snapshot);
      const linked=linkedEvents(snapshot,item);
      const closed=CLOSED.has(norm(item.status));
      if(closed&&linked.length){
        const billable=linked.reduce((s,e)=>s+Number(e.billable||0),0);
        const matured=linked.every(e=>e.matured===true||e.status==='Fatturato');
        if(matured)showToast(billable>0?`Trigger attivato · Fatturabile ${money(billable)} €`:'Trigger attivato · evento già fatturato');
        else if(attempt<24){forceTriggerScan(item);setTimeout(()=>syncActivity(rawItem,attempt+1),70);}
        else showToast('Attività chiusa ma trigger ancora non maturato',true);
      }else if(closed&&!linked.length){
        showToast('Attività chiusa · nessun evento Piano collegato',true);
      }
      window.dispatchEvent(new CustomEvent('dabster-kanban-direct-trigger-synced',{detail:{item:{...item},activities:(api.getActivities?.()||[]).map(a=>({id:a.id,phaseType:a.phaseType,title:a.title,status:a.status})),linked:linked.map(e=>({id:e.id,activityKey:e.activityKey,status:e.status,billable:e.billable,matured:e.matured}))}}));
    },80);
    return true;
  }
  window.addEventListener('dabster-kanban-status-change',e=>syncActivity(e.detail||{}));
  window.DABSTER_KANBAN_TRIGGER_DIRECT_V73={version:73,syncActivity};
  window.DABSTER_KANBAN_TRIGGER_DIRECT_V71=window.DABSTER_KANBAN_TRIGGER_DIRECT_V73;
})();
