/* v56 - compact hour scrubber + economic units in headers + centered monetary columns/KPIs */
(function(){
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const numeric=v=>Number.parseFloat(String(v??'').replace(',','.'))||0;

  function installStyles(){
    if(document.getElementById('dabsterUiPolishV55'))return;
    const style=document.createElement('style');
    style.id='dabsterUiPolishV55';
    style.textContent=`
      /* Economic table: currency belongs to the header, not to every cell. */
      #tab-analisi #analysisSubtabImpianti .economic-table .money-cell>span,
      #tab-analisi #analysisSubtabImpianti .economic-table .computed-cell>b,
      #tab-analisi #analysisSubtabImpianti .economic-table .total-value>b{display:none!important}
      #tab-analisi #analysisSubtabImpianti .economic-table .money-cell input{padding-left:8px!important;padding-right:8px!important}
      #tab-analisi #analysisSubtabImpianti .economic-table .computed-cell,
      #tab-analisi #analysisSubtabImpianti .economic-table .total-value{gap:0!important;padding-right:9px!important}

      /* Economic alignment: phase stays left, all monetary columns are centered. */
      #tab-analisi #analysisSubtabImpianti .economic-table .economic-head>div:first-child,
      #tab-analisi #analysisSubtabImpianti .economic-table .economic-row>div:first-child{
        justify-content:flex-start!important;text-align:left!important;
      }
      #tab-analisi #analysisSubtabImpianti .economic-table .economic-head>div:nth-child(n+2),
      #tab-analisi #analysisSubtabImpianti .economic-table .economic-row>div:nth-child(n+2){
        justify-content:center!important;text-align:center!important;
      }
      #tab-analisi #analysisSubtabImpianti .economic-table .money-cell input{
        text-align:center!important;
      }
      #tab-analisi #analysisSubtabImpianti .economic-table .computed-cell,
      #tab-analisi #analysisSubtabImpianti .economic-table .total-value{
        justify-content:center!important;text-align:center!important;
      }

      /* KPIs use the same centered visual rhythm. */
      #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi{
        justify-items:center!important;text-align:center!important;
      }
      #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi-label,
      #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi-value,
      #tab-analisi #analysisSubtabImpianti .economic-kpis .kpi-sub{
        width:100%!important;text-align:center!important;justify-self:center!important;
      }

      /* Hours: compact potentiometer/scrubber. */
      #phaseWorkloadSection .assignment-head,
      #phaseWorkloadSection .assignment-row{
        grid-template-columns:minmax(135px,1fr) 82px 72px 96px 24px!important;
      }
      #phaseWorkloadSection .hours-scrubber{
        width:100%;height:27px;display:grid;grid-template-columns:22px minmax(0,1fr) 13px;
        align-items:center;border:1px solid #d8e0e5;border-radius:6px;background:#fff;
        overflow:hidden;box-sizing:border-box;transition:border-color .12s,box-shadow .12s;
      }
      #phaseWorkloadSection .hours-scrubber:focus-within{
        border-color:#71a1b9;box-shadow:0 0 0 2px rgba(113,161,185,.10);
      }
      #phaseWorkloadSection .hours-scrubber-knob{
        width:18px;height:18px;margin-left:3px;padding:0;border:1px solid #b8c7ce;border-radius:50%;
        background:linear-gradient(145deg,#fff,#e7ecef);box-shadow:inset 0 0 0 2px #f7f9fa,0 1px 2px rgba(35,50,60,.08);
        position:relative;cursor:ew-resize;touch-action:none;user-select:none;outline:none;
      }
      #phaseWorkloadSection .hours-scrubber-knob::after{
        content:'';position:absolute;left:8px;top:2px;width:2px;height:5px;border-radius:2px;background:#557684;
        transform-origin:1px 7px;transform:rotate(var(--scrub-angle,-135deg));transition:transform .08s linear;
      }
      #phaseWorkloadSection .hours-scrubber-knob:hover{border-color:#8eabb6;background:linear-gradient(145deg,#fff,#dde8ec)}
      #phaseWorkloadSection .hours-scrubber-knob.scrubbing{
        border-color:#5f91a2;box-shadow:0 0 0 3px rgba(83,145,163,.13),inset 0 0 0 2px #f7f9fa;
      }
      #phaseWorkloadSection .hours-scrubber .assignment-hours{
        width:100%!important;min-width:0!important;height:25px!important;border:0!important;border-radius:0!important;
        padding:0 2px!important;text-align:right!important;background:transparent!important;box-shadow:none!important;
        font-variant-numeric:tabular-nums;-moz-appearance:textfield;
      }
      #phaseWorkloadSection .hours-scrubber .assignment-hours::-webkit-outer-spin-button,
      #phaseWorkloadSection .hours-scrubber .assignment-hours::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
      #phaseWorkloadSection .hours-scrubber-unit{font-size:8px;color:#72818a;text-align:center;pointer-events:none}
      body.hours-scrubbing,body.hours-scrubbing *{cursor:ew-resize!important;user-select:none!important}
      @media(max-width:900px){
        #phaseWorkloadSection .assignment-head,#phaseWorkloadSection .assignment-row{
          grid-template-columns:minmax(135px,1fr) 82px 72px 96px 24px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function setDirectLabel(cell,label){
    if(!cell)return;
    let node=[...cell.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&String(n.textContent||'').trim());
    if(node)node.textContent=label;
    else cell.insertBefore(document.createTextNode(label),cell.firstChild);
  }

  function cleanEconomicUnits(){
    const head=document.querySelector('#tab-analisi #analysisSubtabImpianti .economic-table .economic-head');
    if(!head||head.children.length<4)return;
    setDirectLabel(head.children[0],'FASE');
    setDirectLabel(head.children[1],'PROPOSTA €');
    const trade=head.children[2].querySelector('.trade-inline>span');
    if(trade)trade.textContent='TRATTATIVA €';
    setDirectLabel(head.children[3],'COSTI €');
  }

  function syncKnob(input,knob){
    const value=Math.max(0,numeric(input.value));
    const visualMax=200;
    const angle=-135+(clamp(value,0,visualMax)/visualMax)*270;
    knob.style.setProperty('--scrub-angle',angle+'deg');
    knob.setAttribute('aria-label',`Ore ${value.toLocaleString('it-IT',{maximumFractionDigits:1})}. Trascina orizzontalmente per modificare.`);
  }

  function enhanceHoursInput(input){
    if(!input||input.dataset.hoursScrubber==='1')return;
    input.dataset.hoursScrubber='1';
    input.min='0';
    input.step=input.step&&Number(input.step)>0?input.step:'0.5';
    input.inputMode='decimal';

    const parent=input.parentElement;
    if(!parent)return;
    const wrap=document.createElement('div');
    wrap.className='hours-scrubber';
    parent.insertBefore(wrap,input);
    wrap.appendChild(input);

    const knob=document.createElement('button');
    knob.type='button';
    knob.className='hours-scrubber-knob';
    knob.title='Trascina a sinistra/destra per diminuire/aumentare le ore';
    wrap.insertBefore(knob,input);
    const unit=document.createElement('span');
    unit.className='hours-scrubber-unit';unit.textContent='h';
    wrap.appendChild(unit);

    const step=Math.max(0.1,numeric(input.step)||0.5);
    let pointerId=null,startX=0,startValue=0,lastValue=null,moved=false;

    const setValue=value=>{
      const next=Math.max(0,Math.round(value/step)*step);
      const rounded=Math.round(next*10)/10;
      if(numeric(input.value)===rounded)return;
      input.value=Number.isInteger(rounded)?String(rounded):rounded.toFixed(1);
      lastValue=rounded;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      syncKnob(input,knob);
    };

    knob.addEventListener('pointerdown',e=>{
      if(e.button!==undefined&&e.button!==0)return;
      e.preventDefault();
      pointerId=e.pointerId;startX=e.clientX;startValue=numeric(input.value);lastValue=startValue;moved=false;
      knob.setPointerCapture?.(pointerId);knob.classList.add('scrubbing');document.body.classList.add('hours-scrubbing');
    });
    knob.addEventListener('pointermove',e=>{
      if(pointerId===null||e.pointerId!==pointerId)return;
      const dx=e.clientX-startX;
      if(Math.abs(dx)>2)moved=true;
      /* 3 px = one 0.5 h step. Compact but still controllable; exact values remain typable. */
      const steps=Math.round(dx/3);
      setValue(startValue+steps*step);
    });
    const finish=e=>{
      if(pointerId===null||(e.pointerId!==undefined&&e.pointerId!==pointerId))return;
      try{knob.releasePointerCapture?.(pointerId);}catch(_e){}
      pointerId=null;knob.classList.remove('scrubbing');document.body.classList.remove('hours-scrubbing');
      if(lastValue!==null)input.dispatchEvent(new Event('change',{bubbles:true}));
      if(!moved)setTimeout(()=>{input.focus();input.select?.();},0);
    };
    knob.addEventListener('pointerup',finish);
    knob.addEventListener('pointercancel',finish);
    input.addEventListener('input',()=>syncKnob(input,knob));
    input.addEventListener('change',()=>syncKnob(input,knob));
    syncKnob(input,knob);
  }

  function enhanceAll(root=document){
    root.querySelectorAll?.('#phaseWorkloadSection .assignment-hours').forEach(enhanceHoursInput);
    cleanEconomicUnits();
  }

  function install(attempt=0){
    const workload=document.getElementById('phaseWorkloadSection');
    const table=document.querySelector('#tab-analisi .economic-table');
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
    setTimeout(enhanceAll,500);setTimeout(enhanceAll,1600);
  }

  install();
})();