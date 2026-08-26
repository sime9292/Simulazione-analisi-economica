/* v43 - Precompila aligned with: In lavorazione -> Analisi Offerta -> Completata -> Inviata -> Confermata -> Righe Offerta. */
(function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const fire=(el,type='input')=>el?.dispatchEvent(new Event(type,{bubbles:true}));
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  let busy=false;

  function setValue(el,value,type='input'){
    if(!el)return;
    el.value=String(value);
    fire(el,type);
  }

  function statusSelect(){
    return [...document.querySelectorAll('#tab-dati label.field')]
      .find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith('stato'))
      ?.querySelector('select')||null;
  }

  function commessaSelect(){
    return [...document.querySelectorAll('#tab-dati label.field')]
      .find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith('commessa'))
      ?.querySelector('select')||null;
  }

  function offerAmountInput(label){
    return [...document.querySelectorAll('#tab-dati .accordion.amounts label.field')]
      .find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))
      ?.querySelector('input')||null;
  }

  function proposalInputForPhase(phaseId){
    return document.querySelector(`#tab-analisi .economic-table .phase-row[data-economic-phase="${phaseId}"] .ae-proposal`)||null;
  }

  function setStatus(text){
    const el=document.querySelector('.analysis-demo-status');
    if(el)el.textContent=text;
  }

  function setBusy(on,text=''){
    busy=on;
    document.querySelectorAll('.analysis-demo-btn').forEach(b=>b.disabled=on);
    const status=document.querySelector('.analysis-demo-status');
    if(status){status.classList.toggle('busy',on);if(text)status.textContent=text;}
  }

  async function waitReady(){
    for(let i=0;i<260;i++){
      const ready=document.getElementById('analysisSubtabs') &&
        document.querySelectorAll('.phase-work-card').length>=7 &&
        document.querySelector('.phase-type-select') &&
        document.querySelectorAll('#dimRows .dim-data').length>=3 &&
        document.getElementById('offerLinesSection') &&
        document.getElementById('confirmationAmountsSection') &&
        window.DABSTER_OFFER_LINES;
      if(ready)return true;
      await sleep(50);
    }
    return false;
  }

  async function ensureThreeDimensionRows(){
    const root=document.getElementById('dimRows');
    if(!root)return [];
    while(root.querySelectorAll('.dim-data').length<3){
      document.getElementById('dimAdd')?.click();
      await sleep(30);
    }
    const rows=[...root.querySelectorAll('.dim-data')];
    rows.slice(3).forEach(row=>row.querySelector('.dim-delete')?.click());
    await sleep(40);
    return [...root.querySelectorAll('.dim-data')].slice(0,3);
  }

  function setWorkflowStatus(preferred='in lavorazione'){
    const st=statusSelect();if(!st)return;
    const option=[...st.options].find(o=>norm(o.value||o.textContent)===preferred)
      || [...st.options].find(o=>norm(o.value||o.textContent)==='in lavorazione')
      || st.options[0];
    if(option){st.value=option.value;fire(st,'change');}
  }

  function resetOfferAmounts(){
    ['Importo stimato','Importo opere','Consulenza','Progetti','Direzione lavori'].forEach(label=>{
      const input=offerAmountInput(label);
      if(input){input.value='0,00';fire(input,'input');fire(input,'change');}
    });
    const total=document.getElementById('totaleOfferta');if(total)total.value='0,00';
  }

  async function clearData(silent=false){
    if(busy&&!silent)return;
    if(!silent)setBusy(true,'Svuotamento…');
    try{
      if(!await waitReady())throw new Error('Interfaccia non pronta');

      setWorkflowStatus('in lavorazione');
      await sleep(100);
      window.DABSTER_OFFER_LINES?.resetPostConfirmation?.();

      const cs=commessaSelect();
      if(cs?.selectedOptions?.[0]){
        const base='26_119 - CONSULENZA ANTINCENDIO GENERALI';
        cs.selectedOptions[0].textContent=base;
        cs.selectedOptions[0].value=base;
        fire(cs,'change');
      }

      resetOfferAmounts();

      const rows=await ensureThreeDimensionRows();
      rows.forEach(row=>{
        setValue(row.querySelector('.dim-desc'),'');
        setValue(row.querySelector('.dim-mq'),'0');
        setValue(row.querySelector('.dim-mech-rate'),'0');
        setValue(row.querySelector('.dim-elec-rate'),'0');
      });
      setValue(document.getElementById('dimRounded'),'0');
      fire(document.getElementById('dimRounded'),'blur');
      setValue(document.getElementById('dimFeePct'),'7');
      setValue(document.getElementById('dimIeFactor'),'1');
      fire(document.getElementById('dimIeFactor'),'blur');

      document.querySelectorAll('.phase-work-card').forEach(card=>{
        card.querySelectorAll('.activity-delete').forEach(btn=>btn.click());
        card.classList.add('collapsed');
      });
      await sleep(140);

      document.querySelectorAll('#tab-analisi .ae-proposal').forEach(input=>{
        if(!input.readOnly)setValue(input,'0,00');
      });
      setValue(document.getElementById('tradePct'),'0');

      document.querySelectorAll('#reimbursementRows .reimb-row').forEach(row=>{
        setValue(row.querySelector('.reimb-km'),'0');
        setValue(row.querySelector('.reimb-weekqty'),'0');
        const phase=row.querySelector('.cost-phase-select');if(phase)setValue(phase,'','change');
      });
      document.querySelectorAll('#supplierCostRows .supplier-delete').forEach(btn=>btn.click());

      window.DABSTER_DIM_SELECTED_PHASES=[];
      window.DABSTER_DIM_PHASE_VALUES=[];
      window.dabsterEconomicPhaseController?.reconcile?.();
      window.dabsterRecalcEconomic?.();
      window.dabsterAnalysisSubtabs?.activate('dimensionamento');
      document.body.dataset.demoSeeded='0';
      if(!silent)setStatus('Dati svuotati · offerta in lavorazione');
    }catch(err){
      if(!silent)setStatus('Errore: '+(err.message||err));
    }finally{
      if(!silent)setBusy(false);
    }
  }

  async function addActivity(phase,type,title,assignments){
    setValue(phase.querySelector('.phase-type-select'),type,'change');
    phase.classList.remove('collapsed');
    phase.querySelector('.add-activity')?.click();
    await sleep(100);
    const activity=phase.querySelector('.activities .activity-card:last-child');
    if(!activity)return;

    const activityField=activity.querySelector('.activity-name');
    setValue(activityField,title,'change');
    await sleep(20);

    const rows=activity.querySelector('.assignment-rows');
    if(rows)rows.innerHTML='';
    for(const a of assignments){
      activity.querySelector('.add-assignment')?.click();
      await sleep(18);
      const row=activity.querySelector('.assignment-rows .assignment-row:last-child');
      setValue(row?.querySelector('.assignment-role'),a.role,'change');
      setValue(row?.querySelector('.assignment-hours'),a.hours);
    }
    activity.classList.add('collapsed');
    phase.classList.add('collapsed');
  }

  async function setDemoAnalysisProposals(){
    const proposals={preliminare:3360,definitivo:11760,esecutivo:8400,dl:10080};
    for(let attempt=0;attempt<40;attempt++){
      const ready=Object.keys(proposals).every(id=>proposalInputForPhase(id));
      if(ready)break;
      window.dabsterEconomicPhaseController?.reconcile?.();
      await sleep(50);
    }
    Object.entries(proposals).forEach(([id,value])=>{
      const input=proposalInputForPhase(id);
      if(input){input.value=money(value);input.dataset.demoProposal='1';fire(input,'input');fire(input,'change');}
    });
    setValue(document.getElementById('tradePct'),'0');
    window.dabsterRecalcEconomic?.();
    await sleep(120);
    window.dabsterRecalcEconomic?.();
  }

  async function prefill(){
    if(busy)return;
    setBusy(true,'Precompilazione…');
    try{
      if(!await waitReady())throw new Error('Interfaccia non pronta');
      await clearData(true);
      setWorkflowStatus('in lavorazione');

      const cs=commessaSelect();
      if(cs?.selectedOptions?.[0]){
        const label='26_119 - PROGETTAZIONE IMPIANTI SEDE PRODUTTIVA';
        cs.selectedOptions[0].textContent=label;
        cs.selectedOptions[0].value=label;
        fire(cs,'change');
      }

      /* Dimensionamento: riferimento tecnico indipendente. */
      const rows=await ensureThreeDimensionRows();
      const demo=[
        {desc:'Uffici e servizi',mq:650,mech:210,elec:160},
        {desc:'Area produttiva',mq:550,mech:190,elec:135},
        {desc:'Locali tecnici',mq:90,mech:380,elec:280}
      ];
      rows.forEach((row,i)=>{
        const d=demo[i];
        setValue(row.querySelector('.dim-desc'),d.desc);
        setValue(row.querySelector('.dim-mq'),d.mq);
        setValue(row.querySelector('.dim-mech-rate'),d.mech);
        setValue(row.querySelector('.dim-elec-rate'),d.elec);
      });
      setValue(document.getElementById('dimRounded'),'480000');
      fire(document.getElementById('dimRounded'),'blur');
      setValue(document.getElementById('dimFeePct'),'7');
      setValue(document.getElementById('dimIeFactor'),'1');
      fire(document.getElementById('dimIeFactor'),'blur');
      window.DABSTER_DIM_SELECTED_PHASES=[];
      window.DABSTER_DIM_PHASE_VALUES=[];

      /* Analisi Offerta: costruita autonomamente da attività, figure, ore e importi decisi dall'utente. */
      const phaseMap={};
      document.querySelectorAll('.phase-work-card').forEach(card=>{
        const id=card.querySelector('.phase-type-select')?.value||card.dataset.planningPhase||'';
        if(id&&!phaseMap[id])phaseMap[id]=card;
      });
      const scenario=[
        {type:'preliminare',title:'Progetto Preliminare IE',assign:[{role:'RS_IE',hours:24},{role:'UT_IE_S',hours:24}]},
        {type:'definitivo',title:'Progetto IM',assign:[{role:'RS_IM',hours:40},{role:'UT_IM_S',hours:75}]},
        {type:'esecutivo',title:'Calcoli Illuminotecnici',assign:[{role:'RS_IE',hours:28},{role:'UT_IE_S',hours:100}]},
        {type:'dl',title:'Direzione Lavori Generica IM',assign:[{role:'PM',hours:20},{role:'RS_IM',hours:40}]}
      ];
      for(const item of scenario){const phase=phaseMap[item.type];if(phase)await addActivity(phase,item.type,item.title,item.assign);}

      await sleep(260);
      window.dabsterEconomicPhaseController?.reconcile?.();
      await setDemoAnalysisProposals();

      /* Importo Offerta is deliberately left at zero: in the real workflow the user enters
         the commercial amount in Dati Offerta after deciding it in the analysis. */
      resetOfferAmounts();
      setWorkflowStatus('in lavorazione');

      document.querySelectorAll('.accordion').forEach(section=>section.classList.remove('open'));
      document.querySelector('.analysis')?.classList.add('open');
      document.querySelectorAll('.phase-work-card').forEach(card=>card.classList.add('collapsed'));
      window.dabsterAnalysisSubtabs?.activate('impianti');
      document.body.dataset.demoSeeded='1';
      setStatus('Analisi demo caricata · proposta 33.600,00 € · stato In lavorazione · inserisci Importo Offerta nei Dati Offerta');
    }catch(err){
      setStatus('Errore: '+(err.message||err));
    }finally{
      setBusy(false);
    }
  }

  async function saveAnalysis(){
    if(busy)return;
    setBusy(true,'Salvataggio…');
    try{
      if(!await waitReady())throw new Error('Interfaccia non pronta');
      const st=statusSelect(),state=norm(st?.value);
      if(state==='in lavorazione'){
        window.dabsterRecalcEconomic?.();
        setStatus('Analisi salvata · puoi definire Importo Offerta e passare a Completata');
      }else if(state==='confermata'){
        window.DABSTER_OFFER_LINES?.sync?.();
        setStatus(window.DABSTER_OFFER_LINES?.readyForInvoicing?'Offerta confermata · righe quadrate':'Offerta confermata · completa Importo Conferma e Righe Offerta');
      }else{
        setStatus('Analisi congelata nello stato '+(st?.selectedOptions?.[0]?.textContent||st?.value||''));
      }
    }catch(err){
      setStatus('Errore: '+(err.message||err));
    }finally{
      setBusy(false);
    }
  }

  async function install(){
    if(!await waitReady())return;
    const tab=document.getElementById('tab-analisi');
    const nav=document.getElementById('analysisSubtabs');
    if(!tab||!nav||document.getElementById('analysisDemoToolbar'))return;
    const bar=document.createElement('div');
    bar.id='analysisDemoToolbar';
    bar.className='analysis-demo-toolbar';
    bar.innerHTML=`<span class="analysis-demo-status">Pagina pronta · nessun dato demo caricato automaticamente</span><button type="button" class="analysis-demo-btn prefill" id="prefillDemoData">Precompila dati</button><button type="button" class="analysis-demo-btn clear" id="clearDemoData">Svuota</button><button type="button" class="analysis-demo-btn save" id="saveAnalysisData">Salva Analisi</button>`;
    tab.insertBefore(bar,nav);
    document.getElementById('prefillDemoData').addEventListener('click',prefill);
    document.getElementById('clearDemoData').addEventListener('click',()=>clearData(false));
    document.getElementById('saveAnalysisData').addEventListener('click',saveAnalysis);
  }

  window.addEventListener('load',()=>setTimeout(install,350),{once:true});
})();