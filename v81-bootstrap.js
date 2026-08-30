/* v81 - Normal top-level runtime, Test is UI-only autofill over FREE engine. */
(async function(){
  try{
    sessionStorage.setItem('dabster.environment.v44','free');
    sessionStorage.removeItem('dabster.test.case.v44');
    sessionStorage.removeItem('dabster.test.stage.v44');
    const response=await fetch('v66.html?v=81-base',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    let html=await response.text();
    html=html.replace('app-v14.js?v=66','app-v79.js?v=81-free-runtime');
    html=html.replace('</body>','<script src="test-autofill-v81.js?v=81"></script></body>');
    document.open();document.write(html);document.close();
  }catch(err){
    console.error('[Dabster v81] bootstrap error',err);
    document.documentElement.classList.remove('dabster-booting');
    document.body.innerHTML='<div style="padding:24px;font:14px Arial;color:#8a3d35">Errore caricamento v81</div>';
  }
})();