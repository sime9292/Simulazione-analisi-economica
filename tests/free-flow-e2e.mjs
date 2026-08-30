import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.DABSTER_BASE_URL||'http://127.0.0.1:8080';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const checks=[];
const mark=(name,detail={})=>{checks.push({name,ok:true,...detail});console.log('✓',name,JSON.stringify(detail));};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

try{
  await page.goto(`${base}/v66.html`,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForSelector('#dabsterEnvironmentBar',{timeout:20000});
  await page.waitForFunction(()=>window.DABSTER_OFFER_FLOW&&window.DABSTER_OFFER_LINES&&window.DABSTER_BILLING_PLAN_V47&&window.DABSTER_BILLING_TRIGGER_V58,{timeout:20000});

  const env=await page.evaluate(()=>window.DABSTER_TEST_HARNESS_V64?.getEnvironment?.());
  assert.equal(env,'free');
  mark('Ambiente Libero attivo');

  await page.waitForSelector('.offers38-empty');
  assert.match(await page.locator('.offers38-empty').innerText(),/Nessuna offerta presente/i);
  mark('Partenza senza offerte');

  await page.evaluate(()=>window.DABSTER_OFFER_FLOW.openNewOffer());
  await page.waitForSelector('.main-card',{state:'visible'});

  await page.evaluate(async()=>{
    const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const fire=(el,type='input')=>el?.dispatchEvent(new Event(type,{bubbles:true}));
    const field=label=>[...document.querySelectorAll('#tab-dati label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))||null;
    const ctrl=label=>field(label)?.querySelector('input,select,textarea')||null;
    const set=(el,v,type='input')=>{if(!el)return;el.value=String(v);fire(el,type);};
    const comm=ctrl('Commessa');if(comm instanceof HTMLSelectElement&&comm.options.length>1){comm.selectedIndex=1;fire(comm,'change');}
    set(ctrl('Titolo'),'Collaudo processo libero');
    set(ctrl('Codice'),'TEST_FREE_001');
    set(ctrl('Data offerta'),'30/08/2026');
    document.querySelector('.tab[data-tab="analisi"]')?.click();
    window.dabsterAnalysisSubtabs?.activate?.('impianti');
    await new Promise(r=>setTimeout(r,120));

    const wanted=new Set(['esecutivo','consulenze']);
    document.querySelectorAll('#tab-analisi .phase-row[data-economic-phase]').forEach(row=>{
      const p=row.dataset.economicPhase||'';
      row.dataset.economicActive=wanted.has(p)?'1':'0';
      row.hidden=!wanted.has(p);
      row.style.display=wanted.has(p)?'':'none';
      const input=row.querySelector('.ae-proposal');if(input){input.value=p==='esecutivo'?'10.000,00':p==='consulenze'?'5.000,00':'0,00';fire(input,'input');fire(input,'change');}
    });
    const trade=document.getElementById('tradePct');if(trade){trade.value='0';fire(trade,'input');}
    window.dabsterRecalcEconomic?.();

    document.querySelectorAll('#phaseWorkCards .activity-delete').forEach(b=>b.click());
    await new Promise(r=>setTimeout(r,80));
    async function addActivity(phase,name,role,hours){
      const card=[...document.querySelectorAll('#phaseWorkCards>.phase-work-card')].find(c=>(c.querySelector('.phase-type-select')?.value||c.dataset.planningPhase||'')===phase);
      if(!card)throw new Error('Fase non trovata: '+phase);
      card.querySelector('.add-activity')?.click();await new Promise(r=>setTimeout(r,70));
      const a=[...card.querySelectorAll('.activity-card')].at(-1);if(!a)throw new Error('Attività non creata: '+name);
      const n=a.querySelector('.activity-name');n.value=name;fire(n,'input');fire(n,'change');
      const rows=a.querySelector('.assignment-rows');if(rows)rows.innerHTML='';
      a.querySelector('.add-assignment')?.click();await new Promise(r=>setTimeout(r,30));
      const row=a.querySelector('.assignment-row:last-child');
      const rs=row?.querySelector('.assignment-role'),hs=row?.querySelector('.assignment-hours');
      if(rs){rs.value=role;fire(rs,'change');}if(hs){hs.value=String(hours);fire(hs,'input');fire(hs,'change');}
    }
    await addActivity('esecutivo','Consegna progetto test','RS_IE',10);
    await addActivity('consulenze','Consulenza test','PM',4);
    window.dabsterRecalcEconomic?.();
    await new Promise(r=>setTimeout(r,150));
  });

  const econ=await page.evaluate(()=>({gross:document.getElementById('aeGross')?.textContent,total:document.getElementById('totaleOfferta')?.value,activities:[...document.querySelectorAll('.activity-name')].map(x=>x.value).filter(Boolean)}));
  assert.ok(econ.activities.includes('Consegna progetto test'));
  assert.ok(econ.activities.includes('Consulenza test'));
  mark('Analisi compilata con attività e ore',{activities:econ.activities.length});

  await page.evaluate(()=>{
    const s=[...document.querySelectorAll('#tab-dati label.field')].find(x=>String(x.querySelector(':scope > span')?.textContent||'').toLowerCase().startsWith('stato'))?.querySelector('select');
    if(![...s.options].some(o=>String(o.value||o.textContent).toLowerCase()==='confermata'))s.add(new Option('Confermata','Confermata'));
    s.value=[...s.options].find(o=>String(o.value||o.textContent).toLowerCase()==='confermata').value;
    s.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.waitForFunction(()=>!document.getElementById('confirmationAmountsSection')?.hidden,{timeout:10000});
  await page.evaluate(()=>{
    const fire=el=>{el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('blur',{bubbles:true}));};
    [['confirmationProjects','10000'],['confirmationConsulting','5000'],['confirmationDirection','0']].forEach(([id,v])=>{const el=document.getElementById(id);el.value=v;fire(el);});
    window.DABSTER_OFFER_LINES.sync();
  });
  await page.waitForFunction(()=>window.DABSTER_OFFER_LINES?.readyForInvoicing===true,{timeout:10000});
  const lines=await page.evaluate(()=>window.DABSTER_OFFER_LINES.lines.map(x=>({id:x.id,phase:x.phase,description:x.description,amount:x.amount})));
  assert.equal(Math.round(lines.reduce((s,x)=>s+Number(x.amount||0),0)),15000);
  assert.ok(lines.some(x=>x.phase==='esecutivo'&&Math.round(x.amount)===10000));
  assert.ok(lines.some(x=>x.phase==='consulenze'&&Math.round(x.amount)===5000));
  mark('Conferma e Righe Offerta quadrate',{total:15000,lines:lines.length});

  const seed=await page.evaluate(()=>window.DABSTER_BILLING_PLAN_V47.seed([
    {id:'TEST_FREE_001:plan:deposit',baseType:'offer',eventLabel:'Acconto 10%',percent:10,driver:'percent',trigger:'confirmation'},
    {id:'TEST_FREE_001:plan:delivery',baseType:'line',basePhase:'esecutivo',eventLabel:'Consegna progetto 50%',percent:50,driver:'percent',trigger:'activity_closed',activityPhase:'esecutivo',activityName:'Consegna progetto test'}
  ],{replace:true}));
  assert.equal(seed.incomplete,0);
  await sleep(300);
  let trigger=await page.evaluate(()=>window.DABSTER_BILLING_TRIGGER_V58.getSnapshot());
  assert.equal(Math.round(trigger.billable),1500);
  assert.equal(trigger.events.find(x=>x.id==='TEST_FREE_001:plan:delivery')?.status,'Non maturato');
  mark('Piano: acconto matura alla conferma',{billable:trigger.billable});

  await page.evaluate(()=>document.querySelector('#appSidebar .sidebar-item[data-page="kanban"]')?.click());
  await page.waitForSelector('#kanbanPage:not([hidden])');
  await page.locator('.kanban-phase-tab[data-phase="esecutivo"]').click();
  await page.waitForSelector('.kanban-list[data-status="programmazione"] .kanban-card');
  await page.locator('.kanban-list[data-status="programmazione"] .kanban-card .kb-move.next').click();
  await sleep(180);
  await page.locator('.kanban-list[data-status="lavorazione"] .kanban-card .kb-move.next').click();
  await sleep(500);
  trigger=await page.evaluate(()=>window.DABSTER_BILLING_TRIGGER_V58.getSnapshot());
  const delivery=trigger.events.find(x=>x.id==='TEST_FREE_001:plan:delivery');
  assert.equal(delivery?.status,'Fatturabile');
  assert.equal(Math.round(delivery?.billable||0),5000);
  assert.equal(Math.round(trigger.billable),6500);
  mark('Chiusura attività attiva il trigger',{deliveryBillable:delivery.billable,totalBillable:trigger.billable});

  await page.evaluate(()=>window.DABSTER_BILLING_TRIGGER_V58.applyEvent('TEST_FREE_001:plan:delivery'));
  await page.waitForSelector('#newInvoicePageV39:not([hidden])',{timeout:15000});
  await page.waitForSelector('[data-add-selected]:not([disabled])',{timeout:10000});
  await page.locator('[data-add-selected]').click();
  await page.waitForSelector('[data-draft-desc]',{timeout:10000});
  await sleep(250);
  await page.locator('[data-save-invoice]').click();
  await page.waitForSelector('#billingDashboardPageV39:not([hidden])',{timeout:10000});

  const billing=await page.evaluate(()=>({model:window.DABSTER_BILLING_V39.getModel(),metrics:window.DABSTER_BILLING_V39.getOfferMetrics(),trigger:window.DABSTER_BILLING_TRIGGER_V58.getSnapshot()}));
  assert.equal(billing.model.invoices.length,1);
  assert.equal(Math.round(billing.metrics.billed),5000);
  assert.equal(Math.round(billing.metrics.residual),10000);
  const afterEvent=billing.trigger.events.find(x=>x.id==='TEST_FREE_001:plan:delivery');
  assert.equal(afterEvent.status,'Fatturato');
  assert.equal(Math.round(billing.trigger.billable),1500);
  mark('Fattura salvata e residui aggiornati',{billed:billing.metrics.billed,residual:billing.metrics.residual,remainingBillable:billing.trigger.billable});

  await page.evaluate(async()=>{
    window.DABSTER_BILLING_PLAN_V47?.reset?.();
    window.DABSTER_OFFER_LINES?.resetPostConfirmation?.();
    if(window.DABSTER_BILLING_MODEL_V39?.invoices)window.DABSTER_BILLING_MODEL_V39.invoices.splice(0);
    await window.DABSTER_OFFER_FLOW.openNewOffer();
    [...sessionStorage.keys()].filter(k=>k.startsWith('dabster.billing.plan.v47.')).forEach(k=>sessionStorage.removeItem(k));
    window.DABSTER_OFFER_FLOW.showOffers();
  });
  await page.waitForSelector('.offers38-empty');
  assert.match(await page.locator('.offers38-empty').innerText(),/Nessuna offerta presente/i);
  const clean=await page.evaluate(()=>({offer:window.DABSTER_OFFER_FLOW.getSnapshot(),plan:window.DABSTER_BILLING_PLAN_V47.getSnapshot(),invoices:window.DABSTER_BILLING_MODEL_V39?.invoices||[]}));
  assert.equal(clean.offer.loadedOffer,false);
  assert.equal(clean.plan.rows.length,0);
  assert.equal(clean.invoices.length,0);
  mark('Pulizia finale completata',{offers:0,planRows:0,invoices:0});

  console.log('E2E_RESULT='+JSON.stringify({ok:true,checks}));
} catch(err){
  console.error('E2E_RESULT='+JSON.stringify({ok:false,checks,error:String(err?.stack||err)}));
  throw err;
} finally {
  await browser.close();
}
