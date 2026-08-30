/* v78 - Load the complete v66 HTML into the current top-level document, replacing only the app loader. */
(async function(){
  try{
    const response=await fetch('v66.html?v=78-base',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    let html=await response.text();
    html=html.replace('app-v14.js?v=66','app-v78.js?v=78');
    document.open();
    document.write(html);
    document.close();
  }catch(err){
    console.error('[Dabster v78] bootstrap error',err);
    document.documentElement.classList.remove('dabster-booting');
    document.body.innerHTML='<div style="padding:24px;font:14px Arial;color:#8a3d35">Errore caricamento v78</div>';
  }
})();