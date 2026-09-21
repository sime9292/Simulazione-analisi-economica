/* v100 - Additive authorization workflow over v99. Previous versions are untouched. */
(function(){
  if(window.DABSTER_BILLING_CONTROL_V100_API)return;

  var KEY='dabster.billing.control.v100';
  var store={commesse:[],authorizations:[],audit:[],loaded:false};
  var page=null, currentView='', selectedReady={}, selectedCommessa='', commessaTab='offerte';
  var filters={cp:'',commessa:'',client:'',offer:'',date:''};

  function clone(v){return JSON.parse(JSON.stringify(v));}
  function cents(n){return Math.round((Number(n||0)+Number.EPSILON)*100)/100;}
  function money(n){return Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});}
  function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function uid(p){return p+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);}
  function today(){return new Date().toISOString().slice(0,10);}
  function wait(ms){return new Promise(function(r){setTimeout(r,ms);});}
  function load(){try{var x=JSON.parse(sessionStorage.getItem(KEY)||'null');if(x&&Array.isArray(x.commesse))store=x;}catch(e){}}
  function save(){try{sessionStorage.setItem(KEY,JSON.stringify(store));}catch(e){}window.dispatchEvent(new CustomEvent('dabster-billing-control-v100-change',{detail:snapshot()}));}
  load();

  function model(){
    if(!window.DABSTER_BILLING_MODEL_V39)window.DABSTER_BILLING_MODEL_V39={invoices:[]};
    if(!Array.isArray(window.DABSTER_BILLING_MODEL_V39.invoices))window.DABSTER_BILLING_MODEL_V39.invoices=[];
    return window.DABSTER_BILLING_MODEL_V39;
  }
  function invoices(){return model().invoices;}
  function allOffers(){
    var out=[];
    (store.commesse||[]).forEach(function(c){
      (c.offers||[]).forEach(function(o){
        var x=Object.assign({},o);
        x.commessaCode=c.code;x.commessaDescription=c.description;x.commessaClient=c.client;x.cp=o.cp||c.cp||'';
        out.push(x);
      });
    });
    return out;
  }
  function findCommessa(code){return (store.commesse||[]).find(function(c){return c.code===code;})||null;}
  function findOffer(code){return allOffers().find(function(o){return o.code===code;})||null;}
  function planRef(id){
    var found=null;
    (store.commesse||[]).some(function(c){
      return (c.offers||[]).some(function(o){
        var p=(o.plan||[]).find(function(x){return x.id===id;});
        if(p){found={commessa:c,offer:o,plan:p};return true;}
        return false;
      });
    });
    return found;
  }
  function invoiceLinesForPlan(planId){
    var out=[];
    invoices().forEach(function(inv){
      (inv.lines||[]).forEach(function(line){
        if(line.originV100&&line.originV100.planRowId===planId)out.push({invoice:inv,line:line});
      });
    });
    return out;
  }
  function invoicedForPlan(planId){return cents(invoiceLinesForPlan(planId).reduce(function(s,x){return s+Number(x.line.amount||0);},0));}
  function authForPlan(planId){
    return (store.authorizations||[]).filter(function(a){return a.planRowId===planId&&a.status!=='revoked';}).sort(function(a,b){return String(b.createdAt).localeCompare(String(a.createdAt));})[0]||null;
  }
  function isAuthInvoiced(a){
    return invoices().some(function(inv){return (inv.lines||[]).some(function(l){return l.originV100&&l.originV100.authorizationId===a.id;});});
  }
  function conditionReached(o,p){
    var c=p.condition||{};
    if(c.type==='confirmation')return norm(o.status)==='confermata';
    if(c.type==='manual')return !!c.reached;
    if(c.type==='activities'){
      var ids=c.activityIds||[];
      if(!ids.length)return false;
      return ids.every(function(id){var a=(o.activities||[]).find(function(x){return x.id===id;});return !!a&&a.status==='chiusa';});
    }
    return false;
  }
  function conditionLabel(o,p){
    var c=p.condition||{};
    if(c.type==='confirmation')return 'Offerta confermata';
    if(c.type==='manual')return c.label||'Condizione manuale';
    if(c.type==='activities'){
      return (c.activityIds||[]).map(function(id){
        var a=(o.activities||[]).find(function(x){return x.id===id;});
        return a?a.name:id;
      }).join(' + ');
    }
    return '—';
  }
  function stateFor(o,p){
    var billed=invoicedForPlan(p.id),auth=authForPlan(p.id),reached=conditionReached(o,p);
    if(billed>=Number(p.amount||0)-0.01)return {key:'fatturato',label:'Fatturato',billed:billed,auth:auth,reached:reached};
    if(billed>0.01)return {key:'parziale',label:'Parziale',billed:billed,auth:auth,reached:reached};
    if(auth&&!isAuthInvoiced(auth))return {key:'da_fatturare',label:'Da fatturare',billed:billed,auth:auth,reached:reached,warning:!reached};
    if(reached)return {key:'da_autorizzare',label:'Da autorizzare',billed:billed,auth:null,reached:reached};
    return {key:'programmato',label:'Programmato',billed:billed,auth:null,reached:reached};
  }
  function offerMetrics(o){
    var m={confirmed:Number(o.amount||0),billed:0,ready:0,authorize:0,future:0,partial:0};
    (o.plan||[]).forEach(function(p){
      var s=stateFor(o,p),open=Math.max(0,Number(p.amount||0)-Number(s.billed||0));
      m.billed=cents(m.billed+Number(s.billed||0));
      if(s.key==='da_fatturare')m.ready=cents(m.ready+open);
      else if(s.key==='da_autorizzare')m.authorize=cents(m.authorize+open);
      else if(s.key==='programmato')m.future=cents(m.future+open);
      else if(s.key==='parziale')m.partial=cents(m.partial+open);
    });
    return m;
  }
  function commessaMetrics(c){
    var m={confirmed:0,billed:0,ready:0,authorize:0,future:0,partial:0};
    (c.offers||[]).forEach(function(o){var x=offerMetrics(o);Object.keys(m).forEach(function(k){m[k]=cents(m[k]+Number(x[k]||0));});});
    return m;
  }
  function snapshot(){return clone({commesse:store.commesse,authorizations:store.authorizations,audit:store.audit});}
  function audit(type,data){
    store.audit=store.audit||[];
    store.audit.push(Object.assign({id:uid('audit'),type:type,at:new Date().toISOString(),user:'Utente test'},clone(data||{})));
    if(store.audit.length>300)store.audit=store.audit.slice(-300);
  }

  function authorize(planId,note){
    var r=planRef(planId);if(!r)return false;
    var st=stateFor(r.offer,r.plan);if(st.key!=='da_autorizzare')return false;
    var a={id:uid('auth'),planRowId:planId,offerCode:r.offer.code,commessa:r.commessa.code,client:r.offer.client,amount:Number(r.plan.amount||0),note:String(note||'').trim(),status:'active',createdAt:new Date().toISOString(),user:'CP test'};
    store.authorizations.push(a);audit('authorization_created',{authorizationId:a.id,planRowId:planId,amount:a.amount});save();return a;
  }
  function revoke(authId){
    var a=(store.authorizations||[]).find(function(x){return x.id===authId;});
    if(!a||isAuthInvoiced(a))return false;
    a.status='revoked';a.revokedAt=new Date().toISOString();audit('authorization_revoked',{authorizationId:a.id,planRowId:a.planRowId});save();return true;
  }

  function demoDefinitions(){
    return [
      {code:'XX_XXX',description:'Riqualificazione sede direzionale',client:'ALFA SRL',cp:'CP Rossi',offers:[
        {code:'XX_XXXpe02',description:'Variante impianti',client:'ALFA SRL',cp:'CP Rossi',status:'Confermata',amount:10000,confirmationDate:'2026-09-12',
          lines:[{id:'xx2-l-var',phase:'variante',description:'Progettazione variante impianti',amount:6000},{id:'xx2-l-coord',phase:'consulenze',description:'Coordinamento tecnico variante',amount:4000}],
          activities:[{id:'xx2-a-consegna',phase:'variante',name:'Consegna elaborati variante',status:'programmazione'},{id:'xx2-a-chiusura',phase:'consulenze',name:'Chiusura coordinamento variante',status:'programmazione'}],
          plan:[
            {id:'xx2-p-acconto',eventLabel:'Acconto 20%',amount:2000,allocations:[{lineId:'xx2-l-var',amount:1200},{lineId:'xx2-l-coord',amount:800}],condition:{type:'confirmation'},conditionDate:'2026-09-12'},
            {id:'xx2-p-var',eventLabel:'Saldo variante 80%',amount:4800,allocations:[{lineId:'xx2-l-var',amount:4800}],condition:{type:'activities',activityIds:['xx2-a-consegna']}},
            {id:'xx2-p-coord',eventLabel:'Saldo coordinamento 80%',amount:3200,allocations:[{lineId:'xx2-l-coord',amount:3200}],condition:{type:'activities',activityIds:['xx2-a-chiusura']}}
          ]},
        {code:'XX_XXXpe03',description:'Prestazioni tecniche integrative',client:'ALFA SRL',cp:'CP Rossi',status:'Confermata',amount:5000,confirmationDate:'2026-09-14',
          lines:[{id:'xx3-l-int',phase:'consulenze',description:'Prestazioni tecniche integrative',amount:5000}],
          activities:[{id:'xx3-a-close',phase:'consulenze',name:'Chiusura prestazioni integrative',status:'programmazione'}],
          plan:[
            {id:'xx3-p-acconto',eventLabel:'Acconto 20%',amount:1000,allocations:[{lineId:'xx3-l-int',amount:1000}],condition:{type:'confirmation'},conditionDate:'2026-09-14'},
            {id:'xx3-p-saldo',eventLabel:'Saldo prestazioni integrative 80%',amount:4000,allocations:[{lineId:'xx3-l-int',amount:4000}],condition:{type:'activities',activityIds:['xx3-a-close']}}
          ]}
      ]},
      {code:'YY_YYY',description:'Adeguamento edificio produttivo',client:'BETA SPA',cp:'CP Bianchi',offers:[
        {code:'YY_YYYpe01',description:'Progettazione adeguamenti',client:'BETA SPA',cp:'CP Bianchi',status:'Confermata',amount:12000,confirmationDate:'2026-09-16',
          lines:[{id:'yy1-l-prog',phase:'esecutivo',description:'Progettazione adeguamenti',amount:12000}],
          activities:[{id:'yy1-a-close',phase:'esecutivo',name:'Consegna progetto adeguamenti',status:'programmazione'}],
          plan:[
            {id:'yy1-p-acconto',eventLabel:'Acconto 20%',amount:2400,allocations:[{lineId:'yy1-l-prog',amount:2400}],condition:{type:'confirmation'},conditionDate:'2026-09-16'},
            {id:'yy1-p-saldo',eventLabel:'Saldo progettazione 80%',amount:9600,allocations:[{lineId:'yy1-l-prog',amount:9600}],condition:{type:'activities',activityIds:['yy1-a-close']}}
          ]},
        {code:'YY_YYYpe02',description:'Direzione lavori',client:'BETA SPA',cp:'CP Bianchi',status:'Confermata',amount:8000,confirmationDate:'2026-07-20',
          lines:[{id:'yy2-l-dl',phase:'dl',description:'Direzione lavori',amount:8000}],
          activities:[{id:'yy2-a-close',phase:'dl',name:'Chiusura direzione lavori',status:'chiusa'}],
          plan:[
            {id:'yy2-p-acconto',eventLabel:'Acconto 20%',amount:1600,allocations:[{lineId:'yy2-l-dl',amount:1600}],condition:{type:'confirmation'},conditionDate:'2026-07-20'},
            {id:'yy2-p-saldo',eventLabel:'Saldo DL 80%',amount:6400,allocations:[{lineId:'yy2-l-dl',amount:6400}],condition:{type:'activities',activityIds:['yy2-a-close']},conditionDate:'2026-08-24'}
          ]}
      ]}
    ];
  }

  function seedDemoInvoices(){
    var m=model();
    m.invoices=(m.invoices||[]).filter(function(x){return !x.demoV100;});
    function make(id,number,date,client,commessa,offerCode,rows){
      var taxable=cents(rows.reduce(function(s,r){return s+r.amount;},0)),fund=cents(taxable*0.04),vat=cents((taxable+fund)*0.22),total=cents(taxable+fund+vat);
      return {id:id,number:number,date:date,client:client,commessa:commessa,offerCode:offerCode,due:'30 gg',payment:'Bonifico',demoV100:true,incassato:0,
        lines:rows.map(function(r,i){return {id:id+'-'+(i+1),description:r.description,amount:r.amount,vat:22,originType:'offer',allocations:r.allocations||[],originV100:{planRowId:r.planRowId,offerCode:offerCode,commessa:commessa,authorizationId:''}};}),
        registerV97:{commessa:commessa,offerCode:offerCode,type:'Elettronica',taxable:taxable,fund:fund,vat:vat,total:total,received:0,dueDate:''}};
    }
    m.invoices.push(
      make('v100-ft-001','FT DEMO/001','2026-09-01','ALFA SRL','XX_XXX','XX_XXXpe01',[
        {description:'Acconto 20% progettazione impianti',amount:3600,planRowId:'xx1-p-acconto',allocations:[{offerLineId:'xx1-l-def',phase:'definitivo',amount:1200},{offerLineId:'xx1-l-esec',phase:'esecutivo',amount:1600},{offerLineId:'xx1-l-cons',phase:'consulenze',amount:800}]}
      ]),
      make('v100-ft-002','FT DEMO/002','2026-08-25','BETA SPA','YY_YYY','YY_YYYpe02',[
        {description:'Acconto Direzione lavori',amount:1600,planRowId:'yy2-p-acconto',allocations:[{offerLineId:'yy2-l-dl',phase:'dl',amount:1600}]},
        {description:'Saldo Direzione lavori',amount:6400,planRowId:'yy2-p-saldo',allocations:[{offerLineId:'yy2-l-dl',phase:'dl',amount:6400}]}
      ])
    );
  }

  function prepareExistingFixture(){
    var api=window.DABSTER_TEST_FIXTURE_V92_API, f=api&&api.fixture;if(!f)return;
    f.id='XX_XXX';f.customer='ALFA SRL';
    f.offer.code='XX_XXXpe01';f.offer.commessa='XX_XXX';f.offer.commessaLabel='XX_XXX - ALFA SRL - RIQUALIFICAZIONE SEDE DIREZIONALE';f.offer.title='Progettazione impianti';
    var desc={definitivo:'Progettazione definitiva impianti',esecutivo:'Progettazione esecutiva impianti',consulenze:'Consulenza tecnica specialistica'};
    (f.lines||[]).forEach(function(x){x.description=desc[x.phase]||x.description;});
  }
  function buildLivePe01(){
    var snap=window.DABSTER_OFFER_FLOW&&window.DABSTER_OFFER_FLOW.getSnapshot?window.DABSTER_OFFER_FLOW.getSnapshot():{};
    var ps=window.DABSTER_BILLING_PLAN_V47&&window.DABSTER_BILLING_PLAN_V47.getSnapshot?window.DABSTER_BILLING_PLAN_V47.getSnapshot():{rows:[]};
    var domain=window.DABSTER_ACTIVITY_DOMAIN_V95||window.DABSTER_ACTIVITY_DOMAIN_V84||window.DABSTER_ACTIVITY_DOMAIN_V82||window.DABSTER_ACTIVITY_DOMAIN;
    var acts=(domain&&domain.getActivities?domain.getActivities():[]).map(function(a){return {id:a.id,phase:a.phaseType,name:a.title,status:a.status};});
    var lines=(snap.lines||[]).map(function(x,i){
      var id=x.id||('xx1-line-'+i);
      if(x.phase==='definitivo')id='xx1-l-def';else if(x.phase==='esecutivo')id='xx1-l-esec';else if(x.phase==='consulenze')id='xx1-l-cons';
      return {id:id,phase:x.phase,description:x.description,amount:Number(x.amount||0),sourceId:x.id};
    });
    var plans=(ps.rows||[]).map(function(r,i){
      var ids=['xx1-p-acconto','xx1-p-def','xx1-p-esec','xx1-p-cons'];
      var resolved=r.activityKey&&domain&&domain.resolveKey?domain.resolveKey(r.activityKey):null;
      var alloc=(r.allocations||[]).map(function(a){
        var src=lines.find(function(l){return l.sourceId===a.lineId;});
        return {lineId:src?src.id:a.lineId,amount:Number(a.amount||0)};
      });
      return {id:ids[i]||String(r.id||uid('xx1-p')),eventLabel:r.eventLabel,amount:Number(r.calculatedAmount||r.amount||0),allocations:alloc,
        condition:r.trigger==='activity_closed'?{type:'activities',activityIds:resolved?[resolved.id]:[]}:{type:'confirmation'},
        conditionDate:i===0?'2026-08-30':i===1?'2026-09-21':''};
    });
    return {code:'XX_XXXpe01',description:'Progettazione impianti',client:'ALFA SRL',cp:'CP Rossi',status:'Confermata',amount:18000,confirmationDate:'2026-08-30',lines:lines,activities:acts,plan:plans};
  }
  async function seedAfterFixture(){
    var i;
    for(i=0;i<260;i++){
      var s=window.DABSTER_OFFER_FLOW&&window.DABSTER_OFFER_FLOW.getSnapshot?window.DABSTER_OFFER_FLOW.getSnapshot():null;
      var p=window.DABSTER_BILLING_PLAN_V47&&window.DABSTER_BILLING_PLAN_V47.getSnapshot?window.DABSTER_BILLING_PLAN_V47.getSnapshot():null;
      if(s&&s.offer&&s.offer.code==='XX_XXXpe01'&&p&&Math.abs(Number(p.allocated||0)-18000)<0.01&&(p.rows||[]).length===4)break;
      await wait(50);
    }
    var domain=window.DABSTER_ACTIVITY_DOMAIN_V95||window.DABSTER_ACTIVITY_DOMAIN_V84||window.DABSTER_ACTIVITY_DOMAIN_V82||window.DABSTER_ACTIVITY_DOMAIN;
    if(domain&&domain.reconcile)domain.reconcile('v100-fixture');
    await wait(80);
    var def=domain&&domain.getActivities?domain.getActivities().find(function(a){return norm(a.title)==='consegna progetto definitivo';}):null;
    if(def&&domain.setStatus)domain.setStatus(def.id,'chiusa','v100-fixture');
    await wait(80);
    var defs=demoDefinitions();
    defs[0].offers.unshift(buildLivePe01());
    store={commesse:defs,authorizations:[],audit:[],loaded:true};
    seedDemoInvoices();
    authorize('xx2-p-acconto','Fatturare acconto variante come concordato.');
    authorize('xx3-p-acconto','Inserire riferimento alle prestazioni integrative.');
    save();
    selfTest();
    showDashboard();
  }

  function installFixtureHook(){
    document.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('#dabsterEnvironmentBar [data-load]');if(!b)return;
      prepareExistingFixture();store={commesse:[],authorizations:[],audit:[],loaded:false};save();setTimeout(seedAfterFixture,30);
    },true);
    var mo=new MutationObserver(function(){
      var lab=document.querySelector('#dabsterEnvironmentBar .v92-fixture');
      var f=window.DABSTER_TEST_FIXTURE_V92_API&&window.DABSTER_TEST_FIXTURE_V92_API.fixture;
      if(lab&&f&&f.id==='XX_XXX')lab.textContent='XX_XXX · 2 commesse / 5 offerte · Analisi + attività + Righe Offerta + Piano + Autorizzazioni';
    });
    mo.observe(document.documentElement,{childList:true,subtree:true});
  }

  function installStyles(){
    if(document.getElementById('bc100Styles'))return;
    var s=document.createElement('style');s.id='bc100Styles';
    s.textContent=
      '#billingControlPageV100[hidden]{display:none!important}#billingControlPageV100{min-height:650px;background:#f5f7f8;border:1px solid #dbe3e6;border-radius:9px;padding:12px;font-family:Arial,sans-serif;color:#3e515b}'+
      '.bc100-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:10px}.bc100-title strong{display:block;font-size:15px;color:#2f4651}.bc100-title span{display:block;margin-top:3px;font-size:8.4px;color:#72818a}.bc100-actions{display:flex;gap:6px;flex-wrap:wrap}'+
      '.bc100-btn{height:31px;padding:0 11px;border:1px solid #cad5da;border-radius:6px;background:#fff;color:#4e626c;font-size:8.5px;font-weight:780;cursor:pointer}.bc100-btn.primary{background:#ef6d24;border-color:#dc611b;color:#fff}.bc100-btn.blue{background:#4d7f91;border-color:#416f80;color:#fff}.bc100-btn:disabled{opacity:.45;cursor:not-allowed}'+
      '.bc100-kpis{display:grid;grid-template-columns:repeat(5,minmax(110px,1fr));gap:7px;margin-bottom:10px}.bc100-kpi{padding:9px 10px;border:1px solid #dce4e7;border-radius:8px;background:#fff}.bc100-kpi span{display:block;font-size:7px;font-weight:800;color:#75828a;text-transform:uppercase}.bc100-kpi strong{display:block;margin-top:4px;font-size:13px;color:#314a55}.bc100-kpi.orange strong{color:#d96c29}.bc100-kpi.blue strong{color:#397a96}.bc100-kpi.green strong{color:#3a7a51}'+
      '.bc100-table{border:1px solid #d8e1e4;border-radius:8px;overflow:auto;background:#fff}.bc100-row{display:grid;min-width:1100px;min-height:42px}.bc100-row>div{display:flex;align-items:center;min-width:0;padding:6px 8px;border-right:1px solid #e8edef;border-bottom:1px solid #e8edef;font-size:8.4px}.bc100-row>div:last-child{border-right:0}.bc100-row.head{min-height:31px;background:#e9edef}.bc100-row.head>div{font-size:6.9px;font-weight:800;text-transform:uppercase;color:#687780}.bc100-row.clickable{cursor:pointer}.bc100-row.clickable:hover{background:#fff7f0}.bc100-money{justify-content:flex-end;font-weight:780;font-variant-numeric:tabular-nums}'+
      '.bc100-pill{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:7.2px;font-weight:800}.bc100-pill.programmato{background:#edf0f2;color:#65747c}.bc100-pill.da_autorizzare{background:#fff0e4;color:#a45d25}.bc100-pill.da_fatturare{background:#eaf3fa;color:#397795}.bc100-pill.fatturato{background:#e8f5ec;color:#3d7650}.bc100-pill.parziale{background:#f1ecff;color:#7052a0}'+
      '.bc100-filters{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:7px;margin-bottom:9px}.bc100-filter{display:grid;gap:3px}.bc100-filter span{font-size:6.8px;font-weight:800;color:#72818a;text-transform:uppercase}.bc100-filter input,.bc100-filter select,.bc100-note{height:29px;border:1px solid #cdd8dd;border-radius:5px;background:#fff;padding:0 7px;font-size:8.2px;color:#40545e;box-sizing:border-box;width:100%}'+
      '.bc100-tabs{display:flex;gap:5px;margin:8px 0}.bc100-tab{height:30px;padding:0 11px;border:1px solid #cdd8dc;border-radius:6px;background:#fff;color:#536771;font-size:8.2px;font-weight:760;cursor:pointer}.bc100-tab.active{background:#eaf1f4;color:#345f70;border-color:#a9c1cb}'+
      '.bc100-group{margin:8px 0;border:1px solid #dce4e7;border-radius:8px;background:#fff;overflow:hidden}.bc100-group-head{padding:8px 10px;background:#f1f5f6;font-size:9px;font-weight:800;color:#3e5661}.bc100-warn{margin-top:5px;padding:5px 7px;border-radius:5px;background:#fff2e8;color:#9a5d2e;font-size:7.7px}.bc100-empty{padding:28px;text-align:center;color:#75838b;font-size:9px}.bc100-check{width:16px;height:16px}'+
      '.bc100-invoice-card{border:1px solid #d9e2e5;border-radius:8px;background:#fff;padding:10px;margin-bottom:9px}.bc100-fields{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:8px}.bc100-field{display:grid;gap:4px}.bc100-field span{font-size:7px;font-weight:800;text-transform:uppercase;color:#6f7f88}.bc100-field input{height:32px;border:1px solid #ccd7dc;border-radius:5px;padding:0 8px;font-size:8.8px}'+
      '@media(max-width:900px){.bc100-kpis{grid-template-columns:repeat(2,1fr)}.bc100-filters,.bc100-fields{grid-template-columns:1fr 1fr}}';
    document.head.appendChild(s);
  }
  function ensurePage(){
    if(page)return page;
    var main=document.querySelector('.page-shell .main-card');if(!main)return null;
    page=document.createElement('section');page.id='billingControlPageV100';page.hidden=true;main.insertAdjacentElement('afterend',page);return page;
  }
  function hideOthers(){
    var main=document.querySelector('.main-card');if(main)main.style.setProperty('display','none');
    ['kanbanPage','offersListPage','billingDashboardLiveV87','billingDashboardPageV39','billingDashboardEmptyV86','newInvoicePageV39','billablePageV58','invoiceRegisterPageV97','receiptAllocationPageV99'].forEach(function(id){var el=document.getElementById(id);if(el)el.hidden=true;});
  }
  function chrome(title,key){
    var t=document.querySelector('.page-title');if(t)t.textContent=title;
    var bc=document.querySelector('.breadcrumb');if(bc)bc.innerHTML='<span>⌂</span><span>›</span><strong>'+esc(title)+'</strong>';
    document.querySelectorAll('#appSidebar .sidebar-item').forEach(function(x){x.classList.toggle('active',x.dataset.page===key);});
  }
  function showBase(view,title,key){if(!ensurePage())return;hideOthers();page.hidden=false;currentView=view;chrome(title,key);document.getElementById('appSidebar')&&document.getElementById('appSidebar').classList.remove('open');}
  function pill(s){return '<span class="bc100-pill '+s.key+'">'+esc(s.label)+'</span>';}
  function kpis(m){
    return '<div class="bc100-kpis">'+
      '<div class="bc100-kpi"><span>Confermato</span><strong>'+money(m.confirmed)+' €</strong></div>'+
      '<div class="bc100-kpi green"><span>Fatturato</span><strong>'+money(m.billed)+' €</strong></div>'+
      '<div class="bc100-kpi blue"><span>Da fatturare</span><strong>'+money(m.ready)+' €</strong></div>'+
      '<div class="bc100-kpi orange"><span>Da autorizzare</span><strong>'+money(m.authorize)+' €</strong></div>'+
      '<div class="bc100-kpi"><span>Futuro</span><strong>'+money(m.future)+' €</strong></div></div>';
  }
  function totalMetrics(){
    var m={confirmed:0,billed:0,ready:0,authorize:0,future:0,partial:0};
    (store.commesse||[]).forEach(function(c){var x=commessaMetrics(c);Object.keys(m).forEach(function(k){m[k]=cents(m[k]+Number(x[k]||0));});});
    return m;
  }

  function showDashboard(){
    showBase('dashboard','Dashboard Fatturazione','billing');history.replaceState(null,'','#dashboard-fatturazione-v100');
    var rows=(store.commesse||[]).map(function(c){
      var m=commessaMetrics(c),pct=m.confirmed?m.billed/m.confirmed*100:0;
      return '<div class="bc100-row clickable" data-open-commessa="'+esc(c.code)+'" style="grid-template-columns:110px minmax(210px,1.4fr) 145px 105px 105px 105px 105px 105px 70px">'+
        '<div><strong>'+esc(c.code)+'</strong></div><div>'+esc(c.description)+'</div><div>'+esc(c.client)+'</div>'+
        '<div class="bc100-money">'+money(m.confirmed)+' €</div><div class="bc100-money">'+money(m.billed)+' €</div><div class="bc100-money">'+money(m.ready)+' €</div><div class="bc100-money">'+money(m.authorize)+' €</div><div class="bc100-money">'+money(m.future)+' €</div><div>'+pct.toFixed(1)+'%</div></div>';
    }).join('');
    page.innerHTML='<div class="bc100-top"><div class="bc100-title"><strong>Dashboard Fatturazione</strong><span>Controllo per Commessa. Le azioni operative sono nelle code Da autorizzare e Da fatturare.</span></div><div class="bc100-actions"><button class="bc100-btn" data-old-dashboard>Vista tecnica precedente</button></div></div>'+
      kpis(totalMetrics())+
      '<div class="bc100-table"><div class="bc100-row head" style="grid-template-columns:110px minmax(210px,1.4fr) 145px 105px 105px 105px 105px 105px 70px"><div>Commessa</div><div>Descrizione</div><div>Cliente</div><div>Confermato</div><div>Fatturato</div><div>Da fatturare</div><div>Da autorizzare</div><div>Futuro</div><div>% fatt.</div></div>'+
      (rows||'<div class="bc100-empty">Premi “Compila caso completo” nell’ambiente test.</div>')+'</div>';
    bindCommon();
    var old=page.querySelector('[data-old-dashboard]');if(old)old.addEventListener('click',function(){page.hidden=true;window.DABSTER_BILLING_ENTRY_V86&&window.DABSTER_BILLING_ENTRY_V86.loadWorkspace&&window.DABSTER_BILLING_ENTRY_V86.loadWorkspace('dashboard');});
  }

  function showCommessa(code,tab){
    var c=findCommessa(code);if(!c)return;selectedCommessa=code;commessaTab=tab||'offerte';showBase('commessa','Commessa '+code,'billing');
    var m=commessaMetrics(c),body='',tabs=['offerte','piano','fatture','attivita'];
    if(commessaTab==='offerte'){
      body='<div class="bc100-table"><div class="bc100-row head" style="grid-template-columns:135px minmax(240px,1.5fr) 150px 110px 110px 110px 110px 110px"><div>Offerta</div><div>Descrizione</div><div>Cliente</div><div>Valore</div><div>Fatturato</div><div>Da fatturare</div><div>Da autorizzare</div><div>Futuro</div></div>'+
      (c.offers||[]).map(function(o){var x=offerMetrics(o);return '<div class="bc100-row clickable" data-open-offer="'+esc(o.code)+'" style="grid-template-columns:135px minmax(240px,1.5fr) 150px 110px 110px 110px 110px 110px"><div><strong>'+esc(o.code)+'</strong></div><div>'+esc(o.description)+'</div><div>'+esc(o.client)+'</div><div class="bc100-money">'+money(x.confirmed)+' €</div><div class="bc100-money">'+money(x.billed)+' €</div><div class="bc100-money">'+money(x.ready)+' €</div><div class="bc100-money">'+money(x.authorize)+' €</div><div class="bc100-money">'+money(x.future)+' €</div></div>';}).join('')+'</div>';
    }else if(commessaTab==='piano'){
      body=(c.offers||[]).map(function(o){
        return '<div class="bc100-group"><div class="bc100-group-head">'+esc(o.code)+' · '+esc(o.description)+' · '+money(o.amount)+' €</div><div class="bc100-table" style="border:0;border-radius:0"><div class="bc100-row head" style="grid-template-columns:220px 110px minmax(260px,1.4fr) 120px 120px 130px"><div>Evento Piano</div><div>Previsto</div><div>Condizione</div><div>Fatturato</div><div>Residuo</div><div>Stato</div></div>'+
        (o.plan||[]).map(function(p){var st=stateFor(o,p),res=Math.max(0,Number(p.amount||0)-st.billed);return '<div class="bc100-row" style="grid-template-columns:220px 110px minmax(260px,1.4fr) 120px 120px 130px"><div>'+esc(p.eventLabel)+'</div><div class="bc100-money">'+money(p.amount)+' €</div><div>'+esc(conditionLabel(o,p))+'</div><div class="bc100-money">'+money(st.billed)+' €</div><div class="bc100-money">'+money(res)+' €</div><div>'+pill(st)+(st.warning?'<span class="bc100-warn">Attività riaperta dopo autorizzazione</span>':'')+'</div></div>';}).join('')+'</div></div>';
      }).join('');
    }else if(commessaTab==='fatture'){
      var list=invoices().filter(function(i){return i.commessa===c.code;});
      body='<div class="bc100-table"><div class="bc100-row head" style="grid-template-columns:130px 110px 160px minmax(260px,1fr) 130px"><div>Numero</div><div>Data</div><div>Offerta</div><div>Descrizione</div><div>Imponibile</div></div>'+
      (list.flatMap(function(inv){return (inv.lines||[]).map(function(l){return '<div class="bc100-row" style="grid-template-columns:130px 110px 160px minmax(260px,1fr) 130px"><div><strong>'+esc(inv.number)+'</strong></div><div>'+esc(inv.date)+'</div><div>'+esc((l.originV100&&l.originV100.offerCode)||inv.offerCode||'—')+'</div><div>'+esc(l.description)+'</div><div class="bc100-money">'+money(l.amount)+' €</div></div>';});}).join('')||'<div class="bc100-empty">Nessuna fattura.</div>')+'</div>';
    }else{
      body=(c.offers||[]).map(function(o){return '<div class="bc100-group"><div class="bc100-group-head">'+esc(o.code)+' · '+esc(o.description)+'</div><div class="bc100-table" style="border:0;border-radius:0"><div class="bc100-row head" style="grid-template-columns:160px minmax(320px,1fr) 130px"><div>Fase</div><div>Attività</div><div>Stato</div></div>'+
        (o.activities||[]).map(function(a){return '<div class="bc100-row" style="grid-template-columns:160px minmax(320px,1fr) 130px"><div>'+esc(a.phase)+'</div><div>'+esc(a.name)+'</div><div>'+esc(a.status)+'</div></div>';}).join('')+'</div></div>';}).join('');
    }
    page.innerHTML='<div class="bc100-top"><div class="bc100-title"><strong>'+esc(c.code)+' · '+esc(c.description)+'</strong><span>Cliente '+esc(c.client)+' · '+(c.offers||[]).length+' offerte confermate</span></div><div class="bc100-actions"><button class="bc100-btn" data-back-dashboard>← Dashboard</button></div></div>'+
      kpis(m)+'<div class="bc100-tabs">'+tabs.map(function(t){var label=t==='piano'?'Piano fatturazione':t.charAt(0).toUpperCase()+t.slice(1);return '<button class="bc100-tab '+(t===commessaTab?'active':'')+'" data-commessa-tab="'+t+'">'+label+'</button>';}).join('')+'</div>'+body;
    bindCommon();
    page.querySelector('[data-back-dashboard]').addEventListener('click',showDashboard);
    page.querySelectorAll('[data-commessa-tab]').forEach(function(b){b.addEventListener('click',function(){showCommessa(code,b.dataset.commessaTab);});});
  }

  function showOffer(code){
    var o=findOffer(code);if(!o)return;showBase('offer','Offerta '+code,'billing');var m=offerMetrics(o);
    page.innerHTML='<div class="bc100-top"><div class="bc100-title"><strong>'+esc(o.code)+' · '+esc(o.description)+'</strong><span>Commessa '+esc(o.commessaCode)+' · Cliente '+esc(o.client)+'</span></div><div class="bc100-actions"><button class="bc100-btn" data-back-commessa>← Commessa</button>'+(o.code==='XX_XXXpe01'?'<button class="bc100-btn blue" data-open-live>Apri editor Offerta</button>':'')+'</div></div>'+
      kpis(m)+'<div class="bc100-tabs"><button class="bc100-tab active" data-off-tab="lines">Righe Offerta</button><button class="bc100-tab" data-off-tab="plan">Piano fatturazione</button><button class="bc100-tab" data-off-tab="inv">Fatture</button><button class="bc100-tab" data-off-tab="act">Attività</button></div><div data-off-body></div>';
    function render(tab){
      page.querySelectorAll('[data-off-tab]').forEach(function(b){b.classList.toggle('active',b.dataset.offTab===tab);});
      var body=page.querySelector('[data-off-body]');
      if(tab==='lines'){
        body.innerHTML='<div class="bc100-table"><div class="bc100-row head" style="grid-template-columns:160px minmax(320px,1fr) 140px 140px 140px"><div>Fase</div><div>Riga Offerta</div><div>Venduto</div><div>Fatturato</div><div>Residuo</div></div>'+
        (o.lines||[]).map(function(l){
          var billed=cents(invoices().flatMap(function(i){return i.lines||[];}).reduce(function(s,x){return s+(x.allocations||[]).filter(function(a){return a.offerLineId===l.id;}).reduce(function(q,a){return q+Number(a.amount||0);},0);},0));
          return '<div class="bc100-row" style="grid-template-columns:160px minmax(320px,1fr) 140px 140px 140px"><div>'+esc(l.phase)+'</div><div>'+esc(l.description)+'</div><div class="bc100-money">'+money(l.amount)+' €</div><div class="bc100-money">'+money(billed)+' €</div><div class="bc100-money">'+money(Math.max(0,l.amount-billed))+' €</div></div>';
        }).join('')+'</div>';
      }else if(tab==='plan'){
        body.innerHTML='<div class="bc100-table"><div class="bc100-row head" style="grid-template-columns:minmax(220px,1fr) 130px minmax(270px,1.2fr) 130px"><div>Evento Piano</div><div>Importo</div><div>Condizione</div><div>Stato</div></div>'+
        (o.plan||[]).map(function(p){var st=stateFor(o,p);return '<div class="bc100-row" style="grid-template-columns:minmax(220px,1fr) 130px minmax(270px,1.2fr) 130px"><div>'+esc(p.eventLabel)+'</div><div class="bc100-money">'+money(p.amount)+' €</div><div>'+esc(conditionLabel(o,p))+'</div><div>'+pill(st)+'</div></div>';}).join('')+'</div><div class="bc100-warn">Il Piano si modifica dentro l’Offerta. Gli importi già fatturati restano storici; le quote future possono essere modificate o suddivise aggiungendo una nuova riga.</div>';
      }else if(tab==='inv'){
        var list=invoices().filter(function(i){return i.offerCode===o.code||(i.lines||[]).some(function(l){return l.originV100&&l.originV100.offerCode===o.code;});});
        body.innerHTML='<div class="bc100-table"><div class="bc100-row head" style="grid-template-columns:140px 110px minmax(320px,1fr) 140px"><div>Fattura</div><div>Data</div><div>Riga fattura</div><div>Importo</div></div>'+
        (list.flatMap(function(i){return (i.lines||[]).filter(function(l){return (l.originV100&&l.originV100.offerCode===o.code)||i.offerCode===o.code;}).map(function(l){return '<div class="bc100-row" style="grid-template-columns:140px 110px minmax(320px,1fr) 140px"><div>'+esc(i.number)+'</div><div>'+esc(i.date)+'</div><div>'+esc(l.description)+'</div><div class="bc100-money">'+money(l.amount)+' €</div></div>';});}).join('')||'<div class="bc100-empty">Nessuna fattura.</div>')+'</div>';
      }else{
        body.innerHTML='<div class="bc100-table"><div class="bc100-row head" style="grid-template-columns:160px minmax(360px,1fr) 130px"><div>Fase</div><div>Attività pianificata in Offerta</div><div>Stato</div></div>'+
        (o.activities||[]).map(function(a){return '<div class="bc100-row" style="grid-template-columns:160px minmax(360px,1fr) 130px"><div>'+esc(a.phase)+'</div><div>'+esc(a.name)+'</div><div>'+esc(a.status)+'</div></div>';}).join('')+'</div>';
      }
    }
    render('lines');
    page.querySelector('[data-back-commessa]').addEventListener('click',function(){showCommessa(o.commessaCode);});
    page.querySelectorAll('[data-off-tab]').forEach(function(b){b.addEventListener('click',function(){render(b.dataset.offTab);});});
    var live=page.querySelector('[data-open-live]');if(live)live.addEventListener('click',function(){page.hidden=true;var main=document.querySelector('.main-card');if(main)main.style.removeProperty('display');window.DABSTER_OFFER_FLOW&&window.DABSTER_OFFER_FLOW.openOffer&&window.DABSTER_OFFER_FLOW.openOffer();});
  }

  function authRows(){
    return allOffers().flatMap(function(o){return (o.plan||[]).map(function(p){return {o:o,p:p,s:stateFor(o,p)};});}).filter(function(x){return x.s.key==='da_autorizzare';}).filter(function(x){
      return (!filters.cp||x.o.cp===filters.cp)&&(!filters.commessa||x.o.commessaCode===filters.commessa)&&(!filters.client||x.o.client===filters.client)&&(!filters.offer||x.o.code===filters.offer)&&(!filters.date||String(x.p.conditionDate||x.o.confirmationDate||'')===filters.date);
    });
  }
  function options(values,current){
    var uniq=[...new Set(values.filter(Boolean))];
    return '<option value="">Tutti</option>'+uniq.map(function(x){return '<option value="'+esc(x)+'" '+(x===current?'selected':'')+'>'+esc(x)+'</option>';}).join('');
  }
  function showAuthorize(){
    showBase('authorize','Da autorizzare','billing-authorize-v100');history.replaceState(null,'','#da-autorizzare');var rows=authRows();
    page.innerHTML='<div class="bc100-top"><div class="bc100-title"><strong>Da autorizzare</strong><span>Vista unica CP: la condizione è raggiunta ma la fattura non è ancora autorizzata.</span></div></div>'+
      '<div class="bc100-filters"><label class="bc100-filter"><span>CP</span><select data-af="cp">'+options(allOffers().map(function(o){return o.cp;}),filters.cp)+'</select></label>'+
      '<label class="bc100-filter"><span>Commessa</span><select data-af="commessa">'+options((store.commesse||[]).map(function(c){return c.code;}),filters.commessa)+'</select></label>'+
      '<label class="bc100-filter"><span>Cliente</span><select data-af="client">'+options(allOffers().map(function(o){return o.client;}),filters.client)+'</select></label>'+
      '<label class="bc100-filter"><span>Offerta</span><select data-af="offer">'+options(allOffers().map(function(o){return o.code;}),filters.offer)+'</select></label>'+
      '<label class="bc100-filter"><span>Data condizione</span><input type="date" data-af="date" value="'+esc(filters.date)+'"></label></div>'+
      '<div class="bc100-table"><div class="bc100-row head" style="grid-template-columns:110px 170px 125px 190px 130px 190px 100px minmax(220px,1fr) 115px 185px"><div>Commessa</div><div>Descrizione commessa</div><div>Offerta</div><div>Descrizione offerta</div><div>Cliente</div><div>Evento Piano</div><div>Importo</div><div>Condizione raggiunta</div><div>Data</div><div>Azione</div></div>'+
      (rows.map(function(x){return '<div class="bc100-row" style="grid-template-columns:110px 170px 125px 190px 130px 190px 100px minmax(220px,1fr) 115px 185px"><div>'+esc(x.o.commessaCode)+'</div><div>'+esc(x.o.commessaDescription)+'</div><div><button class="bc100-btn" data-open-offer="'+esc(x.o.code)+'">'+esc(x.o.code)+'</button></div><div>'+esc(x.o.description)+'</div><div>'+esc(x.o.client)+'</div><div>'+esc(x.p.eventLabel)+'</div><div class="bc100-money">'+money(x.p.amount)+' €</div><div>'+esc(conditionLabel(x.o,x.p))+'</div><div>'+esc(x.p.conditionDate||x.o.confirmationDate||'—')+'</div><div style="gap:5px;align-items:stretch"><input class="bc100-note" data-note="'+esc(x.p.id)+'" placeholder="Nota opz."><button class="bc100-btn primary" data-authorize="'+esc(x.p.id)+'">Autorizza</button></div></div>';}).join('')||'<div class="bc100-empty">Nessuna voce da autorizzare.</div>')+'</div>';
    page.querySelectorAll('[data-af]').forEach(function(el){el.addEventListener('change',function(){filters[el.dataset.af]=el.value;showAuthorize();});});
    page.querySelectorAll('[data-authorize]').forEach(function(b){b.addEventListener('click',function(){var n=page.querySelector('[data-note="'+b.dataset.authorize+'"]'),a=authorize(b.dataset.authorize,n?n.value:'');if(a){showAuthorize();toast('Autorizzazione registrata.');}});});
    bindCommon();
  }

  function readyRows(){
    return (store.authorizations||[]).filter(function(a){return a.status==='active'&&!isAuthInvoiced(a);}).map(function(a){var r=planRef(a.planRowId);return r?Object.assign({a:a},r):null;}).filter(Boolean);
  }
  function showReady(){
    showBase('ready','Da fatturare','billing-ready-v100');history.replaceState(null,'','#da-fatturare-v100');var rows=readyRows(),count=Object.keys(selectedReady).filter(function(k){return selectedReady[k];}).length;
    page.innerHTML='<div class="bc100-top"><div class="bc100-title"><strong>Da fatturare</strong><span>Coda Amministrazione. Selezione multipla solo per stessa Commessa e stesso Cliente.</span></div><div class="bc100-actions"><button class="bc100-btn primary" data-create-invoice '+(count?'':'disabled')+'>Crea fattura ('+count+')</button></div></div>'+
      '<div class="bc100-table"><div class="bc100-row head" style="grid-template-columns:45px 110px 130px 190px 130px 190px 105px 150px 90px"><div>Sel.</div><div>Commessa</div><div>Offerta</div><div>Descrizione offerta</div><div>Cliente</div><div>Evento</div><div>Autorizzato</div><div>Nota CP</div><div>Revoca</div></div>'+
      (rows.map(function(x){return '<div class="bc100-row" style="grid-template-columns:45px 110px 130px 190px 130px 190px 105px 150px 90px"><div><input class="bc100-check" type="checkbox" data-ready="'+esc(x.a.id)+'" '+(selectedReady[x.a.id]?'checked':'')+'></div><div>'+esc(x.commessa.code)+'</div><div>'+esc(x.offer.code)+'</div><div>'+esc(x.offer.description)+'</div><div>'+esc(x.offer.client)+'</div><div>'+esc(x.plan.eventLabel)+'</div><div class="bc100-money">'+money(x.a.amount)+' €</div><div title="'+esc(x.a.note)+'">'+esc(x.a.note||'—')+'</div><div><button class="bc100-btn" data-revoke="'+esc(x.a.id)+'">Revoca</button></div></div>';}).join('')||'<div class="bc100-empty">Nessuna autorizzazione da fatturare.</div>')+'</div>';
    page.querySelectorAll('[data-ready]').forEach(function(cb){cb.addEventListener('change',function(){selectedReady[cb.dataset.ready]=cb.checked;showReady();});});
    page.querySelectorAll('[data-revoke]').forEach(function(b){b.addEventListener('click',function(){if(revoke(b.dataset.revoke)){delete selectedReady[b.dataset.revoke];showReady();toast('Autorizzazione revocata.');}});});
    var create=page.querySelector('[data-create-invoice]');if(create)create.addEventListener('click',function(){
      var sel=rows.filter(function(x){return selectedReady[x.a.id];});if(!sel.length)return;
      var comm=sel[0].commessa.code,client=sel[0].offer.client;
      if(sel.some(function(x){return x.commessa.code!==comm||x.offer.client!==client;})){toast('Seleziona solo autorizzazioni della stessa Commessa e dello stesso Cliente.',true);return;}
      showInvoiceDraft(sel);
    });
  }

  function showInvoiceDraft(items){
    showBase('invoice','Nuova fattura','billing-ready-v100');var client=items[0].offer.client,comm=items[0].commessa.code,total=cents(items.reduce(function(s,x){return s+x.a.amount;},0)),number='FT TEST/'+String(invoices().length+1).padStart(3,'0');
    page.innerHTML='<div class="bc100-top"><div class="bc100-title"><strong>Nuova fattura da autorizzazioni</strong><span>Importi bloccati: se non sono corretti va revocata/modificata l’autorizzazione a monte.</span></div><div class="bc100-actions"><button class="bc100-btn" data-back-ready>← Da fatturare</button><button class="bc100-btn primary" data-save-auth-invoice>Salva fattura</button></div></div>'+
      '<div class="bc100-invoice-card"><div class="bc100-fields"><label class="bc100-field"><span>Cliente</span><input value="'+esc(client)+'" disabled></label><label class="bc100-field"><span>Commessa</span><input value="'+esc(comm)+'" disabled></label><label class="bc100-field"><span>Numero</span><input data-number value="'+esc(number)+'"></label><label class="bc100-field"><span>Data</span><input type="date" data-date value="'+today()+'"></label></div></div>'+
      '<div class="bc100-table"><div class="bc100-row head" style="grid-template-columns:130px 190px minmax(300px,1fr) 130px"><div>Offerta</div><div>Evento Piano</div><div>Descrizione Riga Fattura</div><div>Importo</div></div>'+
      items.map(function(x){return '<div class="bc100-row" style="grid-template-columns:130px 190px minmax(300px,1fr) 130px"><div>'+esc(x.offer.code)+'</div><div>'+esc(x.plan.eventLabel)+'</div><div><input class="bc100-note" data-line-desc="'+esc(x.a.id)+'" value="'+esc(x.plan.eventLabel+' - '+x.offer.description)+'"></div><div class="bc100-money">'+money(x.a.amount)+' €</div></div>';}).join('')+'</div>'+
      '<div class="bc100-kpis" style="margin-top:10px;grid-template-columns:1fr"><div class="bc100-kpi blue"><span>Imponibile autorizzato</span><strong>'+money(total)+' €</strong></div></div>';
    page.querySelector('[data-back-ready]').addEventListener('click',showReady);
    page.querySelector('[data-save-auth-invoice]').addEventListener('click',function(){
      var num=page.querySelector('[data-number]').value.trim(),date=page.querySelector('[data-date]').value||today();
      if(!num){toast('Inserisci il numero fattura.',true);return;}if(invoices().some(function(i){return i.number===num;})){toast('Numero fattura già presente.',true);return;}
      var lines=items.map(function(x){
        var d=page.querySelector('[data-line-desc="'+x.a.id+'"]');
        return {id:uid('invline'),description:d?d.value:x.plan.eventLabel,amount:x.a.amount,vat:22,originType:'offer',
          allocations:(x.plan.allocations||[]).map(function(a){var l=(x.offer.lines||[]).find(function(q){return q.id===a.lineId;});return {offerLineId:a.lineId,phase:l?l.phase:'',amount:a.amount};}),
          originV100:{authorizationId:x.a.id,planRowId:x.plan.id,offerCode:x.offer.code,commessa:x.commessa.code}};
      });
      var taxable=cents(lines.reduce(function(s,l){return s+l.amount;},0)),fund=cents(taxable*0.04),vat=cents((taxable+fund)*0.22),grand=cents(taxable+fund+vat);
      var inv={id:uid('invoice'),number:num,date:date,client:client,commessa:comm,offerCode:items.length===1?items[0].offer.code:'MULTI',due:'30 gg',payment:'Bonifico',lines:lines,registerV97:{commessa:comm,offerCode:items.length===1?items[0].offer.code:'MULTI',type:'Elettronica',taxable:taxable,fund:fund,vat:vat,total:grand,received:0,dueDate:''}};
      model().invoices.push(inv);
      items.forEach(function(x){x.a.status='invoiced';x.a.invoicedAt=new Date().toISOString();x.a.invoiceId=inv.id;audit('authorization_invoiced',{authorizationId:x.a.id,invoiceId:inv.id,amount:x.a.amount});delete selectedReady[x.a.id];});
      save();window.dispatchEvent(new CustomEvent('dabster-invoice-saved-v97',{detail:{invoice:inv}}));
      page.hidden=true;
      var api=window.DABSTER_INVOICE_REGISTER_V99||window.DABSTER_INVOICE_REGISTER_V97_API;if(api&&api.show)api.show();
      toast('Fattura salvata e autorizzazioni evase.');
    });
  }

  function bindCommon(){
    if(!page)return;
    page.querySelectorAll('[data-open-commessa]').forEach(function(b){b.addEventListener('click',function(){showCommessa(b.dataset.openCommessa);});});
    page.querySelectorAll('[data-open-offer]').forEach(function(b){b.addEventListener('click',function(){showOffer(b.dataset.openOffer);});});
  }
  function toast(msg,error){
    var t=document.getElementById('bc100Toast');
    if(!t){t=document.createElement('div');t.id='bc100Toast';Object.assign(t.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:'9999',padding:'10px 13px',borderRadius:'7px',font:'700 11px Arial',boxShadow:'0 4px 18px rgba(0,0,0,.15)'});document.body.appendChild(t);}
    t.textContent=msg;t.style.background=error?'#8e4646':'#3f6f5a';t.style.color='#fff';t.hidden=false;clearTimeout(t._timer);t._timer=setTimeout(function(){t.hidden=true;},2500);
  }

  function installSidebar(attempt){
    attempt=attempt||0;var nav=document.querySelector('#appSidebar .sidebar-nav');if(!nav){if(attempt<240)setTimeout(function(){installSidebar(attempt+1);},40);return;}
    var billing=nav.querySelector('[data-page="billing"]');
    if(!billing){if(attempt<240)setTimeout(function(){installSidebar(attempt+1);},40);return;}
    if(billing.dataset.v100!=='1'){var b=billing.cloneNode(true);billing.replaceWith(b);billing=b;b.dataset.v100='1';b.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();showDashboard();},true);}
    function ensure(key,label,icon,after,fn){
      var b=nav.querySelector('[data-page="'+key+'"]');
      if(!b){b=document.createElement('button');b.type='button';b.className='sidebar-item';b.dataset.page=key;b.innerHTML='<span class="side-icon">'+icon+'</span>'+label;(after||billing).insertAdjacentElement('afterend',b);}
      if(b.dataset.v100!=='1'){var n=b.cloneNode(true);b.replaceWith(n);b=n;b.dataset.v100='1';b.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();fn();},true);}return b;
    }
    var a=ensure('billing-authorize-v100','Da autorizzare','✓',billing,showAuthorize);
    ensure('billing-ready-v100','Da fatturare','€',a,showReady);
    var old=nav.querySelector('[data-page="billable"]');if(old)old.style.display='none';
    document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#appSidebar .sidebar-item');if(b&&!['billing','billing-authorize-v100','billing-ready-v100'].includes(b.dataset.page)&&page)page.hidden=true;},true);
  }

  function syncLiveActivity(e){
    if(!store.loaded)return;var a=e.detail&&e.detail.activity;if(!a)return;
    var o=findOffer('XX_XXXpe01');if(!o)return;var t=(o.activities||[]).find(function(x){return x.id===a.id;});
    if(t){t.status=a.status;audit('activity_status',{offerCode:o.code,activityId:a.id,status:a.status});save();if(currentView==='authorize')showAuthorize();else if(currentView==='dashboard')showDashboard();else if(currentView==='commessa')showCommessa(selectedCommessa,commessaTab);}
  }

  function selfTest(){
    var errors=[];
    allOffers().forEach(function(o){
      var l=cents((o.lines||[]).reduce(function(s,x){return s+Number(x.amount||0);},0)),p=cents((o.plan||[]).reduce(function(s,x){return s+Number(x.amount||0);},0));
      if(Math.abs(l-o.amount)>0.01)errors.push(o.code+': Righe Offerta '+l+' != '+o.amount);
      if(Math.abs(p-o.amount)>0.01)errors.push(o.code+': Piano '+p+' != '+o.amount);
      (o.plan||[]).forEach(function(r){var a=cents((r.allocations||[]).reduce(function(s,x){return s+Number(x.amount||0);},0));if(Math.abs(a-r.amount)>0.01)errors.push(o.code+' '+r.eventLabel+': allocazioni '+a+' != '+r.amount);});
    });
    var x=findCommessa('XX_XXX'),y=findCommessa('YY_YYY');if(x&&Math.abs(commessaMetrics(x).confirmed-33000)>0.01)errors.push('XX_XXX totale atteso 33.000');if(y&&Math.abs(commessaMetrics(y).confirmed-20000)>0.01)errors.push('YY_YYY totale atteso 20.000');
    var result={ok:errors.length===0,errors:errors,commesse:(store.commesse||[]).length,offers:allOffers().length};console[result.ok?'info':'error']('[Dabster v100] self-test',result);return result;
  }

  installStyles();ensurePage();installSidebar();installFixtureHook();window.addEventListener('dabster-activity-status-change',syncLiveActivity);
  var api={version:100,snapshot:snapshot,selfTest:selfTest,showDashboard:showDashboard,showAuthorize:showAuthorize,showReady:showReady,showCommessa:showCommessa,showOffer:showOffer,authorize:authorize,revoke:revoke,seedAfterFixture:seedAfterFixture};
  window.DABSTER_BILLING_CONTROL_V100_API=api;
  if(store.loaded)setTimeout(function(){selfTest();if(location.hash==='#da-autorizzare')showAuthorize();else if(location.hash==='#da-fatturare-v100')showReady();else if(location.hash==='#dashboard-fatturazione-v100')showDashboard();},120);
})();