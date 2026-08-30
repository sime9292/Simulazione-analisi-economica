/* v72 - Authoritative Kanban status source events from user actions (buttons + drag/drop). */
(function(){
  if(window.DABSTER_KANBAN_STATUS_SOURCE_V72)return;
  const FLOW=['programmazione','lavorazione','chiusa'];
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  let lastSig='',lastAt=0;

  function phase(){return document.querySelector('.kanban-phase-tab.active')?.dataset.phase||'';}
  function itemFromCard(card,status,previousStatus){
    if(!card)return null;
    return {
      id:String(card.dataset.id||''),
      phaseType:phase(),
      title:String(card.querySelector('.kanban-card-title')?.textContent||'').trim(),
      status:String(status||''),
      previousStatus:String(previousStatus||''),
      source:'kanban-source-v72'
    };
  }
  function emit(item){
    if(!item?.id||!item.phaseType||!item.title||item.status===item.previousStatus)return;
    const sig=[item.id,item.phaseType,norm(item.title),item.previousStatus,item.status].join('|'),now=Date.now();
    if(sig===lastSig&&now-lastAt<250)return;lastSig=sig;lastAt=now;
    window.dispatchEvent(new CustomEvent('dabster-kanban-status-change',{detail:item}));
    window.dispatchEvent(new CustomEvent('dabster-kanban-model-change',{detail:item}));
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('.kb-move');if(!btn)return;
    const card=btn.closest('.kanban-card'),list=card?.closest('.kanban-list[data-status]');if(!card||!list)return;
    const prev=String(list.dataset.status||''),i=FLOW.indexOf(prev);if(i<0)return;
    const next=btn.classList.contains('next')?FLOW[i+1]:btn.classList.contains('prev')?FLOW[i-1]:'';if(!next)return;
    const item=itemFromCard(card,next,prev);setTimeout(()=>emit(item),0);
  },true);

  document.addEventListener('drop',e=>{
    const list=e.target.closest?.('.kanban-list[data-status]');if(!list)return;
    const next=String(list.dataset.status||''),id=String(e.dataTransfer?.getData('text/plain')||'');if(!id||!next)return;
    const card=document.querySelector(`.kanban-card[data-id="${CSS.escape(id)}"]`),prev=String(card?.closest('.kanban-list[data-status]')?.dataset.status||'');
    const item=itemFromCard(card,next,prev);setTimeout(()=>emit(item),0);
  },true);

  window.DABSTER_KANBAN_STATUS_SOURCE_V72={version:72};
})();
