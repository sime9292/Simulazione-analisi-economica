/* v46 - Shared Piano di fatturazione editor. Same business logic for manual and Test modes. */
(function(){
  const STORE_PREFIX='dabster.billing.plan.v46.';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const uid=()=>`bp46-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;

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
    return source.map((x,i)=>({
      id:String(x.id||`${x.phase||'line'}-${i}`),phase:String(x.phase||''),description:String(x.description||x.label||`Riga ${i+1}`),amount:Number(x.amount||0)
    })).filter(x=>x.amount>0.005);
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
  function loadState(){
    const ctx=getContext(),key=storageKey(ctx.code);if(key===currentKey)return;
    currentKey=key;try{const raw=sessionStorage.getItem(key);state=raw?JSON.parse(raw):{rows:[]};}catch{state={rows:[]};}
    if(!Array.isArray(state.rows))state.rows=[];
  }
  function saveState(){if(!currentKey)return;try{sessionStorage.setItem(currentKey,JSON.stringify(state));}catch{}}

  function lineForRow(row,ctx){return ctx.lines.find(x=>x.id===row.baseRef)||null;}
  function baseAmount(row,ctx){return row.baseType==='offer'?ctx.offerAmount:(lineForRow(row,ctx)?.amount||0);}
  function calculatedAmount(row,ctx){
    const base=baseAmount(row,ctx),v=Number(row.value||0);if(base<=0||v<=0)return 0;
    return row.valueType==='amount'?v:base*v/100;
  }
  function isRowValid(row,ctx){
    if(!row||!['offer','line'].includes(row.baseType))return false;
    if(row.baseType==='line'&&!lineForRow(row,ctx))return false;
    if(!['percent','amount'].includes(row.valueType)||Number(row.value||0)<=0)return false;
    if(!['confirmation','delivery'].includes(row.trigger))return false;
    if(row.trigger==='delivery'&&!ctx.activities.some(x=>x.key===row.activityKey))return false;
    return true;
  }
  function allocationsForRow(row,ctx){
    const amount=calculatedAmount(row,ctx);if(amount<=0||!isRowValid(row,ctx))return [];
    if(row.baseType==='line')return [{lineId:row.baseRef,amount}];
    const lines=ctx.lines.filter(x=>x.amount>0),total=lines.reduce((s,x)=>s+x.amount,0);if(!lines.length||total<=0)return [];
    let used=0;return lines.map((line,i)=>{
      const share=i===lines.length-1?amount-used:Math.round((amount*line.amount/total)*100)/100;used+=share;return {lineId:line.id,amount:share};
    });
  }
  function snapshot(){
    loadState();const ctx=getContext();let planned=0,incomplete=0;const allocTotals=new Map();
    const rows=state.rows.map(row=>{
      const amount=calculatedAmount(row,ctx),valid=isRowValid(row,ctx),allocations=allocationsForRow(row,ctx);if(valid)planned+=amount;else incomplete++;
      allocations.forEach(a=>allocTotals.set(a.lineId,(allocTotals.get(a.lineId)||0)+a.amount));
      return {...row,baseAmount:baseAmount(row,ctx),calculatedAmount:amount,valid,allocations};
    });
    const overLines=ctx.lines.filter(line=>(allocTotals.get(line.id)||0)-line.amount>0.01).map(line=>({id:line.id,description:line.description,amount:line.amount,planned:allocTotals.get(line.id)||0}));
    return {offerCode:ctx.code,offerAmount:ctx.offerAmount,planned,residual:ctx.offerAmount-planned,coverage:ctx.offerAmount>0?planned/ctx.offerAmount:0,incomplete,overLines,rows};
  }

  function installStyles(){if(document.getElementById('billingPlanV46Styles'))return;const s=document.createElement('style');s.id='billingPlanV46Styles';s.textContent=`
    #billingPlanSection{margin-top:10px!important;border-left-color:#8ba4af!important}#billingPlanSection>.section-head{background:linear-gradient(90deg,#f1f5f6,#fbfcfc)!important;color:#425c68!important}.bp46-wrap{border:1px solid #d8e1e5;border-radius:8px;overflow:hidden;background:#fff}.bp46-head,.bp46-row{display:grid;grid-template-columns:minmax(155px,1.1fr) minmax(150px,1.05fr) 68px 75px minmax(118px,.85fr) minmax(155px,1.1fr) 105px 28px;align-items:center}.bp46-head{min-height:31px;background:#f3f6f7;border-bottom:1px solid #dde4e7}.bp46-head>div{padding:6px 7px;font-size:7.4px;font-weight:800;color:#64747d;text-transform:uppercase}.bp46-row{min-height:43px;border-bottom:1px solid #e8edef}.bp46-row:last-child{border-bottom:0}.bp46-row>div{min-width:0;padding:5px 6px}.bp46-row input,.bp46-row select{width:100%;height:29px;border:1px solid #d5dfe3;border-radius:5px;background:#fff;color:#40545e;padding:0 6px;font-size:8.8px;outline:none}.bp46-row input:focus,.bp46-row select:focus{border-color:#77a7b2;box-shadow:0 0 0 2px rgba(70,139,154,.08)}.bp46-row select:disabled{background:#f4f6f7;color:#9aa5aa}.bp46-calc{text-align:right;font-size:9.5px;font-weight:800;color:#314f5d;white-space:nowrap}.bp46-delete{width:25px;height:25px;border:1px solid #e1d7d7;border-radius:5px;background:#fff;color:#a25a5a;cursor:pointer}.bp46-actions{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 9px;border-top:1px solid #e5ebed;background:#fafcfc}.bp46-add{height:29px;padding:0 10px;border:1px solid #bfcfd5;border-radius:6px;background:#fff;color:#46616c;font-size:8.6px;font-weight:750;cursor:pointer}.bp46-summary{display:flex;align-items:center;gap:9px;flex-wrap:wrap;justify-content:flex-end;font-size:8.4px;color:#6f7d84}.bp46-summary strong{color:#344f5a}.bp46-residual.warn{color:#a45d2d;font-weight:800}.bp46-residual.over{color:#a4484f;font-weight:800}.bp46-empty{padding:12px;border:1px dashed #ccd7db;border-radius:7px;background:#fbfcfc;color:#74828a;font-size:8.8px;line-height:1.4}.bp46-empty strong{display:block;margin-bottom:3px;color:#435b66;font-size:9.6px}.bp46-note{margin:0 0 7px;color:#78858d;font-size:8px;line-height:1.35}.bp46-warn{padding:6px 8px;border-top:1px solid #eadfca;background:#fff9ef;color:#8b6437;font-size:8px;font-weight:700}@media(max-width:1050px){.bp46-wrap{overflow-x:auto}.bp46-head,.bp46-row{min-width:980px}}
  `;document.head.appendChild(s);}

  function ensureSection(){
    const lines=document.getElementById('offerLinesSection');if(!lines)return false;
    section=document.getElementById('billingPlanSection');
    if(!section){section=document.createElement('section');section.id='billingPlanSection';section.className='accordion open';section.innerHTML='<button class="section-head" type="button"><span>◈&nbsp;&nbsp;Piano di fatturazione</span><span class="chevron">⌄</span></button><div class="section-body" id="billingPlanBody"></div>';lines.insertAdjacentElement('afterend',section);section.querySelector('.section-head')?.addEventListener('click',()=>section.classList.toggle('open'));}
    body=section.querySelector('#billingPlanBody');if(!body){body=document.createElement('div');body.id='billingPlanBody';body.className='section-body';section.appendChild(body);}
    section.dataset.billingPlanV46='1';return true;
  }
  function baseOptions(row,ctx){
    const opts=[`<option value="offer" ${row.baseType==='offer'?'selected':''}>Totale offerta · ${money(ctx.offerAmount)} €</option>`];
    ctx.lines.forEach(line=>opts.push(`<option value="line:${esc(line.id)}" ${row.baseType==='line'&&row.baseRef===line.id?'selected':''}>Riga · ${esc(line.description)} · ${money(line.amount)} €</option>`));
    return opts.join('');
  }
  function activityOptions(row,ctx){
    const opts=['<option value="">Seleziona attività</option>'];ctx.activities.forEach(a=>opts.push(`<option value="${esc(a.key)}" ${row.activityKey===a.key?'selected':''}>${esc(a.name)}</option>`));return opts.join('');
  }
  function rowMarkup(row,ctx){
    return `<div class="bp46-row" data-row-id="${esc(row.id)}"><div><select data-f="base">${baseOptions(row,ctx)}</select></div><div><input data-f="eventLabel" value="${esc(row.eventLabel||'')}" placeholder="Es. Acconto"></div><div><select data-f="valueType"><option value="percent" ${row.valueType==='percent'?'selected':''}>%</option><option value="amount" ${row.valueType==='amount'?'selected':''}>€</option></select></div><div><input data-f="value" inputmode="decimal" value="${esc(row.value??'')}" placeholder="0"></div><div><select data-f="trigger"><option value="confirmation" ${row.trigger==='confirmation'?'selected':''}>Alla conferma</option><option value="delivery" ${row.trigger==='delivery'?'selected':''}>Alla consegna</option></select></div><div><select data-f="activityKey" ${row.trigger==='delivery'?'':'disabled'}>${activityOptions(row,ctx)}</select></div><div class="bp46-calc" data-calc>${money(calculatedAmount(row,ctx))} €</div><div><button type="button" class="bp46-delete" data-delete title="Elimina">×</button></div></div>`;
  }
  function summaryMarkup(ctx){
    const s=snapshot(),res=s.residual,klass=res<-.01?'over':res>.01?'warn':'';
    return `<div class="bp46-summary"><span>Offerta <strong>${money(s.offerAmount)} €</strong></span><span>Pianificato <strong>${money(s.planned)} €</strong></span><span class="bp46-residual ${klass}">${res>=0?'Residuo':'Eccedenza'} <strong>${money(Math.abs(res))} €</strong></span><span>Copertura <strong>${(s.coverage*100).toLocaleString('it-IT',{minimumFractionDigits:1,maximumFractionDigits:1})}%</strong></span></div>`;
  }
  function render(){
    loadState();if(!ensureSection())return;const ctx=getContext(),confirmed=norm(ctx.status)==='confermata';section.hidden=!confirmed;if(!confirmed)return;
    const rows=state.rows;
    body.innerHTML=`<div class="bp46-note">Il piano definisce <strong>su cosa</strong> calcolare la quota e <strong>quando</strong> diventa fatturabile. Il trigger non crea automaticamente la fattura.</div>${rows.length?`<div class="bp46-wrap"><div class="bp46-head"><div>Base di calcolo</div><div>Evento</div><div>Tipo</div><div>Valore</div><div>Trigger</div><div>Attività collegata</div><div>Importo</div><div></div></div>${rows.map(r=>rowMarkup(r,ctx)).join('')}<div class="bp46-actions"><button type="button" class="bp46-add" data-add>＋ Aggiungi regola</button>${summaryMarkup(ctx)}</div>${snapshot().incomplete?`<div class="bp46-warn">⚠ ${snapshot().incomplete} regola/e incomplete: non vengono conteggiate nella copertura.</div>`:''}${snapshot().overLines.length?`<div class="bp46-warn">⚠ Una o più Righe Offerta risultano pianificate oltre il proprio importo.</div>`:''}</div>`:`<div class="bp46-empty"><strong>Nessuna regola di fatturazione</strong>Definisci acconti e quote legandoli al totale offerta o a una Riga Offerta, quindi scegli il trigger.</div><div class="bp46-actions"><button type="button" class="bp46-add" data-add>＋ Aggiungi regola</button>${summaryMarkup(ctx)}</div>`}`;
    bindBody();
  }
  function getRow(id){return state.rows.find(x=>x.id===id)||null;}
  function updateRowFromElement(rowEl,field){
    const row=getRow(rowEl.dataset.rowId);if(!row)return;const el=rowEl.querySelector(`[data-f="${field}"]`);if(!el)return;
    if(field==='base'){
      if(el.value==='offer'){row.baseType='offer';row.baseRef='';}else{row.baseType='line';row.baseRef=el.value.slice(5);}
    }else if(field==='value')row.value=num(el.value);
    else row[field]=el.value;
    if(field==='trigger'&&row.trigger!=='delivery')row.activityKey='';saveState();
  }
  function refreshLight(rowEl){
    const row=getRow(rowEl.dataset.rowId),ctx=getContext();if(!row)return;const calc=rowEl.querySelector('[data-calc]');if(calc)calc.textContent=`${money(calculatedAmount(row,ctx))} €`;
    const actions=body.querySelector('.bp46-actions');if(actions){const old=actions.querySelector('.bp46-summary');if(old)old.outerHTML=summaryMarkup(ctx);}
  }
  function bindBody(){
    body.querySelector('[data-add]')?.addEventListener('click',()=>{const ctx=getContext();state.rows.push({id:uid(),baseType:'offer',baseRef:'',eventLabel:'',valueType:'percent',value:0,trigger:'confirmation',activityKey:''});saveState();render();});
    body.querySelectorAll('[data-delete]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.closest('.bp46-row')?.dataset.rowId;state.rows=state.rows.filter(x=>x.id!==id);saveState();render();}));
    body.querySelectorAll('.bp46-row').forEach(rowEl=>{
      rowEl.querySelectorAll('select[data-f]').forEach(el=>el.addEventListener('change',()=>{updateRowFromElement(rowEl,el.dataset.f);render();}));
      rowEl.querySelector('input[data-f="value"]')?.addEventListener('input',e=>{updateRowFromElement(rowEl,'value');refreshLight(rowEl);});
      rowEl.querySelector('input[data-f="eventLabel"]')?.addEventListener('input',e=>{updateRowFromElement(rowEl,'eventLabel');});
    });
  }

  function reset(){loadState();state={rows:[]};saveState();render();return snapshot();}
  function seed(defs,{replace=true}={}){
    loadState();const ctx=getContext(),rows=(defs||[]).map(d=>{
      let baseRef=d.baseRef||'';
      if(d.baseType==='line'&&!baseRef&&d.basePhase)baseRef=ctx.lines.find(x=>x.phase===d.basePhase)?.id||'';
      let activityKey=d.activityKey||'';
      if(d.trigger==='delivery'&&!activityKey&&d.activityName){activityKey=ctx.activities.find(a=>(!d.activityPhase||a.phase===d.activityPhase)&&norm(a.name)===norm(d.activityName))?.key||'';}
      return {id:d.id||uid(),baseType:d.baseType||'offer',baseRef,eventLabel:d.eventLabel||'',valueType:d.valueType||'percent',value:Number(d.value||0),trigger:d.trigger||'confirmation',activityKey};
    });
    state.rows=replace?rows:[...state.rows,...rows];saveState();render();return snapshot();
  }

  async function install(){
    if(installing)return;installing=true;installStyles();
    for(let i=0;i<260;i++){
      if(document.getElementById('offerLinesSection')&&document.getElementById('tab-dati')){ensureSection();loadState();render();break;}
      await sleep(40);
    }
    document.addEventListener('change',e=>{
      if(e.target===control('Stato')||e.target.closest?.('#offerLineRows'))setTimeout(render,40);
    },true);
    window.addEventListener('dabster-offer-flow-change',()=>setTimeout(()=>{loadState();render();},60));
    window.DABSTER_BILLING_PLAN_V46={getSnapshot:snapshot,seed,reset,refresh:render,getContext};
    window.dispatchEvent(new CustomEvent('dabster-billing-plan-ready',{detail:snapshot()}));
  }
  install();
})();