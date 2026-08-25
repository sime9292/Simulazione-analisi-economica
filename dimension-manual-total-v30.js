/* v48 - Totale opere standalone + selectable phases for economic analysis */
(function(){
  function install(attempt=0){
    if(typeof recalcDimensioning!=='function' || typeof dimRows==='undefined' || !dimRows){
      if(attempt<160)setTimeout(()=>install(attempt+1),60);
      return;
    }

    const PHASE_IDS=['preliminare','definitivo','esecutivo','dl'];

    function installSelectorStyles(){
      if(document.getElementById('dimPhaseSelectorStyles'))return;
      const style=document.createElement('style');
      style.id='dimPhaseSelectorStyles';
      style.textContent=`
        .dim-phase-name{display:flex!important;align-items:center!important;gap:7px!important}
        .dim-phase-include{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:18px;height:18px;cursor:pointer}
        .dim-phase-include input{width:13px;height:13px;margin:0;cursor:pointer;accent-color:#2b9bad}
      `;
      document.head.appendChild(style);
    }

    function ensurePhaseSelectors(){
      const rows=[...document.querySelectorAll('.dim-phase-row')].slice(0,4);
      rows.forEach((row,index)=>{
        const name=row.querySelector('.dim-phase-name');
        if(!name||name.querySelector('.dim-phase-include'))return;
        const label=document.createElement('label');
        label.className='dim-phase-include';
        label.title='Includi questa fase quando trasferisci la proposta economica';
        label.innerHTML=`<input class="dim-phase-include-check" type="checkbox" data-phase="${PHASE_IDS[index]}" checked><span aria-hidden="true"></span>`;
        name.prepend(label);
      });
      if(!Array.isArray(window.DABSTER_DIM_SELECTED_PHASES))window.DABSTER_DIM_SELECTED_PHASES=[];
    }

    function recalcFromRoundedTotal(){
      let mqTotal=0,mechTotal=0,elecTotal=0;
      [...dimRows.querySelectorAll('.dim-data')].forEach(row=>{
        const mq=parseItalianNumber(row.querySelector('.dim-mq')?.value);
        const mechRate=parseItalianNumber(row.querySelector('.dim-mech-rate')?.value);
        const elecRate=parseItalianNumber(row.querySelector('.dim-elec-rate')?.value);
        const mech=mq*mechRate,elec=mq*elecRate,rowTotal=mech+elec;
        mqTotal+=mq;mechTotal+=mech;elecTotal+=elec;
        row.querySelector('.dim-mech-total').textContent=formatItalianNumber(mech);
        row.querySelector('.dim-elec-total').textContent=formatItalianNumber(elec);
        row.querySelector('.dim-row-total').textContent=formatItalianNumber(rowTotal);
      });

      const calcTotal=mechTotal+elecTotal;
      setText('dimMqTotal',formatItalianNumber(mqTotal));
      setText('dimMechGrand',formatItalianNumber(mechTotal));
      setText('dimElecGrand',formatItalianNumber(elecTotal));
      setText('dimCalcGrand',formatItalianNumber(calcTotal));
      setText('dimCalcBox',formatItalianNumber(calcTotal));

      if(dimRounded&&!dimRoundedManual)dimRounded.value=formatItalianNumber(calcTotal);
      const rounded=dimRounded?parseItalianNumber(dimRounded.value):calcTotal;
      const hasDetailedSplit=calcTotal>0.005;
      const scale=hasDetailedSplit?rounded/calcTotal:0;
      const mechRounded=hasDetailedSplit?mechTotal*scale:0;
      const elecRounded=hasDetailedSplit?elecTotal*scale:0;
      const feePct=Number(dimFeePct?.value||7);
      if(dimFeePctLabel)dimFeePctLabel.textContent=Number(feePct).toLocaleString('it-IT',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';

      const ieFactor=Math.max(0,parseItalianNumber(dimIeFactor?.value)||1);
      if(dimIeFactor){
        dimIeFactor.disabled=!hasDetailedSplit;
        dimIeFactor.title=hasDetailedSplit?'Fattore applicato alla quota impianti elettrici':'Disponibile quando è presente una ripartizione IM / IE';
      }

      const shares=phasePctInputs.map(i=>Number(i.value||0));
      const shareTotal=shares.reduce((a,b)=>a+b,0);
      const check=document.getElementById('phaseTotalCheck');
      setText('phaseTotalPct',Number(shareTotal).toLocaleString('it-IT',{maximumFractionDigits:1})+'%');
      check?.classList.toggle('invalid',Math.abs(shareTotal-100)>0.01);

      const phaseResultEls=[...document.querySelectorAll('.phase-result-value')];
      const phaseEffEls=[...document.querySelectorAll('.phase-effective-value')];
      const phaseMechEls=[...document.querySelectorAll('.phase-mech-value')];
      const phaseElecEls=[...document.querySelectorAll('.phase-elec-value')];

      phaseValues=shares.map((share,index)=>{
        const effectivePct=feePct*share/100;
        if(phaseEffEls[index])phaseEffEls[index].textContent=Number(effectivePct).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';

        let phaseTotal=0;
        if(hasDetailedSplit){
          const phaseMechComp=mechRounded*effectivePct/100;
          const phaseElecComp=elecRounded*effectivePct/100*ieFactor;
          if(phaseMechEls[index])phaseMechEls[index].textContent=formatItalianNumber(phaseMechComp);
          if(phaseElecEls[index])phaseElecEls[index].textContent=formatItalianNumber(phaseElecComp);
          phaseTotal=phaseMechComp+phaseElecComp;
        }else{
          if(phaseMechEls[index])phaseMechEls[index].textContent='—';
          if(phaseElecEls[index])phaseElecEls[index].textContent='—';
          phaseTotal=rounded*effectivePct/100;
        }

        if(phaseResultEls[index])phaseResultEls[index].textContent=formatItalianNumber(phaseTotal);
        return phaseTotal;
      });

      window.DABSTER_DIM_PHASE_VALUES=phaseValues.slice();
      setText('dimProposalTotal',formatItalianNumber(phaseValues.reduce((a,b)=>a+b,0)));
      if(dimTransfer)dimTransfer.disabled=Math.abs(shareTotal-100)>0.01;
    }

    installSelectorStyles();
    ensurePhaseSelectors();
    recalcDimensioning=recalcFromRoundedTotal;

    dimFeePct?.addEventListener('input',recalcFromRoundedTotal);
    dimIeFactor?.addEventListener('input',recalcFromRoundedTotal);
    phasePctInputs.forEach(i=>i.addEventListener('input',recalcFromRoundedTotal));
    dimRounded?.addEventListener('input',()=>setTimeout(recalcFromRoundedTotal,0));

    dimTransfer?.addEventListener('click',()=>{
      ensurePhaseSelectors();
      const selected=[...document.querySelectorAll('.dim-phase-include-check:checked')].map(x=>x.dataset.phase).filter(Boolean);
      window.DABSTER_DIM_SELECTED_PHASES=selected;
      window.DABSTER_DIM_PHASE_VALUES=phaseValues.slice();
      window.dispatchEvent(new CustomEvent('dabster-dimension-transfer',{detail:{selected:selected.slice(),values:phaseValues.slice()}}));
      setTimeout(()=>window.dabsterRecalcEconomic?.(),110);
    });

    /* Demo controls must not leave transferred phase state behind. */
    document.addEventListener('click',e=>{
      if(e.target.closest('#clearDemoData')){
        window.DABSTER_DIM_SELECTED_PHASES=[];
        setTimeout(()=>window.dabsterEconomicPhaseController?.reconcile(),0);
      }
      if(e.target.closest('#prefillDemoData')){
        ensurePhaseSelectors();
        document.querySelectorAll('.dim-phase-include-check').forEach(input=>input.checked=true);
        window.DABSTER_DIM_SELECTED_PHASES=[];
        setTimeout(()=>window.dabsterEconomicPhaseController?.reconcile(),0);
      }
    },true);

    recalcFromRoundedTotal();
  }

  install();
})();
