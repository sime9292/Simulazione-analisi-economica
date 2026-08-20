/* v13: collapse all on load + full scrollable activity browser */
(function(){
  const core=document.createElement('script');
  core.src='app-v8.js?v=13';
  core.onload=()=>waitReady();
  document.head.appendChild(core);

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

  function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
  function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function waitReady(attempt=0){
    const ready=document.getElementById('phaseWorkloadSection') && document.querySelector('.phase-work-card');
    if(ready){setTimeout(initV13,100);return;}
    if(attempt<120)setTimeout(()=>waitReady(attempt+1),60);
  }

  function initV13(){
    /* Whole page starts compact. */
    document.querySelectorAll('.accordion').forEach(section=>section.classList.remove('open'));
    document.querySelectorAll('.phase-work-card').forEach(card=>card.classList.add('collapsed'));
    document.querySelectorAll('.activity-card').forEach(card=>card.classList.add('collapsed'));

    function prepareActivity(activity){
      if(!activity || activity.dataset.v13Browse==='1')return;
      activity.dataset.v13Browse='1';
      const input=activity.querySelector('.activity-name');
      const menu=activity.querySelector('.activity-suggest-menu');
      if(!input||!menu)return;

      input.placeholder='Scrivi oppure scorri le attività…';

      function renderFull(){
        const q=norm(input.value);
        let matches=ACTIVITIES.filter(item=>!q||norm(item).includes(q));
        if(q)matches.sort((a,b)=>{
          const ap=norm(a).startsWith(q)?0:1,bp=norm(b).startsWith(q)?0:1;
          return ap-bp||a.localeCompare(b,'it');
        });
        if(!matches.length){menu.hidden=true;menu.innerHTML='';return;}
        menu.innerHTML=matches.map(item=>`<button type="button" class="activity-suggestion">${esc(item)}</button>`).join('');
        menu.hidden=false;
        menu.scrollTop=0;
        menu.querySelectorAll('.activity-suggestion').forEach((btn,index)=>{
          btn.addEventListener('pointerdown',e=>{
            e.preventDefault();
            input.value=matches[index];
            input.dispatchEvent(new Event('input',{bubbles:true}));
            menu.hidden=true;
            input.focus();
          });
        });
      }

      /* v12 still handles free text. These handlers replace the short list with the full browsable one. */
      input.addEventListener('focus',()=>setTimeout(renderFull,0));
      input.addEventListener('click',()=>setTimeout(renderFull,0));
      input.addEventListener('input',()=>setTimeout(renderFull,0));
    }

    document.querySelectorAll('.activity-card').forEach(prepareActivity);

    const root=document.getElementById('phaseWorkCards');
    if(root){
      new MutationObserver(mutations=>{
        mutations.forEach(m=>m.addedNodes.forEach(node=>{
          if(!(node instanceof HTMLElement))return;
          /* New phase/activity opens because the user has just created it. */
          if(node.matches('.phase-work-card'))node.classList.remove('collapsed');
          if(node.matches('.activity-card'))prepareActivity(node);
          node.querySelectorAll?.('.activity-card').forEach(prepareActivity);
        }));
      }).observe(root,{childList:true,subtree:true});
    }
  }
})();
