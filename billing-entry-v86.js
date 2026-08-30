/* v86 - Global Billing entry. Dashboard always opens; invoice uses the same live offer/lines or matured Plan source. */
(function(){
  if(window.DABSTER_BILLING_ENTRY_V86)return;
  let loadingPromise=null,emptyPage=null;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
  async function waitFor(fn,loops=180,delay=30){for(let i=0;i<loops;i++){const v=fn();if(v)return v;await sleep(delay);}return null;}
  function field(label){return [...document.querySelectorAll('#tab-dati label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))||null;}
  function control(label){return field(label)?.querySelector('input,select,textarea')||null;}
  function nativeApi(){const api=window.DABSTER_BILLING_V86||window.DABSTER_BILLING_V40||window.DABSTER_BILLING_V39||null;return api?.applySourceAllocations?api:null;}
  function liveLines(){
    const snap=window.DABSTER_OFFER_FLOW?.getSnapshot?.();
    const src=Array.isArray(snap?.lines)&&snap.lines.length?snap.lines:(Array.isArray(window.DABSTER_OFFER_LINES?.lines)?window.DABSTER_OFFER_LINES.lines:[]);
    return src.map((x,i)=>({id:String(x.id||`${x.phase||'line'}-${i}`),phase:String(x.phase||''),description:String(x.description||x.label||`Riga ${i+1}`),amount:Number(x.amount||0)})).filter(x=>x.amount>0.005);
  }
  function activeContext(){
    const snap=window.DABSTER_OFFER_FLOW?.getSnapshot?.()||{};
    const lines=liveLines();
    const code=String(snap.offer?.code||control('Codice')?.value||'').trim();
    const amount=Number(snap.offer?.amount||lines.reduce((s,x)=>s+Number(x.amount||0),0)||num(document.getElementById('totaleOfferta')?.value));
    if(!code||!lines.length||amount<=0)return null;
    const commessaLabel=String(snap.offer?.commessaLabel||control('Commessa')?.value||'').trim();
    return {offer:{...(snap.offer||{}),code,id:code,amount,commessaLabel,commessa:String(snap.offer?.commessa||commessaLabel.split(' - ')[0]||commessaLabel),title:String(snap.offer?.title||control('Titolo')?.value||''),status:String(snap.offer?.status||control('Stato')?.value||'')},lines};
  }
  function ensureCleanModel(){
    if(!window.DABSTER_BILLING_MODEL_V39)window.DABSTER_BILLING_MODEL_V39={invoices:[]};
    if(!Array.isArray(window.DABSTER_BILLING_MODEL_V39.invoices))window.DABSTER_BILLING_MODEL_V39.invoices=[];
    return window.DABSTER_BILLING_MODEL_V39;
  }
  function hideKnownPages(){
    document.querySelector('.main-card')?.style.setProperty('display','none');
    const k=document.getElementById('kanbanPage');if(k)k.hidden=true;
    const offers=document.getElementById('offersListPage');if(offers)offers.hidden=true;
    ['billingDashboardPageV39','newInvoicePageV39','billablePageV58'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=true;});
  }
  function setChrome(title){
    const t=document.querySelector('.page-title');if(t)t.textContent=title;
    const bc=document.querySelector('.breadcrumb');if(bc)bc.innerHTML='<span>⌂</span><span>›</span><strong>'+title+'</strong>';
    document.querySelectorAll('#appSidebar .sidebar-item').forEach(x=>x.classList.toggle('active',x.dataset.page==='billing'));
    document.getElementById('appSidebar')?.classList.remove('open');document.getElementById('appSidebarOverlay')?.classList.remove('open');
  }
  function showEmptyDashboard(){
    const shell=document.querySelector('.page-shell'),main=shell?.querySelector('.main-card');if(!shell||!main)return null;
    hideKnownPages();
    emptyPage=document.getElementById('billingDashboardEmptyV86');
    if(!emptyPage){emptyPage=document.createElement('section');emptyPage.id='billingDashboardEmptyV86';main.insertAdjacentElement('afterend',emptyPage);}
    emptyPage.hidden=false;emptyPage.innerHTML='<div style="min-height:560px;background:#f4f6f7;border:1px solid #dbe2e5;border-radius:9px;padding:14px;font-family:Arial,sans-serif"><div style="font-size:15px;font-weight:800;color:#304650">Dashboard Fatturazione</div><div style="margin-top:3px;font-size:9px;color:#73818a">Commessa → Offerta → Righe Offerta → Righe Fattura</div><div style="margin-top:14px;padding:20px;border:1px dashed #cbd7dc;border-radius:8px;background:#fff;color:#73818a;font-size:10px">Nessuna offerta confermata con Righe Offerta disponibile. La Dashboard rimane comunque accessibile; dopo la conferma dell’offerta mostrerà valore, fatturato, residuo ed evasione.</div></div>';
    setChrome('Dashboard Fatturazione');history.replaceState(null,'','#dashboard-fatturazione');return emptyPage;
  }
  async function ensureWorkspace(){
    if(nativeApi())return nativeApi();
    if(loadingPromise)return loadingPromise;
    loadingPromise=new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-billing-workspace-v86]');
      if(existing){waitFor(nativeApi,200,30).then(api=>api?resolve(api):reject(new Error('Workspace v86 non disponibile.')));return;}
      const s=document.createElement('script');s.src='billing-workspace-v86-loader.js?v=86';s.dataset.billingWorkspaceV86='1';
      s.onload=()=>waitFor(nativeApi,200,30).then(api=>api?resolve(api):reject(new Error('Workspace v86 caricato senza API.')));
      s.onerror=()=>reject(new Error('Impossibile caricare il workspace fatturazione.'));document.head.appendChild(s);
    }).finally(()=>{loadingPromise=null;});
    return loadingPromise;
  }
  async function ensureInvoiceSource(){
    const add=async(selector,src,getter,key)=>{let api=getter();if(api)return api;let s=document.querySelector(selector);if(!s){s=document.createElement('script');s.src=src;s.dataset[key]='1';document.head.appendChild(s);}return waitFor(getter,180,30);};
    await add('script[data-plan-invoice-v86]','billing-plan-invoice-v51.js?v=86',()=>window.DABSTER_PLAN_TO_INVOICE_V55,'planInvoiceV86');
    const source=await add('script[data-plan-source-v86]','billing-plan-source-v52.js?v=86',()=>window.DABSTER_BILLING_PLAN_SOURCE_V58,'planSourceV86');source?.refresh?.();return source;
  }
  async function loadWorkspace(target='dashboard'){
    const ctx=activeContext();
    if(target==='dashboard'&&!ctx)return showEmptyDashboard();
    if(!ctx){console.warn('[Dabster] Nuova fattura: nessuna offerta confermata con Righe Offerta.');showEmptyDashboard();return null;}
    ensureCleanModel();window.DABSTER_OFFER_FLOW?.refresh?.();await sleep(30);
    try{
      const api=await ensureWorkspace();if(emptyPage)emptyPage.hidden=true;
      if(target==='invoice'){api.showInvoice?.();history.replaceState(null,'','#nuova-fattura');await ensureInvoiceSource();}
      else{api.showDashboard?.();history.replaceState(null,'','#dashboard-fatturazione');}
      return api;
    }catch(err){console.error('[Dabster] Errore apertura Fatturazione v86',err);return null;}
  }
  function install(attempt=0){
    const nav=document.querySelector('#appSidebar .sidebar-nav');if(!nav){if(attempt<220)setTimeout(()=>install(attempt+1),40);return;}
    let btn=nav.querySelector('[data-page="billing"]');if(!btn){btn=document.createElement('button');btn.type='button';btn.className='sidebar-item';btn.dataset.page='billing';btn.innerHTML='<span class="side-icon">€</span>Dashboard Fatturazione';nav.appendChild(btn);}
    const billable=nav.querySelector('[data-page="billable"]');if(billable&&btn.nextElementSibling!==billable)btn.insertAdjacentElement('afterend',billable);
    if(btn.dataset.billingEntryReady!=='86'){
      const fresh=btn.cloneNode(true);btn.replaceWith(fresh);btn=fresh;btn.dataset.billingEntryReady='86';
      btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();loadWorkspace('dashboard');},true);
    }
    if(location.hash==='#nuova-fattura')setTimeout(()=>loadWorkspace('invoice'),20);else if(location.hash==='#dashboard-fatturazione')setTimeout(()=>loadWorkspace('dashboard'),20);
  }
  const api={version:86,loadWorkspace,ensureInvoiceSource,activeContext};
  window.DABSTER_BILLING_ENTRY_V86=api;window.DABSTER_BILLING_ENTRY_V50=api;window.DABSTER_BILLING_ENTRY_V49=api;window.DABSTER_BILLING_ENTRY_V48=api;window.DABSTER_BILLING_ENTRY_V47=api;window.DABSTER_BILLING_ENTRY_V46=api;window.DABSTER_BILLING_ENTRY_V45=api;window.DABSTER_BILLING_ENTRY_V44=api;window.DABSTER_BILLING_ENTRY_V43=api;window.DABSTER_BILLING_ENTRY_V42=api;window.DABSTER_BILLING_ENTRY_V41=api;
  install();
})();