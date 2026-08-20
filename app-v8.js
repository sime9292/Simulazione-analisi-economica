/* v8: no default activities, custom activity autocomplete, conditional profit status */
(function(){
  const core=document.createElement('script');
  core.src='app-v7.js?v=12';
  core.onload=()=>waitForWorkload();
  document.head.appendChild(core);

  const ACTIVITY_SUGGESTIONS=[
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

  function waitForWorkload(attempt=0){
    const ready=document.getElementById('phaseWorkloadSection') && document.querySelector('.phase-work-card');
    if(ready){patchWorkload();patchProfitStatus();return;}
    if(attempt<100)setTimeout(()=>waitForWorkload(attempt+1),60);
  }

  function patchWorkload(){
    const cards=document.getElementById('phaseWorkCards');
    if(!cards)return;

    function clearDefaultActivity(card){
      if(card.dataset.noDefaultActivity==='1')return;
      const activities=card.querySelector('.activities');
      if(activities)activities.innerHTML='';
      card.dataset.noDefaultActivity='1';
      const hours=card.querySelector('.phase-hours');if(hours)hours.textContent='0,00';
      const cost=card.querySelector('.phase-work-cost');if(cost)cost.textContent='0,00 €';
      const phaseId=card.dataset.phaseId;
      const phaseRow=document.querySelector(`.economic-row[data-phase-id="${phaseId}"]`);
      const costInput=phaseRow?.querySelector('.ae-cost');if(costInput)costInput.value='0,00';
    }

    function prepareCard(card){
      clearDefaultActivity(card);
      if(card.dataset.addActivityPatched==='1')return;
      card.dataset.addActivityPatched='1';
      const add=card.querySelector('.add-activity');
      add?.addEventListener('click',()=>{
        setTimeout(()=>{
          const activity=card.querySelector('.activities .activity-card:last-child');
          if(!activity)return;
          const rows=activity.querySelector('.assignment-rows');
          if(rows)rows.innerHTML='';
          enhanceActivity(activity);
          activity.querySelector('.activity-name')?.focus();
        },0);
      },true);
    }

    function normalizeText(value){
      return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    }

    function enhanceActivity(activity){
      if(!activity||activity.dataset.autocompleteReady==='1')return;
      activity.dataset.autocompleteReady='1';
      const input=activity.querySelector('.activity-name');
      if(!input)return;
      input.removeAttribute('list');
      input.setAttribute('autocomplete','off');
      input.placeholder='Scrivi o cerca attività…';
      const wrap=input.parentElement;
      wrap.classList.add('activity-autocomplete-wrap');
      const menu=document.createElement('div');
      menu.className='activity-suggest-menu';
      menu.hidden=true;
      wrap.appendChild(menu);

      function close(){menu.hidden=true;menu.innerHTML='';}
      function render(){
        const q=normalizeText(input.value);
        let matches=ACTIVITY_SUGGESTIONS.filter(item=>!q || normalizeText(item).includes(q));
        if(q)matches.sort((a,b)=>{
          const aa=normalizeText(a).startsWith(q)?0:1,bb=normalizeText(b).startsWith(q)?0:1;
          return aa-b || a.localeCompare(b,'it');
        });
        matches=matches.slice(0,7);
        if(!matches.length){close();return;}
        menu.innerHTML=matches.map(item=>`<button type="button" class="activity-suggestion">${escapeHtml(item)}</button>`).join('');
        menu.hidden=false;
        menu.querySelectorAll('.activity-suggestion').forEach((btn,index)=>{
          btn.addEventListener('pointerdown',ev=>{
            ev.preventDefault();
            input.value=matches[index];
            input.dispatchEvent(new Event('input',{bubbles:true}));
            close();
            input.focus();
          });
        });
      }
      input.addEventListener('focus',render);
      input.addEventListener('input',render);
      input.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
      input.addEventListener('blur',()=>setTimeout(close,130));
    }

    function escapeHtml(value){
      return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    cards.querySelectorAll('.phase-work-card').forEach(prepareCard);
    cards.querySelectorAll('.activity-card').forEach(enhanceActivity);

    const observer=new MutationObserver(mutations=>{
      for(const mutation of mutations){
        mutation.addedNodes.forEach(node=>{
          if(!(node instanceof HTMLElement))return;
          if(node.matches('.phase-work-card'))prepareCard(node);
          node.querySelectorAll?.('.phase-work-card').forEach(prepareCard);
          if(node.matches('.activity-card'))enhanceActivity(node);
          node.querySelectorAll?.('.activity-card').forEach(enhanceActivity);
        });
      }
    });
    observer.observe(cards,{childList:true,subtree:true});
  }

  function patchProfitStatus(){
    const value=document.getElementById('aeProfitPct');
    const box=value?.closest('.kpi.profit');
    if(!value||!box)return;
    function update(){
      const numeric=Number(String(value.textContent||'0').replace('%','').replace(/\./g,'').replace(',','.'))||0;
      box.classList.toggle('profit-good',numeric>=25);
      box.classList.toggle('profit-low',numeric<25);
    }
    update();
    new MutationObserver(update).observe(value,{childList:true,characterData:true,subtree:true});
  }
})();
