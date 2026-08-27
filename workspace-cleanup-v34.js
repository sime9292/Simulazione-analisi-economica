/* v34 - Keep Offerta and Attivita Commessa free from prototype/demo chrome. */
(function(){
  function clean(){
    document.getElementById('analysisDemoToolbar')?.remove();
    const foot=document.querySelector('#appSidebar .sidebar-foot');
    if(foot && /simulazione/i.test(foot.textContent||''))foot.remove();
  }
  clean();
  const observer=new MutationObserver(()=>clean());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>{clean();observer.disconnect();},5000);
})();
