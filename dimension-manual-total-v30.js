/* v51 - Dimensionamento Opere is an independent technical reference; phase split remains visible but never transfers to Analisi Economica. */
(function(){
  function install(attempt=0){
    if(typeof recalcDimensioning!=='function' || typeof dimRows==='undefined' || !dimRows){
      if(attempt<160)setTimeout(()=>install(attempt+1),60);
      return;
    }

    function installReferenceStyles(){
      if(document.getElementById('dimIndependentReferenceStyles'))return;
      const style=document.createElement('style');
      style.id='dimIndependentReferenceStyles';
      style.textContent=`
        #analysisSubtabDimensionamento .dim-transfer-wrap{display:none!important}
        #analysisSubtabDimensionamento .dim-independent-note{margin:8px 0 2px;padding:7px 9px;border:1px solid #dce4e7;border-radius:6px;background:#f7f9fa;color:#65747c;font-size:8.7px;line-height:1.35}
        #analysisSubtabDimensionamento .dim-independent-note strong{color:#41555f}
      `;
      document.head.appendChild(style);
    }

    function installReferenceNote(){
      if(document.querySelector('.dim-independent-note'))return;
      const feeLine=document.querySelector('.dim-fee-line');
      if(!feeLine)return;
      const note=document.createElement('div');
      note.className='dim-independent-note';
      note.innerHTML='<strong>Riferimento tecnico indipendente.</strong> La ripartizione del compenso per fase è solo indicativa e non trasferisce importi nell’Analisi Economica.';
      feeLine.insertAdjacentElement('afterend',note);
    }

    function simplifyLegacyPhaseTable(){
      const head=document.querySelector('.dim-phase-head');
      if(!head)return;
      const headCells=[...head.children];
      let effectiveIndex=headCells.findIndex(cell=>String(cell.textContent||'').toLowerCase().includes('effettiva'));
      if(effectiveIndex<0){
        const sample=document.querySelector('.dim-phase-row .phase-effective-value');
        if(sample)effectiveIndex=[...sample.closest('.dim-phase-row').children].indexOf(sample.closest('div'));
      }
      if(effectiveIndex>=0){
        head.children[effectiveIndex]?.remove();
        document.querySelectorAll('.dim-phase-row').forEach(row=>row.children[effectiveIndex]?.remove());
      }
      const labels=[...head.children];
      if(labels[1])labels[1].textContent='RIPARTIZIONE';
      if(labels[2])labels[2].textContent='QUOTA IM';
      if(labels[3])labels[3].textContent='QUOTA IE';
      if(labels[4])labels[4].textContent='COMPENSO FASE';
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

      const parsedIeFactor=parseItalianNumber(dimIeFactor?.value);
      const ieFactor=Math.max(0,Number.isFinite(parsedIeFactor)?parsedIeFactor:1);
      if(dimIeFactor){
        dimIeFactor.disabled=!hasDetailedSplit;
        dimIeFactor.title=hasDetailedSplit?'Fattore applicato alla quota impianti elettrici':'Disponibile quando è presente una ripartizione IM / IE';
      }

      /* Phase calculation is reference-only. Values are deliberately NOT exported to the economic analysis. */
      const shares=phasePctInputs.map(i=>Number(i.value||0));
      const phaseResultEls=[...document.querySelectorAll('.phase-result-value')];
      const phaseMechEls=[...document.querySelectorAll('.phase-mech-value')];
      const phaseElecEls=[...document.querySelectorAll('.phase-elec-value')];
      phaseValues=shares.map((share,index)=>{
        const effectivePct=feePct*share/100;
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

      setText('dimProposalTotal',formatItalianNumber(phaseValues.reduce((a,b)=>a+b,0)));
      window.DABSTER_DIM_SELECTED_PHASES=[];
      window.DABSTER_DIM_PHASE_VALUES=[];
    }

    installReferenceStyles();
    simplifyLegacyPhaseTable();
    installReferenceNote();
    window.DABSTER_DIM_SELECTED_PHASES=[];
    window.DABSTER_DIM_PHASE_VALUES=[];

    if(dimTransfer){
      dimTransfer.disabled=true;
      dimTransfer.hidden=true;
      dimTransfer.style.setProperty('display','none','important');
    }

    recalcDimensioning=recalcFromRoundedTotal;
    dimFeePct?.addEventListener('input',recalcFromRoundedTotal);
    dimIeFactor?.addEventListener('input',recalcFromRoundedTotal);
    phasePctInputs.forEach(i=>i.addEventListener('input',recalcFromRoundedTotal));
    dimRounded?.addEventListener('input',()=>setTimeout(recalcFromRoundedTotal,0));

    document.addEventListener('click',e=>{
      if(e.target.closest('#clearDemoData,#prefillDemoData')){
        window.DABSTER_DIM_SELECTED_PHASES=[];
        window.DABSTER_DIM_PHASE_VALUES=[];
        setTimeout(()=>window.dabsterEconomicPhaseController?.reconcile(),0);
      }
    },true);

    recalcFromRoundedTotal();
  }

  install();
})();