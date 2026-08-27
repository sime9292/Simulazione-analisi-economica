/* clean-v2 compatibility loader: preload legacy UI modules without patching browser globals. */
(function(){
  const revealFailsafe=()=>document.documentElement.classList.remove('dabster-booting');
  setTimeout(revealFailsafe,9000);

  const preload=[
    ['app-v5.js','v=10'],['app-v6.js','v=11'],['app-v7.js','v=12'],['app-v8.js','v=13'],
    ['app-v9.js','v=clean2'],['app-v10.js','v=clean2'],['app-v11.js','v=15'],['app-v12.js','v=16'],['app-v13.js','v=clean2']
  ];
  preload.forEach(([file,query])=>{
    if(document.querySelector(`link[data-clean-preload="${file}"]`))return;
    const link=document.createElement('link');link.rel='preload';link.as='script';link.href=`${file}?${query}`;link.dataset.cleanPreload=file;document.head.appendChild(link);
  });

  function guardedMutationObserverScope(){
    const Native=window.MutationObserver;
    if(!Native||Native.__dabsterPe04Guarded)return ()=>{};

    class GuardedMutationObserver{
      constructor(callback){
        this._callback=callback;
        this._observations=[];
        this._inside=false;
        this._native=new Native(records=>{
          if(this._inside)return;
          this._inside=true;
          const observations=this._observations.slice();
          this._native.disconnect();
          try{callback(records,this);}finally{
            observations.forEach(({target,options})=>{try{this._native.observe(target,options);}catch(_e){}});
            this._inside=false;
          }
        });
      }
      observe(target,options){
        const found=this._observations.find(x=>x.target===target);
        if(found)found.options=options;else this._observations.push({target,options});
        this._native.observe(target,options);
      }
      disconnect(){this._observations=[];this._native.disconnect();}
      takeRecords(){return this._native.takeRecords();}
    }
    GuardedMutationObserver.__dabsterPe04Guarded=true;
    window.MutationObserver=GuardedMutationObserver;
    return ()=>{if(window.MutationObserver===GuardedMutationObserver)window.MutationObserver=Native;};
  }

  function loadPe04Flow(){
    if(document.querySelector('script[data-pe04-flow]'))return;
    const restoreObserver=guardedMutationObserverScope();
    const flow=document.createElement('script');
    flow.src='pe04-flow-v36.js?v=36.1';
    flow.dataset.pe04Flow='1';
    flow.onerror=()=>{restoreObserver();revealFailsafe();console.error('[Dabster] Errore caricamento flusso PE04');};
    flow.onload=()=>{
      let attempts=0;
      const release=()=>{
        attempts++;
        if(window.DABSTER_PE04_FLOW||attempts>300){restoreObserver();return;}
        setTimeout(release,50);
      };
      release();
    };
    document.head.appendChild(flow);
  }

  const core=document.createElement('script');
  core.src='app-v13.js?v=clean2';
  core.dataset.cleanLegacyUi='1';
  core.onerror=revealFailsafe;
  core.onload=()=>{
    const cleanup=document.createElement('script');cleanup.src='workspace-cleanup-v34.js?v=34';document.head.appendChild(cleanup);
    const billingEntry=document.createElement('script');billingEntry.src='billing-entry-v34.js?v=36';document.head.appendChild(billingEntry);
    if(document.readyState==='complete')setTimeout(loadPe04Flow,0);else window.addEventListener('load',loadPe04Flow,{once:true});
  };
  document.head.appendChild(core);
})();
