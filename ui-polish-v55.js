/* v60 - readable managerial UI: stronger phases, economics and planning hierarchy */
(function(){
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const numeric=v=>Number.parseFloat(String(v??'').replace(',','.'))||0;

  function installStyles(){
    if(document.getElementById('dabsterUiPolishV55'))return;
    const style=document.createElement('style');
    style.id='dabsterUiPolishV55';
    style.textContent=`
      /* ---------- ECONOMIC SUMMARY ---------- */
      #tab-analisi #analysisSubtabImpianti .economic-table .money-cell>span,
      #tab-analisi #analysisSubtabImpianti .economic-table .computed-cell>b,
      #tab-analisi #analysisSubtabImpianti .economic-table .total-value>b{display:none!important}
      #tab-analisi #analysisSubtabImpianti .economic-table .money-cell input{padding-left:8px!important;padding-right:8px!important;text-align:center!important}
      #tab-analisi #analysisSubtabImpianti .economic-table .computed-cell,
      #tab-analisi #analysisSubtabImpianti .economic-table .total-value{gap:0!important;padding-right:9px!important;justify-content:center!important;text-align:center!important}

      html body #tab-analisi #analysisSubtabImpianti>.flat-economic{
        border-bottom-color:#c8d3d9!important;
        box-shadow:0 7px 20px rgba(35,50,60,.14)!important;
      }
      html body #tab-analisi #analysisSubtabImpianti>.flat-economic>.analysis-body{padding:8px 9px 9px!important}
      html body #tab-analisi #analysisSubtabImpianti .economic-summary-bar{padding:3px 4px 9px!important;margin-bottom:4px!important}
      html body #tab-analisi #analysisSubtabImpianti .economic-summary-title strong{
        font-size:14px!important;line-height:1.1!important;font-weight:760!important;color:#263d49!important;
      }
      html body #tab-analisi #analysisSubtabImpianti .economic-summary-title span{
        margin-top:2px!important;font-size:9.6px!important;line-height:1.2!important;color:#687780!important;
      }
      html body #tab-analisi #analysisSubtabImpianti .economic-trade-control{
        font-size:10px!important;font-weight:700!important;color:#465a65!important;
      }
      html body #tab-analisi #analysisSubtabImpianti .economic-trade-slider #tradePctLabel{font-size:11.5px!important}

      #tab-analisi #analysisSubtabImpianti .economic-table .economic-head>div:first-child,
      #tab-analisi #analysisSubtabImpianti .economic-table .economic-row>div:first-child{justify-content:flex-start!important;text-align:left!important}
      #tab-analisi #analysisSubtabImpianti .economic-table .economic-head>div:nth-child(n+2),
      #tab-analisi #analysisSubtabImpianti .economic-table .economic-row>div:nth-child(n+2){justify-content:center!important;text-align:center!important}
      html body #tab-analisi #analysisSubtabImpianti .economic-head{
        min-height:36px!important;font-size:10px!important;letter-spacing:.02em!important;color:#40525d!important;
      }
      html body #tab-analisi #analysisSubtabImpianti .economic-row{min-height:36px!important}
      html body #tab-analisi #analysisSubtabImpianti .economic-row>div{padding:4px 9px!important}
      html body #tab-analisi #analysisSubtabImpianti .phase-row>div:first-child,
      html body #tab-analisi #analysisSubtabImpianti .economic-phase-label{
        font-size:12.4px!important;line-height:1.2!important;font-weight:680!important;color:#304650!important;
      }
      html body #tab-analisi #analysisSubtabImpianti .money-cell input,
      html body #tab-analisi #analysisSubtabImpianti .computed-cell,
      html body #tab-analisi #analysisSubtabImpianti .total-value{
        font-size:12.5px!important;font-variant-numeric:tabular-nums!important;
      }
      html body #tab-analisi #analysisSubtabImpianti .total-row{min-height:40px!important}
      html body #tab-analisi #analysisSubtabImpianti .total-row>div{font-size:12.2px!important}
      html body #tab-analisi #analysisSubtabImpianti .total-row>div:first-child{font-size:10.5px!important;letter-spacing:.04em!important}

      /* KPI: labels remain secondary, figures become the visual anchor. */
      html body #tab-analisi #analysisSubtabImpianti .economic-kpis{
        grid-template-rows:64px!important;height:64px!important;min-height:64px!important;max-height:64px!important;gap:8px!important;margin-top:8px!important;
      }
      html body #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi{
        display:grid!important;grid-template-columns:1fr!important;grid-template-rows:auto 1fr!important;
        height:64px!important;min-height:64px!important;max-height:64px!important;padding:8px 10px!important;
        justify-items:center!important;align-items:center!important;align-content:center!important;text-align:center!important;
      }
      html body #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi-label{
        display:block!important;width:100%!important;margin:0!important;text-align:center!important;justify-self:center!important;
        font-size:9.1px!important;line-height:1.14!important;font-weight:720!important;color:#566872!important;
      }
      html body #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi-value{
        display:block!important;width:100%!important;margin:0!important;text-align:center!important;justify-self:center!important;
        align-self:end!important;font-size:14px!important;line-height:1.05!important;font-weight:760!important;color:#293f4a!important;
      }
      html body #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi-sub{
        font-size:9.2px!important;line-height:1!important;text-align:center!important;margin-left:4px!important;
      }
      html body #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi-value *{text-align:center!important}

      /* ---------- SEPARATION ECONOMICS / OPERATIONS ---------- */
      html body #tab-analisi #analysisSubtabImpianti>.flat-planning{
        position:relative!important;margin-top:19px!important;padding-top:14px!important;border-top:7px solid #edf1f3!important;
      }
      html body #tab-analisi #analysisSubtabImpianti>.flat-planning::before{
        content:'';position:absolute;left:0;right:0;top:-8px;height:1px;background:#d6dee2;
      }

      /* ---------- PLANNING HEADER ---------- */
      html body #tab-analisi #analysisSubtabImpianti>.flat-planning .workload-toolbar{
        min-height:45px!important;padding:5px 4px 8px!important;margin:0 0 7px!important;
      }
      html body #tab-analisi #analysisSubtabImpianti>.flat-planning .workload-toolbar>div strong{
        font-size:13.2px!important;line-height:1.12!important;font-weight:760!important;color:#2a414d!important;
      }
      html body #tab-analisi #analysisSubtabImpianti>.flat-planning .workload-toolbar>div span{
        margin-top:2px!important;font-size:9.5px!important;line-height:1.25!important;color:#687880!important;
      }
      html body #tab-analisi #analysisSubtabImpianti>.flat-planning .role-panel-toggle{
        min-height:30px!important;font-size:10px!important;padding:0 10px!important;
      }

      /* Seven phases are primary navigation: readable, equal visual weight, scroll only as fallback. */
      html body #tab-analisi #analysisSubtabImpianti #planningPhaseTabs{
        min-height:47px!important;margin-bottom:10px!important;display:flex!important;align-items:stretch!important;
        scrollbar-width:thin!important;background:#fff!important;border-color:#d9e1e5!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #planningPhaseTabs .kanban-phase-tab{
        flex:1 1 0!important;min-width:138px!important;min-height:46px!important;height:auto!important;
        padding:7px 10px 8px!important;font-size:10.7px!important;line-height:1.17!important;font-weight:650!important;
        white-space:normal!important;text-align:center!important;color:#40545f!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #planningPhaseTabs .kanban-phase-tab.active{
        font-weight:780!important;color:#9b4d17!important;background:#fff9f4!important;border-bottom-width:3px!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #planningPhaseTabs .kanban-phase-tab .count{
        min-width:18px!important;height:18px!important;margin-left:5px!important;padding:0 5px!important;
        display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:9px!important;font-weight:750!important;
      }

      /* ---------- PLANNING COLUMNS ---------- */
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .planning-phase-board{
        grid-template-columns:minmax(285px,.7fr) minmax(500px,1.3fr)!important;gap:11px!important;padding:10px!important;background:#f6f8f9!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .planning-column{
        border-color:#d9e1e5!important;border-radius:8px!important;background:#fff!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .planning-column-head{
        min-height:48px!important;padding:7px 10px!important;background:#f5f7f8!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .planning-selected-column .planning-column-head{background:#f0f6f7!important}
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .planning-column-head strong{
        font-size:11.8px!important;line-height:1.15!important;font-weight:760!important;color:#2f4651!important;text-decoration:none!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .planning-column-head span{
        margin-top:2px!important;font-size:8.9px!important;line-height:1.15!important;color:#6b7a83!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .planning-column-hint{
        font-size:8.7px!important;color:#74838b!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .planning-available-list,
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .planning-selected-drop{
        padding:8px!important;gap:8px!important;background:#fff!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .planning-available-list{max-height:330px!important}

      /* Available activities: name first, code/discipline second. */
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .planning-available-card{
        grid-template-columns:58px minmax(0,1fr) 30px!important;gap:8px!important;min-height:56px!important;padding:8px 8px!important;
        border-color:#d5dee3!important;box-shadow:none!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .planning-available-code{
        font-size:8.8px!important;font-weight:800!important;color:#607e8c!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .planning-available-copy strong{
        font-size:11.2px!important;line-height:1.22!important;font-weight:720!important;color:#2d434e!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .planning-available-copy span{
        font-size:8.5px!important;line-height:1.1!important;font-weight:720!important;color:#64808d!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .planning-card-add{
        width:28px!important;height:28px!important;font-size:15px!important;border-radius:6px!important;
      }

      /* Selected activity cards: stronger title and clearer metrics. */
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .activity-card{border-color:#d1dbe0!important;border-left-width:4px!important}
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .activity-head{
        min-height:52px!important;padding:7px 8px 7px 10px!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .planning-activity-main strong{font-size:9px!important}
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .planning-activity-main span{
        font-size:12px!important;line-height:1.2!important;font-weight:760!important;color:#293f4a!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .planning-activity-ident em{
        height:22px!important;padding:0 8px!important;font-size:8.4px!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .activity-head-metrics span{
        height:27px!important;padding:0 8px!important;font-size:9.2px!important;font-weight:720!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .activity-body{
        padding:9px 9px 11px!important;background:#fcfdfd!important;
      }

      /* Assignment rows: operational data must be readable without making the form bulky. */
      #phaseWorkloadSection .assignment-head,#phaseWorkloadSection .assignment-row{
        grid-template-columns:minmax(155px,1fr) 86px 76px 102px 24px!important;gap:7px!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .assignment-head{
        min-height:29px!important;padding:3px 1px 5px!important;font-size:9.2px!important;font-weight:720!important;color:#5c6e78!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .assignment-row{min-height:34px!important}
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .assignment-row select,
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .assignment-row input{
        height:30px!important;font-size:10.8px!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .assignment-rate{
        font-size:10.4px!important;color:#536975!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .assignment-cost{
        font-size:11px!important;font-weight:760!important;color:#23495a!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .add-assignment{
        height:28px!important;margin-top:8px!important;font-size:9.7px!important;padding:0 10px!important;
      }

      /* Compact potentiometer/scrubber for hours. */
      #phaseWorkloadSection .hours-scrubber{
        width:100%;height:30px;display:grid;grid-template-columns:23px minmax(0,1fr) 14px;
        align-items:center;border:1px solid #d5dee3;border-radius:6px;background:#fff;overflow:hidden;box-sizing:border-box;
        transition:border-color .12s,box-shadow .12s;
      }
      #phaseWorkloadSection .hours-scrubber:focus-within{border-color:#71a1b9;box-shadow:0 0 0 2px rgba(113,161,185,.10)}
      #phaseWorkloadSection .hours-scrubber-knob{
        width:19px;height:19px;margin-left:3px;padding:0;border:1px solid #b5c4cb;border-radius:50%;
        background:linear-gradient(145deg,#fff,#e7ecef);box-shadow:inset 0 0 0 2px #f7f9fa,0 1px 2px rgba(35,50,60,.08);
        position:relative;cursor:ew-resize;touch-action:none;user-select:none;outline:none;
      }
      #phaseWorkloadSection .hours-scrubber-knob::after{
        content:'';position:absolute;left:8px;top:2px;width:2px;height:6px;border-radius:2px;background:#557684;
        transform-origin:1px 7px;transform:rotate(var(--scrub-angle,-135deg));transition:transform .08s linear;
      }
      #phaseWorkloadSection .hours-scrubber-knob:hover{border-color:#8eabb6;background:linear-gradient(145deg,#fff,#dde8ec)}
      #phaseWorkloadSection .hours-scrubber-knob.scrubbing{border-color:#5f91a2;box-shadow:0 0 0 3px rgba(83,145,163,.13),inset 0 0 0 2px #f7f9fa}
      #phaseWorkloadSection .hours-scrubber .assignment-hours{
        width:100%!important;min-width:0!important;height:28px!important;border:0!important;border-radius:0!important;
        padding:0 2px!important;text-align:right!important;background:transparent!important;box-shadow:none!important;
        font-size:10.8px!important;font-variant-numeric:tabular-nums;-moz-appearance:textfield;
      }
      #phaseWorkloadSection .hours-scrubber .assignment-hours::-webkit-outer-spin-button,
      #phaseWorkloadSection .hours-scrubber .assignment-hours::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
      #phaseWorkloadSection .hours-scrubber-unit{font-size:8.5px;color:#687a83;text-align:center;pointer-events:none}
      body.hours-scrubbing,body.hours-scrubbing *{cursor:ew-resize!important;user-select:none!important}

      /* ---------- DIMENSIONAMENTO ---------- */
      #tab-analisi #analysisSubtabDimensionamento .dimensioning>.section-body{background:#fff!important;padding:13px 13px 15px!important}
      #tab-analisi #analysisSubtabDimensionamento .dim-table{border-color:#dbe2e6!important;box-shadow:0 2px 7px rgba(35,50,60,.045)!important}
      #tab-analisi #analysisSubtabDimensionamento .dim-head{background:#f3f5f6!important;color:#43535d!important;font-size:9px!important}
      #tab-analisi #analysisSubtabDimensionamento .dim-data{min-height:35px!important}
      #tab-analisi #analysisSubtabDimensionamento .dim-total-row{background:#edf3f5!important;border-top:1px solid #cfd9de!important}
      #tab-analisi #analysisSubtabDimensionamento .dim-addline{margin:8px 0 18px!important;padding:6px 8px!important;background:#fafbfb!important;border-color:#e3e8ea!important;box-shadow:none!important}
      #tab-analisi #analysisSubtabDimensionamento .dim-rounded-control{background:#fffdf7!important;border-color:#d9bf85!important}
      #tab-analisi #analysisSubtabDimensionamento .dim-fee-line{
        grid-template-columns:minmax(300px,1.45fr) minmax(190px,.82fr) minmax(150px,.65fr)!important;gap:9px!important;margin:0 0 18px!important;align-items:stretch!important;
      }
      #tab-analisi #analysisSubtabDimensionamento .dim-fee-slider,
      #tab-analisi #analysisSubtabDimensionamento .dim-ie-factor{min-height:56px!important;background:#fafbfc!important;border-color:#e1e6e9!important;box-shadow:none!important}
      #tab-analisi #analysisSubtabDimensionamento .dim-fee-total{min-height:56px!important;background:#fffaf0!important;border:1px solid #d8bc7a!important;box-shadow:0 2px 6px rgba(116,88,38,.07)!important}
      #tab-analisi #analysisSubtabDimensionamento .dim-fee-slider label,
      #tab-analisi #analysisSubtabDimensionamento .dim-fee-total>span:first-child,
      #tab-analisi #analysisSubtabDimensionamento .dim-ie-factor label{font-size:9px!important;letter-spacing:.015em!important;color:#5b6972!important}
      #tab-analisi #analysisSubtabDimensionamento .dim-fee-total strong{min-height:29px!important;font-size:12.5px!important;color:#4f4129!important}
      #tab-analisi #analysisSubtabDimensionamento .managerial-phase-table{margin-top:0!important;border-color:#dbe2e6!important;box-shadow:0 2px 7px rgba(35,50,60,.04)!important}
      #tab-analisi #analysisSubtabDimensionamento .managerial-phase-table .dim-phase-head,
      #tab-analisi #analysisSubtabDimensionamento .managerial-phase-table .dim-phase-row{
        grid-template-columns:minmax(210px,1.6fr) minmax(95px,.62fr) minmax(115px,.82fr) minmax(115px,.82fr) minmax(135px,.95fr)!important;
      }
      #tab-analisi #analysisSubtabDimensionamento .managerial-phase-table .dim-phase-head{min-height:35px!important;background:#f3f5f6!important;font-size:8.8px!important;color:#4c5d67!important}
      #tab-analisi #analysisSubtabDimensionamento .managerial-phase-table .dim-phase-row{min-height:38px!important;font-size:10.2px!important}
      #tab-analisi #analysisSubtabDimensionamento .managerial-phase-table .dim-phase-head>div:first-child,
      #tab-analisi #analysisSubtabDimensionamento .managerial-phase-table .dim-phase-row>div:first-child{justify-content:flex-start!important;text-align:left!important}
      #tab-analisi #analysisSubtabDimensionamento .managerial-phase-table .dim-phase-head>div:nth-child(2),
      #tab-analisi #analysisSubtabDimensionamento .managerial-phase-table .dim-phase-row>div:nth-child(2){justify-content:center!important;text-align:center!important}
      #tab-analisi #analysisSubtabDimensionamento .managerial-phase-table .dim-phase-head>div:nth-child(n+3),
      #tab-analisi #analysisSubtabDimensionamento .managerial-phase-table .dim-phase-row>div:nth-child(n+3){justify-content:flex-end!important;text-align:right!important}
      #tab-analisi #analysisSubtabDimensionamento .managerial-phase-table .dim-phase-row>div:last-child{background:#f3f8f7!important;color:#234d45!important;font-weight:800!important}
      #tab-analisi #analysisSubtabDimensionamento .managerial-phase-table .dim-phase-row input{width:58px!important;text-align:center!important;background:#fff!important}
      #tab-analisi #analysisSubtabDimensionamento .dim-phase-footer{margin-top:12px!important;padding-top:10px!important;border-top:1px solid #e5e9eb!important}
      #tab-analisi #analysisSubtabDimensionamento .phase-total-check{font-size:9.2px!important;color:#65747d!important}
      #tab-analisi #analysisSubtabDimensionamento .dim-transfer{height:31px!important;padding:0 14px!important;border-radius:6px!important}

      @media(max-width:900px){
        html body #tab-analisi #analysisSubtabImpianti #planningPhaseTabs .kanban-phase-tab{flex:0 0 auto!important;min-width:145px!important}
        html body #tab-analisi #analysisSubtabImpianti #phaseWorkloadSection .planning-phase-board{min-width:820px!important;grid-template-columns:300px 1fr!important}
        #phaseWorkloadSection .assignment-head,#phaseWorkloadSection .assignment-row{grid-template-columns:minmax(155px,1fr) 86px 76px 102px 24px!important}
        #tab-analisi #analysisSubtabDimensionamento .managerial-phase-table .dim-phase-head,
        #tab-analisi #analysisSubtabDimensionamento .managerial-phase-table .dim-phase-row{
          grid-template-columns:minmax(190px,1.45fr) minmax(90px,.62fr) minmax(105px,.8fr) minmax(105px,.8fr) minmax(125px,.9fr)!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function setDirectLabel(cell,label){
    if(!cell)return;
    let node=[...cell.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&String(n.textContent||'').trim());
    if(node)node.textContent=label;else cell.insertBefore(document.createTextNode(label),cell.firstChild);
  }

  function cleanEconomicUnits(){
    const head=document.querySelector('#tab-analisi #analysisSubtabImpianti .economic-table .economic-head');
    if(!head||head.children.length<4)return;
    setDirectLabel(head.children[0],'FASE');setDirectLabel(head.children[1],'PROPOSTA €');
    const trade=head.children[2].querySelector('.trade-inline>span');if(trade)trade.textContent='TRATTATIVA €';
    setDirectLabel(head.children[3],'COSTI €');
  }

  function centerKpis(){
    document.querySelectorAll('#tab-analisi #analysisSubtabImpianti .economic-kpis .kpi').forEach(kpi=>{
      kpi.style.setProperty('justify-items','center','important');
      kpi.style.setProperty('align-items','center','important');
      kpi.style.setProperty('align-content','center','important');
      kpi.style.setProperty('text-align','center','important');
      kpi.querySelectorAll('.kpi-label,.kpi-value,.kpi-sub').forEach(el=>{
        el.style.setProperty('display','block','important');el.style.setProperty('width','100%','important');
        el.style.setProperty('text-align','center','important');el.style.setProperty('justify-self','center','important');
        el.style.setProperty('align-self','center','important');el.style.setProperty('margin-left','auto','important');el.style.setProperty('margin-right','auto','important');
      });
    });
  }

  function polishDimensionLabels(){
    const sliderLabel=document.querySelector('#analysisSubtabDimensionamento .dim-fee-slider label');if(sliderLabel)sliderLabel.textContent='COMPENSO %';
    const totalLabel=document.querySelector('#analysisSubtabDimensionamento .dim-fee-total>span:first-child');if(totalLabel)totalLabel.textContent='COMPENSO INDICATIVO';
    const factorLabel=document.querySelector('#analysisSubtabDimensionamento .dim-ie-factor label');if(factorLabel)factorLabel.textContent='FATTORE COMPLESSITÀ IE';
    const roundedLabel=document.querySelector('#analysisSubtabDimensionamento .dim-rounded-label');if(roundedLabel)roundedLabel.textContent='Totale opere arrotondato';
  }

  function syncKnob(input,knob){
    const value=Math.max(0,numeric(input.value)),visualMax=200,angle=-135+(clamp(value,0,visualMax)/visualMax)*270;
    knob.style.setProperty('--scrub-angle',angle+'deg');
    knob.setAttribute('aria-label',`Ore ${value.toLocaleString('it-IT',{maximumFractionDigits:1})}. Trascina orizzontalmente per modificare.`);
  }

  function enhanceHoursInput(input){
    if(!input||input.dataset.hoursScrubber==='1')return;
    input.dataset.hoursScrubber='1';input.min='0';input.step=input.step&&Number(input.step)>0?input.step:'0.5';input.inputMode='decimal';
    const parent=input.parentElement;if(!parent)return;
    const wrap=document.createElement('div');wrap.className='hours-scrubber';parent.insertBefore(wrap,input);wrap.appendChild(input);
    const knob=document.createElement('button');knob.type='button';knob.className='hours-scrubber-knob';
    knob.title='Trascina a sinistra/destra per diminuire/aumentare le ore';wrap.insertBefore(knob,input);
    const unit=document.createElement('span');unit.className='hours-scrubber-unit';unit.textContent='h';wrap.appendChild(unit);
    const step=Math.max(0.1,numeric(input.step)||0.5);let pointerId=null,startX=0,startValue=0,lastValue=null,moved=false;
    const setValue=value=>{
      const next=Math.max(0,Math.round(value/step)*step),rounded=Math.round(next*10)/10;
      if(numeric(input.value)===rounded)return;
      input.value=Number.isInteger(rounded)?String(rounded):rounded.toFixed(1);lastValue=rounded;
      input.dispatchEvent(new Event('input',{bubbles:true}));syncKnob(input,knob);
    };
    knob.addEventListener('pointerdown',e=>{
      if(e.button!==undefined&&e.button!==0)return;e.preventDefault();
      pointerId=e.pointerId;startX=e.clientX;startValue=numeric(input.value);lastValue=startValue;moved=false;
      knob.setPointerCapture?.(pointerId);knob.classList.add('scrubbing');document.body.classList.add('hours-scrubbing');
    });
    knob.addEventListener('pointermove',e=>{
      if(pointerId===null||e.pointerId!==pointerId)return;
      const dx=e.clientX-startX;if(Math.abs(dx)>2)moved=true;setValue(startValue+Math.round(dx/3)*step);
    });
    const finish=e=>{
      if(pointerId===null||(e.pointerId!==undefined&&e.pointerId!==pointerId))return;
      try{knob.releasePointerCapture?.(pointerId);}catch(_e){}
      pointerId=null;knob.classList.remove('scrubbing');document.body.classList.remove('hours-scrubbing');
      if(lastValue!==null)input.dispatchEvent(new Event('change',{bubbles:true}));
      if(!moved)setTimeout(()=>{input.focus();input.select?.();},0);
    };
    knob.addEventListener('pointerup',finish);knob.addEventListener('pointercancel',finish);
    input.addEventListener('input',()=>syncKnob(input,knob));input.addEventListener('change',()=>syncKnob(input,knob));syncKnob(input,knob);
  }

  function enhanceAll(root=document){
    root.querySelectorAll?.('#phaseWorkloadSection .assignment-hours').forEach(enhanceHoursInput);
    cleanEconomicUnits();centerKpis();polishDimensionLabels();
  }

  function install(attempt=0){
    const workload=document.getElementById('phaseWorkloadSection'),table=document.querySelector('#tab-analisi .economic-table');
    if(!workload||!table){if(attempt<180)setTimeout(()=>install(attempt+1),60);return;}
    installStyles();enhanceAll();
    new MutationObserver(mutations=>{
      mutations.forEach(m=>m.addedNodes.forEach(node=>{
        if(!(node instanceof HTMLElement))return;
        if(node.matches?.('.assignment-hours'))enhanceHoursInput(node);
        node.querySelectorAll?.('.assignment-hours').forEach(enhanceHoursInput);
      }));
    }).observe(workload,{childList:true,subtree:true});
    document.addEventListener('click',e=>{
      if(e.target.closest('#prefillDemoData,#clearDemoData,#dimTransfer,.analysis-subtab'))setTimeout(()=>enhanceAll(),180);
    },true);
    setTimeout(enhanceAll,500);setTimeout(enhanceAll,1600);setTimeout(centerKpis,2800);
  }

  install();
})();
