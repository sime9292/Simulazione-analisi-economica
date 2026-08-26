/* v42 - Precompila aligned with Righe Offerta -> Importo Conferma -> Confermata workflow. */
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

  function amountDetailInput(label){
    return [...document.querySelectorAll('#tab-dati .accordion.amounts label.field')]
      .find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))
      ?.querySelector('input')||null;
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
        document.getElementById('dimTransfer') &&
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

  function setNonConfirmedStatus(preferred='completata'){
    const st=statusSelect();if(!st)return;
    const option=[...st.options].find(o=>norm(o.value||o.textContent)===preferred)
      || [...st.options].find(o=>norm(o.value||o.textContent)==='in lavorazione')
      || [...st.options].find(o=>norm(o.value||o.textContent)!=='confermata');
    if(option){st.value=option.value;fire(st,'change');}
  }

  function resetOfferBreakdown(){
    ['Consulenza','Progetti','Direzione lavori'].forEach(label=>{
      const input=amountDetailInput(label);
      if(input){input.value='0,00';fire(input,'input');fire(input,'change');}
    });
    window.DABSTER_OFFER_LINES?.sync?.();
  }

  function syncOfferBreakdownFromLines(){
    window.DABSTER_OFFER_LINES?.sync?.();
    const lines=Array.isArray(window.DABSTER_OFFER_LINES?.lines)?window.DABSTER_OFFER_LINES.lines:[];
    let consulting=0,projects=0,direction=0;
    lines.forEach(line=>{
      const value=Number(line.amount||0);
      if(line.phase==='dl')direction+=value;
      else if(line.phase==='consulenze')consulting+=value;
      else projects+=value;
    });
    const values={
      'Consulenza':consulting,
      'Progetti':projects,
      'Direzione lavori':direction
    };
    Object.entries(values).forEach(([label,value])=>{
      const input=amountDetailInput(label);
      if(input){input.value=money(value);fire(input,'input');fire(input,'change');}
    });
    window.DABSTER_OFFER_LINES?.sync?.();
    return {consulting,projects,direction,total:consulting+projects+direction};
  }

  async function purgeGeneratedProgramming(){
    const st=statusSelect();
    if(!st)return;
    const confirmed=[...st.options].find(o=>norm(o.value||o.textContent)==='confermata');
    if(!confirmed)return;

    const original=st.value;
    const activityNames=[...document.querySelectorAll('#phaseWorkloadSection .activity-name')].map(input=>({input,value:input.value}));
    activityNames.forEach(x=>{x.input.value='';});

    /* Legacy cleanup attempt: it may be rejected by the new confirmation validation,
       so the real reset is completed by clearData + prototype unlock listeners. */
    st.value=confirmed.value;
    fire(st,'change');
    await sleep(120);

    st.value=original;
    fire(st,'change');
    await sleep(100);

    activityNames.forEach(x=>{x.input.value=x.value;});
  }

  async function clearData(silent=false){
    if(busy&&!silent)return;
    if(!silent)setBusy(true,'Svuotamento…');
    try{
      if(!await waitReady())throw new Error('Interfaccia non pronta');
      await purgeGeneratedProgramming();

      setNonConfirmedStatus('in lavorazione');
      await sleep(100);

      const cs=commessaSelect();
      if(cs?.selectedOptions?.[0]){
        const base='26_119 - CONSULENZA ANTINCENDIO GENERALI';
        cs.selectedOptions[0].textContent=base;
        cs.selectedOptions[0].value=base;
        fire(cs,'change');
      }

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
      [10,35,25,30].forEach((v,i)=>setValue(document.querySelectorAll('.phase-pct')[i],v));

      document.querySelectorAll('.phase-work-card').forEach(card=>{
        card.querySelectorAll('.activity-delete').forEach(btn=>btn.click());
        card.classList.add('collapsed');
      });
      await sleep(100);

      document.querySelectorAll('#tab-analisi .ae-proposal').forEach(input=>{
        if(!input.readOnly)setValue(input,'0,00');
      });
      setValue(document.getElementById('tradePct'),'0');

      document.querySelectorAll('#reimbursementRows .reimb-row').forEach(row=>{
        setValue(row.querySelector('.reimb-km'),'0');
        setValue(row.querySelector('.reimb-weekqty'),'0');
      });
      document.querySelectorAll('#supplierCostRows .supplier-delete').forEach(btn=>btn.click());

      await sleep(180);
      window.DABSTER_OFFER_LINES?.sync?.();
      resetOfferBreakdown();

      window.dabsterAnalysisSubtabs?.activate('dimensionamento');
      document.body.dataset.demoSeeded='0';
      if(!silent)setStatus('Dati svuotati · offerta riportata in lavorazione');
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

  async function prefill(){
    if(busy)return;
    setBusy(true,'Precompilazione…');
    try{
      if(!await waitReady())throw new Error('Interfaccia non pronta');
      await clearData(true);

      const cs=commessaSelect();
      if(cs?.selectedOptions?.[0]){
        const label='26_119 - PROGETTAZIONE IMPIANTI SEDE PRODUTTIVA';
        cs.selectedOptions[0].textContent=label;
        cs.selectedOptions[0].value=label;
        fire(cs,'change');
      }

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
      for(const item of scenario){
        const phase=phaseMap[item.type];
        if(phase)await addActivity(phase,item.type,item.title,item.assign);
      }

      await sleep(180);
      document.getElementById('dimTransfer')?.click();
      await sleep(450);
      window.dabsterRecalcEconomic?.();
      window.DABSTER_OFFER_LINES?.sync?.();
      await sleep(180);

      const breakdown=syncOfferBreakdownFromLines();
      await sleep(120);

      /* Precompila prepares a complete offer but deliberately does NOT confirm it.
         The user can now switch Stato -> Confermata and test Importo Conferma. */
      setNonConfirmedStatus('completata');
      await sleep(120);

      document.querySelectorAll('.accordion').forEach(section=>section.classList.remove('open'));
      document.querySelector('.dimensioning')?.classList.add('open');
      document.getElementById('offerLinesSection')?.classList.add('open');
      document.querySelectorAll('.phase-work-card').forEach(card=>card.classList.add('collapsed'));
      window.dabsterAnalysisSubtabs?.activate('dimensionamento');
      document.body.dataset.demoSeeded='1';
      setStatus(`Dati demo caricati · Righe Offerta ${money(breakdown.total)} € · stato Completata, pronto per conferma`);
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
      const st=statusSelect();
      const confirmed=st && norm(st.value)==='confermata';

      if(confirmed){
        fire(st,'change');
        await sleep(180);
        setStatus('Analisi salvata · attività commessa sincronizzate');
      }else{
        window.DABSTER_OFFER_LINES?.sync?.();
        setStatus('Analisi salvata · Righe Offerta aggiornate, in attesa di conferma');
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

    const planning=document.getElementById('phaseWorkloadSection');
    if(planning){
      const dirty=()=>{
        if(busy)return;
        const st=statusSelect();
        if(st && norm(st.value)==='confermata')setStatus('Modifiche attività da salvare');
      };
      planning.addEventListener('input',dirty,true);
      planning.addEventListener('change',dirty,true);
      planning.addEventListener('click',e=>{
        if(e.target.closest('.add-activity,.activity-delete,.assignment-delete,.add-assignment,.phase-delete,#addEconomicPhase'))setTimeout(dirty,30);
      },true);
    }
  }

  window.addEventListener('load',()=>setTimeout(install,350),{once:true});
})();