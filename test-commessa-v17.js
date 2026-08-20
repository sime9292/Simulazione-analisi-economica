/* v17 automated end-to-end commessa test */
(function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const tests=[];
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;

  function report(name,ok,detail=''){
    tests.push({name,ok,detail});
    renderReport();
  }
  function renderReport(){
    let panel=document.getElementById('e2eTestPanel');
    if(!panel){
      panel=document.createElement('aside');panel.id='e2eTestPanel';panel.className='e2e-test-panel';
      document.body.appendChild(panel);
    }
    const passed=tests.filter(t=>t.ok).length;
    panel.innerHTML=`<div class="e2e-test-head"><strong>Test commessa</strong><span>${passed}/${tests.length} OK</span></div><div class="e2e-test-body">${tests.map(t=>`<div class="e2e-test-row ${t.ok?'ok':'ko'}"><b>${t.ok?'✓':'×'}</b><span>${t.name}${t.detail?`<small>${t.detail}</small>`:''}</span></div>`).join('')}</div>`;
  }
  function value(el,v,event='input'){
    if(!el)throw new Error('Campo non trovato');
    el.value=String(v);el.dispatchEvent(new Event(event,{bubbles:true}));
  }
  function click(el){if(!el)throw new Error('Pulsante non trovato');el.click();}
  function statusSelect(){
    return [...document.querySelectorAll('#tab-dati label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith('stato'))?.querySelector('select');
  }
  function phaseByType(type){return [...document.querySelectorAll('.phase-work-card')].find(c=>c.querySelector('.phase-type-select')?.value===type);}
  function tabPhase(type){
    const b=document.querySelector(`.kanban-phase-tab[data-phase="${type}"]`);if(b)b.click();return b;
  }
  function sidebar(page){const b=document.querySelector(`.sidebar-item[data-page="${page}"]`);if(b)b.click();}

  async function addActivity(phase,type,title,assignments){
    const typeSelect=phase.querySelector('.phase-type-select');
    value(typeSelect,type,'change');
    click(phase.querySelector('.add-activity'));
    await sleep(100);
    const activity=phase.querySelector('.activities .activity-card:last-child');
    if(!activity)throw new Error('Attività non creata');
    value(activity.querySelector('.activity-name'),title);
    await sleep(20);
    activity.querySelector('.assignment-rows').innerHTML='';
    for(const a of assignments){
      click(activity.querySelector('.add-assignment'));
      await sleep(15);
      const row=activity.querySelector('.assignment-rows .assignment-row:last-child');
      value(row.querySelector('.assignment-role'),a.role,'change');
      value(row.querySelector('.assignment-hours'),a.hours);
    }
    return activity;
  }

  async function run(){
    try{
      for(let i=0;i<180;i++){
        if(document.querySelectorAll('.phase-work-card').length>=4 && document.querySelector('.phase-type-select') && statusSelect()?.querySelector('option[value="Confermata"]'))break;
        await sleep(60);
      }
      report('Applicazione inizializzata',document.querySelectorAll('.phase-work-card').length>=4);

      sidebar('offer');
      const phases=[...document.querySelectorAll('.phase-work-card')].slice(0,4);
      if(phases.length<4)throw new Error('Mancano le 4 fasi base');
      phases.forEach(p=>p.querySelectorAll('.activity-delete').forEach(b=>b.click()));
      await sleep(80);

      const scenario=[
        {type:'preliminare',title:'Analisi documentale e sopralluoghi',proposal:'4.500,00',assign:[{role:'PM',hours:4},{role:'RS_IE',hours:12}]},
        {type:'definitivo',title:'Progettazione definitiva impianti',proposal:'8.500,00',assign:[{role:'RS_IE',hours:18},{role:'UT_IE_S',hours:36}]},
        {type:'esecutivo',title:'Progettazione esecutiva impianti',proposal:'12.000,00',assign:[{role:'RS_IE',hours:12},{role:'UT_IE_S',hours:48},{role:'UT_IM_S',hours:32}]},
        {type:'dl',title:'Direzione lavori impianti',proposal:'6.000,00',assign:[{role:'PM',hours:8},{role:'RS_IE',hours:24}]}
      ];
      const acts={};
      for(let i=0;i<scenario.length;i++){
        acts[scenario[i].type]=await addActivity(phases[i],scenario[i].type,scenario[i].title,scenario[i].assign);
      }
      report('4 attività inserite nelle fasi',document.querySelectorAll('.activity-card').length===4,'1 attività per fase');

      const managedRows=[...document.querySelectorAll('#tab-analisi .economic-row[data-phase-managed="1"]')].slice(0,4);
      scenario.forEach((s,i)=>{if(managedRows[i])value(managedRows[i].querySelector('.ae-proposal'),s.proposal);});
      await sleep(250);

      const hours=[...document.querySelectorAll('.assignment-hours')].reduce((s,x)=>s+Number(x.value||0),0);
      report('Ore complessive coerenti',Math.abs(hours-194)<0.01,`${hours} h previste`);
      const expectedInternal=6177.884615384615;
      const expectedGeneral=expectedInternal*.35;
      const actualCosts=num(document.getElementById('aeCosts')?.textContent);
      const actualGeneral=num(document.getElementById('aeGeneralExpenses')?.textContent);
      report('Costo interno calcolato',Math.abs(actualCosts-expectedInternal)<2,`${actualCosts.toLocaleString('it-IT',{minimumFractionDigits:2})} €`);
      report('Spese generali 35% su ore interne',Math.abs(actualGeneral-expectedGeneral)<2,`${actualGeneral.toLocaleString('it-IT',{minimumFractionDigits:2})} €`);

      const st=statusSelect();
      value(st,'Confermata','change');
      await sleep(450);
      sidebar('kanban');
      await sleep(120);
      const counts=[...document.querySelectorAll('.kanban-phase-tab .count')].map(x=>Number(x.textContent||0));
      report('Conferma trasferisce le attività',counts.slice(0,4).every(x=>x===1) && counts[4]===0,`conteggi fasi: ${counts.join(' / ')}`);

      let allProgram=true;
      for(const s of scenario){
        tabPhase(s.type);await sleep(25);
        allProgram=allProgram && !!document.querySelector('.kanban-list[data-status="programmazione"] .kanban-card');
      }
      report('Le nuove attività entrano in Programmazione',allProgram);

      sidebar('offer');await sleep(40);
      const def=phaseByType('definitivo');
      const utIe=[...def.querySelectorAll('.assignment-row')].find(r=>r.querySelector('.assignment-role')?.value==='UT_IE_S');
      value(utIe.querySelector('.assignment-hours'),40);
      await sleep(350);
      sidebar('kanban');tabPhase('definitivo');await sleep(60);
      const defCard=document.querySelector('.kanban-list[data-status="programmazione"] .kanban-card');
      report('Modifica ore aggiorna la Programmazione',/58(?:[,.]0)?\s*ore/i.test(defCard?.textContent||''),defCard?.querySelector('.kanban-card-line strong')?.textContent||'card non trovata');

      tabPhase('preliminare');await sleep(30);
      const preCard=document.querySelector('.kanban-list[data-status="programmazione"] .kanban-card');
      click(preCard?.querySelector('.kb-move.next'));
      await sleep(60);
      sidebar('offer');await sleep(30);
      const pre=phaseByType('preliminare');
      const pm=[...pre.querySelectorAll('.assignment-row')].find(r=>r.querySelector('.assignment-role')?.value==='PM');
      value(pm.querySelector('.assignment-hours'),10);
      await sleep(350);
      sidebar('kanban');tabPhase('preliminare');await sleep(60);
      const preWork=document.querySelector('.kanban-list[data-status="lavorazione"] .kanban-card');
      report('Attività in lavorazione non viene sovrascritta',/16(?:[,.]0)?\s*ore/i.test(preWork?.textContent||''),'resta a 16 h dopo modifica offerta');

      sidebar('offer');await sleep(30);
      const dl=phaseByType('dl');
      click(dl.querySelector('.activity-delete'));
      await sleep(350);
      sidebar('kanban');tabPhase('dl');await sleep(60);
      report('Eliminazione rimuove solo la Programmazione',!document.querySelector('.kanban-list[data-status="programmazione"] .kanban-card'),'DL eliminata correttamente');

      tabPhase('definitivo');await sleep(30);
      const modalCard=document.querySelector('.kanban-list[data-status="programmazione"] .kanban-card');
      click(modalCard);await sleep(60);
      const works=document.querySelectorAll('.kb-modal .kb-work-entry');
      const userFields=document.querySelectorAll('.kb-modal .kb-user');
      report('Dettaglio card genera le lavorazioni',works.length===2 && userFields.length===2,`${works.length} lavorazioni, utenti assegnabili dopo`);
      document.querySelector('.kb-modal-close')?.click();

      const profit=num(document.getElementById('aeProfitPct')?.textContent);
      report('Indicatore utile economico valorizzato',Number.isFinite(profit) && profit>25,`${profit.toLocaleString('it-IT',{maximumFractionDigits:2})}%`);

    }catch(err){
      report('Test interrotto',false,err.message||String(err));
      console.error('E2E commessa test failed',err);
    }
  }

  window.addEventListener('load',()=>setTimeout(run,1500),{once:true});
})();
