/* clean-v2 compatibility loader: preload legacy UI modules without patching browser globals. */
(function(){
  const preload=[
    ['app-v5.js','v=10'],['app-v6.js','v=11'],['app-v7.js','v=12'],['app-v8.js','v=13'],
    ['app-v9.js','v=clean2'],['app-v10.js','v=clean2'],['app-v11.js','v=15'],['app-v12.js','v=16'],['app-v13.js','v=clean2'],
    ['billing-dashboard-v31.js','v=31']
  ];
  preload.forEach(([file,query])=>{
    if(document.querySelector(`link[data-clean-preload="${file}"]`))return;
    const link=document.createElement('link');link.rel='preload';link.as='script';link.href=`${file}?${query}`;link.dataset.cleanPreload=file;document.head.appendChild(link);
  });
  const core=document.createElement('script');core.src='app-v13.js?v=clean2';core.dataset.cleanLegacyUi='1';document.head.appendChild(core);
  const billing=document.createElement('script');billing.src='billing-dashboard-v31.js?v=31';billing.dataset.cleanBillingDashboard='1';document.head.appendChild(billing);
})();