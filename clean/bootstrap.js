import {createStore} from './store.js';
import {createBillingDomain} from './billing-domain.js';
import {installEconomicAdapter} from './economic-adapter.js';
import {installOfferWorkflow} from './offer-workflow.js';
import {runSelfTests} from './self-test.js';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function waitForCore(){
  for(let i=0;i<260;i++){
    const ready=document.querySelector('#tab-analisi .economic-table')&&
      document.getElementById('analysisSubtabs')&&
      document.querySelectorAll('#phaseWorkCards > .phase-work-card').length>=7&&
      document.getElementById('reimbursementsSection')&&
      document.getElementById('externalCostsSection');
    if(ready)return true;
    await sleep(40);
  }
  return false;
}

async function loadPresentationModules(){
  const modules=['../ui-polish-v55.js','../planning-layout-v59.js','../approval-mail-v62.js'];
  await Promise.all(modules.map(path=>import(path).catch(err=>console.error('[Dabster clean UI]',path,err))));
}

async function boot(){
  if(window.DABSTER_CLEAN_V2?.booted)return window.DABSTER_CLEAN_V2;
  const tests=runSelfTests();
  if(!tests.ok)throw new Error('Regression test economici Clean V2 non superati');
  if(!await waitForCore())throw new Error('Componenti base del gestionale non disponibili');

  const store=createStore();
  const billing=createBillingDomain(store);
  const economic=installEconomicAdapter(store);
  const offer=installOfferWorkflow(store,billing);

  window.DABSTER_STORE=store;
  window.DABSTER_BILLING_DOMAIN=billing;
  window.DABSTER_CLEAN_TESTS=tests;
  window.DABSTER_CLEAN_V2={booted:true,store,billing,economic,offer,tests,version:'clean-v2'};

  await loadPresentationModules();
  economic.settle();
  offer.sync();
  document.documentElement.dataset.dabsterArchitecture='clean-v2';
  window.dispatchEvent(new CustomEvent('dabster-clean-ready',{detail:window.DABSTER_CLEAN_V2}));
  return window.DABSTER_CLEAN_V2;
}

window.DABSTER_CLEAN_BOOT=boot();
window.DABSTER_CLEAN_BOOT.catch(err=>{
  console.error('[Dabster clean boot]',err);
  document.documentElement.dataset.dabsterArchitecture='clean-v2-error';
});
