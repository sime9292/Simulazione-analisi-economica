/* v45 - Production cleanup: keep empty-draft editability, remove demo toolbar and seed actions. */
(function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const fire=(el,type='change')=>el?.dispatchEvent(new Event(type,{bubbles:true}));

  function statusSelect(){
    return [...document.querySelectorAll('#tab-dati label.field')]
      .find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith('stato'))
      ?.querySelector('select')||null;
  }

  function hasPlannedActivities(){
    return [...document.querySelectorAll('#phaseWorkCards .activity-name')]
      .some(input=>String(input.value||'').trim());
  }

  async function waitReady(){
    for(let i=0;i<220;i++){
      if(statusSelect() && document.getElementById('phaseWorkCards'))return true;
      await sleep(40);
    }
    return false;
  }

  function setDraftStatus(){
    const st=statusSelect();if(!st)return;
    const option=[...st.options].find(o=>norm(o.value||o.textContent)==='in lavorazione');
    if(option && norm(st.value)!=='in lavorazione'){
      st.value=option.value;
      fire(st,'change');
    }
  }

  async function ensureEmptyDraftEditable(){
    if(!await waitReady())return;
    if(hasPlannedActivities())return;
    setDraftStatus();
    await sleep(90);
    const st=statusSelect();
    if(st&&norm(st.value)==='in lavorazione')fire(st,'change');
    await sleep(40);
    window.dabsterEconomicPhaseController?.reconcile?.();
  }

  window.addEventListener('load',()=>setTimeout(ensureEmptyDraftEditable,300),{once:true});
})();
