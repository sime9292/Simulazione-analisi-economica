/* v45 - Test Environment used only to seed offer/analysis/confirmed offer lines. Billing stays fully manual. */
(function(){
  const ENV_KEY='dabster.environment.v44';
  const CASE_KEY='dabster.test.case.v44';
  const STAGE_KEY='dabster.test.stage.v44';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const CASES={
    '26_022pe01':{
      label:'26_022pe01 · Guardamiglio (LO)',
      offer:{
        id:'26_022pe01',code:'26_022pe01',commessa:'26_022',
        commessaLabel:'26_022 - URBANIZZAZIONE GUARDAMIGLIO (LO) - LOGISTICO',
        title:'Consulenza tecnica Edificio a destinazione logistica in località Guardamiglio (LO)',
        client:"G. B. & PARTNERS SRL PROGETTI E SERVIZI IMMOBILIARI - SOCIETA' UNIPERSONALE",
        offerDate:'23/04/2026',status:'Confermata',amount:19000
      },
      confirmation:{consulting:6000,projects:13000,direction:0},
      lines:[
        {id:'26_022pe01:test:pua',phase:'preliminare',description:'PUA',amount:3000},
        {id:'26_022pe01:test:pdc',phase:'esecutivo',description:'Progetto impianti per PDC',amount:10000},
        {id:'26_022pe01:test:vvf',phase:'valutazione_vvf',description:'Parere Preventivo VVF',amount:6000}
      ],
      activities:{
        preliminare:{name:'PUA',assign:[['PM',4],['RS_IE',6]]},
        esecutivo:{name:'Progetto impianti per PDC',assign:[['RS_IM',10],['UT_IM_S',16]]},
        valutazione_vvf:{name:'Parere Preventivo VVF',assign:[['VVF_S',8],['VVF_J',8]]}
      }
    }
  };

  let env=sessionStorage.getItem(ENV_KEY)||'free';
  let caseId=sessionStorage.getItem(CASE_KEY)||Object.keys(CASES)[0];
  if(!CASES[caseId])caseId=Object.keys(CASES)[0];
  let stage=Number(sessionStorage.getItem(STAGE_KEY)||0);if(![0,1,2].includes(stage))stage=0;
  let bar=null,busy=false,billingPrepared=false,lastError='';
  const currentCase=()=>CASES[caseId];
  const fire=(el,type='input')=>el?.dispatchEvent(new Event(type,{bubbles:true}));
  function setControl(el,value,type='input'){if(!el)return;el.value=String(value);fire(el,type);}
  function field(label){return [...document.querySelectorAll('#tab-dati label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))||null;}
  function control(label){return field(label)?.querySelector('input,select,textarea')||null;}
  function amountField(label){return [...document.querySelectorAll('#tab-dati .accordion.amounts label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))?.querySelector('input')||null;}
  function scrollTo(el){try{el?.scrollIntoView({behavior:'smooth',block:'center'});}catch{el?.scrollIntoView();}}
  async function waitFor(fn,loops=240,delay=45){for(let i=0;i<loops;i++){const v=fn();if(v)return v;await sleep(delay);}return null;}
  async function waitFlow(){return waitFor(()=>window.DABSTER_OFFER_FLOW?.openNewOffer&&window.DABSTER_OFFER_FLOW);}
  async function waitDetail(){return waitFor(()=>document.getElementById('analysisSubtabs')&&document.querySelectorAll('#phaseWorkCards>.phase-work-card').length>=7&&document.getElementById('totaleOfferta'));}
  function statusSelect(){return control('Stato');}
  function setStatus(label){const s=statusSelect();if(!s)return;let o=[...s.options].find(x=>norm(x.value||x.textContent)===norm(label));if(!o){o=new Option(label,label);s.add(o);}s.value=o.value;fire(s,'change');}
  function tab(name){document.querySelector(`.tab[data-tab="${name}"]`)?.click();}
  function cardForPhase(id){return [...document.querySelectorAll('#phaseWorkCards>.phase-work-card')].find(c=>(c.querySelector('.phase-type-select')?.value||c.dataset.planningPhase||'')===id)||null;}
  function clearActivities(){document.querySelectorAll('#phaseWorkCards .activity-delete').forEach(b=>b.click());}
  async function addActivity(phase,item){
    const card=cardForPhase(phase);if(!card)return;card.querySelector('.add-activity')?.click();await sleep(70);
    const activity=[...card.querySelectorAll('.activities .activity-card')].at(-1);if(!activity)return;
    const name=activity.querySelector('.activity-name');if(name){name.value=item.name;fire(name,'change');}
    const rows=activity.querySelector('.assignment-rows');if(rows)rows.innerHTML='';
    for(const [role,hours] of item.assign){activity.querySelector('.add-assignment')?.click();await sleep(25);const row=activity.querySelector('.assignment-rows .assignment-row:last-child');const r=row?.querySelector('.assignment-role'),h=row?.querySelector('.assignment-hours');if(r){r.value=role;fire(r,'change');}if(h){h.value=String(hours);fire(h,'input');}}
    fire(name,'change');
  }
  function setProposal(phase,value){const row=document.querySelector(`#tab-analisi .economic-table .phase-row[data-economic-phase="${phase}"]`),input=row?.querySelector('.ae-proposal');if(input){input.value=money(value);fire(input,'input');fire(input,'change');}}

  function snapshot(){const c=currentCase(),confirmed=stage>=2;return {offer:{...c.offer,status:confirmed?'Confermata':'In lavorazione'},lines:confirmed?c.lines.map(x=>({...x})):[],loadedOffer:stage>0,testEnvironment:true};}
  async function patchFlow(){const flow=await waitFlow();if(!flow)return null;flow.offer={...currentCase().offer};flow.getSnapshot=()=>snapshot();window.DABSTER_TEST_CASE_V44=currentCase();window.dispatchEvent(new CustomEvent('dabster-offer-flow-change',{detail:snapshot()}));return flow;}

  function enforceEconomicPhases(c){
    const wanted=new Set(c.lines.map(x=>x.phase));
    document.querySelectorAll('#tab-analisi .economic-table .phase-row[data-economic-phase]').forEach(row=>{
      const phase=row.dataset.economicPhase||'',keep=wanted.has(phase),proposal=row.querySelector('.ae-proposal');
      row.dataset.economicActive=keep?'1':'0';row.hidden=!keep;
      if(!keep&&proposal){proposal.value='0,00';fire(proposal,'input');fire(proposal,'change');}
    });
  }

  function enforceExactOfferLines(c){
    const root=document.getElementById('offerLineRows');if(!root)return {ok:false,total:0,count:0,message:'Contenitore Righe Offerta non disponibile.'};
    const wanted=new Map(c.lines.map(x=>[x.phase,x]));
    [...root.querySelectorAll('.offer-line-row')].forEach(row=>{
      const phase=row.dataset.phase||row.querySelector('.offer-line-phase-select')?.value||'';
      if(!wanted.has(phase))row.remove();
    });
    c.lines.forEach(line=>{
      let row=[...root.querySelectorAll('.offer-line-row')].find(r=>(r.dataset.phase||r.querySelector('.offer-line-phase-select')?.value||'')===line.phase);
      if(!row)return;
      row.hidden=false;
      const desc=row.querySelector('.offer-line-desc'),amount=row.querySelector('.offer-line-amount');
      if(desc){desc.value=line.description;fire(desc,'input');}
      if(amount){amount.value=money(line.amount);row.dataset.manualAmount='1';fire(amount,'input');fire(amount,'blur');}
    });
    const rows=[...root.querySelectorAll('.offer-line-row')];
    const total=rows.reduce((sum,row)=>sum+num(row.querySelector('.offer-line-amount')?.value),0);
    const descriptions=rows.map(row=>String(row.querySelector('.offer-line-desc')?.value||'').trim());
    const expectedDescriptions=c.lines.map(x=>x.description);
    const descriptionsOk=expectedDescriptions.every(x=>descriptions.includes(x));
    const ok=rows.length===c.lines.length&&Math.abs(total-c.offer.amount)<=0.01&&descriptionsOk;
    return {ok,total,count:rows.length,message:ok?'':`Righe Offerta non quadrate: ${rows.length} righe, totale ${money(total)} €; atteso ${c.lines.length} righe, ${money(c.offer.amount)} €.`};
  }

  async function loadAnalysis(){
    if(busy)return;busy=true;lastError='';renderBar();try{
      stage=0;sessionStorage.setItem(STAGE_KEY,'0');billingPrepared=false;
      const c=currentCase(),flow=await patchFlow();if(!flow)return;await flow.openNewOffer();await waitDetail();tab('dati');
      setStatus('In lavorazione');
      const comm=control('Commessa');if(comm){let o=[...comm.options].find(x=>x.value===c.offer.commessaLabel);if(!o){o=new Option(c.offer.commessaLabel,c.offer.commessaLabel);comm.add(o);}comm.value=o.value;fire(comm,'change');}
      setControl(control('Titolo'),c.offer.title);setControl(control('Codice'),c.offer.code);setControl(control('Data offerta'),c.offer.offerDate);
      setControl(amountField('Importo stimato'),c.offer.amount);setControl(amountField('Consulenza'),c.confirmation.consulting);setControl(amountField('Progetti'),c.confirmation.projects);setControl(amountField('Direzione lavori'),c.confirmation.direction);setControl(document.getElementById('totaleOfferta'),c.offer.amount);
      tab('analisi');window.dabsterAnalysisSubtabs?.activate?.('impianti');clearActivities();await sleep(140);
      for(const [phase,item] of Object.entries(c.activities))await addActivity(phase,item);
      await sleep(180);window.dabsterEconomicPhaseController?.reconcile?.();
      ['preliminare','definitivo','valutazione_vvf','esecutivo','dl','scia_vvf','consulenze'].forEach(p=>setProposal(p,0));c.lines.forEach(l=>setProposal(l.phase,l.amount));
      enforceEconomicPhases(c);setControl(document.getElementById('tradePct'),0);window.dabsterRecalcEconomic?.();setControl(document.getElementById('totaleOfferta'),c.offer.amount);
      stage=1;sessionStorage.setItem(STAGE_KEY,'1');await patchFlow();scrollTo(document.getElementById('analysisSubtabImpianti'));
    }finally{busy=false;renderBar();}
  }

  async function confirmAndCreateLines(){
    if(busy||stage<1)return;busy=true;lastError='';renderBar();try{
      const c=currentCase();await waitDetail();
      enforceEconomicPhases(c);c.lines.forEach(l=>setProposal(l.phase,l.amount));window.dabsterRecalcEconomic?.();
      tab('dati');setStatus('Confermata');
      await waitFor(()=>!document.getElementById('confirmationAmountsSection')?.hidden&&document.getElementById('confirmationConsulting'));
      [['confirmationConsulting',c.confirmation.consulting],['confirmationProjects',c.confirmation.projects],['confirmationDirection',c.confirmation.direction]].forEach(([id,v])=>{const el=document.getElementById(id);if(el){el.value=money(v);fire(el,'input');fire(el,'blur');}});
      await sleep(180);window.DABSTER_OFFER_LINES?.sync?.();await waitFor(()=>document.querySelectorAll('#offerLineRows .offer-line-row').length>=c.lines.length);
      let check=enforceExactOfferLines(c);await sleep(80);window.DABSTER_OFFER_LINES?.sync?.();await sleep(80);check=enforceExactOfferLines(c);
      if(!check.ok){lastError=check.message;console.error('[Dabster Test v45]',lastError);stage=1;sessionStorage.setItem(STAGE_KEY,'1');scrollTo(document.getElementById('offerLinesSection'));return;}
      stage=2;sessionStorage.setItem(STAGE_KEY,'2');billingPrepared=false;await patchFlow();scrollTo(document.getElementById('offerLinesSection'));
    }finally{busy=false;renderBar();}
  }

  async function prepareBilling(){
    if(env!=='test'||billingPrepared||stage<2)return;const api=await waitFor(()=>window.DABSTER_BILLING_V39?.getModel&&window.DABSTER_BILLING_V39,260,45);if(!api)return;const model=api.getModel();if(Array.isArray(model?.invoices))model.invoices.splice(0,model.invoices.length);billingPrepared=true;window.dispatchEvent(new CustomEvent('dabster-offer-flow-change',{detail:snapshot()}));
  }

  function installStyles(){if(document.getElementById('testDataEntryV44Styles'))return;const s=document.createElement('style');s.id='testDataEntryV44Styles';s.textContent=`
    #dabsterEnvironmentBar{position:relative;z-index:50;margin:0 0 9px;padding:8px 10px;border:1px solid #d6e0e4;border-radius:8px;background:#fff;font-family:Arial,sans-serif}.td44-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.td44-label{font-size:7.5px;font-weight:800;text-transform:uppercase;color:#75848c}.td44-seg{display:flex;border:1px solid #cfd9de;border-radius:6px;overflow:hidden}.td44-mode,.td44-action{height:29px;border:0;background:#fff;color:#4b626d;font-size:8.8px;font-weight:760;cursor:pointer}.td44-mode{padding:0 11px;border-right:1px solid #dbe2e5}.td44-mode:last-child{border-right:0}.td44-mode.active{background:#3e6574;color:#fff}.td44-test .td44-mode.active{background:#d86c27}.td44-case{height:29px;min-width:235px;border:1px solid #cfd9de;border-radius:6px;background:#fff;padding:0 8px;font-size:8.8px;color:#3e5661}.td44-actions{display:flex;gap:6px;margin-left:auto}.td44-action{padding:0 10px;border:1px solid #cad6db;border-radius:6px}.td44-action.primary{background:#d86c27;border-color:#c85f20;color:#fff}.td44-action.done{background:#edf6ef;border-color:#cfe3d5;color:#3f6f50}.td44-action:disabled,.td44-case:disabled{opacity:.45;cursor:not-allowed}.td44-note{font-size:7.7px;color:#728089}.td44-stage{display:inline-flex;height:20px;align-items:center;padding:0 7px;border-radius:999px;background:#f1f5f6;color:#526873;font-size:7.4px;font-weight:750}.td44-error{font-size:7.7px;font-weight:750;color:#a4484f;background:#fff1f1;border:1px solid #edc7ca;border-radius:5px;padding:4px 7px}@media(max-width:950px){.td44-actions{width:100%;margin-left:0;flex-wrap:wrap}.td44-case{min-width:190px;max-width:100%}}
  `;document.head.appendChild(s);}
  function renderBar(){if(!bar)return;const test=env==='test';bar.classList.toggle('td44-test',test);bar.innerHTML=`<div class="td44-row"><span class="td44-label">Ambiente</span><div class="td44-seg"><button class="td44-mode ${!test?'active':''}" data-env="free">Libero</button><button class="td44-mode ${test?'active':''}" data-env="test">Test</button></div>${test?`<span class="td44-label">Caso</span><select class="td44-case" ${busy?'disabled':''}>${Object.entries(CASES).map(([id,c])=>`<option value="${esc(id)}" ${id===caseId?'selected':''}>${esc(c.label)}</option>`).join('')}</select><span class="td44-stage">${stage===0?'Nessun dato caricato':stage===1?'Analisi caricata':'Offerta confermata + 3 righe · 19.000 €'}</span>${lastError?`<span class="td44-error">${esc(lastError)}</span>`:''}<div class="td44-actions"><button class="td44-action ${stage>=1?'done':'primary'}" data-load-analysis ${busy?'disabled':''}>1 · Carica Offerta + Analisi</button><button class="td44-action ${stage>=2?'done':'primary'}" data-confirm-lines ${busy||stage<1?'disabled':''}>2 · Conferma + Righe Offerta</button><button class="td44-action" disabled>3 · Piano pagamenti · prossimamente</button><button class="td44-action" data-reset ${busy?'disabled':''}>↺ Reset test</button></div>`:`<span class="td44-note">Uso normale del gestionale. Fatturazione sempre manuale.</span>`}</div>`;
    bar.querySelectorAll('[data-env]').forEach(b=>b.addEventListener('click',()=>switchEnv(b.dataset.env)));bar.querySelector('.td44-case')?.addEventListener('change',e=>{caseId=e.target.value;sessionStorage.setItem(CASE_KEY,caseId);sessionStorage.setItem(STAGE_KEY,'0');location.reload();});bar.querySelector('[data-load-analysis]')?.addEventListener('click',loadAnalysis);bar.querySelector('[data-confirm-lines]')?.addEventListener('click',confirmAndCreateLines);bar.querySelector('[data-reset]')?.addEventListener('click',()=>{sessionStorage.setItem(STAGE_KEY,'0');location.reload();});}
  function switchEnv(next){if(next===env)return;sessionStorage.setItem(ENV_KEY,next);if(next==='free')sessionStorage.setItem(STAGE_KEY,'0');location.reload();}
  function installBar(){installStyles();const shell=document.querySelector('.page-shell');if(!shell)return false;bar=document.getElementById('dabsterEnvironmentBar');if(!bar){bar=document.createElement('section');bar.id='dabsterEnvironmentBar';const title=shell.querySelector('.page-title');shell.insertBefore(bar,title||shell.firstChild);}renderBar();return true;}

  async function install(){for(let i=0;i<240&&!installBar();i++)await sleep(40);if(!bar)return;if(env==='test'){await patchFlow();document.addEventListener('click',e=>{if(e.target.closest?.('#appSidebar .sidebar-item[data-page="billing"]'))setTimeout(prepareBilling,60);},true);if(location.hash==='#dashboard-fatturazione'||location.hash==='#nuova-fattura')prepareBilling();}}
  install();
})();