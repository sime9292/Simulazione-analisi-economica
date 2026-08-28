/* v34 - Keep Offerta and Attivita Commessa free from prototype/demo chrome. */
(function(){
  function clean(){
    const toolbar=document.getElementById('analysisDemoToolbar');
    if(toolbar){toolbar.hidden=true;toolbar.style.display='none';toolbar.setAttribute('aria-hidden','true');}
    const foot=document.querySelector('#appSidebar .sidebar-foot');
    if(foot && /simulazione/i.test(foot.textContent||''))foot.remove();
  }
  clean();
  const observer=new MutationObserver(()=>clean());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>{clean();observer.disconnect();},5000);
})();
