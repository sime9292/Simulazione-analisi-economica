/* v83 - Normal top-level runtime with orphan-free Kanban; Test remains pure autofill. */
(async function(){
  try{
    sessionStorage.setItem('dabster.environment.v44','free');
    sessionStorage.removeItem('dabster.test.case.v44');
    sessionStorage.removeItem('dabster.test.stage.v44');
    const response=await fetch('v66.html?v=83-base',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    let html=await response.text();
    html=html.replace('app-v14.js?v=66','app-v83.js?v=83');
    html=html.replace('</body>','<script src="test-autofill-v81.js?v=83-autofill"></script></body>');
    document.open();document.write(html);document.close();
  }catch(err){
    console.error('[Dabster v83] bootstrap error',err);
    document.documentElement.classList.remove('dabster-booting');
    document.body.innerHTML='<div style="padding:24px;font:14px Arial;color:#8a3d35">Errore caricamento v83</div>';
  }
})();