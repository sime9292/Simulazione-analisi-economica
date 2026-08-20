/* v15 - Analisi Economica first tab, active by default */
(function(){
  function setAnalysisFirst(){
    const tabs=document.querySelector('.tabs');
    const analysisTab=tabs?.querySelector('.tab[data-tab="analisi"]');
    if(tabs&&analysisTab&&tabs.firstElementChild!==analysisTab){
      tabs.insertBefore(analysisTab,tabs.firstElementChild);
    }

    document.querySelectorAll('.tab').forEach(tab=>{
      tab.classList.toggle('active',tab.dataset.tab==='analisi');
    });
    document.querySelectorAll('.tab-panel').forEach(panel=>panel.classList.remove('active'));
    document.getElementById('tab-analisi')?.classList.add('active');
  }

  setAnalysisFirst();

  const core=document.createElement('script');
  core.src='app-v11.js?v=15';
  core.onload=()=>{
    setAnalysisFirst();
    setTimeout(setAnalysisFirst,120);
  };
  document.head.appendChild(core);
})();
