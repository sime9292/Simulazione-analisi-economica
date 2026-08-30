/* v84 - Test autofill must start from a completely empty Activity Domain. */
(function(){
  if(window.DABSTER_TEST_DOMAIN_RESET_V84)return;
  function domain(){return window.DABSTER_ACTIVITY_DOMAIN_V84||window.DABSTER_ACTIVITY_DOMAIN_V82||window.DABSTER_ACTIVITY_DOMAIN||null;}
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('#dabsterEnvironmentBar [data-load],#dabsterEnvironmentBar [data-reset]');
    if(!btn)return;
    domain()?.reset?.(btn.matches('[data-load]')?'test-autofill-start':'test-reset');
  },true);
  window.DABSTER_TEST_DOMAIN_RESET_V84={version:84};
})();