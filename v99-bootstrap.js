/* v99 - Same v98 runtime + receipt allocation and payment states. */
(async function(){
  try{
    sessionStorage.setItem('dabster.environment.v44','free');
    sessionStorage.removeItem('dabster.test.case.v44');
    sessionStorage.removeItem('dabster.test.stage.v44');
    const response=await fetch('v66.html?v=99-base',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    let html=await response.text();
    html=html.replace('app-v14.js?v=66','app-v95.js?v=99');
    html=html.replace('</body>','<script src="test-fixture-v92.js?v=99"></script><script src="invoice-register-v99-loader.js?v=99"></script><script src="receipt-allocation-v99.js?v=99"></script><script src="billing-page-router-v99.js?v=99"></script></body>');
    document.open();document.write(html);document.close();
  }catch(err){
    console.error('[Dabster v99] bootstrap error',err);
    document.documentElement.classList.remove('dabster-booting');
    document.body.innerHTML='<div style="padding:24px;font:14px Arial;color:#8a3d35">Errore caricamento v99</div>';
  }
})();
