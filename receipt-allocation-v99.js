/* v99 - Receipt allocation: enter received amount, allocate it across open invoices, update payment states. */
(function(){
  if(window.DABSTER_RECEIPT_ALLOCATION_V99)return;
  window.DABSTER_RECEIPT_ALLOCATION_V99=true;

  const cents=n=>Math.round((Number(n||0)+Number.EPSILON)*100)/100;
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const parseMoney=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
  const today=()=>new Date().toISOString().slice(0,10);
  const state={amount:0,date:today(),allocations:new Map(),message:''};
  let page=null;

  function api(){return window.DABSTER_INVOICE_REGISTER_V99||window.DABSTER_INVOICE_REGISTER_V97_API||null;}
  function invoices(){return api()?.getInvoices?.()||[];}
  function amounts(inv){return api()?.invoiceAmounts?.(inv)||{total:0,received:0,residual:0,status:'Da incassare'};}
  function openInvoices(){return invoices().filter(inv=>amounts(inv).residual>.01);}
  function allocatedTotal(){return cents([...state.allocations.values()].reduce((s,v)=>s+Number(v||0),0));}
  function remainingReceipt(){return Math.max(0,cents(state.amount-allocatedTotal()));}
  function statusAfter(inv,add){const a=amounts(inv),received=cents(a.received+Number(add||0)),residual=Math.max(0,cents(a.total-received));return residual<=.01?'Incassata':received>.01?'Parziale':'Da incassare';}
  function displayDate(v){const d=/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))?new Date(v+'T12:00:00'):null;return d&&!Number.isNaN(d.getTime())?d.toLocaleDateString('it-IT'):String(v||'—');}

  function normalizeAllocations(){
    let remaining=Math.max(0,cents(state.amount));
    for(const inv of openInvoices()){
      const id=String(inv.id),current=Math.max(0,Number(state.allocations.get(id)||0)),max=Math.min(amounts(inv).residual,remaining),next=Math.min(current,max);
      if(next>.005){state.allocations.set(id,cents(next));remaining=cents(remaining-next);}else state.allocations.delete(id);
    }
    for(const id of [...state.allocations.keys()])if(!openInvoices().some(inv=>String(inv.id)===String(id)))state.allocations.delete(id);
  }
  function setAllocation(inv,value){
    const id=String(inv.id),current=Number(state.allocations.get(id)||0),usedOther=cents(allocatedTotal()-current),availableReceipt=Math.max(0,cents(state.amount-usedOther)),max=Math.min(amounts(inv).residual,availableReceipt),wanted=Math.max(0,cents(parseMoney(value))),next=Math.min(wanted,max);
    if(next>.005)state.allocations.set(id,next);else state.allocations.delete(id);
    state.message=wanted>max+.005?`Importo ridotto a ${money(max)} €: non puoi superare né il residuo fattura né l'incasso disponibile.`:'';
  }

  function installStyles(){
    if(document.getElementById('receiptAllocationV99Styles'))return;
    const s=document.createElement('style');s.id='receiptAllocationV99Styles';s.textContent=`
      #receiptAllocationPageV99[hidden]{display:none!important}.ra99{min-height:650px;background:#f5f6f7;border:1px solid #dce2e5;border-radius:9px;padding:12px;font-family:Arial,sans-serif;color:#3f515b}.ra99-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:9px}.ra99-title strong{display:block;font-size:15px;color:#304650}.ra99-title span{display:block;margin-top:2px;font-size:8.5px;color:#74818a}.ra99-actions{display:flex;gap:7px}.ra99-btn{height:31px;padding:0 12px;border:1px solid #cad5da;border-radius:6px;background:#fff;color:#50646e;font-size:8.7px;font-weight:780;cursor:pointer}.ra99-btn.primary{background:#ef6b22;border-color:#dc601b;color:#fff}.ra99-btn:disabled{opacity:.45;cursor:not-allowed}.ra99-card{border:1px solid #d9e1e4;border-radius:8px;background:#fff;padding:10px;margin-bottom:9px}.ra99-fields{display:grid;grid-template-columns:220px 170px 1fr;gap:10px;align-items:end}.ra99-field{display:grid;gap:4px}.ra99-field span{font-size:7.5px;font-weight:800;color:#687981;text-transform:uppercase}.ra99-field input{height:34px;border:1px solid #cdd8dd;border-radius:6px;padding:0 9px;font-size:11px;color:#344d58}.ra99-kpis{display:grid;grid-template-columns:repeat(3,minmax(120px,1fr));gap:7px}.ra99-kpi{padding:8px 9px;border:1px solid #dce4e7;border-radius:7px;background:#f9fbfb}.ra99-kpi span{display:block;font-size:7px;font-weight:800;text-transform:uppercase;color:#74818a}.ra99-kpi strong{display:block;margin-top:4px;font-size:13px;color:#334b56}.ra99-kpi.remaining strong{color:#d66a25}.ra99-table{border:1px solid #d8e0e4;border-radius:7px;overflow:auto;background:#fff}.ra99-row{display:grid;grid-template-columns:105px 95px minmax(180px,1.2fr) 105px 115px 115px 115px 130px;min-width:990px;min-height:40px}.ra99-row>div{display:flex;align-items:center;min-width:0;padding:6px 8px;border-right:1px solid #e7ecee;border-bottom:1px solid #e7ecee;font-size:8.6px}.ra99-row>div:last-child{border-right:0}.ra99-row.head{min-height:30px;background:#e9ecee}.ra99-row.head>div{font-size:7px;font-weight:800;text-transform:uppercase;color:#68767e}.ra99-money{justify-content:flex-end;font-weight:760;font-variant-numeric:tabular-nums}.ra99-alloc{width:100%;height:29px;border:1px solid #cbd7dc;border-radius:5px;padding:0 7px;text-align:right;font-size:9px;box-sizing:border-box}.ra99-status{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:7.2px;font-weight:800}.ra99-status.open{background:#fff0e5;color:#9b5d2d}.ra99-status.partial{background:#eaf4ff;color:#3378ad}.ra99-status.paid{background:#eaf6ed;color:#3f7350}.ra99-message{margin-top:8px;padding:7px 9px;border-radius:6px;background:#fff4e7;border:1px solid #efd4b2;color:#865b2d;font-size:8.2px}.ra99-help{margin-top:8px;padding:7px 9px;border:1px solid #dce4e7;border-radius:7px;background:#fff;font-size:8px;color:#687981;line-height:1.4}.ra99-empty{padding:28px;text-align:center;color:#75838b;font-size:9px}@media(max-width:800px){.ra99-fields{grid-template-columns:1fr 1fr}.ra99-kpis{grid-column:1/-1}.ra99-top{align-items:center}.ra99{padding:8px}}
    `;document.head.appendChild(s);
  }
  function ensurePage(){if(page)return page;const main=document.querySelector('.page-shell .main-card');if(!main)return null;page=document.getElementById('receiptAllocationPageV99');if(!page){page=document.createElement('section');page.id='receiptAllocationPageV99';page.hidden=true;main.insertAdjacentElement('afterend',page);}return page;}
  function hideOtherPages(){document.querySelector('.main-card')?.style.setProperty('display','none');['kanbanPage','offersListPage','billingDashboardLiveV87','billingDashboardPageV39','billingDashboardEmptyV86','newInvoicePageV39','billablePageV58','invoiceRegisterPageV97'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=true;});}
  function setChrome(){const t=document.querySelector('.page-title');if(t)t.textContent='Registra incasso';const bc=document.querySelector('.breadcrumb');if(bc)bc.innerHTML='<span>⌂</span><span>›</span><span>Fatture</span><span>›</span><strong>Registra incasso</strong>';document.querySelectorAll('#appSidebar .sidebar-item').forEach(x=>x.classList.toggle('active',x.dataset.page==='invoices'));document.getElementById('appSidebar')?.classList.remove('open');document.getElementById('appSidebarOverlay')?.classList.remove('open');}

  function render(){
    if(!ensurePage())return;normalizeAllocations();const open=openInvoices(),allocated=allocatedTotal(),remaining=remainingReceipt(),canSave=state.amount>.005&&Math.abs(remaining)<=.01&&allocated>.005;
    const rows=open.map(inv=>{const a=amounts(inv),alloc=Number(state.allocations.get(String(inv.id))||0),after=statusAfter(inv,alloc),cls=after==='Incassata'?'paid':after==='Parziale'?'partial':'open';return `<div class="ra99-row"><div><strong>${esc(inv.number||'—')}</strong></div><div>${esc(displayDate(inv.date))}</div><div>${esc(inv.client||'—')}</div><div>${esc(inv.commessa||inv.registerV97?.commessa||'—')}</div><div class="ra99-money">${money(a.total)} €</div><div class="ra99-money">${money(a.received)} €</div><div class="ra99-money">${money(a.residual)} €</div><div><input class="ra99-alloc" data-ra-alloc="${esc(inv.id)}" value="${alloc?money(alloc):'0,00'}"><span style="margin-left:6px" class="ra99-status ${cls}">${esc(after)}</span></div></div>`;}).join('');
    page.innerHTML=`<div class="ra99"><div class="ra99-top"><div class="ra99-title"><strong>Registra incasso</strong><span>Inserisci l'importo ricevuto e allocane il totale alle fatture ancora aperte.</span></div><div class="ra99-actions"><button class="ra99-btn" data-ra-back>← Fatture</button><button class="ra99-btn primary" data-ra-save ${canSave?'':'disabled'}>Registra incasso</button></div></div><div class="ra99-card"><div class="ra99-fields"><label class="ra99-field"><span>Importo incassato</span><input data-ra-amount inputmode="decimal" value="${state.amount?money(state.amount):'0,00'}"></label><label class="ra99-field"><span>Data incasso</span><input type="date" data-ra-date value="${esc(state.date)}"></label><div class="ra99-kpis"><div class="ra99-kpi"><span>Incasso</span><strong>${money(state.amount)} €</strong></div><div class="ra99-kpi"><span>Allocato</span><strong>${money(allocated)} €</strong></div><div class="ra99-kpi remaining"><span>Da allocare</span><strong>${money(remaining)} €</strong></div></div></div>${state.message?`<div class="ra99-message">${esc(state.message)}</div>`:''}</div><div class="ra99-table"><div class="ra99-row head"><div>Fattura</div><div>Data</div><div>Cliente</div><div>Commessa</div><div>Totale</div><div>Incassato</div><div>Residuo</div><div>Da allocare</div></div>${rows||'<div class="ra99-empty">Non ci sono fatture aperte da incassare.</div>'}</div><div class="ra99-help"><strong>Regola.</strong> L'importo dell'incasso deve essere interamente allocato. Può chiudere una fattura, coprirla solo in parte oppure essere distribuito su più fatture. Lo stato viene ricalcolato automaticamente: <strong>Da incassare → Parziale → Incassata</strong>.</div></div>`;
    bind();
  }
  function bind(){
    page.querySelector('[data-ra-back]')?.addEventListener('click',()=>{page.hidden=true;api()?.show?.();});
    page.querySelector('[data-ra-amount]')?.addEventListener('change',e=>{state.amount=Math.max(0,cents(parseMoney(e.target.value)));state.message='';normalizeAllocations();render();});
    page.querySelector('[data-ra-date]')?.addEventListener('change',e=>{state.date=e.target.value||today();});
    page.querySelectorAll('[data-ra-alloc]').forEach(inp=>inp.addEventListener('change',()=>{const inv=openInvoices().find(x=>String(x.id)===String(inp.dataset.raAlloc));if(!inv)return;setAllocation(inv,inp.value);render();}));
    page.querySelector('[data-ra-save]')?.addEventListener('click',saveReceipt);
  }
  function saveReceipt(){
    const allocated=allocatedTotal(),remaining=remainingReceipt();
    if(state.amount<=.005){state.message='Inserisci l’importo incassato.';render();return;}
    if(Math.abs(remaining)>.01){state.message=`Devi ancora allocare ${money(remaining)} € prima di registrare l'incasso.`;render();return;}
    if(allocated<=.005)return;
    const receipt={id:'rcpt-'+Date.now().toString(36),date:state.date,amount:cents(state.amount),allocations:[]};
    for(const [id,value] of state.allocations.entries()){
      const inv=invoices().find(x=>String(x.id)===String(id));if(!inv)continue;const before=amounts(inv),applied=Math.min(cents(value),before.residual);if(applied<=.005)continue;
      inv.incassato=cents(before.received+applied);inv.registerV97={...(inv.registerV97||{}),received:inv.incassato};inv.receipts=Array.isArray(inv.receipts)?inv.receipts:[];inv.receipts.push({receiptId:receipt.id,date:receipt.date,amount:applied});inv.paymentStatus=statusAfter(inv,applied);receipt.allocations.push({invoiceId:inv.id,invoiceNumber:inv.number,amount:applied});
    }
    const model=window.DABSTER_BILLING_MODEL_V39;if(model){model.receipts=Array.isArray(model.receipts)?model.receipts:[];model.receipts.push(receipt);}
    window.dispatchEvent(new CustomEvent('dabster-receipt-saved-v99',{detail:{receipt}}));
    state.amount=0;state.date=today();state.allocations.clear();state.message='';page.hidden=true;api()?.show?.();
  }
  function show(){if(!ensurePage())return;hideOtherPages();page.hidden=false;setChrome();state.amount=0;state.date=today();state.allocations.clear();state.message='';history.replaceState(null,'','#registra-incasso');render();}

  installStyles();
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-ir-receipt]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();show();},true);
  if(location.hash==='#registra-incasso')setTimeout(show,80);
  window.DABSTER_RECEIPT_ALLOCATION_V99_API={show,getOpenInvoices:openInvoices,getAllocated:()=>[...state.allocations.entries()]};
})();
