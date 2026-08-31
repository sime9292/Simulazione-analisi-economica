/* v98 - Billing page visibility router. Dashboard, New Invoice and Invoice Register are mutually exclusive. */
(function(){
  if(window.DABSTER_BILLING_PAGE_ROUTER_V98)return;
  window.DABSTER_BILLING_PAGE_ROUTER_V98=true;
  let syncing=false;

  const get=id=>document.getElementById(id);
  const visible=el=>!!el&&!el.hidden;
  const hide=el=>{if(el&&!el.hidden)el.hidden=true;};

  function sync(){
    if(syncing)return;
    syncing=true;
    try{
      const invoice=get('newInvoicePageV39');
      const register=get('invoiceRegisterPageV97');
      const liveDashboard=get('billingDashboardLiveV87');
      const workspaceDashboard=get('billingDashboardPageV39');
      const emptyDashboard=get('billingDashboardEmptyV86');

      if(visible(invoice)){
        hide(register);hide(liveDashboard);hide(workspaceDashboard);hide(emptyDashboard);
        return;
      }
      if(visible(register)){
        hide(invoice);hide(liveDashboard);hide(workspaceDashboard);hide(emptyDashboard);
        return;
      }
      if(visible(liveDashboard)){
        hide(invoice);hide(register);hide(workspaceDashboard);hide(emptyDashboard);
        return;
      }
      if(visible(workspaceDashboard)||visible(emptyDashboard)){
        hide(invoice);hide(register);hide(liveDashboard);
      }
    }finally{syncing=false;}
  }

  function install(){
    sync();
    const observer=new MutationObserver(()=>sync());
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
    document.addEventListener('click',()=>setTimeout(sync,0),true);
    window.addEventListener('hashchange',()=>setTimeout(sync,0));
    window.addEventListener('dabster-invoice-saved-v97',()=>setTimeout(sync,0));
    window.DABSTER_BILLING_PAGE_ROUTER_V98_API={sync};
  }

  if(document.body)install();else document.addEventListener('DOMContentLoaded',install,{once:true});
})();
