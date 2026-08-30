/* v89 - Manual confirmation -> Righe Offerta -> standalone Billing Dashboard. */
(async function(){
  try{
    sessionStorage.setItem('dabster.environment.v44','free');
    sessionStorage.removeItem('dabster.test.case.v44');
    sessionStorage.removeItem('dabster.test.stage.v44');
    const response=await fetch('v66.html?v=89-base',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    let html=await response.text();
    html=html.replace('app-v14.js?v=66','app-v89.js?v=89');
    html=html.replace('</body>','<script src="test-domain-reset-v84.js?v=89"></script><script src="test-autofill-v81.js?v=89-autofill"></script></body>');
    document.open();document.write(html);document.close();
  }catch(err){
    console.error('[Dabster v89] bootstrap error',err);
    document.documentElement.classList.remove('dabster-booting');
    document.body.innerHTML='<div style="padding:24px;font:14px Arial;color:#8a3d35">Errore caricamento v89</div>';
  }
})();