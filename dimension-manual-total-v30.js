/* v34 - Totale opere arrotondato usable as standalone base + IM/IE compensation follows fee slider */
(function(){
  function install(attempt=0){
    if(typeof recalcDimensioning!=='function' || typeof dimRows==='undefined' || !dimRows){
      if(attempt<160)setTimeout(()=>install(attempt+1),60);
      return;
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
          /* These columns are compensation amounts, not raw works shares.
             Therefore they must react immediately to the overall fee slider. */
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

      setText('dimProposalTotal',formatItalianNumber(phaseValues.reduce((a,b)=>a+b,0)));
      if(dimTransfer)dimTransfer.disabled=Math.abs(shareTotal-100)>0.01;
    }

    recalcDimensioning=recalcFromRoundedTotal;

    /* Existing listeners may retain older function references, so this final pass wins. */
    dimFeePct?.addEventListener('input',recalcFromRoundedTotal);
    dimIeFactor?.addEventListener('input',recalcFromRoundedTotal);
    phasePctInputs.forEach(i=>i.addEventListener('input',recalcFromRoundedTotal));
    dimRounded?.addEventListener('input',()=>setTimeout(recalcFromRoundedTotal,0));

    recalcFromRoundedTotal();
  }

  install();
})();
