/* v19 stable interactive demo: seed once, then leave UI entirely to the user */
(function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const fire=(el,type='input')=>el?.dispatchEvent(new Event(type,{bubbles:true}));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

  async function waitReady(){
    for(let i=0;i<220;i++){
      const ready=document.querySelectorAll('.phase-work-card').length>=4 &&
        document.querySelector('.phase-type-select') &&
        document.querySelectorAll('#dimRows .dim-data').length>=3 &&
        document.getElementById('dimTransfer');
      if(ready)return true;
      await sleep(60);
    }
    return false;
  }

  function value(el,v,type='input'){
    if(!el)return;
    el.value=String(v);
    fire(el,type);
  }

  async function addActivity(phase,type,title,assignments){
    const typeSelect=phase.querySelector('.phase-type-select');
    value(typeSelect,type,'change');
    phase.querySelector('.add-activity')?.click();
    await sleep(90);
    const activity=phase.querySelector('.activities .activity-card:last-child');
    if(!activity)return;
    value(activity.querySelector('.activity-name'),title);
    const rows=activity.querySelector('.assignment-rows');
    if(rows)rows.innerHTML='';
    for(const a of assignments){
      activity.querySelector('.add-assignment')?.click();
      await sleep(20);
      const row=activity.querySelector('.assignment-rows .assignment-row:last-child');
      value(row?.querySelector('.assignment-role'),a.role,'change');
      value(row?.querySelector('.assignment-hours'),a.hours);
    }
    activity.classList.add('collapsed');
  }

  function setCommessaLabel(){
    const field=[...document.querySelectorAll('#tab-dati label.field')]
      .find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith('commessa'));
    const sel=field?.querySelector('select');
    if(sel?.selectedOptions?.[0]){
      const label='26_119 - PROGETTAZIONE IMPIANTI SEDE PRODUTTIVA';
      sel.selectedOptions[0].textContent=label;
      sel.selectedOptions[0].value=label;
    }
  }

  function setStatusConfirmed(){
    const field=[...document.querySelectorAll('#tab-dati label.field')]
      .find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith('stato'));
    const sel=field?.querySelector('select');
    if(!sel)return;
    const confirmed=[...sel.options].find(o=>norm(o.value||o.textContent)==='confermata');
    if(confirmed){sel.value=confirmed.value;fire(sel,'change');}
  }

  async function seed(){
    if(!await waitReady())return;
    if(document.body.dataset.demoV19Seeded==='1')return;
    document.body.dataset.demoV19Seeded='1';

    setCommessaLabel();

    const dimRows=[...document.querySelectorAll('#dimRows .dim-data')].slice(0,3);
    const dimData=[
      {desc:'Uffici e servizi',mq:650,mech:210,elec:160},
      {desc:'Area produttiva',mq:550,mech:190,elec:135},
      {desc:'Locali tecnici',mq:90,mech:380,elec:280}
    ];
    dimRows.forEach((row,i)=>{
      const d=dimData[i];
      value(row.querySelector('.dim-desc'),d.desc);
      value(row.querySelector('.dim-mq'),d.mq);
      value(row.querySelector('.dim-mech-rate'),d.mech);
      value(row.querySelector('.dim-elec-rate'),d.elec);
    });
    value(document.getElementById('dimRounded'),'480000');
    fire(document.getElementById('dimRounded'),'blur');
    value(document.getElementById('dimFeePct'),'7');
    value(document.getElementById('dimIeFactor'),'1');
    fire(document.getElementById('dimIeFactor'),'blur');

    const phases=[...document.querySelectorAll('.phase-work-card')].slice(0,4);
    phases.forEach(p=>{
      p.querySelectorAll('.activity-delete').forEach(b=>b.click());
      p.classList.add('collapsed');
    });
    await sleep(100);

    const scenario=[
      {type:'preliminare',title:'Analisi documentale e sopralluoghi',assign:[{role:'PM',hours:4},{role:'RS_IE',hours:12}]},
      {type:'definitivo',title:'Progettazione definitiva impianti',assign:[{role:'RS_IE',hours:18},{role:'UT_IE_S',hours:36}]},
      {type:'esecutivo',title:'Progettazione esecutiva impianti',assign:[{role:'RS_IE',hours:12},{role:'UT_IE_S',hours:48},{role:'UT_IM_S',hours:32}]},
      {type:'dl',title:'Direzione lavori impianti',assign:[{role:'PM',hours:8},{role:'RS_IE',hours:24}]}
    ];
    for(let i=0;i<scenario.length;i++)await addActivity(phases[i],scenario[i].type,scenario[i].title,scenario[i].assign);

    await sleep(180);
    document.getElementById('dimTransfer')?.click();
    await sleep(180);
    setStatusConfirmed();
    await sleep(260);

    /* Start clean and compact, but do not touch the UI again. */
    document.querySelectorAll('.accordion').forEach(section=>section.classList.remove('open'));
    document.querySelectorAll('.phase-work-card').forEach(card=>card.classList.add('collapsed'));

    const badge=document.createElement('div');
    badge.className='demo-ready-badge';
    badge.textContent='Dati demo caricati';
    document.body.appendChild(badge);
    setTimeout(()=>badge.classList.add('show'),20);
    setTimeout(()=>{badge.classList.remove('show');setTimeout(()=>badge.remove(),250);},1800);
  }

  window.addEventListener('load',()=>setTimeout(seed,900),{once:true});
})();
