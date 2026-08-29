/* v47 - Shared Piano di fatturazione editor: compact layout, bidirectional %/amount, confirmation/activity-completed triggers. */
(function(){
  const STORE_PREFIX='dabster.billing.plan.v47.';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
  const round2=n=>Math.round((Number(n||0)+Number.EPSILON)*100)/100;
  const round4=n=>Math.round((Number(n||0)+Number.EPSILON)*10000)/10000;
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const pct=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:0,maximumFractionDigits:4});
  const uid=()=>`bp47-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;

  let section=null,body=null,currentKey='',state={rows:[]},installing=false;

  function field(label){return [...document.querySelectorAll('#tab-dati label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))||null;}
  function control(label){return field(label)?.querySelector('input,select,textarea')||null;}
  function offerCode(){return String(control('Codice')?.value||window.DABSTER_OFFER_FLOW?.getSnapshot?.()?.offer?.code||window.DABSTER_OFFER_FLOW?.offer?.code||'bozza').trim()||'bozza';}
  function parseTotal(){
    const snap=window.DABSTER_OFFER_FLOW?.getSnapshot?.();
    const candidates=[snap?.offer?.amount,window.DABSTER_OFFER_LINES?.confirmationTotal,window.DABSTER_OFFER_LINES?.total,document.getElementById('totaleOfferta')?.value];
    for(const v of candidates){const n=typeof v==='number'?v:num(v);if(n>0)return n;}
    return 0;
  }
  function getLines(){
    const snap=window.DABSTER_OFFER_FLOW?.getSnapshot?.();
    const source=Array.isArray(snap?.lines)&&snap.lines.length?snap.lines:(Array.isArray(window.DABSTER_OFFER_LINES?.lines)?window.DABSTER_OFFER_LINES.lines:[]);
    return source.map((x,i)=>({id:String(x.id||`${x.phase||'line'}-${i}`),phase:String(x.phase||''),description:String(x.description||x.label||`Riga ${i+1}`),amount:Number(x.amount||0)})).filter(x=>x.amount>0.005);
  }
  function getActivities(){
    const out=[];
    document.querySelectorAll('#phaseWorkCards > .phase-work-card').forEach(card=>{
      const phase=card.querySelector('.phase-type-select')?.value||card.dataset.planningPhase||'';
      card.querySelectorAll('.activity-card').forEach(activity=>{
        const name=String(activity.querySelector('.activity-name')?.value||'').trim();if(!name)return;
        const key=`${phase}::${norm(name)}`;
        if(!out.some(x=>x.key===key))out.push({key,phase,name});
      });
    });
    return out;
  }
  function getContext(){
    const snap=window.DABSTER_OFFER_FLOW?.getSnapshot?.()||{};
    return {code:offerCode(),status:String(control('Stato')?.value||snap.offer?.status||''),offerAmount:parseTotal(),lines:getLines(),activities:getActivities()};
  }
  function storageKey(code){return STORE_PREFIX+(code||'bozza');}
  function normalizeStoredRow(r){
    const row={id:r?.id||uid(),baseType:r?.baseType||'offer',baseRef:r?.baseRef||'',eventLabel:r?.eventLabel||'',percent:Number(r?.percent||0),amount:Number(r?.amount||0),driver:r?.driver==='amount'?'amount':'percent',trigger:r?.trigger==='delivery'?'activity_closed':(r?.trigger||'confirmation'),activityKey:r?.activityKey||''};
    if(!row.percent&&!row.amount&&r?.valueType&&Number(r?.value||0)>0){if(r.valueType==='amount'){row.amount=Number(r.value);row.driver='amount';}else{row.percent=Number(r.value);row.driver='percent';}}
    return row;
  }
  function loadState(){
    const ctx=getContext(),key=storageKey(ctx.code);if(key===currentKey)return;
    currentKey=key;try{const raw=sessionStorage.getItem(key);const parsed=raw?JSON.parse(raw):{rows:[]};state={rows:Array.isArray(parsed?.rows)?parsed.rows.map(normalizeStoredRow):[]};}catch{state={rows:[]};}
  }
  function saveState(){if(!currentKey)return;try{sessionStorage.setItem(currentKey,JSON.stringify(state));}catch{}}

  function lineForRow(row,ctx){return ctx.lines.find(x=>x.id===row.baseRef)||null;}
  function baseAmount(row,ctx){return row.baseType==='offer'?ctx.offerAmount:(lineForRow(row,ctx)?.amount||0);}
  function syncAmounts(row,ctx,driver=row.driver){
    const base=baseAmount(row,ctx);row.driver=driver==='amount'?'amount':'percent';
    if(base<=0){if(row.driver==='percent')row.amount=0;else row.percent=0;return row;}
    if(row.driver==='amount')row.percent=round4((Number(row.amount||0)/base)*100);
    else row.amount=round2(base*Number(row.percent||0)/100);
    return row;
  }
  function calculatedAmount(row,ctx){syncAmounts(row,ctx,row.driver);return Number(row.amount||0);}
  function isRowValid(row,ctx){
    if(!row||!['offer','line'].includes(row.baseType))return false;
    if(row.baseType==='line'&&!lineForRow(row,ctx))return false;
    if(Number(row.amount||0)<=0||Number(row.percent||0)<=0)return false;
    if(!['confirmation','activity_closed'].includes(row.trigger))return false;
    if(row.trigger==='activity_closed'&&!ctx.activities.some(x=>x.key===row.activityKey))return false;
    return true;
  }
  function allocationsForRow(row,ctx){
    const amount=calculatedAmount(row,ctx);if(amount<=0||!isRowValid(row,ctx))return [];
    if(row.baseType==='line')return [{lineId:row.baseRef,amount:round2(amount)}];
    const lines=ctx.lines.filter(x=>x.amount>0),total=lines.reduce((s,x)=>s+x.amount,0);if(!lines.length||total<=0)return [];
    let used=0;return lines.map((line,i)=>{const share=i===lines.length-1?round2(amount-used):round2(amount*line.amount/total);used=round2(used+share);return {lineId:line.id,amount:share};});
  }
  function snapshot(){
    loadState();const ctx=getContext();let allocated=0,incomplete=0;const allocTotals=new Map();
    const rows=state.rows.map(row=>{
      syncAmounts(row,ctx,row.driver);const amount=Number(row.amount||0),valid=isRowValid(row,ctx),allocations=allocationsForRow(row,ctx);if(valid)allocated=round2(allocated+amount);else incomplete++;
      allocations.forEach(a=>allocTotals.set(a.lineId,round2((allocTotals.get(a.lineId)||0)+a.amount)));
      return {...row,baseAmount:baseAmount(row,ctx),calculatedAmount:amount,valid,allocations};
    });
    const overLines=ctx.lines.filter(line=>(allocTotals.get(line.id)||0)-line.amount>0.01).map(line=>({id:line.id,description:line.description,amount:line.amount,allocated:allocTotals.get(line.id)||0}));
    return {offerCode:ctx.code,total:ctx.offerAmount,offerAmount:ctx.offerAmount,allocated,planned:allocated,residual:round2(ctx.offerAmount-allocated),incomplete,overLines,rows};
  }

  function installStyles(){if(document.getElementById('billingPlanV47Styles'))return;const s=document.createElement('style');s.id='billingPlanV47Styles';s.textContent=`
    #billingPlanSection{margin-top:10px!important;border-left-color:#8ba4af!important}#billingPlanSection>.section-head{background:linear-gradient(90deg,#f1f5f6,#fbfcfc)!important;color:#425c68!important}.bp47-wrap{border:1px solid #d8e1e5;border-radius:8px;overflow:hidden;background:#fff}.bp47-head,.bp47-row{display:grid;grid-template-columns:minmax(135px,1.18fr) minmax(120px,1fr) 58px 90px 112px minmax(145px,1.12fr) 28px;align-items:center}.bp47-head{min-height:30px;background:#f3f6f7;border-bottom:1px solid #dde4e7}.bp47-head>div{min-width:0;padding:5px 6px;font-size:7.2px;font-weight:800;color:#64747d;text-transform:uppercase}.bp47-row{min-height:41px;border-bottom:1px solid #e8edef}.bp47-row:last-child{border-bottom:0}.bp47-row>div{min-width:0;padding:4px 5px}.bp47-row input,.bp47-row select{box-sizing:border-box;width:100%;min-width:0;height:28px;border:1px solid #d5dfe3;border-radius:5px;background:#fff;color:#40545e;padding:0 5px;font-size:8.3px;outline:none}.bp47-row input:focus,.bp47-row select:focus{border-color:#77a7b2;box-shadow:0 0 0 2px rgba(70,139,154,.08)}.bp47-row select:disabled{background:#f4f6f7;color:#9aa5aa}.bp47-num input{text-align:right;font-variant-numeric:tabular-nums}.bp47-delete{width:24px!important;height:24px!important;border:1px solid #e1d7d7!important;border-radius:5px!important;background:#fff!important;color:#a25a5a!important;cursor:pointer}.bp47-actions{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 8px;border-top:1px solid #e5ebed;background:#fafcfc}.bp47-add{height:28px;padding:0 9px;border:1px solid #bfcfd5;border-radius:6px;background:#fff;color:#46616c;font-size:8.4px;font-weight:750;cursor:pointer;white-space:nowrap}.bp47-summary{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end}.bp47-total{display:flex;align-items:baseline;gap:4px;padding:4px 7px;border:1px solid #dde5e8;border-radius:6px;background:#fff;font-size:7.5px;color:#74828a;white-space:nowrap}.bp47-total strong{font-size:9px;color:#344f5a}.bp47-total.residual.warn strong{color:#a45d2d}.bp47-total.residual.over strong{color:#a4484f}.bp47-empty{padding:11px;border:1px dashed #ccd7db;border-radius:7px;background:#fbfcfc;color:#74828a;font-size:8.6px;line-height:1.4}.bp47-empty strong{display:block;margin-bottom:3px;color:#435b66;font-size:9.4px}.bp47-note{margin:0 0 6px;color:#78858d;font-size:7.8px;line-height:1.35}.bp47-warn{padding:6px 8px;border-top:1px solid #eadfca;background:#fff9ef;color:#8b6437;font-size:7.9px;font-weight:700}
    @media(max-width:1050px){.bp47-head,.bp47-row{grid-template-columns:minmax(122px,1.12fr) minmax(105px,.95fr) 52px 80px 102px minmax(122px,1fr) 26px}.bp47-head>div{padding:5px 4px;font-size:6.8px}.bp47-row>div{padding:4px}.bp47-row input,.bp47-row select{font-size:7.8px;padding:0 4px}.bp47-summary{gap:5px}.bp47-total{padding:4px 5px}}
    @media(max-width:760px){.bp47-head{display:none}.bp47-row{grid-template-columns:minmax(0,1.15fr) minmax(0,1fr) 58px 82px;grid-template-areas:'base event pct amount' 'trigger activity activity delete';gap:2px 0;padding:4px 3px}.bp47-base{grid-area:base}.bp47-event{grid-area:event}.bp47-pct{grid-area:pct}.bp47-amount{grid-area:amount}.bp47-trigger{grid-area:trigger}.bp47-activity{grid-area:activity}.bp47-remove{grid-area:delete}.bp47-actions{align-items:flex-start;flex-direction:column}.bp47-summary{justify-content:flex-start}}
    @media(max-width:520px){.bp47-row{grid-template-columns:1fr 1fr;grid-template-areas:'base base' 'event event' 'pct amount' 'trigger trigger' 'activity delete'}.bp47-row input,.bp47-row select{height:30px;font-size:8.4px}}
  `;document.head.appendChild(s);}

  function ensureSection(){
    const lines=document.getElementById('offerLinesSection');if(!lines)return false;
    section=document.getElementById('billingPlanSection');
    if(!section){section=document.createElement('section');section.id='billingPlanSection';section.className='accordion open';section.innerHTML='<button class="section-head" type="button"><span>◈&nbsp;&nbsp;Piano di fatturazione</span><span class="chevron">⌄</span></button><div class="section-body" id="billingPlanBody"></div>';lines.insertAdjacentElement('afterend',section);section.querySelector('.section-head')?.addEventListener('click',()=>section.classList.toggle('open'));}
    body=section.querySelector('#billingPlanBody');if(!body){body=document.createElement('div');body.id='billingPlanBody';body.className='section-body';section.appendChild(body);}
    section.dataset.billingPlanV47='1';return true;
  }
  function baseOptions(row,ctx){
    const opts=[`<option value="offer" ${row.baseType==='offer'?'selected':''}>Totale offerta · ${money(ctx.offerAmount)} €</option>`];
    ctx.lines.forEach(line=>opts.push(`<option value="line:${esc(line.id)}" ${row.baseType==='line'&&row.baseRef===line.id?'selected':''}>${esc(line.description)} · ${money(line.amount)} €</option>`));return opts.join('');
  }
  function activityOptions(row,ctx){
    const opts=['<option value="">Seleziona attività</option>'];ctx.activities.forEach(a=>opts.push(`<option value="${esc(a.key)}" ${row.activityKey===a.key?'selected':''}>${esc(a.name)}</option>`));return opts.join('');
  }
  function rowMarkup(row,ctx){
    syncAmounts(row,ctx,row.driver);
    return `<div class="bp47-row" data-row-id="${esc(row.id)}"><div class="bp47-base"><select data-f="base">${baseOptions(row,ctx)}</select></div><div class="bp47-event"><input data-f="eventLabel" value="${esc(row.eventLabel||'')}" placeholder="Es. Acconto"></div><div class="bp47-num bp47-pct"><input data-f="percent" inputmode="decimal" value="${esc(pct(row.percent))}" placeholder="0"></div><div class="bp47-num bp47-amount"><input data-f="amount" inputmode="decimal" value="${esc(money(row.amount))}" placeholder="0,00"></div><div class="bp47-trigger"><select data-f="trigger"><option value="confirmation" ${row.trigger==='confirmation'?'selected':''}>Offerta confermata</option><option value="activity_closed" ${row.trigger==='activity_closed'?'selected':''}>Attività conclusa</option></select></div><div class="bp47-activity"><select data-f="activityKey" ${row.trigger==='activity_closed'?'':'disabled'}>${activityOptions(row,ctx)}</select></div><div class="bp47-remove"><button type="button" class="bp47-delete" data-delete title="Elimina">×</button></div></div>`;
  }
  function summaryMarkup(){
    const s=snapshot(),res=s.residual,klass=res<-.01?'over':res>.01?'warn':'';
    return `<div class="bp47-summary"><span class="bp47-total">Totale <strong>${money(s.total)} €</strong></span><span class="bp47-total">Allocato <strong>${money(s.allocated)} €</strong></span><span class="bp47-total residual ${klass}">Residuo <strong>${money(Math.abs(res))} €${res<-.01?' eccedenza':''}</strong></span></div>`;
  }
  function render(){
    loadState();if(!ensureSection())return;const ctx=getContext(),confirmed=norm(ctx.status)==='confermata';section.hidden=!confirmed;if(!confirmed)return;
    state.rows.forEach(r=>syncAmounts(r,ctx,r.driver));saveState();
    const rows=state.rows,s=snapshot();
    body.innerHTML=`<div class="bp47-note">Il piano definisce la base economica e il momento in cui una quota diventa fatturabile. I trigger disponibili in questa fase sono <strong>Offerta confermata</strong> e <strong>Attività conclusa</strong>.</div>${rows.length?`<div class="bp47-wrap"><div class="bp47-head"><div>Base</div><div>Evento</div><div>%</div><div>Importo €</div><div>Trigger</div><div>Attività collegata</div><div></div></div>${rows.map(r=>rowMarkup(r,ctx)).join('')}<div class="bp47-actions"><button type="button" class="bp47-add" data-add>＋ Aggiungi regola</button>${summaryMarkup()}</div>${s.incomplete?`<div class="bp47-warn">⚠ ${s.incomplete} regola/e incomplete: non vengono conteggiate nell’allocato.</div>`:''}${s.overLines.length?`<div class="bp47-warn">⚠ Una o più Righe Offerta risultano allocate oltre il proprio importo.</div>`:''}</div>`:`<div class="bp47-empty"><strong>Nessuna regola di fatturazione</strong>Definisci la base, la quota e il trigger. Compilando la percentuale viene calcolato l’importo; compilando l’importo viene calcolata la percentuale.</div><div class="bp47-actions"><button type="button" class="bp47-add" data-add>＋ Aggiungi regola</button>${summaryMarkup()}</div>`}`;
    bindBody();
  }
  function getRow(id){return state.rows.find(x=>x.id===id)||null;}
  function refreshRow(rowEl){
    const row=getRow(rowEl.dataset.rowId),ctx=getContext();if(!row)return;syncAmounts(row,ctx,row.driver);
    const p=rowEl.querySelector('[data-f="percent"]'),a=rowEl.querySelector('[data-f="amount"]');if(p&&document.activeElement!==p)p.value=pct(row.percent);if(a&&document.activeElement!==a)a.value=money(row.amount);
    const sum=body.querySelector('.bp47-summary');if(sum)sum.outerHTML=summaryMarkup();saveState();
  }
  function bindBody(){
    body.querySelector('[data-add]')?.addEventListener('click',()=>{state.rows.push({id:uid(),baseType:'offer',baseRef:'',eventLabel:'',percent:0,amount:0,driver:'percent',trigger:'confirmation',activityKey:''});saveState();render();});
    body.querySelectorAll('[data-delete]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.closest('.bp47-row')?.dataset.rowId;state.rows=state.rows.filter(x=>x.id!==id);saveState();render();}));
    body.querySelectorAll('.bp47-row').forEach(rowEl=>{
      rowEl.querySelector('[data-f="base"]')?.addEventListener('change',e=>{const row=getRow(rowEl.dataset.rowId);if(!row)return;if(e.target.value==='offer'){row.baseType='offer';row.baseRef='';}else{row.baseType='line';row.baseRef=e.target.value.slice(5);}syncAmounts(row,getContext(),row.driver);saveState();render();});
      rowEl.querySelector('[data-f="eventLabel"]')?.addEventListener('input',e=>{const row=getRow(rowEl.dataset.rowId);if(row){row.eventLabel=e.target.value;saveState();}});
      rowEl.querySelector('[data-f="percent"]')?.addEventListener('input',e=>{const row=getRow(rowEl.dataset.rowId);if(!row)return;row.percent=num(e.target.value);row.driver='percent';syncAmounts(row,getContext(),'percent');refreshRow(rowEl);});
      rowEl.querySelector('[data-f="amount"]')?.addEventListener('input',e=>{const row=getRow(rowEl.dataset.rowId);if(!row)return;row.amount=num(e.target.value);row.driver='amount';syncAmounts(row,getContext(),'amount');refreshRow(rowEl);});
      rowEl.querySelector('[data-f="percent"]')?.addEventListener('blur',()=>render());
      rowEl.querySelector('[data-f="amount"]')?.addEventListener('blur',()=>render());
      rowEl.querySelector('[data-f="trigger"]')?.addEventListener('change',e=>{const row=getRow(rowEl.dataset.rowId);if(!row)return;row.trigger=e.target.value;if(row.trigger!=='activity_closed')row.activityKey='';saveState();render();});
      rowEl.querySelector('[data-f="activityKey"]')?.addEventListener('change',e=>{const row=getRow(rowEl.dataset.rowId);if(row){row.activityKey=e.target.value;saveState();render();}});
    });
  }

  function reset(){loadState();state={rows:[]};saveState();render();return snapshot();}
  function seed(defs,{replace=true}={}){
    loadState();const ctx=getContext(),rows=(defs||[]).map(d=>{
      let baseRef=d.baseRef||'';if(d.baseType==='line'&&!baseRef&&d.basePhase)baseRef=ctx.lines.find(x=>x.phase===d.basePhase)?.id||'';
      let activityKey=d.activityKey||'';if((d.trigger==='activity_closed'||d.trigger==='delivery')&&!activityKey&&d.activityName)activityKey=ctx.activities.find(a=>(!d.activityPhase||a.phase===d.activityPhase)&&norm(a.name)===norm(d.activityName))?.key||'';
      const row={id:d.id||uid(),baseType:d.baseType||'offer',baseRef,eventLabel:d.eventLabel||'',percent:Number(d.percent||0),amount:Number(d.amount||0),driver:d.driver==='amount'?'amount':'percent',trigger:d.trigger==='delivery'?'activity_closed':(d.trigger||'confirmation'),activityKey};
      if(!row.percent&&!row.amount&&d.valueType&&Number(d.value||0)>0){if(d.valueType==='amount'){row.amount=Number(d.value);row.driver='amount';}else{row.percent=Number(d.value);row.driver='percent';}}
      syncAmounts(row,ctx,row.driver);return row;
    });
    state.rows=replace?rows:[...state.rows,...rows];saveState();render();return snapshot();
  }

  async function install(){
    if(installing)return;installing=true;installStyles();
    for(let i=0;i<260;i++){if(document.getElementById('offerLinesSection')&&document.getElementById('tab-dati')){ensureSection();loadState();render();break;}await sleep(40);}
    document.addEventListener('change',e=>{if(e.target===control('Stato')||e.target.closest?.('#offerLineRows'))setTimeout(render,40);},true);
    window.addEventListener('dabster-offer-flow-change',()=>setTimeout(()=>{loadState();render();},60));
    const api={getSnapshot:snapshot,seed,reset,refresh:render,getContext};
    window.DABSTER_BILLING_PLAN_V47=api;
    window.DABSTER_BILLING_PLAN_V46=api; // compatibility for current Test controller: same shared business component.
    window.dispatchEvent(new CustomEvent('dabster-billing-plan-ready',{detail:snapshot()}));
  }
  install();
})();