/* v26 - Analisi Economica grouped into scalable discipline subtabs */
(function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  async function init(){
    for(let i=0;i<180;i++){
      const tab=document.getElementById('tab-analisi');
      const dim=tab?.querySelector('.dimensioning');
      const economic=tab?.querySelector('.analysis');
      const workload=document.getElementById('phaseWorkloadSection');
      const reimbursements=document.getElementById('reimbursementsSection');
      const external=document.getElementById('externalCostsSection');
      if(tab&&dim&&economic&&workload&&reimbursements&&external){
        build(tab,{dim,economic,workload,reimbursements,external});
        return;
      }
      await sleep(60);
    }
  }

  function build(tab,sections){
    if(document.getElementById('analysisSubtabs'))return;

    const nav=document.createElement('div');
    nav.id='analysisSubtabs';
    nav.className='analysis-subtabs';
    nav.setAttribute('role','tablist');
    nav.innerHTML=`
      <button type="button" class="analysis-subtab active" role="tab" aria-selected="true" data-analysis-subtab="dimensionamento">Dimensionamento Opere</button>
      <button type="button" class="analysis-subtab" role="tab" aria-selected="false" data-analysis-subtab="impianti">Impianti</button>`;

    const panels=document.createElement('div');
    panels.className='analysis-subtab-panels';
    panels.innerHTML=`
      <div id="analysisSubtabDimensionamento" class="analysis-subtab-panel active" data-analysis-panel="dimensionamento"></div>
      <div id="analysisSubtabImpianti" class="analysis-subtab-panel" data-analysis-panel="impianti" hidden></div>`;

    tab.insertBefore(nav,tab.firstChild);
    nav.insertAdjacentElement('afterend',panels);

    const dimPanel=panels.querySelector('[data-analysis-panel="dimensionamento"]');
    const impPanel=panels.querySelector('[data-analysis-panel="impianti"]');

    /* Dimensionamento is itself the first workspace, so it does not need a second accordion header. */
    sections.dim.classList.add('open','subtab-primary-workspace');
    dimPanel.appendChild(sections.dim);

    /* Impianti keeps the existing operational sections and their accordion behaviour. */
    [sections.economic,sections.workload,sections.reimbursements,sections.external].forEach(section=>impPanel.appendChild(section));

    /* Stato Analisi Economica is the first summary users need when entering Impianti. */
    sections.economic.classList.add('open');

    function activate(name){
      nav.querySelectorAll('.analysis-subtab').forEach(btn=>{
        const active=btn.dataset.analysisSubtab===name;
        btn.classList.toggle('active',active);
        btn.setAttribute('aria-selected',active?'true':'false');
      });
      panels.querySelectorAll('.analysis-subtab-panel').forEach(panel=>{
        const active=panel.dataset.analysisPanel===name;
        panel.classList.toggle('active',active);
        panel.hidden=!active;
      });
      /* Re-entering Impianti always starts with the economic status visible. */
      if(name==='impianti')sections.economic.classList.add('open');
    }

    nav.addEventListener('click',e=>{
      const btn=e.target.closest('.analysis-subtab');
      if(btn)activate(btn.dataset.analysisSubtab);
    });

    /* After transferring the calculated compensation, continue naturally in the Impianti workspace. */
    document.getElementById('dimTransfer')?.addEventListener('click',()=>setTimeout(()=>activate('impianti'),80));

    /* Starting point whenever the prototype is freshly loaded. */
    activate('dimensionamento');

    /* Generic hook for the future VVF discipline: the container is intentionally not hard-coded to two tabs. */
    window.dabsterAnalysisSubtabs={activate};
  }

  window.addEventListener('load',()=>setTimeout(init,300),{once:true});
})();
