/* v64 - Test environment shell with no preloaded fixtures. Test data are injected only for explicit test runs. */
(function(){
  const ENV_KEY='dabster.environment.v44';
  const CASE_KEY='dabster.test.case.v44';
  const STAGE_KEY='dabster.test.stage.v44';
  let env=sessionStorage.getItem(ENV_KEY)||'free';
  let bar=null,fixture=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function installStyles(){
    if(document.getElementById('testDataEntryV64Styles'))return;
    const s=document.createElement('style');s.id='testDataEntryV64Styles';s.textContent=`
      #dabsterEnvironmentBar{position:relative;z-index:50;margin:0 0 9px;padding:8px 10px;border:1px solid #d6e0e4;border-radius:8px;background:#fff;font-family:Arial,sans-serif}.td50-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.td50-label{font-size:7.5px;font-weight:800;text-transform:uppercase;color:#75848c}.td50-seg{display:flex;border:1px solid #cfd9de;border-radius:6px;overflow:hidden}.td50-mode,.td50-action{height:29px;border:0;background:#fff;color:#4b626d;font-size:8.8px;font-weight:760;cursor:pointer}.td50-mode{padding:0 11px;border-right:1px solid #dbe2e5}.td50-mode:last-child{border-right:0}.td50-mode.active{background:#3e6574;color:#fff}.td50-test .td50-mode.active{background:#d86c27}.td50-note{font-size:8px;color:#728089}.td50-stage{display:inline-flex;height:20px;align-items:center;padding:0 7px;border-radius:999px;background:#f1f5f6;color:#526873;font-size:7.4px;font-weight:750}.td50-action{padding:0 10px;border:1px solid #cad6db;border-radius:6px}.td50-action:disabled{opacity:.45;cursor:not-allowed}.td50-fixture{font-size:8px;font-weight:750;color:#3f6674;background:#eef6f8;border:1px solid #ccdde3;border-radius:5px;padding:5px 8px}
    `;document.head.appendChild(s);
  }
  function clearLegacyTestState(){
    sessionStorage.removeItem(CASE_KEY);sessionStorage.setItem(STAGE_KEY,'0');
    window.DABSTER_TEST_CASE_V50=null;
  }
  function renderBar(){
    if(!bar)return;const test=env==='test';bar.classList.toggle('td50-test',test);
    const fixtureText=fixture?`Caso fittizio pronto: ${esc(fixture.label||fixture.offer?.code||'Test')}`:'Nessun caso Test precaricato';
    bar.innerHTML=`<div class="td50-row"><span class="td50-label">Ambiente</span><div class="td50-seg"><button class="td50-mode ${!test?'active':''}" data-env="free">Libero</button><button class="td50-mode ${test?'active':''}" data-env="test">Test</button></div>${test?`<span class="td50-fixture">${fixtureText}</span><span class="td50-note">I dati vengono caricati solo durante un test esplicito. Nessuna offerta demo è presente.</span>`:`<span class="td50-note">Uso normale del gestionale. Nessun dato demo precaricato.</span>`}</div>`;
    bar.querySelectorAll('[data-env]').forEach(b=>b.addEventListener('click',()=>switchEnv(b.dataset.env)));
  }
  function switchEnv(next){
    if(next===env)return;env=next;sessionStorage.setItem(ENV_KEY,next);clearLegacyTestState();renderBar();
  }
  function installBar(){
    installStyles();const shell=document.querySelector('.page-shell');if(!shell)return false;
    bar=document.getElementById('dabsterEnvironmentBar');if(!bar){bar=document.createElement('section');bar.id='dabsterEnvironmentBar';const title=shell.querySelector('.page-title');shell.insertBefore(bar,title||shell.firstChild);}renderBar();return true;
  }
  function setFixture(next){fixture=next&&typeof next==='object'?JSON.parse(JSON.stringify(next)):null;window.DABSTER_TEST_FIXTURE_V64=fixture;renderBar();return fixture;}
  function clearFixture(){fixture=null;window.DABSTER_TEST_FIXTURE_V64=null;clearLegacyTestState();renderBar();return true;}
  async function install(){clearLegacyTestState();for(let i=0;i<260&&!installBar();i++)await new Promise(r=>setTimeout(r,40));}

  window.DABSTER_TEST_HARNESS_V64={
    setFixture,clearFixture,getFixture:()=>fixture,getEnvironment:()=>env,
    resetRuntime(){clearFixture();window.DABSTER_BILLING_PLAN_V47?.reset?.();window.DABSTER_OFFER_LINES?.resetPostConfirmation?.();window.DABSTER_BILLING_MODEL_V39={invoices:[]};window.DABSTER_OFFER_FLOW?.openNewOffer?.();}
  };
  install();
})();