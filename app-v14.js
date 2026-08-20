/* v28 - revoke Kanban planning when offer leaves Confermata + optional explicit save mode */
(function(){
  const nativeAdd=EventTarget.prototype.addEventListener;
  const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  let wrappedStatusListener=false;

  EventTarget.prototype.addEventListener=function(type,listener,options){
    const source=typeof listener==='function'?String(listener):'';

    /* In explicit-save mode, editing the analysis does not continuously push changes
       to the commessa. The status change to Confermata still performs the first transfer;
       later updates are forced by the Salva Analisi button. */
    const isAutomaticPlanningSync=window.DABSTER_EXPLICIT_SAVE_MODE===true &&
      ['input','change','click'].includes(type) && source.includes('scheduleSync');
    if(isAutomaticPlanningSync)return;

    const isOfferStatusHandler=!wrappedStatusListener && type==='change' && this instanceof HTMLSelectElement && source.includes('offerConfirmed') && source.includes('syncKanbanFromOffer');

    if(isOfferStatusHandler){
      wrappedStatusListener=true;
      const select=this;
      let wasConfirmed=normalize(select.value)==='confermata';

      const wrapped=function(ev){
        const nowConfirmed=normalize(select.value)==='confermata';

        if(wasConfirmed && !nowConfirmed){
          const requestedValue=select.value;
          const activityNames=[...document.querySelectorAll('#phaseWorkloadSection .activity-name')].map(input=>({input,value:input.value}));
          const toast=document.getElementById('kbToast');

          /* Temporarily present an empty confirmed offer to the original sync.
             Its own protection deletes only cards still in Programmazione,
             while Lavorazione/Chiuse are preserved. */
          activityNames.forEach(x=>{x.input.value='';});
          if(toast)toast.id='kbToastPaused';
          select.value='Confermata';
          listener.call(select,ev);
          select.value=requestedValue;
          activityNames.forEach(x=>{x.input.value=x.value;});
          if(toast)toast.id='kbToast';
        }

        listener.call(select,ev);
        wasConfirmed=nowConfirmed;

        if(!nowConfirmed && document.getElementById('kbToast')){
          const toast=document.getElementById('kbToast');
          toast.textContent='Offerta non confermata · attività in programmazione rimosse';
          toast.classList.add('show');
          setTimeout(()=>toast.classList.remove('show'),2400);
        }
      };

      const result=nativeAdd.call(this,type,wrapped,options);
      /* Older versions keep their original behaviour and can restore immediately.
         Explicit-save mode keeps this interceptor alive long enough to suppress
         the planning auto-sync listeners registered just afterwards. */
      if(window.DABSTER_EXPLICIT_SAVE_MODE!==true)EventTarget.prototype.addEventListener=nativeAdd;
      return result;
    }

    return nativeAdd.call(this,type,listener,options);
  };

  const core=document.createElement('script');
  core.src='app-v13.js?v=28';
  core.onload=()=>{
    /* Safety restore once the application listeners have been installed. */
    setTimeout(()=>{EventTarget.prototype.addEventListener=nativeAdd;},window.DABSTER_EXPLICIT_SAVE_MODE===true?8000:2500);
  };
  document.head.appendChild(core);
})();
