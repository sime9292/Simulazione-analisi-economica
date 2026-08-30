/* v64 - Generic offer workflow with no seeded/demo offers. Keeps existing UI and engine contracts. */
(function(){
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  let offersPage=null,emitTimer=null;
  const state={listStatus:'all',listSearch:'',lastSnapshot:null};

  function field(label){return [...document.querySelectorAll('#tab-dati label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))||null;}
  function control(label){return field(label)?.querySelector('input,select,textarea')||null;}
  function fire(el,type='input'){el?.dispatchEvent(new Event(type,{bubbles:true}));}
  function confirmation(){
    return {
      consulting:num(document.getElementById('confirmationConsulting')?.value||0),
      projects:num(document.getElementById('confirmationProjects')?.value||0),
      direction:num(document.getElementById('confirmationDirection')?.value||0)
    };
  }
  function currentLines(){
    const src=window.DABSTER_OFFER_LINES?.lines;
    return Array.isArray(src)?src.map(x=>({...x,amount:Number(x.amount||0)})).filter(x=>x.amount>0.005):[];
  }
  function readOffer(){
    const commessaLabel=String(control('Commessa')?.value||'').trim();
    const code=String(control('Codice')?.value||'').trim();
    const title=String(control('Titolo')?.value||'').trim();
    const status=String(control('Stato')?.value||'In lavorazione').trim()||'In lavorazione';
    const amount=num(document.getElementById('totaleOfferta')?.value||0);
    return {
      id:code,code,
      commessa:commessaLabel.split(' - ')[0]||commessaLabel,
      commessaLabel,title,client:'',projectManager:'',commessaManager:'',status,amount,
      confirmation:confirmation()
    };
  }
  function getSnapshot(){
    const offer=readOffer(),lines=currentLines();
    const loadedOffer=!!(offer.code||offer.title||offer.amount>0||lines.length);
    return {offer,lines,loadedOffer};
  }
  function emit(){
    const snap=getSnapshot();state.lastSnapshot=snap;
    window.dispatchEvent(new CustomEvent('dabster-offer-flow-change',{detail:snap}));
    return snap;
  }
  function scheduleEmit(){clearTimeout(emitTimer);emitTimer=setTimeout(()=>{emit();if(offersPage&&!offersPage.hidden)renderOffers();},50);}

  function installStyles(){
    if(document.getElementById('offerFlowV64Styles'))return;
    const s=document.createElement('style');s.id='offerFlowV64Styles';s.textContent=`
      #offersListPage[hidden]{display:none!important}.offers38{background:#f4f6f7;border:1px solid #dbe2e5;border-radius:9px;padding:13px;min-height:650px}.offers38-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:11px}.offers38-head strong{display:block;font-size:15px;color:#304650}.offers38-head span{display:block;margin-top:2px;font-size:9px;color:#718089}.offers38-new{height:32px;padding:0 12px;border:1px solid #d36520;border-radius:6px;background:#e97026;color:#fff;font-size:10px;font-weight:750;cursor:pointer}.offers38-kpis{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:8px;margin-bottom:11px}.offers38-kpi{min-height:62px;padding:9px 11px;border:1px solid #dce3e6;border-radius:8px;background:#fff;cursor:pointer;text-align:left}.offers38-kpi span{display:block;font-size:8px;font-weight:750;color:#71808a;text-transform:uppercase}.offers38-kpi strong{display:block;margin-top:5px;font-size:18px;color:#334955}.offers38-kpi.active{border-color:#e2a16f;background:#fff8f2}.offers38-controls{display:grid;grid-template-columns:minmax(240px,1fr) 180px;gap:8px;margin-bottom:9px}.offers38-controls input,.offers38-controls select{height:31px;border:1px solid #d5dde1;border-radius:6px;background:#fff;padding:0 9px;font-size:10px;color:#40545f}.offers38-table{border:1px solid #d7dfe3;border-radius:8px;overflow:hidden;background:#fff}.offers38-row{display:grid;grid-template-columns:105px 120px minmax(250px,1.5fr) minmax(170px,.8fr) 118px 120px 34px;min-height:43px}.offers38-row>div{display:flex;align-items:center;min-width:0;padding:6px 8px;border-right:1px solid #e8ecee;border-bottom:1px solid #e8ecee;font-size:9.7px;color:#3c515c}.offers38-row>div:last-child{border-right:0;justify-content:center}.offers38-row.head{min-height:32px;background:#f1f4f5}.offers38-row.head>div{font-size:7.8px;font-weight:780;color:#63727b;text-transform:uppercase}.offers38-row.data{cursor:pointer}.offers38-row.data:hover>div{background:#fff8f3}.offers38-code{font-weight:800;color:#31596b}.offers38-title{font-weight:700}.offers38-money{justify-content:flex-end;font-variant-numeric:tabular-nums;font-weight:700}.offers38-status{display:inline-flex;padding:4px 7px;border-radius:999px;background:#e8f3eb;color:#3d6c4d;font-size:8px;font-weight:750}.offers38-open{font-size:17px;color:#e06b22}.offers38-empty{padding:22px;text-align:center;color:#7c8991;font-size:10px}@media(max-width:900px){.offers38-kpis{grid-template-columns:repeat(2,1fr)}.offers38-table{overflow-x:auto}.offers38-row{min-width:900px}.offers38-controls{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }
  function hideAllPages(){
    document.querySelector('.main-card')?.style.setProperty('display','none');
    const k=document.getElementById('kanbanPage');if(k)k.hidden=true;
    ['billingDashboardPageV39','billingDashboardPageV38','billingDashboardPageV37','billingDashboardPageV36','billingDashboardPageV35','billingDashboardPage','newInvoicePageV39'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=true;});
    if(offersPage)offersPage.hidden=true;
  }
  function setPageChrome(title,breadcrumb,page){
    const t=document.querySelector('.page-title');if(t)t.textContent=title;
    const bc=document.querySelector('.breadcrumb');if(bc)bc.innerHTML=breadcrumb;
    document.querySelectorAll('#appSidebar .sidebar-item').forEach(x=>x.classList.toggle('active',x.dataset.page===page));
    document.getElementById('appSidebar')?.classList.remove('open');document.getElementById('appSidebarOverlay')?.classList.remove('open');
  }
  function activeSnapshot(){const snap=getSnapshot();return snap.loadedOffer?snap:null;}
  function matchesFilter(snap){
    if(!snap)return false;const o=snap.offer;
    if(state.listStatus!=='all'&&state.listStatus!==norm(o.status))return false;
    const q=norm(state.listSearch);return !q||norm(`${o.code} ${o.commessaLabel} ${o.title}`).includes(q);
  }
  function offerListRow(){
    const snap=activeSnapshot();if(!matchesFilter(snap))return '';
    const o=snap.offer;
    return `<div class="offers38-row data" data-open-offer><div><strong>${esc(o.commessa||'—')}</strong></div><div><span class="offers38-code">${esc(o.code||'Bozza')}</span></div><div><span class="offers38-title">${esc(o.title||'Offerta senza titolo')}</span></div><div>—</div><div class="offers38-money">${money(o.amount)} €</div><div><span class="offers38-status">${esc(o.status||'In lavorazione')}</span></div><div class="offers38-open">›</div></div>`;
  }
  function statusCount(status){const snap=activeSnapshot();return snap&&norm(snap.offer.status)===norm(status)?1:0;}
  function renderOffers(){
    if(!offersPage)return;
    const row=offerListRow();
    offersPage.innerHTML=`<div class="offers38"><div class="offers38-head"><div><strong>Offerte</strong><span>Nessuna offerta demo precaricata. Le offerte compaiono solo dopo la compilazione.</span></div><button type="button" class="offers38-new" id="offers38New">＋ Nuova offerta</button></div><div class="offers38-kpis"><button class="offers38-kpi" data-kpi="in lavorazione"><span>Da inviare</span><strong>${statusCount('In lavorazione')}</strong></button><button class="offers38-kpi" data-kpi="completata"><span>Da revisionare</span><strong>${statusCount('Completata')}</strong></button><button class="offers38-kpi" data-kpi="inviata"><span>Inviate</span><strong>${statusCount('Inviata')}</strong></button><button class="offers38-kpi" data-kpi="confermata"><span>Confermate</span><strong>${statusCount('Confermata')}</strong></button></div><div class="offers38-controls"><input id="offers38Search" value="${esc(state.listSearch)}" placeholder="Cerca commessa, codice o titolo…"><select id="offers38Status"><option value="all">Tutti gli stati</option><option value="in lavorazione">In lavorazione</option><option value="completata">Completata</option><option value="inviata">Inviata</option><option value="confermata">Confermata</option></select></div><div class="offers38-table"><div class="offers38-row head"><div>Commessa</div><div>Codice offerta</div><div>Offerta</div><div>Cliente</div><div>Importo</div><div>Stato</div><div></div></div>${row||'<div class="offers38-empty">Nessuna offerta presente.</div>'}</div></div>`;
    const sel=offersPage.querySelector('#offers38Status');if(sel)sel.value=state.listStatus;
    offersPage.querySelector('#offers38Search')?.addEventListener('input',e=>{state.listSearch=e.target.value;renderOffers();});
    offersPage.querySelector('#offers38Status')?.addEventListener('change',e=>{state.listStatus=e.target.value;renderOffers();});
    offersPage.querySelectorAll('[data-kpi]').forEach(b=>b.addEventListener('click',()=>{const v=b.dataset.kpi;state.listStatus=state.listStatus===v?'all':v;renderOffers();}));
    offersPage.querySelector('[data-open-offer]')?.addEventListener('click',openOffer);
    offersPage.querySelector('#offers38New')?.addEventListener('click',openNewOffer);
  }
  function showOffers(){emit();hideAllPages();offersPage.hidden=false;setPageChrome('Offerte','<span>⌂</span><span>›</span><strong>Offerte</strong>','offers');history.replaceState(null,'','#offerte');renderOffers();}
  function showDetail(){
    hideAllPages();const main=document.querySelector('.main-card');if(main)main.style.removeProperty('display');
    const code=readOffer().code||'Nuova';setPageChrome('Offerta','<span>⌂</span><span>›</span><span>Offerte</span><span>›</span><strong>'+esc(code)+'</strong>','offers');history.replaceState(null,'','#offerta-'+(readOffer().code||'nuova'));
  }
  async function openOffer(){showDetail();emit();}
  function setControl(el,value,type='input'){if(!el)return;el.value=String(value);fire(el,type);}
  function clearActivities(){document.querySelectorAll('#phaseWorkCards .activity-delete').forEach(btn=>btn.click());}
  async function openNewOffer(){
    showDetail();
    window.DABSTER_BILLING_PLAN_V47?.reset?.();
    window.DABSTER_OFFER_LINES?.resetPostConfirmation?.();
    const comm=control('Commessa');if(comm instanceof HTMLSelectElement){comm.selectedIndex=0;fire(comm,'change');}
    setControl(control('Titolo'),'');setControl(control('Codice'),'');
    const date=control('Data offerta');if(date)setControl(date,'');
    const status=control('Stato');if(status){const o=[...status.options].find(x=>norm(x.value||x.textContent)==='in lavorazione');if(o){status.value=o.value;fire(status,'change');}}
    ['Importo stimato','Consulenza','Progetti','Direzione lavori'].forEach(label=>{const el=[...document.querySelectorAll('#tab-dati .accordion.amounts label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))?.querySelector('input');if(el)setControl(el,0);});
    setControl(document.getElementById('totaleOfferta'),0);
    document.querySelectorAll('#tab-analisi .ae-proposal').forEach(el=>setControl(el,'0,00'));
    clearActivities();window.dabsterEconomicPhaseController?.reconcile?.();window.dabsterRecalcEconomic?.();window.dabsterAnalysisSubtabs?.activate?.('impianti');emit();
  }
  function installNavigation(){
    const nav=document.querySelector('#appSidebar .sidebar-nav'),old=nav?.querySelector('[data-page="offer"], [data-page="offers"]');if(!nav||!old)return false;
    let offersBtn=old;if(old.dataset.page!=='offers'||old.dataset.offer64Nav!=='1'){offersBtn=old.cloneNode(true);offersBtn.dataset.page='offers';offersBtn.dataset.offer64Nav='1';offersBtn.innerHTML='<span class="side-icon">▣</span>Offerte';old.replaceWith(offersBtn);}
    offersBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showOffers();});
    document.addEventListener('click',e=>{const b=e.target.closest?.('#appSidebar .sidebar-item');if(b&&b.dataset.page!=='offers'&&offersPage)offersPage.hidden=true;},true);return true;
  }
  async function install(){
    installStyles();
    for(let i=0;i<240;i++){
      const shell=document.querySelector('.page-shell'),main=shell?.querySelector('.main-card'),nav=document.querySelector('#appSidebar .sidebar-nav');
      if(shell&&main&&nav&&document.getElementById('analysisSubtabs')){
        offersPage=document.getElementById('offersListPage');if(!offersPage){offersPage=document.createElement('section');offersPage.id='offersListPage';offersPage.hidden=true;main.insertAdjacentElement('afterend',offersPage);}
        installNavigation();
        const api={get offer(){return readOffer();},getSnapshot,showOffers,openOffer,openNewOffer,refresh:emit};window.DABSTER_OFFER_FLOW=api;
        document.querySelector('.main-card')?.addEventListener('input',scheduleEmit,true);document.querySelector('.main-card')?.addEventListener('change',scheduleEmit,true);
        window.addEventListener('dabster-offer-lines-change',scheduleEmit);
        if(location.hash.startsWith('#offerta-'))showDetail();else if(location.hash==='#dashboard-fatturazione'||location.hash==='#nuova-fattura'){}else showOffers();
        emit();return;
      }
      await new Promise(r=>setTimeout(r,50));
    }
  }
  install();
})();