/* Activity picker - closed by default, free typing, floating dropdown outside cards */
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
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  let openMenu=null;
  let openInput=null;

  function close(menu){
    if(!menu)return;
    menu.hidden=true;
    menu.innerHTML='';
    menu.style.removeProperty('left');
    menu.style.removeProperty('top');
    menu.style.removeProperty('width');
    if(openMenu===menu){openMenu=null;openInput=null;}
  }

  function closeAll(except=null){
    document.querySelectorAll('.activity-suggest-menu').forEach(menu=>{if(menu!==except)close(menu);});
  }

  function positionMenu(input,menu){
    if(!input?.isConnected||!menu)return;
    const r=input.getBoundingClientRect();
    const gap=4;
    const viewportGap=8;
    const maxHeight=Math.min(300,Math.max(150,window.innerHeight-40));
    const below=window.innerHeight-r.bottom-gap-viewportGap;
    const above=r.top-gap-viewportGap;
    const useAbove=below<170&&above>below;
    const available=Math.max(120,useAbove?above:below);
    const height=Math.min(maxHeight,available);

    menu.style.position='fixed';
    menu.style.zIndex='10000';
    menu.style.left=Math.max(viewportGap,Math.min(r.left,window.innerWidth-r.width-viewportGap))+'px';
    menu.style.width=Math.max(260,r.width)+'px';
    menu.style.maxHeight=height+'px';
    menu.style.overflowY='auto';
    menu.style.overflowX='hidden';
    menu.style.margin='0';
    menu.style.right='auto';
    menu.style.bottom='auto';
    menu.style.top=useAbove?Math.max(viewportGap,r.top-gap-height)+'px':Math.min(window.innerHeight-height-viewportGap,r.bottom+gap)+'px';
  }

  function render(input,all=false){
    const activity=input.closest('.activity-card');
    const menu=activity?.querySelector('.activity-suggest-menu') || (openInput===input?openMenu:null);
    if(!menu)return;

    const q=norm(input.value);
    let items=ACTIVITIES.filter(x=>all||!q||norm(x).includes(q));
    if(q&&!all)items.sort((a,b)=>{
      const ap=norm(a).startsWith(q)?0:1,bp=norm(b).startsWith(q)?0:1;
      return ap-bp||a.localeCompare(b,'it');
    });
    if(!items.length){close(menu);return;}

    closeAll(menu);
    if(menu.parentElement!==document.body)document.body.appendChild(menu);
    openMenu=menu;openInput=input;
    menu.innerHTML=items.map(x=>`<button type="button" class="activity-suggestion">${esc(x)}</button>`).join('');
    menu.hidden=false;
    menu.scrollTop=0;
    positionMenu(input,menu);

    menu.querySelectorAll('.activity-suggestion').forEach((btn,i)=>{
      btn.addEventListener('pointerdown',e=>{
        e.preventDefault();e.stopPropagation();
        input.value=items[i];
        input.dispatchEvent(new Event('input',{bubbles:true}));
        close(menu);
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
      btn.type='button';
      btn.className='activity-dropdown-toggle';
      btn.title='Mostra attività disponibili';
      btn.setAttribute('aria-label','Mostra attività disponibili');
      btn.textContent='⌄';
      wrap.appendChild(btn);
      btn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();});
      btn.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();
        if(menu.hidden||openMenu!==menu)render(input,true);else close(menu);
      });
    }

    /* Free typing: only matching suggestions appear. */
    input.addEventListener('input',()=>setTimeout(()=>{
      if(norm(input.value))render(input,false);else close(menu);
    },8));
    input.addEventListener('keydown',e=>{if(e.key==='Escape')close(menu);});
    input.addEventListener('blur',()=>setTimeout(()=>{if(!menu.matches(':hover'))close(menu);},180));
  }

  /* Legacy focus/click handlers must not open the whole catalog automatically. */
  document.addEventListener('focus',e=>{
    if(e.target?.matches?.('.activity-name')){
      e.stopPropagation();
      if(openInput!==e.target)closeAll();
    }
  },true);

  document.addEventListener('click',e=>{
    if(e.target?.matches?.('.activity-name')){
      e.stopPropagation();
    }else if(!e.target?.closest?.('.activity-dropdown-toggle')&&!e.target?.closest?.('.activity-suggest-menu')){
      closeAll();
    }
  },true);

  /* Floating menu follows the field while the page moves. */
  window.addEventListener('resize',()=>{if(openMenu&&openInput)positionMenu(openInput,openMenu);});
  window.addEventListener('scroll',()=>{if(openMenu&&openInput)positionMenu(openInput,openMenu);},true);

  function install(attempt=0){
    const root=document.getElementById('phaseWorkCards');
    if(!root){if(attempt<180)setTimeout(()=>install(attempt+1),60);return;}
    root.querySelectorAll('.activity-card').forEach(prepare);
    new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(node=>{
      if(!(node instanceof HTMLElement))return;
      if(node.matches('.activity-card'))setTimeout(()=>prepare(node),20);
      node.querySelectorAll?.('.activity-card').forEach(x=>setTimeout(()=>prepare(x),20));
    }))).observe(root,{childList:true,subtree:true});
  }
  install();
})();
