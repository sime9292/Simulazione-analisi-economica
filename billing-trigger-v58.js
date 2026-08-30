/* v58 - Trigger fatturazione: Attività chiusa -> evento Piano fatturabile, dashboard CC/CP/Fatturabile, Da fatturare e riconciliazione. */
(function(){
  const VERSION=58;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const cents=n=>Math.round((Number(n||0)+Number.EPSILON)*100)/100;
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const activities=new Map();
  const draftMeta=new Map();
  const pendingLineEvents=new Map();
  const appliedEvents=new Set();
  let observer=null,queued=false,reconError='',pendingFocusEvent='',lastReconSig='',lastBillableSig='';

  const planApi=()=>window.DABSTER_BILLING_PLAN_V47||window.DABSTER_BILLING_PLAN_V46||null;
  const billingApi=()=>window.DABSTER_BILLING_V40||window.DABSTER_BILLING_V39||null;
  const billingEntry=()=>window.DABSTER_BILLING_ENTRY_V48||window.DABSTER_BILLING_ENTRY_V47||window.DABSTER_BILLING_ENTRY_V46||window.DABSTER_BILLING_ENTRY_V45||window.DABSTER_BILLING_ENTRY_V44||null;
  const offerSnapshot=()=>window.DABSTER_OFFER_FLOW?.getSnapshot?.()||{};
  const offer=()=>offerSnapshot().offer||{};
  const offerCode=()=>String(offer().code||planApi()?.getContext?.()?.code||'').trim();
  const isTest=()=>sessionStorage.getItem('dabster.environment.v44')==='test';

  function responsibles(){
    const o=offer();
    const cc=String(o.cc||o.capoCommessa||o.commessaManager||(isTest()&&offerCode()==='26_022pe01'?'GEA':'GRE'));
    const cp=String(o.cp||o.capoProgetto||o.projectManager||'MRC');
    return {cc,cp};
  }

  function model(){return billingApi()?.getModel?.()||window.DABSTER_BILLING_MODEL_V39||{invoices:[]};}
  function allReconciliations(){
    const out=[];
    (model().invoices||[]).forEach(inv=>(inv.lines||[]).forEach(line=>(line.planReconciliations||[]).forEach(r=>out.push({...r,invoiceId:inv.id,invoiceNo:inv.number,invoiceLineId:line.id}))));
    return out;
  }
  function planRows(){try{return planApi()?.getSnapshot?.()?.rows||[];}catch{return [];}}
  function planContext(){try{return planApi()?.getContext?.()||{lines:[],status:''};}catch{return {lines:[],status:''};}}
  function offerConfirmed(){return norm(planContext().status||offer().status)==='confermata';}
  function activityFromKey(key){
    const raw=String(key||''),i=raw.indexOf('::');if(i<0)return null;
    const phase=raw.slice(0,i),name=raw.slice(i+2);
    return [...activities.values()].find(a=>a.phaseType===phase&&norm(a.title)===norm(name))||null;
  }
  function billedForEvent(id){return cents(allReconciliations().filter(r=>String(r.planEventId)===String(id)).reduce((s,r)=>s+Number(r.amount||0),0));}
  function eventStates(){
    return planRows().map(row=>{
      const planned=cents(Number(row.calculatedAmount||row.amount||0)),billed=billedForEvent(row.id),remaining=Math.max(0,cents(planned-billed));
      const trigger=row.trigger||'confirmation';
      const activity=trigger==='activity_closed'?activityFromKey(row.activityKey):null;
      const matured=!!row.valid&&(trigger==='confirmation'?offerConfirmed():trigger==='activity_closed'?activity?.status==='chiusa':false);
      let status='Non maturato',anomaly=false,billable=0;
      if(!row.valid)status='Incompleto';
      else if(remaining<=.01)status='Fatturato';
      else if(billed>.01&&matured){status='Parziale';billable=remaining;}
      else if(billed>.01&&!matured){status='Parziale · trigger riaperto';anomaly=true;}
      else if(matured){status='Fatturabile';billable=remaining;}
      return {...row,planned,billed,remaining,billable,matured,status,anomaly,activity};
    });
  }
  function eventById(id){return eventStates().find(x=>String(x.id)===String(id))||null;}
  function summary(){const events=eventStates(),billable=cents(events.reduce((s,e)=>s+e.billable,0));return {events,billable,count:events.filter(e=>e.billable>.01).length,anomalies:events.filter(e=>e.anomaly).length};}

  function patchPlanSeed(){
    const api=planApi();if(!api||api.__dabsterTriggerV58SeedPatched)return false;
    const original=api.seed?.bind(api);if(!original)return false;
    api.__dabsterTriggerV58SeedPatched=true;api.__dabsterTriggerV58OriginalSeed=original;
    api.seed=(defs,opts)=>{
      let next=Array.isArray(defs)?defs:[];
      if(isTest()&&offerCode()==='26_022pe01')next=next.filter(d=>String(d.id)!=='26_022pe01:plan:pua-close');
      const result=original(next,opts);setTimeout(schedule,0);return result;
    };
    sanitizeExistingTestPlan();return true;
  }
  function sanitizeExistingTestPlan(){
    const api=planApi();if(!api||!isTest()||offerCode()!=='26_022pe01')return;
    const snap=api.getSnapshot?.();if(!snap?.rows?.some(r=>String(r.id)==='26_022pe01:plan:pua-close'))return;
    const rows=snap.rows.filter(r=>String(r.id)!=='26_022pe01:plan:pua-close').map(r=>({id:r.id,baseType:r.baseType,baseRef:r.baseRef,eventLabel:r.eventLabel,percent:r.percent,amount:r.amount,driver:r.driver,trigger:r.trigger,activityKey:r.activityKey}));
    api.__dabsterTriggerV58OriginalSeed?.(rows,{replace:true});
  }

  function scanKanban(){
    const board=document.getElementById('kanbanBoard'),phase=document.querySelector('.kanban-phase-tab.active')?.dataset.phase;if(!board||!phase)return false;
    let changed=false;
    board.querySelectorAll('.kanban-list[data-status] .kanban-card[data-id]').forEach(card=>{
      const next={id:card.dataset.id,phaseType:phase,title:String(card.querySelector('.kanban-card-title')?.textContent||'').trim(),status:card.closest('.kanban-list')?.dataset.status||''};
      const prev=activities.get(next.id);if(!prev||prev.phaseType!==next.phaseType||prev.title!==next.title||prev.status!==next.status){activities.set(next.id,next);changed=true;}
    });
    if(changed)window.dispatchEvent(new CustomEvent('dabster-billing-trigger-change',{detail:{activities:[...activities.values()],summary:summary()}}));
    return changed;
  }

  function setPlanMessage(text,error=false){
    const box=document.querySelector('#newInvoicePageV39 .bp57-message');if(!box)return;
    if(box.textContent!==text)box.textContent=text;box.hidden=!text;box.classList.toggle('error',!!error);
  }
  function scaledAllocations(evt){
    const rows=(evt.allocations||[]).filter(a=>Number(a.amount||0)>0);if(!rows.length||evt.planned<=0||evt.billable<=0)return [];
    const ratio=evt.billable/evt.planned;let used=0;
    return rows.map((a,i)=>{const amount=i===rows.length-1?cents(evt.billable-used):cents(Number(a.amount||0)*ratio);used=cents(used+amount);const line=planContext().lines?.find(x=>String(x.id)===String(a.lineId));return {lineId:a.lineId,phase:line?.phase||a.phase||'',amount};}).filter(a=>a.amount>.01);
  }
  async function ensureInvoiceLines(){
    const entry=billingEntry();if(entry?.loadWorkspace)await entry.loadWorkspace('invoice');else billingApi()?.showInvoice?.();
    for(let i=0;i<80;i++){
      const page=document.getElementById('newInvoicePageV39');if(page&&!page.hidden){
        if(!page.querySelector('[data-src-check]')){page.querySelector('[data-src-commessa]')?.click();await sleep(10);page.querySelector('[data-src-offer]')?.click();await sleep(10);}
        if(page.querySelector('[data-src-check]'))return true;
      }
      await sleep(25);
    }
    return false;
  }
  async function applyEvent(id){
    const evt=eventById(id);if(!evt){setPlanMessage('Evento Piano non disponibile.',true);return;}
    if(evt.billable<=.01){setPlanMessage(`Evento non applicabile: ${evt.status}.`,true);return;}
    if(appliedEvents.has(String(id))){setPlanMessage('Evento già applicato alla fattura corrente.',true);return;}
    if(!await ensureInvoiceLines()){setPlanMessage('Righe Offerta non disponibili.',true);return;}
    const billing=billingApi(),allocations=scaledAllocations(evt);if(!billing?.applySourceAllocations||!allocations.length){setPlanMessage('Impossibile precompilare le Righe Offerta.',true);return;}
    const result=billing.applySourceAllocations(allocations,{mode:'add',message:`Applicato dal Piano: ${evt.eventLabel||'Evento'} · ${money(evt.billable)} €`});
    if(!result?.ok){setPlanMessage(result?.error||'Impossibile applicare l’evento.',true);return;}
    allocations.forEach(a=>{const key=String(a.lineId),arr=pendingLineEvents.get(key)||[];arr.push({eventId:String(evt.id),amount:a.amount});pendingLineEvents.set(key,arr);});
    appliedEvents.add(String(evt.id));setPlanMessage(`Applicato: ${evt.eventLabel||'Evento'} · ${money(evt.billable)} €. Gli importi restano modificabili.`,false);
    window.dispatchEvent(new CustomEvent('dabster-plan-applied-to-lines',{detail:{id:evt.id,label:evt.eventLabel,amount:evt.billable,allocations}}));schedule();
  }

  function compatibleEvents(lineIds){
    const ids=new Set((lineIds||[]).map(String));
    return eventStates().filter(e=>e.billable>.01&&(e.allocations||[]).some(a=>ids.has(String(a.lineId))));
  }
  function currentDraftRows(){return [...document.querySelectorAll('#newInvoicePageV39 .ni39-draftgrid [data-draft-desc]')].map(inp=>({id:inp.dataset.draftDesc,row:inp.closest('.bw39-row'),description:inp.value}));}
  function captureAddSelected(){
    const billing=billingApi(),selections=billing?.getSourceSelections?.()||[],metrics=billing?.getOfferMetrics?.()?.lines||[],before=new Set(currentDraftRows().map(x=>x.id));
    const chosen=selections.filter(s=>Number(s.value||0)>0).map(s=>{const line=metrics.find(x=>String(x.id)===String(s.key));return line?{line,amount:cents(s.value)}:null;}).filter(Boolean);
    setTimeout(()=>{
      const fresh=currentDraftRows().filter(x=>!before.has(x.id));
      fresh.forEach((d,i)=>{
        const src=chosen[i];if(!src)return;
        const pending=pendingLineEvents.get(String(src.line.id))||[];
        let choice='',parts=[];
        const unique=[...new Set(pending.map(x=>x.eventId))];
        if(unique.length===1)choice=unique[0];
        else if(unique.length>1){let left=src.amount;parts=pending.map(p=>{const a=Math.min(left,cents(p.amount));left=cents(left-a);return {eventId:p.eventId,amount:a,allocations:[{offerLineId:src.line.id,phase:src.line.phase,amount:a}]};}).filter(p=>p.amount>.01);if(left>.01)parts.push({eventId:'outside',amount:left,allocations:[{offerLineId:src.line.id,phase:src.line.phase,amount:left}]});}
        if(!choice&&!parts.length){const candidates=compatibleEvents([src.line.id]);if(candidates.length===1)choice=String(candidates[0].id);else if(!candidates.length)choice='outside';}
        draftMeta.set(d.id,{id:d.id,description:d.description,amount:src.amount,allocations:[{offerLineId:src.line.id,phase:src.line.phase,amount:src.amount}],choice,parts,suggested:!!choice&&choice!=='outside'&&!pending.length});
        pendingLineEvents.delete(String(src.line.id));
      });
      schedule();
    },0);
  }

  function captureGroup(){
    const ids=[...document.querySelectorAll('#newInvoicePageV39 [data-draft-check]:checked')].map(x=>x.dataset.draftCheck),children=ids.map(id=>draftMeta.get(id)).filter(Boolean),before=new Set(currentDraftRows().map(x=>x.id));if(children.length<2)return;
    setTimeout(()=>{
      const fresh=currentDraftRows().filter(x=>!before.has(x.id));const d=fresh.at(-1);if(!d)return;
      const allocations=children.flatMap(x=>x.allocations||[]),amount=cents(children.reduce((s,x)=>s+Number(x.amount||0),0)),parts=[];
      children.forEach(x=>{if(x.parts?.length)parts.push(...x.parts.map(p=>({...p,allocations:(p.allocations||[]).map(a=>({...a}))})));else if(x.choice&&x.choice!=='outside')parts.push({eventId:x.choice,amount:x.amount,allocations:(x.allocations||[]).map(a=>({...a}))});});
      const eventIds=[...new Set(parts.map(p=>p.eventId))],outside=cents(amount-parts.reduce((s,p)=>s+Number(p.amount||0),0));
      let choice='';if(eventIds.length===1&&outside<=.01)choice=eventIds[0];
      ids.forEach(id=>draftMeta.delete(id));draftMeta.set(d.id,{id:d.id,description:d.description,amount,allocations,choice,parts:eventIds.length>1||outside>.01?parts:[],suggested:false});schedule();
    },0);
  }

  function captureSplit(btn){
    const id=btn.dataset.split,group=draftMeta.get(id),before=new Set(currentDraftRows().map(x=>x.id));if(!group)return;
    setTimeout(()=>{
      const fresh=currentDraftRows().filter(x=>!before.has(x.id));
      fresh.forEach((d,i)=>{const a=group.allocations?.[i];if(!a)return;let choice=group.choice||'';if(group.parts?.length){const p=group.parts.find(x=>(x.allocations||[]).some(q=>String(q.offerLineId)===String(a.offerLineId)));choice=p?.eventId||'outside';}draftMeta.set(d.id,{id:d.id,description:d.description,amount:cents(a.amount),allocations:[{...a}],choice,parts:[],suggested:false});});
      draftMeta.delete(id);schedule();
    },0);
  }

  function pruneDraftMeta(){
    const live=new Set(currentDraftRows().map(x=>x.id));let changed=false;
    [...draftMeta.keys()].forEach(id=>{if(!live.has(id)){draftMeta.delete(id);changed=true;}});
    const represented=new Set();draftMeta.forEach(m=>{if(m.choice&&m.choice!=='outside')represented.add(String(m.choice));(m.parts||[]).forEach(p=>{if(p.eventId!=='outside')represented.add(String(p.eventId));});});
    [...appliedEvents].forEach(id=>{if(!represented.has(id)&&![...pendingLineEvents.values()].flat().some(p=>p.eventId===id))appliedEvents.delete(id);});
    return changed;
  }

  function reconOptions(meta){
    const lineIds=(meta.allocations||[]).map(a=>a.offerLineId),events=compatibleEvents(lineIds),current=meta.choice;
    if(current&&current!=='outside'&&!events.some(e=>String(e.id)===String(current))){const e=eventById(current);if(e)events.push(e);}
    return `<option value="" ${!current?'selected':''}>Seleziona evento</option>${events.map(e=>`<option value="${esc(e.id)}" ${String(current)===String(e.id)?'selected':''}>${esc(e.eventLabel||'Evento')} · ${money(e.remaining)} €</option>`).join('')}<option value="outside" ${current==='outside'?'selected':''}>Fuori Piano</option>`;
  }
  function renderReconciliation(){
    const body=document.querySelector('#newInvoicePageV39 .ni39-section.invoice .ni39-body');if(!body)return;
    pruneDraftMeta();const rows=currentDraftRows().filter(d=>draftMeta.has(d.id));
    let box=body.querySelector('.v58-recon');
    if(!rows.length){box?.remove();lastReconSig='';return;}
    const sig=JSON.stringify(rows.map(d=>{const m=draftMeta.get(d.id);return [d.id,m?.choice,m?.amount,(m?.parts||[]).map(p=>[p.eventId,p.amount])];}).concat([[reconError]]));
    if(sig===lastReconSig&&box)return;lastReconSig=sig;
    if(!box){box=document.createElement('div');box.className='v58-recon';const totals=body.querySelector('.ni39-totals');if(totals)body.insertBefore(box,totals);else body.appendChild(box);}
    box.innerHTML=`<div class="v58-recon-head"><div><strong>Riconciliazione Piano</strong><span>Collega le Righe Fattura agli eventi maturati oppure indica Fuori Piano.</span></div></div>${reconError?`<div class="v58-recon-error">${esc(reconError)}</div>`:''}<div class="v58-recon-grid head"><div>Riga fattura</div><div>Importo</div><div>Evento Piano</div></div>${rows.map(d=>{const m=draftMeta.get(d.id);const many=(m.parts||[]).length>1;return `<div class="v58-recon-grid"><div><strong>${esc(d.description)}</strong>${m.suggested?'<small>Proposta automatica</small>':''}</div><div class="v58-money">${money(m.amount)} €</div><div>${many?`<span class="v58-multi">${m.parts.filter(p=>p.eventId!=='outside').length} eventi collegati</span>`:`<select data-v58-recon="${esc(d.id)}">${reconOptions(m)}</select>`}</div></div>`;}).join('')}<div class="v58-recon-note">La riconciliazione aggiorna lo stato del Piano: <strong>Fatturabile → Parziale → Fatturato</strong>. “Fuori Piano” riduce il residuo dell’offerta senza consumare un evento.</div>`;
    box.querySelectorAll('[data-v58-recon]').forEach(sel=>sel.addEventListener('change',()=>{const m=draftMeta.get(sel.dataset.v58Recon);if(m){m.choice=sel.value;m.parts=[];m.suggested=false;reconError='';schedule();}}));
  }

  function validateReconciliation(){
    const ordered=currentDraftRows().map(d=>{const m=draftMeta.get(d.id);if(m)return m;const free=!!d.row?.querySelector('[data-free-amount]');return free?{id:d.id,description:d.description,amount:0,allocations:[],choice:'outside',parts:[],free:true}:{id:d.id,description:d.description,amount:0,allocations:[],choice:'',parts:[],missing:true};}),errors=[],assigned=new Map();
    ordered.forEach(m=>{
      if(m.free)return;
      if(m.missing){errors.push(`Riconciliazione non disponibile per ${m.description}.`);return;}
      if(m.parts?.length){m.parts.forEach(p=>{if(p.eventId&&p.eventId!=='outside')assigned.set(p.eventId,cents((assigned.get(p.eventId)||0)+p.amount));});return;}
      if(!m.choice){errors.push(`Scegli l’evento Piano o “Fuori Piano” per ${m.description}.`);return;}
      if(m.choice!=='outside')assigned.set(m.choice,cents((assigned.get(m.choice)||0)+m.amount));
    });
    assigned.forEach((amount,id)=>{const e=eventById(id);if(!e)errors.push('Evento Piano non disponibile.');else if(!e.matured)errors.push(`${e.eventLabel}: trigger non maturato.`);else if(amount>e.remaining+.01)errors.push(`${e.eventLabel}: ${money(amount)} € supera il residuo evento di ${money(e.remaining)} €.`);});
    return {ok:!errors.length,errors,ordered};
  }
  function reconsForMeta(meta){
    if(meta.parts?.length)return meta.parts.filter(p=>p.eventId&&p.eventId!=='outside').flatMap(p=>(p.allocations||[]).map(a=>({planEventId:p.eventId,offerLineId:a.offerLineId,phase:a.phase,amount:cents(a.amount)})));
    if(!meta.choice||meta.choice==='outside')return [];
    return (meta.allocations||[]).map(a=>({planEventId:meta.choice,offerLineId:a.offerLineId,phase:a.phase,amount:cents(a.amount)}));
  }
  function captureSave(e){
    const validation=validateReconciliation();if(!validation.ok){e.preventDefault();e.stopImmediatePropagation();reconError=validation.errors.join(' · ');renderReconciliation();return;}
    reconError='';const before=(model().invoices||[]).length,metas=validation.ordered.map(m=>JSON.parse(JSON.stringify(m)));
    setTimeout(()=>{
      const invoices=model().invoices||[];if(invoices.length<=before)return;const inv=invoices.at(-1);
      (inv.lines||[]).forEach((line,i)=>{line.planReconciliations=reconsForMeta(metas[i]||{});});
      draftMeta.clear();pendingLineEvents.clear();appliedEvents.clear();lastReconSig='';window.dispatchEvent(new CustomEvent('dabster-billing-reconciliation-change',{detail:{invoiceId:inv.id,invoiceNo:inv.number,summary:summary()}}));schedule();
    },0);
  }

  function installStyles(){
    if(document.getElementById('billingTriggerV58Styles'))return;const s=document.createElement('style');s.id='billingTriggerV58Styles';s.textContent=`
      .bw39-commessa,.bw39-offer{grid-template-columns:minmax(250px,1.7fr) 58px 58px 125px 120px 120px 125px 34px!important}.v58-owner{justify-content:center!important;font-weight:820!important;color:#3d5b68!important}.v58-billable{justify-content:flex-end!important;font-weight:850!important;color:#b35f24!important;background:#fff9f3}.v58-maincopy{display:block!important}.v58-maincopy strong{display:block}.v58-maincopy small{display:block;margin-top:2px;color:#7a878e;font-size:7.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v58-kpi-billable{border-color:#e9c9ad!important;background:#fff9f3!important}.v58-kpi-billable strong{color:#b35f24!important}
      .v58-side-badge{margin-left:auto;min-width:17px;padding:2px 5px;border-radius:999px;background:#fff1e6;color:#b35f24;font-size:7px;font-weight:850;text-align:center}.v58-billable-page{min-height:620px;background:#f4f6f7;border:1px solid #dbe2e5;border-radius:9px;padding:12px}.v58-page-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}.v58-page-top strong{font-size:15px;color:#304650}.v58-page-top span{display:block;margin-top:3px;font-size:8px;color:#738089}.v58-total{padding:7px 10px;border:1px solid #e4c6aa;border-radius:7px;background:#fff9f3;text-align:right}.v58-total span{font-size:7px;text-transform:uppercase;color:#886951}.v58-total strong{display:block;margin-top:2px;color:#b35f24;font-size:13px}.v58-table{border:1px solid #d8e0e4;border-radius:7px;overflow:hidden;background:#fff}.v58-row{display:grid;grid-template-columns:95px 115px 52px 52px minmax(170px,1fr) 120px 120px 92px;min-height:38px}.v58-row>div{display:flex;align-items:center;min-width:0;padding:6px 7px;border-right:1px solid #e7ecee;border-bottom:1px solid #e7ecee;font-size:8.2px;color:#40545f}.v58-row>div:last-child{border-right:0}.v58-row.head{min-height:28px;background:#f1f4f5}.v58-row.head>div{font-size:6.8px;font-weight:800;text-transform:uppercase;color:#67757e}.v58-code{font-weight:820;color:#31596b}.v58-state{display:inline-flex;padding:3px 6px;border-radius:999px;background:#fff1e6;color:#a65a27;font-size:7.2px;font-weight:800}.v58-open{height:25px;padding:0 7px;border:1px solid #c9d7dc;border-radius:5px;background:#fff;color:#426675;font-size:7.3px;font-weight:780;cursor:pointer}.v58-empty{padding:18px;text-align:center;color:#78858c;font-size:8.6px}.v58-anomaly{margin-top:8px;padding:7px 9px;border:1px solid #edc7ca;border-radius:6px;background:#fff3f3;color:#984c53;font-size:7.8px;font-weight:720}
      .v58-recon{margin:9px 0 0;border:1px solid #d8e2e5;border-radius:7px;overflow:hidden;background:#fbfcfc}.v58-recon-head{padding:7px 8px;background:#f2f6f7;border-bottom:1px solid #dfe7e9}.v58-recon-head strong{display:block;font-size:9px;color:#3c5662}.v58-recon-head span{display:block;margin-top:2px;font-size:7.3px;color:#75838a}.v58-recon-grid{display:grid;grid-template-columns:minmax(220px,1.4fr) 110px minmax(220px,1fr);min-height:36px}.v58-recon-grid>div{display:flex;align-items:center;min-width:0;padding:6px 8px;border-right:1px solid #e6ecee;border-bottom:1px solid #e6ecee;font-size:8px;color:#40545f}.v58-recon-grid>div:last-child{border-right:0}.v58-recon-grid.head{min-height:27px;background:#f7f9fa}.v58-recon-grid.head>div{font-size:6.8px;font-weight:800;text-transform:uppercase;color:#68777f}.v58-recon-grid small{display:block;margin-left:6px;color:#6c8792;font-size:6.8px}.v58-recon-grid select{width:100%;height:26px;border:1px solid #ccd8dd;border-radius:5px;background:#fff;color:#40545f;padding:0 6px;font-size:7.8px}.v58-money{justify-content:flex-end!important;font-weight:800}.v58-multi{padding:3px 6px;border-radius:999px;background:#edf4f6;color:#52717e;font-size:7px;font-weight:760}.v58-recon-note{padding:6px 8px;color:#6f7d84;font-size:7.3px}.v58-recon-error{padding:6px 8px;background:#fff3f3;color:#984c53;border-bottom:1px solid #ecc9cc;font-size:7.6px;font-weight:720}.v58-event-status{display:block;margin-top:2px;font-size:6.7px;font-weight:780}.v58-event-status.billable{color:#b35f24}.v58-event-status.done{color:#477255}.v58-event-status.wait{color:#7f898e}.v58-focus{box-shadow:inset 0 0 0 2px rgba(225,112,38,.28)!important;background:#fff8f1!important}
      @media(max-width:900px){.bw39-commessa,.bw39-offer{grid-template-columns:minmax(205px,1.4fr) 46px 46px 105px 105px 105px 110px 30px!important}.v58-row{grid-template-columns:80px 95px 45px 45px minmax(145px,1fr) 100px 105px 78px}}
    `;document.head.appendChild(s);
  }

  function enhanceKpis(){
    const root=document.querySelector('#billingDashboardPageV39:not([hidden]) .bw39-kpis'),billing=billingApi();if(!root||!billing)return;
    const m=billing.getOfferMetrics?.();if(!m)return;const s=summary();
    const html=`<div class="bw39-kpi"><span>Importo confermato</span><strong>${money(m.amount)} €</strong></div><div class="bw39-kpi"><span>Fatturato</span><strong>${money(m.billed)} €</strong></div><div class="bw39-kpi"><span>Residuo</span><strong>${money(m.residual)} €</strong></div><div class="bw39-kpi v58-kpi-billable"><span>Fatturabile</span><strong>${money(s.billable)} €</strong></div>`;
    if(root.innerHTML!==html)root.innerHTML=html;
  }
  function enhanceDashboardRows(){
    const page=document.querySelector('#billingDashboardPageV39:not([hidden])'),billing=billingApi();if(!page||!billing)return;const m=billing.getOfferMetrics?.(),o=offer(),r=responsibles(),s=summary();if(!m)return;
    const kind=page.querySelector('.bw39-row.head.bw39-commessa')?'commessa':page.querySelector('.bw39-row.head.bw39-offer')?'offer':'';if(!kind)return;
    const head=page.querySelector(`.bw39-row.head.bw39-${kind}`),row=page.querySelector(`.bw39-row.data.bw39-${kind}`);if(!head||!row)return;
    const label=kind==='commessa'?'Commessa':'Offerta',code=kind==='commessa'?o.commessa:o.code,subtitle=kind==='commessa'?(o.commessaLabel||o.title):(o.title||o.client||'');
    const hh=`<div>${label}</div><div>CC</div><div>CP</div><div>Importo confermato</div><div>Fatturato</div><div>Residuo</div><div>Fatturabile</div><div></div>`;
    const rh=`<div class="v58-maincopy"><strong class="bw39-code">${esc(code||'—')}</strong><small>${esc(subtitle||'')}</small></div><div class="v58-owner">${esc(r.cc)}</div><div class="v58-owner">${esc(r.cp)}</div><div class="bw39-money">${money(m.amount)} €</div><div class="bw39-money">${money(m.billed)} €</div><div class="bw39-money">${money(m.residual)} €</div><div class="v58-billable">${money(s.billable)} €</div><div class="bw39-arrow">›</div>`;
    if(head.innerHTML!==hh)head.innerHTML=hh;if(row.innerHTML!==rh)row.innerHTML=rh;
  }

  function ensureBillablePage(){
    let page=document.getElementById('billablePageV58');if(page)return page;
    page=document.createElement('section');page.id='billablePageV58';page.className='v58-billable-page';page.hidden=true;
    const anchor=document.getElementById('newInvoicePageV39')||document.getElementById('billingDashboardPageV39')||document.getElementById('kanbanPage')||document.querySelector('.main-card');anchor?.insertAdjacentElement('afterend',page);return page;
  }
  function installBillableMenu(){
    const nav=document.querySelector('#appSidebar .sidebar-nav');if(!nav)return;
    let btn=nav.querySelector('[data-page="billable"]');if(!btn){btn=document.createElement('button');btn.type='button';btn.className='sidebar-item';btn.dataset.page='billable';btn.innerHTML='<span class="side-icon">◇</span>Da fatturare<span class="v58-side-badge">0</span>';const billing=nav.querySelector('[data-page="billing"]');billing?.insertAdjacentElement('afterend',btn)||nav.appendChild(btn);btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showBillablePage();document.getElementById('appSidebar')?.classList.remove('open');document.getElementById('appSidebarOverlay')?.classList.remove('open');});}
    const badge=btn.querySelector('.v58-side-badge'),count=summary().count;if(badge&&badge.textContent!==String(count))badge.textContent=String(count);
  }
  function hideOtherPages(){
    const main=document.querySelector('.main-card');if(main)main.style.display='none';['kanbanPage','billingDashboardPageV39','newInvoicePageV39'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=true;});
  }
  function showBillablePage(){
    hideOtherPages();const page=ensureBillablePage();page.hidden=false;document.querySelectorAll('#appSidebar .sidebar-item').forEach(x=>x.classList.toggle('active',x.dataset.page==='billable'));const title=document.querySelector('.page-title');if(title)title.textContent='Da fatturare';const bc=document.querySelector('.breadcrumb');if(bc)bc.innerHTML='<span>⌂</span><span>›</span><strong>Da fatturare</strong>';history.replaceState(null,'','#da-fatturare');renderBillablePage();
  }
  function renderBillablePage(){
    const page=ensureBillablePage();if(!page||page.hidden)return;const s=summary(),o=offer(),r=responsibles(),items=s.events.filter(e=>e.billable>.01),sig=JSON.stringify(items.map(e=>[e.id,e.billable,e.status]).concat([[s.anomalies]]));if(sig===lastBillableSig&&page.innerHTML)return;lastBillableSig=sig;
    page.innerHTML=`<div class="v58-page-top"><div><strong>Da fatturare</strong><span>Eventi del Piano il cui trigger è maturato e non ancora completamente fatturati.</span></div><div class="v58-total"><span>Fatturabile ora</span><strong>${money(s.billable)} €</strong></div></div><div class="v58-table"><div class="v58-row head"><div>Commessa</div><div>Offerta</div><div>CC</div><div>CP</div><div>Evento</div><div>Stato</div><div>Fatturabile</div><div></div></div>${items.length?items.map(e=>`<div class="v58-row"><div class="v58-code">${esc(o.commessa||'—')}</div><div class="v58-code">${esc(o.code||'—')}</div><div>${esc(r.cc)}</div><div>${esc(r.cp)}</div><div><strong>${esc(e.eventLabel||'Evento')}</strong></div><div><span class="v58-state">${esc(e.status)}</span></div><div class="v58-billable">${money(e.billable)} €</div><div><button class="v58-open" data-v58-open="${esc(e.id)}">Apri fattura</button></div></div>`).join(''):'<div class="v58-empty">Nessun evento è fatturabile in questo momento.</div>'}</div>${s.anomalies?`<div class="v58-anomaly">${s.anomalies} evento/i hanno una fatturazione già registrata ma il trigger operativo è stato riaperto. Il residuo tornerà fatturabile quando l’attività verrà nuovamente chiusa.</div>`:''}`;
    page.querySelectorAll('[data-v58-open]').forEach(b=>b.addEventListener('click',()=>openInvoiceForEvent(b.dataset.v58Open)));
  }
  async function openInvoiceForEvent(id){
    pendingFocusEvent=String(id);if(!await ensureInvoiceLines())return;window.DABSTER_BILLING_PLAN_SOURCE_V57?.refresh?.();setTimeout(()=>{const btn=document.querySelector(`#newInvoicePageV39 [data-bp57-apply="${CSS.escape(String(id))}"]`),row=btn?.closest('.bp56-row');row?.classList.add('v58-focus');row?.scrollIntoView({behavior:'smooth',block:'center'});},100);
  }

  function decoratePlanPanels(){
    const states=new Map(eventStates().map(e=>[String(e.id),e]));
    document.querySelectorAll('#newInvoicePageV39 [data-bp57-apply]').forEach(btn=>{
      const e=states.get(String(btn.dataset.bp57Apply));if(!e)return;const inDraft=appliedEvents.has(String(e.id));let text='Applica',disabled=false,cls='billable';
      if(inDraft){text='In fattura ✓';disabled=true;cls='done';}
      else if(e.status==='Fatturato'){text='Fatturato';disabled=true;cls='done';}
      else if(e.billable<=.01){text=e.anomaly?'Trigger riaperto':'Non maturato';disabled=true;cls='wait';}
      if(btn.textContent!==text)btn.textContent=text;if(btn.disabled!==disabled)btn.disabled=disabled;
      const triggerCell=btn.closest('.bp56-row')?.children?.[2];if(triggerCell){let st=triggerCell.querySelector('.v58-event-status');if(!st){st=document.createElement('small');st.className='v58-event-status';triggerCell.appendChild(st);}st.className=`v58-event-status ${cls}`;const label=e.billable>.01?`${e.status} · ${money(e.billable)} €`:e.status;if(st.textContent!==label)st.textContent=label;}
      if(pendingFocusEvent===String(e.id))btn.closest('.bp56-row')?.classList.add('v58-focus');
    });
    document.querySelectorAll('#billingPlanBody .bp47-row').forEach(row=>{const e=states.get(String(row.dataset.rowId)),btn=row.querySelector('.bp51-invoice');if(!e||!btn)return;const disabled=e.billable<=.01||appliedEvents.has(String(e.id));if(btn.disabled!==disabled)btn.disabled=disabled;btn.title=e.billable>.01?`Fatturabile: ${money(e.billable)} €`:e.status;});
  }

  function schedule(){if(queued)return;queued=true;setTimeout(()=>{queued=false;patchPlanSeed();scanKanban();installBillableMenu();enhanceKpis();enhanceDashboardRows();renderBillablePage();renderReconciliation();decoratePlanPanels();},0);}
  function installEvents(){
    document.addEventListener('click',e=>{
      const apply=e.target.closest?.('[data-bp57-apply]');if(apply){e.preventDefault();e.stopImmediatePropagation();applyEvent(apply.dataset.bp57Apply);return;}
      const offerApply=e.target.closest?.('#billingPlanBody .bp51-invoice');if(offerApply){e.preventDefault();e.stopImmediatePropagation();const id=offerApply.closest('.bp47-row')?.dataset.rowId;if(id)applyEvent(id);return;}
      if(e.target.closest?.('[data-add-selected]'))captureAddSelected();
      if(e.target.closest?.('[data-group-draft]'))captureGroup();
      const split=e.target.closest?.('[data-split]');if(split)captureSplit(split);
      if(e.target.closest?.('[data-save-invoice]'))captureSave(e);
      if(e.target.closest?.('[data-cancel-invoice]')){draftMeta.clear();pendingLineEvents.clear();appliedEvents.clear();reconError='';lastReconSig='';}
      const side=e.target.closest?.('#appSidebar .sidebar-item');if(side&&side.dataset.page!=='billable'){const p=document.getElementById('billablePageV58');if(p)p.hidden=true;}
      setTimeout(schedule,0);
    },true);
    window.addEventListener('hashchange',schedule);window.addEventListener('dabster-offer-flow-change',schedule);window.addEventListener('dabster-billing-plan-ready',schedule);window.addEventListener('dabster-billing-reconciliation-change',schedule);window.addEventListener('dabster-plan-applied-to-lines',schedule);
  }
  function install(){
    installStyles();installEvents();observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true});
    let tries=0;const timer=setInterval(()=>{patchPlanSeed();schedule();if(++tries>240)clearInterval(timer);},50);if(location.hash==='#da-fatturare')setTimeout(showBillablePage,300);schedule();
    window.DABSTER_BILLING_TRIGGER_V58={getSnapshot:summary,getEventState:eventById,getActivities:()=>[...activities.values()],applyEvent,showBillablePage,responsibles};
  }
  install();
})();
