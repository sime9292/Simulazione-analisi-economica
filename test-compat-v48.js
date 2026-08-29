/* v48 - Compatibility guard for Test flow after billing-plan v47 rollout. */
(function(){
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;

  function field(label){
    return [...document.querySelectorAll('#tab-dati label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))||null;
  }
  function control(label){return field(label)?.querySelector('input,select,textarea')||null;}
  function currentCode(){return String(control('Codice')?.value||'').trim();}
  function activityNames(){return [...document.querySelectorAll('#phaseWorkCards .activity-name')].map(x=>norm(x.value)).filter(Boolean);}

  function analysisReady(){
    if(currentCode()!=='26_022pe01')return false;
    const names=activityNames();
    const hasRequired=['pua','progetto impianti per pdc','parere preventivo vvf'].every(x=>names.includes(norm(x)));
    const total=num(document.getElementById('totaleOfferta')?.value);
    return hasRequired&&Math.abs(total-19000)<=0.01;
  }
  function confirmationReady(){
    return norm(control('Stato')?.value)==='confermata'&&document.querySelectorAll('#offerLineRows .offer-line-row').length>=3;
  }
  function bridgePlanApi(){
    if(window.DABSTER_BILLING_PLAN_V47&&!window.DABSTER_BILLING_PLAN_V46){
      window.DABSTER_BILLING_PLAN_V46=window.DABSTER_BILLING_PLAN_V47;
    }
  }
  function repairButtons(){
    bridgePlanApi();
    const confirm=document.querySelector('#dabsterEnvironmentBar [data-confirm-lines]');
    if(confirm&&analysisReady()){
      confirm.disabled=false;
      confirm.title='Conferma offerta e genera le Righe Offerta';
    }
    const plan=document.querySelector('#dabsterEnvironmentBar [data-load-plan]');
    if(plan&&confirmationReady()){
      plan.disabled=false;
      plan.title='Carica il Piano di fatturazione Test';
    }
  }

  const observer=new MutationObserver(()=>repairButtons());
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','value']});
  document.addEventListener('input',repairButtons,true);
  document.addEventListener('change',repairButtons,true);
  window.addEventListener('dabster-offer-flow-change',()=>setTimeout(repairButtons,20));
  window.addEventListener('dabster-billing-plan-ready',()=>setTimeout(repairButtons,20));
  let tries=0;const timer=setInterval(()=>{repairButtons();if(++tries>300)clearInterval(timer);},50);
})();