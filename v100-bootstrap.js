/* v100 - v99 runtime plus additive authorization workflow. */
(async function(){
  try{
    sessionStorage.setItem('dabster.environment.v44','free');
    sessionStorage.removeItem('dabster.test.case.v44');
    sessionStorage.removeItem('dabster.test.stage.v44');
    const response=await fetch('v66.html?v=100-base',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    let html=await response.text();
    html=html.replace('app-v14.js?v=66','app-v95.js?v=100');
    html=html.replace('</body>','<script src="test-fixture-v92.js?v=100"></script><script src="invoice-register-v99-loader.js?v=100"></script><script src="receipt-allocation-v99.js?v=100"></script><script src="billing-page-router-v99.js?v=100"></script><script src="billing-control-v100.js?v=100"></script></body>');
    document.open();document.write(html);document.close();
  }catch(err){
    console.error('[Dabster v100] bootstrap error',err);
    document.documentElement.classList.remove('dabster-booting');
    document.body.innerHTML='<div style="padding:24px;font:14px Arial;color:#8a3d35">Errore caricamento v100</div>';
  }
})();