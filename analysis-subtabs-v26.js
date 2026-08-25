/* v46 - Analisi Economica: flat Impianti workspace with sticky economic summary + phase tabs */
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

    /* Impianti is now one continuous workspace: economic summary, phase planning, reimbursements, externals. */
    [sections.economic,sections.workload,sections.reimbursements,sections.external].forEach(section=>{
      section.classList.add('open','flat-imp-section');
      impPanel.appendChild(section);
    });

    sections.economic.classList.add('flat-economic');
    sections.workload.classList.add('flat-planning');
    sections.reimbursements.classList.add('flat-reimbursements');
    sections.external.classList.add('flat-external');

    /* Use normal workspace labels instead of expandable accordion labels. */
    const planningCopy=sections.workload.querySelector('.workload-toolbar>div');
    if(planningCopy){
      planningCopy.innerHTML='<strong>Attività e risorse previste</strong><span>Seleziona la fase, porta le attività nel preventivo e assegna figure e ore.</span>';
    }
    const reimbIntro=sections.reimbursements.querySelector('.reimb-intro>div');
    if(reimbIntro){
      reimbIntro.innerHTML='<strong>Rimborsi spese</strong><span>Trasferte e spese previste della commessa.</span>';
    }
    const supplierIntro=sections.external.querySelector('.supplier-intro>div');
    if(supplierIntro){
      supplierIntro.innerHTML='<strong>Costi esterni</strong><span>Fornitori e consulenze esterne previste.</span>';
    }

    /* planningPhaseTabs is created asynchronously by activity-ui-v24. Keep its sticky offset tied to the real economic block height. */
    let economicObserver=null;
    function updateStickyOffset(){
      if(impPanel.hidden)return;
      const h=Math.ceil(sections.economic.getBoundingClientRect().height||0);
      impPanel.style.setProperty('--economic-sticky-height',`${h}px`);
    }
    function bindStickyOffset(attempt=0){
      const phaseTabs=document.getElementById('planningPhaseTabs');
      if(!phaseTabs){if(attempt<180)setTimeout(()=>bindStickyOffset(attempt+1),50);return;}
      updateStickyOffset();
      economicObserver?.disconnect();
      economicObserver=new ResizeObserver(updateStickyOffset);
      economicObserver.observe(sections.economic);
      window.addEventListener('resize',updateStickyOffset,{passive:true});
    }
    bindStickyOffset();

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
      if(name==='impianti'){
        [sections.economic,sections.workload,sections.reimbursements,sections.external].forEach(section=>section.classList.add('open'));
        requestAnimationFrame(()=>requestAnimationFrame(updateStickyOffset));
      }
    }

    nav.addEventListener('click',e=>{
      const btn=e.target.closest('.analysis-subtab');
      if(btn)activate(btn.dataset.analysisSubtab);
    });

    /* After transferring the calculated compensation, continue naturally in the Impianti workspace. */
    document.getElementById('dimTransfer')?.addEventListener('click',()=>setTimeout(()=>activate('impianti'),80));

    /* Starting point whenever the prototype is freshly loaded. */
    activate('dimensionamento');

    /* Generic hook for future disciplines such as VVF. */
    window.dabsterAnalysisSubtabs={activate};
  }

  window.addEventListener('load',()=>setTimeout(init,300),{once:true});
})();
