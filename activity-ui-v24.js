/* v24 - activity field: closed by default, dropdown on demand, free typing with filtered suggestions */
(function(){
  const ACTIVITIES=[
    'Analisi documentale e sopralluoghi',
    'Progettazione preliminare impianti',
    'Progettazione definitiva impianti',
    'Progettazione esecutiva impianti',
    'Direzione lavori impianti',
    'Valutazione progetto antincendio',
    'Progetto prevenzione incendi',
    'Assistenza iter autorizzativo',
    'SCIA e assistenza al collaudo'
  ];

  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function closeAll(except=null){
    document.querySelectorAll('.activity-suggest-menu').forEach(menu=>{
      if(menu!==except){menu.hidden=true;menu.innerHTML='';}
    });
  }

  function render(input,all=false){
    const wrap=input.closest('.activity-autocomplete-wrap')||input.parentElement;
    const menu=wrap?.querySelector('.activity-suggest-menu');
    if(!menu)return;
    const q=norm(input.value);
    let items=ACTIVITIES.filter(x=>all||!q||norm(x).includes(q));
    if(q&&!all)items.sort((a,b)=>{
      const ap=norm(a).startsWith(q)?0:1,bp=norm(b).startsWith(q)?0:1;
      return ap-bp||a.localeCompare(b,'it');
    });
    if(!items.length){menu.hidden=true;menu.innerHTML='';return;}
    closeAll(menu);
    menu.innerHTML=items.map(x=>`<button type="button" class="activity-suggestion">${esc(x)}</button>`).join('');
    menu.hidden=false;
    menu.scrollTop=0;
    menu.querySelectorAll('.activity-suggestion').forEach((btn,i)=>{
      btn.addEventListener('pointerdown',e=>{
        e.preventDefault();e.stopPropagation();
        input.value=items[i];
        input.dispatchEvent(new Event('input',{bubbles:true}));
        menu.hidden=true;menu.innerHTML='';
        input.focus();
      });
    });
  }

  function prepare(activity){
    if(!activity||activity.dataset.v24ActivityUi==='1')return;
    const input=activity.querySelector('.activity-name');
    if(!input)return;
    const wrap=input.closest('.activity-autocomplete-wrap')||input.parentElement;
    const menu=wrap?.querySelector('.activity-suggest-menu');
    if(!wrap||!menu)return;
    activity.dataset.v24ActivityUi='1';
    input.placeholder='Scrivi o scegli attività…';
    menu.hidden=true;menu.innerHTML='';

    if(!wrap.querySelector('.activity-dropdown-toggle')){
      const btn=document.createElement('button');
      btn.type='button';btn.className='activity-dropdown-toggle';btn.title='Mostra attività disponibili';btn.setAttribute('aria-label','Mostra attività disponibili');btn.textContent='⌄';
      wrap.appendChild(btn);
      btn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();});
      btn.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();
        if(menu.hidden)render(input,true);else{menu.hidden=true;menu.innerHTML='';}
      });
    }

    /* Typing is always free; suggestions appear only as filtered results. */
    input.addEventListener('input',()=>setTimeout(()=>{
      if(norm(input.value))render(input,false);else{menu.hidden=true;menu.innerHTML='';}
    },8));
    input.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.hidden=true;menu.innerHTML='';}});
    input.addEventListener('blur',()=>setTimeout(()=>{menu.hidden=true;menu.innerHTML='';},160));
  }

  /* Stop the legacy handlers from opening the full list merely on focus/click. */
  document.addEventListener('focus',e=>{
    if(e.target?.matches?.('.activity-name')){
      e.stopPropagation();
      const menu=e.target.closest('.activity-autocomplete-wrap')?.querySelector('.activity-suggest-menu');
      if(menu){menu.hidden=true;menu.innerHTML='';}
    }
  },true);
  document.addEventListener('click',e=>{
    if(e.target?.matches?.('.activity-name')){
      e.stopPropagation();
      setTimeout(()=>{
        const menu=e.target.closest('.activity-autocomplete-wrap')?.querySelector('.activity-suggest-menu');
        if(menu){menu.hidden=true;menu.innerHTML='';}
      },10);
    }else if(!e.target?.closest?.('.activity-autocomplete-wrap'))closeAll();
  },true);

  function install(attempt=0){
    const root=document.getElementById('phaseWorkCards');
    if(!root){if(attempt<180)setTimeout(()=>install(attempt+1),60);return;}
    root.querySelectorAll('.activity-card').forEach(prepare);
    new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(node=>{
      if(!(node instanceof HTMLElement))return;
      if(node.matches('.activity-card'))setTimeout(()=>prepare(node),20);
      node.querySelectorAll?.('.activity-card').forEach(x=>setTimeout(()=>prepare(x),20));
    }))).observe(root,{childList:true,subtree:true});
    setTimeout(()=>closeAll(),500);
    setTimeout(()=>closeAll(),1600);
  }
  install();
})();
