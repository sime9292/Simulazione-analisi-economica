/* v77 - Notify when authoritative Trigger billable state changes. */
(function(){
  if(window.DABSTER_TRIGGER_NOTIFY_V77)return;
  let last=null,timer=null;
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  function toast(text){
    const el=document.getElementById('kbToast');if(!el||!text)return;
    el.textContent=text;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2800);
  }
  function read(){try{return window.DABSTER_BILLING_TRIGGER_V58?.getSnapshot?.()||null;}catch{return null;}}
  function sync({silent=false}={}){
    const s=read();if(!s)return;
    const next={count:Number(s.count||0),billable:Number(s.billable||0),events:(s.events||[]).map(e=>({id:String(e.id),matured:!!e.matured,billable:Number(e.billable||0),status:e.status}))};
    const badge=document.querySelector('#appSidebar [data-page="billable"] .v58-side-badge');if(badge)badge.textContent=String(next.count);
    if(last&&!silent&&next.count>last.count){const inc=Math.max(0,next.billable-last.billable);toast(inc>0?`Trigger attivato · Fatturabile ${money(inc)} €`:'Trigger attivato');}
    if(last&&!silent&&next.count<last.count)toast('Trigger riaperto · fatturabile aggiornato');
    last=next;
  }
  window.addEventListener('dabster-billing-trigger-change',()=>setTimeout(()=>sync(),10));
  window.addEventListener('dabster-billing-plan-ready',()=>setTimeout(()=>sync({silent:!last}),20));
  const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>sync(),25);});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  const interval=setInterval(()=>sync(),250);
  window.DABSTER_TRIGGER_NOTIFY_V77={version:77,sync,stop:()=>{clearInterval(interval);observer.disconnect();}};
  setTimeout(()=>sync({silent:true}),400);
})();