/* v79 - Normal top-level page, standard engine, one Test controller only. */
(async function(){
  try{
    const response=await fetch('v66.html?v=79-base',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    let html=await response.text();
    html=html.replace('app-v14.js?v=66','app-v79.js?v=79');
    html=html.replace('</body>','<script src="test-flow-v70.js?v=79-single-test"></script></body>');
    document.open();
    document.write(html);
    document.close();
  }catch(err){
    console.error('[Dabster v79] bootstrap error',err);
    document.documentElement.classList.remove('dabster-booting');
    document.body.innerHTML='<div style="padding:24px;font:14px Arial;color:#8a3d35">Errore caricamento v79</div>';
  }
})();