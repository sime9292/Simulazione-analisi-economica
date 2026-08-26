/* v59 - Seven-phase planning presentation + stronger separation below sticky economics. */
(function(){
  function install(attempt=0){
    const panel=document.getElementById('analysisSubtabImpianti');
    const planning=document.getElementById('phaseWorkloadSection');
    const tabs=document.getElementById('planningPhaseTabs');
    if(!panel||!planning||!tabs){if(attempt<220)setTimeout(()=>install(attempt+1),50);return;}
    if(document.getElementById('planningLayoutV59Styles'))return;

    const style=document.createElement('style');
    style.id='planningLayoutV59Styles';
    style.textContent=`
      /* The economic summary is a fixed decision block; planning starts as a separate workspace. */
      html body #tab-analisi #analysisSubtabImpianti>.flat-economic{
        border-bottom-color:#cfd9de!important;
        box-shadow:0 6px 18px rgba(35,50,60,.13)!important;
      }
      html body #tab-analisi #analysisSubtabImpianti>.flat-planning{
        position:relative!important;
        margin-top:22px!important;
        padding-top:15px!important;
        border-top:1px solid #d7dfe3!important;
      }
      html body #tab-analisi #analysisSubtabImpianti>.flat-planning::before{
        content:'';
        position:absolute;
        left:0;right:0;top:-9px;
        height:7px;
        border-radius:4px;
        background:#eef2f4;
        pointer-events:none;
      }
      html body #tab-analisi #analysisSubtabImpianti>.flat-planning .workload-toolbar{
        margin-bottom:7px!important;
        padding:1px 4px 6px!important;
      }
      html body #tab-analisi #analysisSubtabImpianti>.flat-planning .workload-toolbar>div strong{
        font-size:12.1px!important;
        color:#2f4651!important;
      }
      html body #tab-analisi #analysisSubtabImpianti>.flat-planning .workload-toolbar>div span{
        font-size:9px!important;
        color:#6b7a83!important;
      }

      /* Seven operational phases: one fixed ordered navigation row on desktop. */
      html body #tab-analisi #analysisSubtabImpianti #planningPhaseTabs{
        display:grid!important;
        grid-template-columns:repeat(7,minmax(0,1fr))!important;
        width:100%!important;
        min-width:930px!important;
        overflow:visible!important;
        border-radius:7px!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #planningPhaseTabs .kanban-phase-tab{
        min-width:0!important;
        width:auto!important;
        min-height:42px!important;
        padding:5px 7px!important;
        white-space:normal!important;
        line-height:1.12!important;
        text-align:center!important;
        justify-content:center!important;
        border-right:1px solid #e5e9eb!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #planningPhaseTabs .kanban-phase-tab:last-child{
        border-right:0!important;
      }
      html body #tab-analisi #analysisSubtabImpianti #planningPhaseTabs .kanban-phase-tab .count{
        margin-left:5px!important;
        flex:0 0 auto!important;
      }

      /* Keep horizontal scrolling as fallback only when the viewport is genuinely narrower. */
      html body #tab-analisi #analysisSubtabImpianti>.flat-planning>.section-body{
        overflow-x:auto!important;
        overflow-y:visible!important;
      }
      @media(max-width:980px){
        html body #tab-analisi #analysisSubtabImpianti #planningPhaseTabs{
          grid-template-columns:repeat(7,minmax(125px,1fr))!important;
          min-width:990px!important;
        }
      }
    `;
    document.head.appendChild(style);

    const toolbar=planning.querySelector('.workload-toolbar>div');
    if(toolbar)toolbar.innerHTML='<strong>Attività e risorse previste</strong><span>Seleziona la fase, aggiungi le attività previste e assegna figure professionali e ore.</span>';
  }

  install();
})();
