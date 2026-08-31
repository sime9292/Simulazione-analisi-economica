/* v98 - Same v97 runtime + billing page visibility router. */
(async function(){
  try{
    sessionStorage.setItem('dabster.environment.v44','free');
    sessionStorage.removeItem('dabster.test.case.v44');
    sessionStorage.removeItem('dabster.test.stage.v44');
    const response=await fetch('v66.html?v=98-base',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    let html=await response.text();
    html=html.replace('app-v14.js?v=66','app-v95.js?v=98');
    html=html.replace('</body>','<script src="test-fixture-v92.js?v=98"></script><script src="invoice-register-v97.js?v=98"></script><script src="billing-page-router-v98.js?v=98"></script></body>');
    document.open();document.write(html);document.close();
  }catch(err){
    console.error('[Dabster v98] bootstrap error',err);
    document.documentElement.classList.remove('dabster-booting');
    document.body.innerHTML='<div style="padding:24px;font:14px Arial;color:#8a3d35">Errore caricamento v98</div>';
  }
})();
