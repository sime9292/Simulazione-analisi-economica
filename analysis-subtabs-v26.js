/* v47 - Flat Impianti workspace + dynamic economic phases from Dimensionamento / activities */
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

    sections.dim.classList.add('open','subtab-primary-workspace');
    dimPanel.appendChild(sections.dim);

    [sections.economic,sections.workload,sections.reimbursements,sections.external].forEach(section=>{
      section.classList.add('open','flat-imp-section');
      impPanel.appendChild(section);
    });

    sections.economic.classList.add('flat-economic');
    sections.workload.classList.add('flat-planning');
    sections.reimbursements.classList.add('flat-reimbursements');
    sections.external.classList.add('flat-external');

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

    /* Economic phase rows are system-controlled. A phase is active when:
       1) it was explicitly transferred from Dimensionamento, OR
       2) it contains at least one activity in the planning board. */
    const PHASES=[
      {id:'preliminare',label:'Progetto Preliminare',dimIndex:0},
      {id:'definitivo',label:'Progetto Definitivo',dimIndex:1},
      {id:'esecutivo',label:'Progetto Esecutivo',dimIndex:2},
      {id:'dl',label:'Direzione Lavori',dimIndex:3},
      {id:'consulenze',label:'Consulenze varie',dimIndex:null}
    ];
    const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
    let phaseControllerTimer=null;
    let phaseControllerObserver=null;
    let manualBeforeTransfer=new Map();

    function getPhaseCards(){return [...document.querySelectorAll('#phaseWorkCards > .phase-work-card')];}
    function getPhaseCard(id){return getPhaseCards().find(card=>card.querySelector('.phase-type-select')?.value===id)||null;}
    function getPhaseRow(id){
      const card=getPhaseCard(id);if(!card)return null;
      return sections.economic.querySelector(`.economic-table .phase-row[data-phase-id="${card.dataset.phaseId}"]`);
    }
    function activityCount(card){
      if(!card)return 0;
      return [...card.querySelectorAll('.activity-card .activity-name')].filter(field=>String(field.value||'').trim()).length;
    }
    function selectedDimensionPhases(){return new Set(Array.isArray(window.DABSTER_DIM_SELECTED_PHASES)?window.DABSTER_DIM_SELECTED_PHASES:[]);}
    function dimensionValue(def){
      if(def.dimIndex===null)return 0;
      const values=Array.isArray(window.DABSTER_DIM_PHASE_VALUES)?window.DABSTER_DIM_PHASE_VALUES:[];
      return Number(values[def.dimIndex]||0);
    }

    function prepareEconomicRow(def,row){
      if(!row)return;
      row.dataset.economicPhase=def.id;
      row.classList.add('economic-managed-phase');
      const nameCell=row.children[0];
      if(nameCell&&!nameCell.querySelector('.economic-phase-label')){
        const label=document.createElement('span');
        label.className='economic-phase-label';label.textContent=def.label;
        nameCell.appendChild(label);
      }else{
        const label=nameCell?.querySelector('.economic-phase-label');if(label)label.textContent=def.label;
      }
      const input=row.querySelector('.ae-proposal');
      if(input&&input.dataset.phaseProposalBound!=='1'){
        input.dataset.phaseProposalBound='1';
        input.addEventListener('input',()=>{row.dataset.proposalSource='manual';});
      }
    }

    function reconcileEconomicPhases({transfer=false}={}){
      const selected=selectedDimensionPhases();
      PHASES.forEach(def=>{
        const card=getPhaseCard(def.id),row=getPhaseRow(def.id);
        if(!card||!row)return;
        prepareEconomicRow(def,row);

        const hasActivities=activityCount(card)>0;
        const fromDimension=selected.has(def.id);
        const active=fromDimension||hasActivities;
        const wasActive=row.dataset.economicActive==='1';
        const proposal=row.querySelector('.ae-proposal');
        const dimValue=dimensionValue(def);

        if(transfer&&proposal&&def.dimIndex!==null){
          if(fromDimension){
            proposal.value=money(dimValue);
            row.dataset.proposalSource='dimension';
          }else if(hasActivities){
            if(row.dataset.proposalSource==='manual'&&manualBeforeTransfer.has(def.id)){
              proposal.value=manualBeforeTransfer.get(def.id);
            }else if(row.dataset.proposalSource!=='manual'){
              proposal.value=money(dimValue);
              row.dataset.proposalSource='auto-dimension';
            }
          }
        }else if(active&&!wasActive&&proposal&&def.dimIndex!==null&&row.dataset.proposalSource!=='manual'){
          if(dimValue>0){
            proposal.value=money(dimValue);
            row.dataset.proposalSource=fromDimension?'dimension':'auto-dimension';
          }
        }

        row.dataset.economicActive=active?'1':'0';
        row.classList.toggle('economic-phase-inactive',!active);
        row.hidden=!active;
      });

      const actions=sections.economic.querySelector('.phase-summary-actions');
      if(actions)actions.classList.add('system-phase-actions');

      manualBeforeTransfer.clear();
      window.dabsterRecalcEconomic?.();
      requestAnimationFrame(()=>requestAnimationFrame(updateStickyOffset));
    }

    function schedulePhaseReconcile(delay=35){
      clearTimeout(phaseControllerTimer);
      phaseControllerTimer=setTimeout(()=>reconcileEconomicPhases(),delay);
    }

    function installEconomicPhaseController(attempt=0){
      const root=document.getElementById('phaseWorkCards');
      const ready=root && getPhaseCards().length>=5 && PHASES.every(def=>getPhaseCard(def.id)&&getPhaseRow(def.id));
      if(!ready){if(attempt<240)setTimeout(()=>installEconomicPhaseController(attempt+1),50);return;}

      PHASES.forEach(def=>prepareEconomicRow(def,getPhaseRow(def.id)));
      reconcileEconomicPhases();

      phaseControllerObserver?.disconnect();
      phaseControllerObserver=new MutationObserver(mutations=>{
        if(mutations.some(m=>m.type==='childList'))schedulePhaseReconcile(35);
      });
      phaseControllerObserver.observe(root,{childList:true,subtree:true});
      root.addEventListener('input',()=>schedulePhaseReconcile(25),true);
      root.addEventListener('change',()=>schedulePhaseReconcile(25),true);

      const transfer=document.getElementById('dimTransfer');
      transfer?.addEventListener('click',()=>{
        manualBeforeTransfer=new Map();
        PHASES.forEach(def=>{
          const row=getPhaseRow(def.id);
          const proposal=row?.querySelector('.ae-proposal');
          if(row?.dataset.proposalSource==='manual'&&proposal)manualBeforeTransfer.set(def.id,proposal.value);
        });
      },true);

      window.addEventListener('dabster-dimension-transfer',()=>reconcileEconomicPhases({transfer:true}));
      window.dabsterEconomicPhaseController={reconcile:reconcileEconomicPhases};
    }
    installEconomicPhaseController();

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
        requestAnimationFrame(()=>requestAnimationFrame(()=>{reconcileEconomicPhases();updateStickyOffset();}));
      }
    }

    nav.addEventListener('click',e=>{
      const btn=e.target.closest('.analysis-subtab');
      if(btn)activate(btn.dataset.analysisSubtab);
    });

    document.getElementById('dimTransfer')?.addEventListener('click',()=>setTimeout(()=>activate('impianti'),80));

    activate('dimensionamento');
    window.dabsterAnalysisSubtabs={activate};
  }

  window.addEventListener('load',()=>setTimeout(init,300),{once:true});
})();
