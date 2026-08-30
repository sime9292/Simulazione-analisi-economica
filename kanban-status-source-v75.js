/* v75 - Authoritative Kanban status stream, including mobile touch-drag moves. */
(function(){
  if(window.DABSTER_KANBAN_STATUS_SOURCE_V75)return;
  const cache=new Map();
  let queued=false;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const phase=()=>String(document.querySelector('.kanban-phase-tab.active')?.dataset.phase||'');
  function visible(){
    const p=phase();if(!p)return [];
    return [...document.querySelectorAll('#kanbanBoard .kanban-list[data-status] .kanban-card[data-id]')].map(card=>({
      id:String(card.dataset.id||''),phaseType:p,title:String(card.querySelector('.kanban-card-title')?.textContent||'').trim(),status:String(card.closest('.kanban-list[data-status]')?.dataset.status||''),source:'kanban-status-v75'
    })).filter(x=>x.id&&x.title&&x.status);
  }
  function emit(item,previousStatus=''){
    const detail={...item,previousStatus:String(previousStatus||'')};
    window.dispatchEvent(new CustomEvent('dabster-kanban-status-change',{detail}));
    window.dispatchEvent(new CustomEvent('dabster-kanban-model-change',{detail}));
  }
  function scan({prime=false}={}){
    queued=false;
    const items=visible(),live=new Set();
    items.forEach(item=>{
      live.add(item.id);const prev=cache.get(item.id);
      if(!prev){cache.set(item.id,{...item});emit(item,'');return;}
      const changed=prev.status!==item.status||prev.phaseType!==item.phaseType||norm(prev.title)!==norm(item.title);
      cache.set(item.id,{...item});
      if(changed)emit(item,prev.status);
      else if(prime)emit(item,prev.status);
    });
    [...cache.keys()].forEach(id=>{if(!live.has(id)&&items.length)cache.delete(id);});
  }
  function schedule(opts){if(queued)return;queued=true;setTimeout(()=>scan(opts),20);}
  const observer=new MutationObserver(()=>schedule());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('pointerup',e=>{if(e.target.closest?.('.kanban-card'))setTimeout(()=>scan(),35);},true);
  document.addEventListener('click',e=>{if(e.target.closest?.('.kb-move,.kb-save,.kanban-phase-tab,#appSidebar [data-page="kanban"]'))setTimeout(()=>scan({prime:true}),40);},true);
  document.addEventListener('drop',()=>setTimeout(()=>scan(),35),true);
  window.addEventListener('hashchange',()=>{if(location.hash==='#attivita-commessa')setTimeout(()=>scan({prime:true}),80);});
  const timer=setInterval(()=>{if(!document.getElementById('kanbanPage')?.hidden)scan();},180);
  window.DABSTER_KANBAN_STATUS_SOURCE_V75={version:75,scan,stop:()=>{clearInterval(timer);observer.disconnect();}};
  setTimeout(()=>scan({prime:true}),300);
})();
