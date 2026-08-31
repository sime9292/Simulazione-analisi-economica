/* v99 - Billing page visibility router. Dashboard, New Invoice, Invoice Register and Receipt Allocation are mutually exclusive. */
(function(){
  if(window.DABSTER_BILLING_PAGE_ROUTER_V99)return;
  window.DABSTER_BILLING_PAGE_ROUTER_V99=true;
  let syncing=false;
  const get=id=>document.getElementById(id),visible=el=>!!el&&!el.hidden,hide=el=>{if(el&&!el.hidden)el.hidden=true;};
  function sync(){
    if(syncing)return;syncing=true;
    try{
      const invoice=get('newInvoicePageV39'),register=get('invoiceRegisterPageV97'),receipt=get('receiptAllocationPageV99'),liveDashboard=get('billingDashboardLiveV87'),workspaceDashboard=get('billingDashboardPageV39'),emptyDashboard=get('billingDashboardEmptyV86');
      if(visible(receipt)){hide(invoice);hide(register);hide(liveDashboard);hide(workspaceDashboard);hide(emptyDashboard);return;}
      if(visible(invoice)){hide(receipt);hide(register);hide(liveDashboard);hide(workspaceDashboard);hide(emptyDashboard);return;}
      if(visible(register)){hide(receipt);hide(invoice);hide(liveDashboard);hide(workspaceDashboard);hide(emptyDashboard);return;}
      if(visible(liveDashboard)){hide(receipt);hide(invoice);hide(register);hide(workspaceDashboard);hide(emptyDashboard);return;}
      if(visible(workspaceDashboard)||visible(emptyDashboard)){hide(receipt);hide(invoice);hide(register);hide(liveDashboard);}
    }finally{syncing=false;}
  }
  function install(){
    sync();const observer=new MutationObserver(()=>sync());observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
    document.addEventListener('click',()=>setTimeout(sync,0),true);window.addEventListener('hashchange',()=>setTimeout(sync,0));window.addEventListener('dabster-invoice-saved-v97',()=>setTimeout(sync,0));window.addEventListener('dabster-receipt-saved-v99',()=>setTimeout(sync,0));
    window.DABSTER_BILLING_PAGE_ROUTER_V99_API={sync};
  }
  if(document.body)install();else document.addEventListener('DOMContentLoaded',install,{once:true});
})();
