/* v76 - Keep every stale Trigger activity alias aligned with the live Kanban card.
   billing-trigger-v58 keeps historical activity objects in an internal Map; activityFromKey()
   selects the first phase/title match. When a Test case is rebuilt, duplicate aliases may remain.
   This synchronizer updates ALL matching aliases, so the first match cannot retain an old status. */
(function(){
  if(window.DABSTER_KANBAN_TRIGGER_DEDUP_V76)return;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const CLOSED=new Set(['chiusa','chiuso','conclusa','concluso','completata','completato','closed','done']);
  const canonical=s=>CLOSED.has(norm(s))?'chiusa':String(s||'');
  const triggerApi=()=>window.DABSTER_BILLING_TRIGGER_V58||null;
  const planApi=()=>window.DABSTER_BILLING_PLAN_V47||window.DABSTER_BILLING_PLAN_V46||null;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});

  function same(a,item){
    if(String(a?.id||'')&&String(a.id)===String(item?.id||''))return true;
    return String(a?.phaseType||'')===String(item?.phaseType||'')&&norm(a?.title)===norm(item?.title);
  }
  function keyParts(key){const raw=String(key||''),i=raw.indexOf('::');return i<0?{phase:'',name:''}:{phase:raw.slice(0,i),name:raw.slice(i+2)};}
  function linkedRows(item){
    const rows=planApi()?.getSnapshot?.()?.rows||[];
    return rows.filter(r=>{
      if(r.trigger!=='activity_closed')return false;
      const k=keyParts(r.activityKey);
      return k.phase===String(item.phaseType||'')&&norm(k.name)===norm(item.title);
    });
  }
  function toast(text){
    const el=document.getElementById('kbToast');if(!el||!text)return;
    el.textContent=text;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3000);
  }
  function poke(){
    window.dispatchEvent(new CustomEvent('dabster-billing-plan-ready',{detail:{reason:'kanban-dedup-v76'}}));
    const board=document.getElementById('kanbanBoard');if(board){const x=document.createElement('i');x.hidden=true;x.dataset.v76='1';board.appendChild(x);x.remove();}
  }
  async function sync(raw,attempt=0){
    if(!raw?.id&&!raw?.title)return false;
    const api=triggerApi();if(!api?.getActivities||!api?.getSnapshot){if(attempt<30){await sleep(50);return sync(raw,attempt+1);}return false;}
    const item={...raw,status:canonical(raw.status)};
    const list=api.getActivities()||[];
    const matches=list.filter(a=>same(a,item));
    if(!matches.length){
      poke();
      if(attempt<20){await sleep(55);return sync(item,attempt+1);}
      return false;
    }
    // Critical fix: update every stale alias, not just the newest/current object.
    matches.forEach(a=>{a.phaseType=String(item.phaseType||a.phaseType||'');a.title=String(item.title||a.title||'');a.status=item.status;if(item.id)a.id=String(item.id);});
    poke();
    await sleep(45);
    const snap=api.getSnapshot?.()||{events:[]};
    const rows=linkedRows(item),ids=new Set(rows.map(r=>String(r.id)));
    const events=(snap.events||[]).filter(e=>ids.has(String(e.id)));
    const badge=document.querySelector('#appSidebar [data-page="billable"] .v58-side-badge');if(badge)badge.textContent=String(Number(snap.count||0));
    if(item.status==='chiusa'&&events.length){
      const ok=events.every(e=>e.matured===true||e.status==='Fatturato');
      if(ok){const total=events.reduce((s,e)=>s+Number(e.billable||0),0);toast(total>0?`Trigger attivato · Fatturabile ${money(total)} €`:'Trigger attivato · evento già fatturato');}
      else if(attempt<8){await sleep(70);return sync(item,attempt+1);}
      else console.error('[Dabster v76] Activity aliases aligned but event still not matured',{item,matches:matches.map(a=>({id:a.id,phaseType:a.phaseType,title:a.title,status:a.status})),events});
    }
    window.dispatchEvent(new CustomEvent('dabster-billing-trigger-change',{detail:{reason:'kanban-dedup-v76',item,summary:snap,duplicateAliases:matches.length}}));
    return true;
  }
  function visible(){
    const phase=String(document.querySelector('.kanban-phase-tab.active')?.dataset.phase||'');if(!phase)return [];
    return [...document.querySelectorAll('#kanbanBoard .kanban-list[data-status] .kanban-card[data-id]')].map(card=>({id:String(card.dataset.id||''),phaseType:phase,title:String(card.querySelector('.kanban-card-title')?.textContent||'').trim(),status:String(card.closest('.kanban-list[data-status]')?.dataset.status||'')})).filter(x=>x.id&&x.title);
  }
  function syncVisible(){visible().forEach(x=>sync(x));}
  window.addEventListener('dabster-kanban-status-change',e=>sync(e.detail||{}));
  window.addEventListener('dabster-kanban-model-change',e=>sync(e.detail||{}));
  document.addEventListener('click',e=>{if(e.target.closest?.('.kb-move,.kanban-phase-tab,#appSidebar [data-page="kanban"]'))setTimeout(syncVisible,40);},true);
  document.addEventListener('pointerup',e=>{if(e.target.closest?.('.kanban-card'))setTimeout(syncVisible,40);},true);
  const timer=setInterval(()=>{if(!document.getElementById('kanbanPage')?.hidden)syncVisible();},300);
  window.DABSTER_KANBAN_TRIGGER_DEDUP_V76={version:76,sync,syncVisible,stop:()=>clearInterval(timer)};
  setTimeout(syncVisible,350);
})();
