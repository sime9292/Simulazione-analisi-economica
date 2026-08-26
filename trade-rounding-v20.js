/* clean-v2 compatibility entry: business logic now lives under /clean. */
(function(){
  if(window.DABSTER_CLEAN_BOOT)return;
  window.DABSTER_CLEAN_BOOT=import('./clean/bootstrap.js').catch(err=>{
    console.error('[Dabster clean-v2 bootstrap]',err);
    document.documentElement.dataset.dabsterArchitecture='clean-v2-error';
    throw err;
  });
})();
