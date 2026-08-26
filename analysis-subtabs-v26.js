/* v58 - Flat Impianti workspace + seven operational phases + compact economic summary */
(function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const PHASES=[
    {id:'preliminare',label:'Progetto preliminare e Pratiche',dimIndex:0},
    {id:'definitivo',label:'Progetto PFTE',dimIndex:1},
    {id:'valutazione_vvf',label:'Valutazione Progetto Antincendio',dimIndex:null},
    {id:'esecutivo',label:'Progetto Esecutivo',dimIndex:2},
    {id:'dl',label:'Direzione Lavori',dimIndex:3},
    {id:'scia_vvf',label:'SCIA Antincendio',dimIndex:null},
    {id:'consulenze',label:'Consulenze varie',dimIndex:null}
  ];
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});

  async function init(){
    for(let i=0;i<180;i++){
      const tab=document.getElementById('tab-analisi');
      const sections={
        dim:tab?.querySelector('.dimensioning'),economic:tab?.querySelector('.analysis'),
        workload:document.getElementById('phaseWorkloadSection'),reimbursements:document.getElementById('reimbursementsSection'),
        external:document.getElementById('externalCostsSection')
      };
      if(tab&&Object.values(sections).every(Boolean)){build(tab,sections);return;}
      await sleep(60);
    }
  }

  function build(tab,sections){
    if(document.getElementById('analysisSubtabs'))return;
    const nav=document.createElement('div');
    nav.id='analysisSubtabs';nav.className='analysis-subtabs';nav.setAttribute('role','tablist');
    nav.innerHTML='<button type="button" class="analysis-subtab active" role="tab" aria-selected="true" data-analysis-subtab="dimensionamento">Dimensionamento Opere</button><button type="button" class="analysis-subtab" role="tab" aria-selected="false" data-analysis-subtab="impianti">Impianti</button>';
    const panels=document.createElement('div');
    panels.className='analysis-subtab-panels';
    panels.innerHTML='<div id="analysisSubtabDimensionamento" class="analysis-subtab-panel active" data-analysis-panel="dimensionamento"></div><div id="analysisSubtabImpianti" class="analysis-subtab-panel" data-analysis-panel="impianti" hidden></div>';
    tab.insertBefore(nav,tab.firstChild);nav.insertAdjacentElement('afterend',panels);
    const dimPanel=panels.querySelector('[data-analysis-panel="dimensionamento"]');
    const impPanel=panels.querySelector('[data-analysis-panel="impianti"]');
    sections.dim.classList.add('open','subtab-primary-workspace');dimPanel.appendChild(sections.dim);
    [sections.economic,sections.workload,sections.reimbursements,sections.external].forEach(s=>{s.classList.add('open','flat-imp-section');impPanel.appendChild(s);});
    sections.economic.classList.add('flat-economic');sections.workload.classList.add('flat-planning');
    sections.reimbursements.classList.add('flat-reimbursements');sections.external.classList.add('flat-external');

    const planningCopy=sections.workload.querySelector('.workload-toolbar>div');
    if(planningCopy)planningCopy.innerHTML='<strong>Attività e risorse previste</strong><span>Seleziona la fase, porta le attività nel preventivo e assegna figure e ore.</span>';
    const reimbIntro=sections.reimbursements.querySelector('.reimb-intro>div');
    if(reimbIntro)reimbIntro.innerHTML='<strong>Rimborsi spese</strong><span>Trasferte e spese previste della commessa.</span>';
    const supplierIntro=sections.external.querySelector('.supplier-intro>div');
    if(supplierIntro)supplierIntro.innerHTML='<strong>Costi esterni</strong><span>Fornitori e consulenze esterne previste.</span>';

    installSummaryStyles();
    installSummaryLayout(sections.economic);

    let resizeObs=null;
    const updateSticky=()=>{if(!impPanel.hidden)impPanel.style.setProperty('--economic-sticky-height',`${Math.ceil(sections.economic.getBoundingClientRect().height||0)}px`);};
    (function bindSticky(attempt=0){
      if(!document.getElementById('planningPhaseTabs')){if(attempt<180)setTimeout(()=>bindSticky(attempt+1),50);return;}
      updateSticky();resizeObs?.disconnect();resizeObs=new ResizeObserver(updateSticky);resizeObs.observe(sections.economic);window.addEventListener('resize',updateSticky,{passive:true});
    })();

    let timer=null,observer=null,manualBeforeTransfer=new Map();
    const cards=()=>[...document.querySelectorAll('#phaseWorkCards > .phase-work-card')];
    const cardFor=id=>cards().find(c=>((c.querySelector('.phase-type-select')?.value)||c.dataset.planningPhase)===id)||null;
    const rowFor=id=>{const c=cardFor(id);return c?sections.economic.querySelector(`.economic-table .phase-row[data-phase-id="${c.dataset.phaseId}"]`):null;};
    const countActivities=c=>c?[...c.querySelectorAll('.activity-card .activity-name')].filter(x=>String(x.value||'').trim()).length:0;
    const selected=()=>new Set(Array.isArray(window.DABSTER_DIM_SELECTED_PHASES)?window.DABSTER_DIM_SELECTED_PHASES:[]);
    const dimValue=d=>d.dimIndex===null?0:Number((Array.isArray(window.DABSTER_DIM_PHASE_VALUES)?window.DABSTER_DIM_PHASE_VALUES:[])[d.dimIndex]||0);

    function prepareRow(def,row){
      if(!row)return;row.dataset.economicPhase=def.id;row.classList.add('economic-managed-phase');
      const cell=row.children[0],editor=cell?.querySelector('.phase-name-editor');if(editor)editor.style.setProperty('display','none','important');
      row.querySelector('.phase-delete')?.style.setProperty('display','none','important');
      let label=cell?.querySelector('.economic-phase-label');if(cell&&!label){label=document.createElement('span');label.className='economic-phase-label';cell.appendChild(label);}
      if(label)label.textContent=def.label;
      const input=row.querySelector('.ae-proposal');
      if(input&&input.dataset.phaseProposalBound!=='1'){input.dataset.phaseProposalBound='1';input.addEventListener('input',()=>row.dataset.proposalSource='manual');}
    }

    function reconcile({transfer=false}={}){
      const chosen=selected();let activeCount=0;
      PHASES.forEach(def=>{
        const card=cardFor(def.id),row=rowFor(def.id);if(!card||!row)return;prepareRow(def,row);
        const has=countActivities(card)>0,fromDim=chosen.has(def.id),active=has||fromDim,was=row.dataset.economicActive==='1';
        if(active)activeCount++;
        const input=row.querySelector('.ae-proposal'),value=dimValue(def);
        if(transfer&&input&&def.dimIndex!==null){
          if(fromDim){input.value=money(value);row.dataset.proposalSource='dimension';}
          else if(has){
            if(row.dataset.proposalSource==='manual'&&manualBeforeTransfer.has(def.id))input.value=manualBeforeTransfer.get(def.id);
            else if(row.dataset.proposalSource!=='manual'){input.value=money(value);row.dataset.proposalSource='auto-dimension';}
          }
        }else if(active&&!was&&input&&def.dimIndex!==null&&row.dataset.proposalSource!=='manual'&&value>0){
          input.value=money(value);row.dataset.proposalSource=fromDim?'dimension':'auto-dimension';
        }
        row.dataset.economicActive=active?'1':'0';row.hidden=!active;
        if(active)row.style.removeProperty('display');else row.style.setProperty('display','none','important');
      });
      const hint=sections.economic.querySelector('.economic-empty-hint');if(hint)hint.hidden=activeCount>0;
      const actions=sections.economic.querySelector('.phase-summary-actions');if(actions)actions.style.setProperty('display','none','important');
      manualBeforeTransfer.clear();window.dabsterRecalcEconomic?.();requestAnimationFrame(()=>requestAnimationFrame(updateSticky));
    }
    const schedule=(d=35)=>{clearTimeout(timer);timer=setTimeout(()=>reconcile(),d);};

    (function installController(attempt=0){
      const root=document.getElementById('phaseWorkCards');
      if(!(root&&cards().length>=7&&PHASES.every(d=>cardFor(d.id)&&rowFor(d.id)))){if(attempt<280)setTimeout(()=>installController(attempt+1),50);return;}
      PHASES.forEach(d=>prepareRow(d,rowFor(d.id)));reconcile();
      observer?.disconnect();observer=new MutationObserver(ms=>{if(ms.some(m=>m.type==='childList'))schedule();});observer.observe(root,{childList:true,subtree:true});
      root.addEventListener('input',()=>schedule(25),true);root.addEventListener('change',()=>schedule(25),true);
      document.getElementById('dimTransfer')?.addEventListener('click',()=>{
        manualBeforeTransfer=new Map();PHASES.forEach(d=>{const r=rowFor(d.id),p=r?.querySelector('.ae-proposal');if(r?.dataset.proposalSource==='manual'&&p)manualBeforeTransfer.set(d.id,p.value);});
      },true);
      window.addEventListener('dabster-dimension-transfer',()=>reconcile({transfer:true}));
      window.dabsterEconomicPhaseController={reconcile};
    })();

    function activate(name){
      nav.querySelectorAll('.analysis-subtab').forEach(b=>{const on=b.dataset.analysisSubtab===name;b.classList.toggle('active',on);b.setAttribute('aria-selected',on?'true':'false');});
      panels.querySelectorAll('.analysis-subtab-panel').forEach(p=>{const on=p.dataset.analysisPanel===name;p.classList.toggle('active',on);p.hidden=!on;});
      if(name==='impianti'){[sections.economic,sections.workload,sections.reimbursements,sections.external].forEach(s=>s.classList.add('open'));requestAnimationFrame(()=>requestAnimationFrame(()=>{installSummaryLayout(sections.economic);reconcile();updateSticky();}));}
    }
    nav.addEventListener('click',e=>{const b=e.target.closest('.analysis-subtab');if(b)activate(b.dataset.analysisSubtab);});
    document.getElementById('dimTransfer')?.addEventListener('click',()=>setTimeout(()=>activate('impianti'),80));
    activate('dimensionamento');window.dabsterAnalysisSubtabs={activate};
  }

  function installSummaryLayout(section){
    const body=section.querySelector('.analysis-body'),layout=body?.querySelector('.analysis-layout'),table=layout?.querySelector('.economic-table');
    const trade=document.getElementById('tradePct'),tradeLabel=document.getElementById('tradePctLabel');if(!body||!layout||!table||!trade||!tradeLabel)return;
    let bar=body.querySelector('.economic-summary-bar');
    if(!bar){bar=document.createElement('div');bar.className='economic-summary-bar';bar.innerHTML='<div class="economic-summary-title"><strong>Sintesi economica</strong><span>Proposta, trattativa e costi della commessa</span></div><div class="economic-trade-control"><span>Trattativa</span><div class="economic-trade-slider"></div></div>';body.insertBefore(bar,layout);}
    const wrap=bar.querySelector('.economic-trade-slider');if(trade.parentElement!==wrap)wrap.appendChild(trade);if(tradeLabel.parentElement!==wrap)wrap.appendChild(tradeLabel);
    const head=table.querySelector('.economic-head');
    const setText=(cell,text)=>{if(!cell)return;const n=[...cell.childNodes].find(x=>x.nodeType===Node.TEXT_NODE&&String(x.textContent||'').trim());if(n)n.textContent=text;else cell.insertBefore(document.createTextNode(text),cell.firstChild);};
    if(head?.children?.length>=4){setText(head.children[0],'FASE');setText(head.children[1],'PROPOSTA');const t=head.children[2].querySelector('.trade-inline>span');if(t)t.textContent='TRATTATIVA';setText(head.children[3],'COSTI');}
    const expenseLabel=layout.querySelector('.kpi.expenses .kpi-label');
    if(expenseLabel&&expenseLabel.dataset.compactLabel!=='1'){
      expenseLabel.dataset.compactLabel='1';
      const keepCompact=()=>{if(expenseLabel.textContent!=='SPESE GENERALI · 35%')expenseLabel.textContent='SPESE GENERALI · 35%';};
      keepCompact();new MutationObserver(keepCompact).observe(expenseLabel,{childList:true,characterData:true,subtree:true});
    }
    const total=table.querySelector('.total-row>div:first-child');if(total)total.textContent='TOTALE';
    if(!table.querySelector('.economic-empty-hint')){const h=document.createElement('div');h.className='economic-empty-hint';h.textContent='Le fasi compariranno qui dal Dimensionamento Opere o dalle attività preventivate.';head?.insertAdjacentElement('afterend',h);}
  }

  function installSummaryStyles(){
    if(document.getElementById('economicSummaryV49Styles'))return;
    const s=document.createElement('style');s.id='economicSummaryV49Styles';s.textContent=`
      html body #tab-analisi #analysisSubtabImpianti .economic-summary-bar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:1px 2px 7px;margin-bottom:2px;border-bottom:1px solid #edf0f2;background:#fff}
      html body #tab-analisi #analysisSubtabImpianti .economic-summary-title{display:flex;flex-direction:column;gap:1px}html body #tab-analisi #analysisSubtabImpianti .economic-summary-title strong{font-size:11.5px;color:#344653}html body #tab-analisi #analysisSubtabImpianti .economic-summary-title span{font-size:8px;color:#859098}
      html body #tab-analisi #analysisSubtabImpianti .economic-trade-control{display:flex;align-items:center;gap:8px;font-size:8.5px;font-weight:700;color:#596872;white-space:nowrap}html body #tab-analisi #analysisSubtabImpianti .economic-trade-slider{display:grid;grid-template-columns:minmax(125px,190px) 38px;align-items:center;gap:7px;min-width:174px}html body #tab-analisi #analysisSubtabImpianti .economic-trade-slider input{width:100%!important;height:7px!important;margin:0!important;accent-color:#e76f1d!important}html body #tab-analisi #analysisSubtabImpianti .economic-trade-slider #tradePctLabel{font-size:9.5px;font-weight:800;color:#d9641b;text-align:right}
      html body #tab-analisi #analysisSubtabImpianti .analysis-layout{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:6px!important;min-width:0!important;width:100%!important}html body #tab-analisi #analysisSubtabImpianti .economic-table-wrap{width:100%!important;min-width:0!important}
      html body #tab-analisi #analysisSubtabImpianti .economic-table{width:100%!important;min-width:0!important;border-color:#d5dde1!important;border-radius:6px!important}html body #tab-analisi #analysisSubtabImpianti .economic-row{grid-template-columns:var(--ae-col1,minmax(175px,1.15fr)) var(--ae-col2,minmax(105px,.7fr)) var(--ae-col3,minmax(110px,.72fr)) var(--ae-col4,minmax(105px,.7fr))!important;min-height:30px!important}html body #tab-analisi #analysisSubtabImpianti .economic-row>div{padding:2px 7px!important;border-color:#e3e8ea!important}
      html body #tab-analisi #analysisSubtabImpianti .economic-head{min-height:30px!important;font-size:8.3px!important;color:#52616b!important}html body #tab-analisi #analysisSubtabImpianti .economic-head>div{justify-content:flex-start!important;text-align:left!important}html body #tab-analisi #analysisSubtabImpianti .economic-head>div:nth-child(1){background:#f3f5f6!important}html body #tab-analisi #analysisSubtabImpianti .economic-head>div:nth-child(2){background:#eef6f0!important}html body #tab-analisi #analysisSubtabImpianti .economic-head>div:nth-child(3){background:#eaf3ec!important}html body #tab-analisi #analysisSubtabImpianti .economic-head>div:nth-child(4){background:#f8eded!important}html body #tab-analisi #analysisSubtabImpianti .economic-head .numeric{justify-content:flex-start!important}html body #tab-analisi #analysisSubtabImpianti .trade-inline{display:block!important}html body #tab-analisi #analysisSubtabImpianti .trade-inline>span{font-size:8.3px!important}
      html body #tab-analisi #analysisSubtabImpianti .economic-table .economic-row:not(.economic-head):not(.total-row)>div:nth-child(1){background:#fff!important}html body #tab-analisi #analysisSubtabImpianti .economic-table .economic-row:not(.economic-head):not(.total-row)>div:nth-child(2){background:#f8fbf9!important}html body #tab-analisi #analysisSubtabImpianti .economic-table .economic-row:not(.economic-head):not(.total-row)>div:nth-child(3),html body #tab-analisi #analysisSubtabImpianti .economic-table .computed-cell{background:#f5faf6!important}html body #tab-analisi #analysisSubtabImpianti .economic-table .economic-row:not(.economic-head):not(.total-row)>div:nth-child(4){background:#fffafa!important}
      html body #tab-analisi #analysisSubtabImpianti .money-cell input{height:28px!important;background:transparent!important}html body #tab-analisi #analysisSubtabImpianti .money-cell span{height:28px!important;background:rgba(255,255,255,.55)!important}html body #tab-analisi #analysisSubtabImpianti .computed-cell{min-height:28px!important}html body #tab-analisi #analysisSubtabImpianti .economic-phase-label{font-weight:650!important;color:#3f515d!important;white-space:nowrap}
      html body #tab-analisi #analysisSubtabImpianti .total-row{min-height:33px!important;border-top:2px solid #aeb8be!important}html body #tab-analisi #analysisSubtabImpianti .total-row>div{font-weight:750!important;color:#33434d!important}html body #tab-analisi #analysisSubtabImpianti .total-row>div:nth-child(1){background:#edf1f3!important}html body #tab-analisi #analysisSubtabImpianti .total-row>div:nth-child(2){background:#e8f1ea!important}html body #tab-analisi #analysisSubtabImpianti .total-row>div:nth-child(3){background:#e3eee6!important}html body #tab-analisi #analysisSubtabImpianti .total-row>div:nth-child(4),html body #tab-analisi #analysisSubtabImpianti .cost-total{background:#f3e8e9!important;color:#604a4d!important}html body #tab-analisi #analysisSubtabImpianti .total-row>div:nth-child(4) *{font-weight:750!important;color:#604a4d!important}
      html body #tab-analisi #analysisSubtabImpianti .economic-empty-hint{padding:8px 10px;border-bottom:1px solid #e7ecee;background:#fbfcfd;color:#7b8790;font-size:8.5px}html body #tab-analisi #analysisSubtabImpianti .economic-empty-hint[hidden]{display:none!important}
      html body #tab-analisi #analysisSubtabImpianti .economic-kpis{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;width:100%!important;min-width:0!important;height:auto!important;gap:6px!important}html body #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi{height:50px!important;min-height:50px!important;max-height:50px!important;padding:6px 8px!important;border-radius:6px!important;border:1px solid #dce3e6!important;box-shadow:none!important}html body #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi.mol{background:#f6faf7!important}html body #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi.expenses{background:#f7f8fa!important}html body #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi.mon{background:#f5f9f7!important}html body #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi.profit{background:#fff5f5!important}html body #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi.profit.profit-good{background:#eff8f2!important;border-color:#cfe4d6!important}html body #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi-label{font-size:7px!important;color:#68757e!important}html body #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi-value{font-size:10.8px!important;color:#32434d!important}html body #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi.profit.profit-good .kpi-label,html body #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi.profit.profit-good .kpi-value{color:#34704b!important}html body #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi.profit.profit-low .kpi-label,html body #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi.profit.profit-low .kpi-value{color:#9b3542!important}
      @media(max-width:900px){html body #tab-analisi #analysisSubtabImpianti .economic-summary-bar{flex-wrap:wrap;align-items:flex-start}html body #tab-analisi #analysisSubtabImpianti .economic-table{min-width:620px!important}html body #tab-analisi #analysisSubtabImpianti .economic-kpis{grid-template-columns:repeat(4,minmax(130px,1fr))!important;min-width:560px!important}}
    `;document.head.appendChild(s);
  }

  window.addEventListener('load',()=>setTimeout(init,300),{once:true});
})();
