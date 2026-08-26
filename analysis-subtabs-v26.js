/* clean-v2 - Dimensionamento is reference-only; Analisi Offerta phases come only from planned activities. */
(function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const PHASES=[
    {id:'preliminare',label:'Progetto preliminare e Pratiche'},
    {id:'definitivo',label:'Progetto PFTE'},
    {id:'valutazione_vvf',label:'Valutazione Progetto Antincendio'},
    {id:'esecutivo',label:'Progetto Esecutivo'},
    {id:'dl',label:'Direzione Lavori'},
    {id:'scia_vvf',label:'SCIA Antincendio'},
    {id:'consulenze',label:'Consulenze varie'}
  ];

  async function init(){
    for(let i=0;i<220;i++){
      const tab=document.getElementById('tab-analisi');
      const sections={dim:tab?.querySelector('.dimensioning'),economic:tab?.querySelector('.analysis'),workload:document.getElementById('phaseWorkloadSection'),reimbursements:document.getElementById('reimbursementsSection'),external:document.getElementById('externalCostsSection')};
      if(tab&&Object.values(sections).every(Boolean)&&document.querySelectorAll('#phaseWorkCards > .phase-work-card').length>=7){build(tab,sections);return;}
      await sleep(45);
    }
  }

  function build(tab,sections){
    if(document.getElementById('analysisSubtabs'))return;
    const nav=document.createElement('div');nav.id='analysisSubtabs';nav.className='analysis-subtabs';nav.setAttribute('role','tablist');
    nav.innerHTML='<button type="button" class="analysis-subtab active" role="tab" aria-selected="true" data-analysis-subtab="dimensionamento">Dimensionamento Opere</button><button type="button" class="analysis-subtab" role="tab" aria-selected="false" data-analysis-subtab="impianti">Analisi Offerta</button>';
    const panels=document.createElement('div');panels.className='analysis-subtab-panels';panels.innerHTML='<div id="analysisSubtabDimensionamento" class="analysis-subtab-panel active" data-analysis-panel="dimensionamento"></div><div id="analysisSubtabImpianti" class="analysis-subtab-panel" data-analysis-panel="impianti" hidden></div>';
    tab.insertBefore(nav,tab.firstChild);nav.insertAdjacentElement('afterend',panels);
    const dimPanel=panels.querySelector('[data-analysis-panel="dimensionamento"]'),impPanel=panels.querySelector('[data-analysis-panel="impianti"]');
    sections.dim.classList.add('open','subtab-primary-workspace');dimPanel.appendChild(sections.dim);
    [sections.economic,sections.workload,sections.reimbursements,sections.external].forEach(s=>{s.classList.add('open','flat-imp-section');impPanel.appendChild(s);});
    sections.economic.classList.add('flat-economic');sections.workload.classList.add('flat-planning');sections.reimbursements.classList.add('flat-reimbursements');sections.external.classList.add('flat-external');

    const planningCopy=sections.workload.querySelector('.workload-toolbar>div');if(planningCopy)planningCopy.innerHTML='<strong>Attività e risorse previste</strong><span>Le attività inserite attivano automaticamente la relativa riga dell’Analisi Offerta.</span>';
    const reimbIntro=sections.reimbursements.querySelector('.reimb-intro>div');if(reimbIntro)reimbIntro.innerHTML='<strong>Rimborsi spese</strong><span>Costi previsti da attribuire internamente alla fase interessata.</span>';
    const supplierIntro=sections.external.querySelector('.supplier-intro>div');if(supplierIntro)supplierIntro.innerHTML='<strong>Costi esterni</strong><span>Fornitori e consulenze esterne da attribuire internamente alla fase interessata.</span>';

    installSummaryStyles();installSummaryLayout(sections.economic);

    let resizeObs=null,timer=null,observer=null;
    const updateSticky=()=>{if(!impPanel.hidden)impPanel.style.setProperty('--economic-sticky-height',`${Math.ceil(sections.economic.getBoundingClientRect().height||0)}px`);};
    const cards=()=>[...document.querySelectorAll('#phaseWorkCards > .phase-work-card')];
    const cardFor=id=>cards().find(c=>(c.querySelector('.phase-type-select')?.value||c.dataset.planningPhase||'')===id)||null;
    const rowFor=id=>{const card=cardFor(id);return card?sections.economic.querySelector(`.economic-table .phase-row[data-phase-id="${card.dataset.phaseId}"]`):null;};
    const countActivities=card=>card?[...card.querySelectorAll('.activity-card .activity-name')].filter(x=>String(x.value||'').trim()).length:0;

    function prepareRow(def,row){
      if(!row)return;
      row.dataset.economicPhase=def.id;row.dataset.phaseManaged='1';row.classList.add('economic-managed-phase');
      const cell=row.children[0],editor=cell?.querySelector('.phase-name-editor');if(editor)editor.style.setProperty('display','none','important');
      row.querySelector('.phase-delete')?.style.setProperty('display','none','important');
      let label=cell?.querySelector('.economic-phase-label');if(cell&&!label){label=document.createElement('span');label.className='economic-phase-label';cell.appendChild(label);}if(label)label.textContent=def.label;
    }

    function reconcile(){
      let activeCount=0;
      PHASES.forEach(def=>{
        const card=cardFor(def.id),row=rowFor(def.id);if(!card||!row)return;
        prepareRow(def,row);
        const active=countActivities(card)>0;if(active)activeCount++;
        row.dataset.economicActive=active?'1':'0';row.hidden=!active;
        if(active)row.style.removeProperty('display');else row.style.setProperty('display','none','important');
      });
      const hint=sections.economic.querySelector('.economic-empty-hint');if(hint)hint.hidden=activeCount>0;
      sections.economic.querySelector('.phase-summary-actions')?.style.setProperty('display','none','important');
      window.dabsterRecalcEconomic?.();
      window.dispatchEvent(new CustomEvent('dabster-analysis-phases-change',{detail:{active:PHASES.filter(p=>rowFor(p.id)?.dataset.economicActive==='1').map(p=>p.id)}}));
      requestAnimationFrame(()=>requestAnimationFrame(updateSticky));
    }
    const schedule=(delay=30)=>{clearTimeout(timer);timer=setTimeout(reconcile,delay);};

    (function installController(attempt=0){
      const root=document.getElementById('phaseWorkCards');
      if(!(root&&PHASES.every(d=>cardFor(d.id)&&rowFor(d.id)))){if(attempt<240)setTimeout(()=>installController(attempt+1),45);return;}
      PHASES.forEach(d=>prepareRow(d,rowFor(d.id)));reconcile();
      observer=new MutationObserver(ms=>{if(ms.some(m=>m.type==='childList'))schedule();});observer.observe(root,{childList:true,subtree:true});
      root.addEventListener('input',()=>schedule(20),true);root.addEventListener('change',()=>schedule(20),true);
      window.dabsterEconomicPhaseController={reconcile};
    })();

    function activate(name){
      nav.querySelectorAll('.analysis-subtab').forEach(b=>{const on=b.dataset.analysisSubtab===name;b.classList.toggle('active',on);b.setAttribute('aria-selected',on?'true':'false');});
      panels.querySelectorAll('.analysis-subtab-panel').forEach(p=>{const on=p.dataset.analysisPanel===name;p.classList.toggle('active',on);p.hidden=!on;});
      if(name==='impianti'){[sections.economic,sections.workload,sections.reimbursements,sections.external].forEach(s=>s.classList.add('open'));requestAnimationFrame(()=>requestAnimationFrame(()=>{installSummaryLayout(sections.economic);reconcile();updateSticky();}));}
    }
    nav.addEventListener('click',e=>{const b=e.target.closest('.analysis-subtab');if(b)activate(b.dataset.analysisSubtab);});
    resizeObs=new ResizeObserver(updateSticky);resizeObs.observe(sections.economic);window.addEventListener('resize',updateSticky,{passive:true});
    activate('dimensionamento');window.dabsterAnalysisSubtabs={activate};
  }

  function installSummaryLayout(section){
    const body=section.querySelector('.analysis-body'),layout=body?.querySelector('.analysis-layout'),table=layout?.querySelector('.economic-table'),trade=document.getElementById('tradePct'),tradeLabel=document.getElementById('tradePctLabel');
    if(!body||!layout||!table||!trade||!tradeLabel)return;
    let bar=body.querySelector('.economic-summary-bar');
    if(!bar){bar=document.createElement('div');bar.className='economic-summary-bar';bar.innerHTML='<div class="economic-summary-title"><strong>Sintesi economica</strong><span>Proposta, trattativa e costi della commessa</span></div><div class="economic-trade-control"><span>Trattativa</span><div class="economic-trade-slider"></div></div>';body.insertBefore(bar,layout);}
    const wrap=bar.querySelector('.economic-trade-slider');if(trade.parentElement!==wrap)wrap.appendChild(trade);if(tradeLabel.parentElement!==wrap)wrap.appendChild(tradeLabel);
    const head=table.querySelector('.economic-head'),setText=(cell,text)=>{if(!cell)return;const node=[...cell.childNodes].find(x=>x.nodeType===Node.TEXT_NODE&&String(x.textContent||'').trim());if(node)node.textContent=text;else cell.insertBefore(document.createTextNode(text),cell.firstChild);};
    if(head?.children?.length>=4){setText(head.children[0],'FASE');setText(head.children[1],'PROPOSTA');const t=head.children[2].querySelector('.trade-inline>span');if(t)t.textContent='TRATTATIVA';setText(head.children[3],'COSTI');}
    const expenseLabel=layout.querySelector('.kpi.expenses .kpi-label');if(expenseLabel)expenseLabel.textContent='SPESE GENERALI · 35%';
    const total=table.querySelector('.total-row>div:first-child');if(total)total.textContent='TOTALE';
    if(!table.querySelector('.economic-empty-hint')){const h=document.createElement('div');h.className='economic-empty-hint';h.textContent='Le fasi compariranno qui quando sono presenti attività preventivate.';head?.insertAdjacentElement('afterend',h);}
  }

  function installSummaryStyles(){
    if(document.getElementById('economicSummaryCleanStyles'))return;
    const s=document.createElement('style');s.id='economicSummaryCleanStyles';s.textContent=`
      html body #tab-analisi #analysisSubtabImpianti .economic-summary-bar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:1px 2px 7px;margin-bottom:2px;border-bottom:1px solid #edf0f2;background:#fff}
      html body #tab-analisi #analysisSubtabImpianti .economic-summary-title{display:flex;flex-direction:column;gap:1px}html body #tab-analisi #analysisSubtabImpianti .economic-summary-title strong{font-size:11.5px;color:#344653}html body #tab-analisi #analysisSubtabImpianti .economic-summary-title span{font-size:8px;color:#859098}
      html body #tab-analisi #analysisSubtabImpianti .economic-trade-control{display:flex;align-items:center;gap:8px;font-size:8.5px;font-weight:700;color:#596872;white-space:nowrap}html body #tab-analisi #analysisSubtabImpianti .economic-trade-slider{display:grid;grid-template-columns:minmax(125px,190px) 38px;align-items:center;gap:7px;min-width:174px}html body #tab-analisi #analysisSubtabImpianti .economic-trade-slider input{width:100%!important;height:7px!important;margin:0!important;accent-color:#e76f1d!important}html body #tab-analisi #analysisSubtabImpianti .economic-trade-slider #tradePctLabel{font-size:9.5px;font-weight:800;color:#d9641b;text-align:right}
      html body #tab-analisi #analysisSubtabImpianti .analysis-layout{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:6px!important;min-width:0!important;width:100%!important}html body #tab-analisi #analysisSubtabImpianti .economic-table-wrap{width:100%!important;min-width:0!important}
      html body #tab-analisi #analysisSubtabImpianti .economic-table{width:100%!important;min-width:0!important;border-color:#d5dde1!important;border-radius:6px!important}html body #tab-analisi #analysisSubtabImpianti .economic-row{grid-template-columns:var(--ae-col1,minmax(190px,1.18fr)) var(--ae-col2,minmax(100px,.66fr)) var(--ae-col3,minmax(105px,.68fr)) var(--ae-col4,minmax(100px,.66fr)) minmax(90px,.52fr)!important;min-height:30px!important}html body #tab-analisi #analysisSubtabImpianti .economic-row>div{padding:2px 7px!important;border-color:#e3e8ea!important}
      html body #tab-analisi #analysisSubtabImpianti .economic-head{min-height:30px!important;font-size:8.3px!important;color:#52616b!important}html body #tab-analisi #analysisSubtabImpianti .economic-head>div:nth-child(1){background:#f3f5f6!important}html body #tab-analisi #analysisSubtabImpianti .economic-head>div:nth-child(2){background:#eef6f0!important}html body #tab-analisi #analysisSubtabImpianti .economic-head>div:nth-child(3){background:#eaf3ec!important}html body #tab-analisi #analysisSubtabImpianti .economic-head>div:nth-child(4){background:#f8eded!important}.economic-hours-head{background:#f0f4f6!important}
      html body #tab-analisi #analysisSubtabImpianti .economic-table .economic-row:not(.economic-head):not(.total-row)>div:nth-child(2){background:#f8fbf9!important}html body #tab-analisi #analysisSubtabImpianti .economic-table .economic-row:not(.economic-head):not(.total-row)>div:nth-child(3){background:#f5faf6!important}html body #tab-analisi #analysisSubtabImpianti .economic-table .economic-row:not(.economic-head):not(.total-row)>div:nth-child(4){background:#fffafa!important}
      .economic-hours-cell{display:flex!important;align-items:center!important;justify-content:center!important;background:#f7fafb!important;color:#3f5661!important;font-size:10px!important;font-weight:650!important;font-variant-numeric:tabular-nums}.economic-hours-total{background:#eaf0f2!important;font-weight:780!important}
      html body #tab-analisi #analysisSubtabImpianti .total-row{min-height:33px!important;border-top:2px solid #aeb8be!important}html body #tab-analisi #analysisSubtabImpianti .economic-empty-hint{padding:8px 10px;border-bottom:1px solid #e7ecee;background:#fbfcfd;color:#7b8790;font-size:8.5px}html body #tab-analisi #analysisSubtabImpianti .economic-empty-hint[hidden]{display:none!important}
      html body #tab-analisi #analysisSubtabImpianti .economic-kpis{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;width:100%!important;min-width:0!important;height:auto!important;gap:6px!important}html body #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi{height:50px!important;min-height:50px!important;padding:6px 8px!important;border-radius:6px!important;border:1px solid #dce3e6!important;box-shadow:none!important}
      @media(max-width:900px){html body #tab-analisi #analysisSubtabImpianti .economic-table{min-width:720px!important}html body #tab-analisi #analysisSubtabImpianti .economic-kpis{grid-template-columns:repeat(4,minmax(130px,1fr))!important;min-width:560px!important}}
    `;document.head.appendChild(s);
  }

  window.addEventListener('load',()=>setTimeout(init,220),{once:true});
})();
