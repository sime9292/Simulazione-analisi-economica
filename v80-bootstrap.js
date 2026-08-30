/* v80 - Standard runtime + one pure autofill controller. Test does not patch business state. */
(async function(){
  try{
    const response=await fetch('v66.html?v=80-base',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    let html=await response.text();
    html=html.replace('app-v14.js?v=66','app-v79.js?v=80-normal-engine');
    html=html.replace('</body>','<script src="test-autofill-v80.js?v=80-pure-autofill"></script></body>');
    document.open();document.write(html);document.close();
  }catch(err){
    console.error('[Dabster v80] bootstrap error',err);
    document.documentElement.classList.remove('dabster-booting');
    document.body.innerHTML='<div style="padding:24px;font:14px Arial;color:#8a3d35">Errore caricamento v80</div>';
  }
})();