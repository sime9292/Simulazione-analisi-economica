/* v18 patch: coherent dimensioning data + collapsible E2E test panel */
(function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const fire=(el,type='input')=>el?.dispatchEvent(new Event(type,{bubbles:true}));

  async function waitFor(selector,tries=180){
    for(let i=0;i<tries;i++){
      const el=document.querySelector(selector);
      if(el)return el;
      await sleep(60);
    }
    return null;
  }

  async function seedDimensioning(){
    const rowsRoot=await waitFor('#dimRows');
    const transfer=await waitFor('#dimTransfer');
    if(!rowsRoot||!transfer)return;

    for(let i=0;i<120 && rowsRoot.querySelectorAll('.dim-data').length<3;i++)await sleep(50);
    const rows=[...rowsRoot.querySelectorAll('.dim-data')].slice(0,3);
    if(rows.length<3)return;

    /* Test commessa: sede produttiva con uffici, area produttiva e locali tecnici. */
    const data=[
      {desc:'Uffici e servizi',mq:650,mech:210,elec:160},
      {desc:'Area produttiva',mq:550,mech:190,elec:135},
      {desc:'Locali tecnici',mq:90,mech:380,elec:280}
    ];

    rows.forEach((row,i)=>{
      const d=data[i];
      const desc=row.querySelector('.dim-desc');
      const mq=row.querySelector('.dim-mq');
      const mech=row.querySelector('.dim-mech-rate');
      const elec=row.querySelector('.dim-elec-rate');
      if(desc)desc.value=d.desc;
      if(mq){mq.value=String(d.mq);fire(mq);}
      if(mech){mech.value=String(d.mech);fire(mech);}
      if(elec){elec.value=String(d.elec);fire(elec);}
    });

    const rounded=document.getElementById('dimRounded');
    if(rounded){rounded.value='480000';fire(rounded);fire(rounded,'blur');}
    const fee=document.getElementById('dimFeePct');
    if(fee){fee.value='7';fire(fee);}
    const factor=document.getElementById('dimIeFactor');
    if(factor){factor.value='1';fire(factor);fire(factor,'blur');}

    /* Rename the demo commessa so dimensioning, activities and Kanban tell one story. */
    const commessaSelect=[...document.querySelectorAll('#tab-dati label.field')]
      .find(x=>(x.querySelector(':scope > span')?.textContent||'').trim().toLowerCase().startsWith('commessa'))
      ?.querySelector('select');
    if(commessaSelect?.selectedOptions?.[0]){
      commessaSelect.selectedOptions[0].textContent='26_119 - PROGETTAZIONE IMPIANTI SEDE PRODUTTIVA';
      commessaSelect.selectedOptions[0].value='26_119 - PROGETTAZIONE IMPIANTI SEDE PRODUTTIVA';
    }

    /* v17 creates the activities first; once they are ready use the dimensioning result as proposal. */
    for(let i=0;i<160;i++){
      if(document.querySelectorAll('.activity-card').length===4)break;
      await sleep(50);
    }
    await sleep(160);
    transfer.click();
  }

  function installCollapsibleTestPanel(){
    const enhance=panel=>{
      if(!panel)return;
      const head=panel.querySelector('.e2e-test-head');
      if(!head)return;
      if(!head.querySelector('.e2e-test-toggle')){
        const btn=document.createElement('button');
        btn.type='button';btn.className='e2e-test-toggle';
        btn.addEventListener('click',e=>{
          e.stopPropagation();
          panel.classList.toggle('collapsed');
          btn.textContent=panel.classList.contains('collapsed')?'Mostra':'Nascondi';
          btn.title=panel.classList.contains('collapsed')?'Mostra risultati test':'Nascondi risultati test';
        });
        head.appendChild(btn);
      }
      const btn=head.querySelector('.e2e-test-toggle');
      if(btn)btn.textContent=panel.classList.contains('collapsed')?'Mostra':'Nascondi';
    };

    const existing=document.getElementById('e2eTestPanel');
    if(existing)enhance(existing);
    const obs=new MutationObserver(()=>{
      const panel=document.getElementById('e2eTestPanel');
      if(panel)enhance(panel);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  window.addEventListener('load',()=>{
    installCollapsibleTestPanel();
    setTimeout(seedDimensioning,450);
  },{once:true});
})();
