/* v23 - revoke Kanban planning when offer leaves Confermata */
(function(){
  const nativeAdd=EventTarget.prototype.addEventListener;
  const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  let wrappedStatusListener=false;

  EventTarget.prototype.addEventListener=function(type,listener,options){
    const source=typeof listener==='function'?String(listener):'';
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
      EventTarget.prototype.addEventListener=nativeAdd;
      return result;
    }

    return nativeAdd.call(this,type,listener,options);
  };

  const core=document.createElement('script');
  core.src='app-v13.js?v=23';
  core.onload=()=>{
    /* Safety restore in case the status listener was not discovered. */
    setTimeout(()=>{EventTarget.prototype.addEventListener=nativeAdd;},2500);
  };
  document.head.appendChild(core);
})();
