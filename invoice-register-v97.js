/* v97 - Invoice register: saved invoices remain linked to offer/offer lines and are visible from Sidebar > Fatture. */
(function(){
  if(window.DABSTER_INVOICE_REGISTER_V97)return;
  window.DABSTER_INVOICE_REGISTER_V97=true;

  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const filters={global:'',cols:Array(13).fill('')};
  let page=null,tbody=null,selectedId='';

  function model(){return window.DABSTER_BILLING_V40?.getModel?.()||window.DABSTER_BILLING_V39?.getModel?.()||window.DABSTER_BILLING_MODEL_V39||{invoices:[]};}
  function invoices(){const m=model();return Array.isArray(m?.invoices)?m.invoices:[];}
  function entry(){return window.DABSTER_BILLING_ENTRY_V86||window.DABSTER_BILLING_ENTRY_V50||null;}
  function context(){try{return entry()?.activeContext?.()||null;}catch{return null;}}
  function cents(n){return Math.round((Number(n||0)+Number.EPSILON)*100)/100;}
  function formatDate(v){const s=String(v||'');if(!s)return '—';const d=/^\d{4}-\d{2}-\d{2}$/.test(s)?new Date(s+'T12:00:00'):null;if(!d||Number.isNaN(d.getTime()))return s;return d.toLocaleDateString('it-IT');}
  function dueDate(date,rule){
    const d=/^\d{4}-\d{2}-\d{2}$/.test(String(date||''))?new Date(date+'T12:00:00'):null;if(!d||Number.isNaN(d.getTime()))return String(rule||'—');
    const days=Number(String(rule||'').match(/\d+/)?.[0]||0);
    if(norm(rule).includes('fine mese')){const end=new Date(d.getFullYear(),d.getMonth()+1,0,12,0,0);end.setDate(end.getDate()+days);return end.toLocaleDateString('it-IT');}
    if(days){d.setDate(d.getDate()+days);return d.toLocaleDateString('it-IT');}return String(rule||'—');
  }
  function invoiceAmounts(inv){
    const taxable=cents((inv.lines||[]).reduce((s,l)=>s+Number(l.amount||0),0)),r=inv.registerV97||{};
    const fund=Number.isFinite(Number(r.fund))?Number(r.fund):0;
    const vat=Number.isFinite(Number(r.vat))?Number(r.vat):cents((inv.lines||[]).reduce((s,l)=>s+Number(l.amount||0)*Number(l.vat||22)/100,0));
    const total=Number.isFinite(Number(r.total))&&Number(r.total)>0?Number(r.total):cents(taxable+fund+vat);
    const received=Math.max(0,Number(inv.incassato??r.received??0)||0),residual=Math.max(0,cents(total-received));
    const status=residual<=.01?'Pagata':received>.01?'Parziale':'Da incassare';return {taxable,fund,vat,total,received,residual,status};
  }
  function invoiceRow(inv){
    const a=invoiceAmounts(inv),r=inv.registerV97||{},ctx=context();
    const commessa=String(inv.commessa||r.commessa||ctx?.offer?.commessa||'—'),type=String(inv.type||r.type||'Elettronica'),deadline=String(inv.dueDate||r.dueDate||dueDate(inv.date,inv.due));
    return {inv,values:[String(inv.number||'—'),formatDate(inv.date),type,String(inv.client||'—'),commessa,money(a.taxable),money(a.fund),money(a.vat),money(a.total),money(a.received),money(a.residual),a.status,deadline],amounts:a};
  }
  function filteredRows(){const g=norm(filters.global);return invoices().slice().reverse().map(invoiceRow).filter(row=>{if(g&&!norm(row.values.join(' ')).includes(g))return false;return filters.cols.every((f,i)=>!norm(f)||norm(row.values[i]).includes(norm(f)));});}
  function statusClass(s){return s==='Pagata'?'paid':s==='Parziale'?'partial':'open';}

  function installStyles(){
    if(document.getElementById('invoiceRegisterV97Styles'))return;const st=document.createElement('style');st.id='invoiceRegisterV97Styles';st.textContent=`
      #invoiceRegisterPageV97[hidden]{display:none!important}.ir97{min-height:650px;background:#fff;border:1px solid #e0e3e5;border-radius:8px;padding:10px;font-family:Arial,sans-serif;color:#424b52}.ir97-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;flex-wrap:wrap}.ir97-actions,.ir97-tools{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.ir97-btn{height:31px;padding:0 14px;border:1px solid #d9dfe2;border-radius:5px;background:#fff;color:#52616a;font-size:8.8px;font-weight:750;cursor:pointer}.ir97-btn.orange{background:#f06b20;border-color:#e26018;color:#fff;min-width:105px}.ir97-btn:disabled{opacity:.5;cursor:not-allowed}.ir97-tools label{display:flex;align-items:center;gap:6px;font-size:8.5px;color:#68747b}.ir97-tools input,.ir97-tools select{height:30px;border:1px solid #cdd5d9;border-radius:4px;background:#fff;padding:0 8px;font-size:8.8px;color:#46555d}.ir97-tools input{width:150px}.ir97-tablewrap{width:100%;overflow:auto;border:1px solid #edf0f1;border-radius:5px}.ir97-table{width:100%;min-width:1420px;border-collapse:separate;border-spacing:0;table-layout:fixed}.ir97-table th{height:42px;padding:5px 6px;background:#e5e6e8;border-right:1px solid #f4f4f4;border-bottom:1px solid #fff;color:#33415a;font-size:8px;font-weight:800;text-align:center}.ir97-table th:nth-child(1){width:92px}.ir97-table th:nth-child(2){width:100px}.ir97-table th:nth-child(3){width:105px}.ir97-table th:nth-child(4){width:150px}.ir97-table th:nth-child(5){width:120px}.ir97-table th:nth-child(n+6):nth-child(-n+11){width:96px}.ir97-table th:nth-child(12){width:110px}.ir97-table th:nth-child(13){width:105px}.ir97-filters td{padding:5px;background:#eef0f1;border-right:1px solid #fff;border-bottom:1px solid #fff}.ir97-filters input{width:100%;height:29px;border:1px solid #d5dadd;border-radius:4px;background:#fff;padding:0 7px;font-size:8px;box-sizing:border-box}.ir97-table tbody tr{cursor:pointer}.ir97-table tbody tr:nth-child(odd){background:#f5f5f4}.ir97-table tbody tr:nth-child(even){background:#fbfbfa}.ir97-table tbody tr.selected{outline:2px solid #e8792e;outline-offset:-2px}.ir97-table tbody tr:hover{background:#fff6ef}.ir97-table td{height:38px;padding:6px 8px;border-right:1px solid #fff;border-bottom:1px solid #fff;font-size:8.7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}.ir97-table td.money{color:#e76c2a;font-weight:760;text-align:right;font-variant-numeric:tabular-nums}.ir97-table td.number{color:#e76c2a;font-weight:800;text-align:left}.ir97-table td.left{text-align:left}.ir97-status{display:inline-flex;align-items:center;justify-content:center;min-width:68px;padding:4px 8px;border-radius:999px;color:#fff;font-size:7.7px;font-weight:800}.ir97-status.paid{background:#38b85c}.ir97-status.partial{background:#3e9ce7}.ir97-status.open{background:#f06b20}.ir97-empty{padding:30px;text-align:center;color:#7a858c;font-size:9.5px}.ir97-foot{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:7px;color:#7a858c;font-size:8px}.ir97-note{margin-top:7px;padding:7px 9px;border:1px solid #e1e7e9;border-radius:5px;background:#f8fafb;font-size:8px;color:#6c7880}.ir97-note strong{color:#40545e}@media(max-width:760px){.ir97{padding:7px}.ir97-toolbar{align-items:flex-start}.ir97-tools{width:100%}.ir97-tools input{flex:1;min-width:120px}.ir97-tablewrap{max-height:66vh}}
    `;document.head.appendChild(st);
  }
  function ensurePage(){if(page)return page;const shell=document.querySelector('.page-shell'),main=shell?.querySelector('.main-card');if(!shell||!main)return null;page=document.getElementById('invoiceRegisterPageV97');if(!page){page=document.createElement('section');page.id='invoiceRegisterPageV97';page.hidden=true;main.insertAdjacentElement('afterend',page);}return page;}
  function hideOtherPages(){const main=document.querySelector('.main-card');if(main)main.style.display='none';['kanbanPage','offersListPage','billingDashboardPageV39','billingDashboardEmptyV86','newInvoicePageV39','billablePageV58'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=true;});}
  function setChrome(){const title=document.querySelector('.page-title');if(title)title.textContent='Fatture';const bc=document.querySelector('.breadcrumb');if(bc)bc.innerHTML='<span>⌂</span><span>›</span><strong>Fatture</strong>';document.querySelectorAll('#appSidebar .sidebar-item').forEach(x=>x.classList.toggle('active',x.dataset.page==='invoices'));document.getElementById('appSidebar')?.classList.remove('open');document.getElementById('appSidebarOverlay')?.classList.remove('open');}
  async function newInvoice(){if(page)page.hidden=true;const api=entry();if(api?.loadWorkspace)await api.loadWorkspace('invoice');}
  function render(){
    if(!ensurePage())return;const rows=filteredRows();
    page.innerHTML=`<div class="ir97"><div class="ir97-toolbar"><div class="ir97-actions"><button type="button" class="ir97-btn orange" data-ir-new>Nuova fattura</button><button type="button" class="ir97-btn orange" data-ir-receipt disabled title="Gestione incassi: prossimo step">Registra incasso</button></div><div class="ir97-tools"><label>Righe per pagina <select data-ir-size><option>25</option><option>50</option><option>100</option></select></label><label>Cerca <input data-ir-global value="${esc(filters.global)}"></label></div></div><div class="ir97-tablewrap"><table class="ir97-table"><thead><tr>${['Numero','Data','Tipo','Cliente','Commesse','Imponibile','Cassa','IVA','Totale','Incassato','Residuo','Stato pagamento','Scadenza'].map(x=>`<th>${x}</th>`).join('')}</tr><tr class="ir97-filters">${filters.cols.map((v,i)=>`<td><input data-ir-col="${i}" value="${esc(v)}" placeholder="Cerca"></td>`).join('')}</tr></thead><tbody data-ir-body></tbody></table></div><div class="ir97-foot"><span>${rows.length} fattura/e visualizzate</span><span>Archivio fatture collegate a commesse, offerte e Righe Offerta</span></div><div class="ir97-note"><strong>Collegamenti preservati.</strong> Il salvataggio nel registro non modifica le allocazioni: ogni Riga Fattura mantiene il collegamento alle Righe Offerta e, quando presente, alla riconciliazione del Piano di fatturazione.</div></div>`;
    tbody=page.querySelector('[data-ir-body]');renderBody();bindPage();
  }
  function renderBody(){if(!tbody)return;const rows=filteredRows();tbody.innerHTML=rows.length?rows.map(row=>{const v=row.values,a=row.amounts,sel=String(row.inv.id)===String(selectedId)?' selected':'';return `<tr class="${sel}" data-ir-id="${esc(row.inv.id)}"><td class="number">${esc(v[0])}</td><td>${esc(v[1])}</td><td>${esc(v[2])}</td><td class="left">${esc(v[3])}</td><td>${esc(v[4])}</td><td class="money">${money(a.taxable)}</td><td class="money">${money(a.fund)}</td><td class="money">${money(a.vat)}</td><td class="money">${money(a.total)}</td><td class="money">${money(a.received)}</td><td class="money">${money(a.residual)}</td><td><span class="ir97-status ${statusClass(a.status)}">${esc(a.status)}</span></td><td>${esc(v[12])}</td></tr>`;}).join(''):`<tr><td colspan="13"><div class="ir97-empty">Nessuna fattura salvata. Crea una Nuova fattura e premi “Salva fattura”.</div></td></tr>`;tbody.querySelectorAll('[data-ir-id]').forEach(tr=>tr.addEventListener('click',()=>{selectedId=tr.dataset.irId;renderBody();}));}
  function bindPage(){page.querySelector('[data-ir-new]')?.addEventListener('click',newInvoice);page.querySelector('[data-ir-global]')?.addEventListener('input',e=>{filters.global=e.target.value;renderBody();});page.querySelectorAll('[data-ir-col]').forEach(el=>el.addEventListener('input',e=>{filters.cols[Number(e.target.dataset.irCol)]=e.target.value;renderBody();}));}
  function showInvoices(){if(!ensurePage())return;hideOtherPages();page.hidden=false;setChrome();history.replaceState(null,'','#fatture');render();}
  function installSidebar(attempt=0){
    const nav=document.querySelector('#appSidebar .sidebar-nav');if(!nav){if(attempt<240)setTimeout(()=>installSidebar(attempt+1),35);return;}
    let btn=nav.querySelector('[data-page="invoices"]');if(!btn){btn=document.createElement('button');btn.type='button';btn.className='sidebar-item';btn.dataset.page='invoices';btn.innerHTML='<span class="side-icon">▤</span>Fatture';const billing=nav.querySelector('[data-page="billing"]');if(billing)billing.insertAdjacentElement('afterend',btn);else nav.appendChild(btn);}
    if(btn.dataset.irReady!=='97'){const fresh=btn.cloneNode(true);btn.replaceWith(fresh);btn=fresh;btn.dataset.irReady='97';btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();showInvoices();},true);}
    document.addEventListener('click',e=>{const b=e.target.closest?.('#appSidebar .sidebar-item');if(b&&b.dataset.page!=='invoices'&&page)page.hidden=true;},true);if(location.hash==='#fatture')setTimeout(showInvoices,40);
  }
  function readSaveMeta(){
    const p=document.getElementById('newInvoicePageV39');if(!p)return null;const get=key=>p.querySelector(`[data-meta="${key}"]`)?.value||'';const sums={};
    p.querySelectorAll('.ni39-summary .ni39-sumrow').forEach(r=>{const label=norm(r.querySelector('span')?.textContent),value=num(r.querySelector('strong')?.textContent);if(label.startsWith('imponibile'))sums.taxable=value;else if(label.startsWith('cassa'))sums.fund=value;else if(label.startsWith('iva'))sums.vat=value;else if(label.startsWith('totale'))sums.total=value;});
    return {ctx:context(),client:get('client'),number:get('number'),date:get('date'),due:get('due'),payment:get('payment'),...sums};
  }
  function enrichSavedInvoice(inv,meta){
    if(!inv||!meta)return;const offer=meta.ctx?.offer||{};
    inv.commessa=String(inv.commessa||offer.commessa||offer.commessaLabel?.split(' - ')[0]||'');inv.offerCode=String(inv.offerCode||offer.code||'');inv.type=inv.type||'Elettronica';inv.incassato=Number(inv.incassato||0);inv.dueDate=dueDate(inv.date||meta.date,inv.due||meta.due);
    inv.registerV97={...(inv.registerV97||{}),commessa:inv.commessa,offerCode:inv.offerCode,type:inv.type,taxable:Number(meta.taxable||0),fund:Number(meta.fund||0),vat:Number(meta.vat||0),total:Number(meta.total||0),received:Number(inv.incassato||0),dueDate:inv.dueDate};
  }
  function observeSave(){document.addEventListener('click',e=>{const btn=e.target.closest?.('#newInvoicePageV39 [data-save-invoice]');if(!btn)return;const before=invoices().length,meta=readSaveMeta();setTimeout(()=>{const list=invoices();if(list.length<=before)return;const inv=list[list.length-1];enrichSavedInvoice(inv,meta);window.dispatchEvent(new CustomEvent('dabster-invoice-saved-v97',{detail:{invoice:inv}}));showInvoices();},40);},true);}

  installStyles();installSidebar();observeSave();const interval=setInterval(()=>{if(document.hidden)return;if(!document.querySelector('#appSidebar [data-page="invoices"]'))installSidebar();},800);window.addEventListener('beforeunload',()=>clearInterval(interval),{once:true});
  window.DABSTER_INVOICE_REGISTER_V97_API={show:showInvoices,render,getInvoices:()=>invoices().slice(),invoiceAmounts};
})();