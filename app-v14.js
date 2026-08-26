/* clean-v2 compatibility loader: preload legacy UI modules without patching browser globals. */
(function(){
  ['app-v5.js','app-v6.js','app-v7.js','app-v8.js','app-v9.js','app-v10.js','app-v11.js','app-v12.js','app-v13.js'].forEach(file=>{
    if(document.querySelector(`link[data-clean-preload="${file}"]`))return;
    const link=document.createElement('link');link.rel='preload';link.as='script';link.href=file+'?v=clean2';link.dataset.cleanPreload=file;document.head.appendChild(link);
  });
  const core=document.createElement('script');core.src='app-v13.js?v=clean2';core.dataset.cleanLegacyUi='1';document.head.appendChild(core);
})();
