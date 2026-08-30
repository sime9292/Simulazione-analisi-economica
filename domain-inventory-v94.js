/* v94 - PASSIVE Activity Domain inventory. No state mutation, no reconcile, no refresh. */
(function(){
  if(window.DABSTER_DOMAIN_INVENTORY_V94)return;
  window.DABSTER_DOMAIN_INVENTORY_V94=true;

  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const domain=()=>window.DABSTER_ACTIVITY_DOMAIN_V84||window.DABSTER_ACTIVITY_DOMAIN_V82||window.DABSTER_ACTIVITY_DOMAIN||null;
  const plan=()=>window.DABSTER_BILLING_PLAN_V47||null;
  let panel=null,body=null,collapsed=false;

  function analysisRows(){
    const out=[];
    document.querySelectorAll('#phaseWorkCards > .phase-work-card').forEach(card=>{
      const phase=String(card.querySelector('.phase-type-select')?.value||card.dataset.planningPhase||'');
      card.querySelectorAll('.activity-card').forEach(a=>{
        const title=String(a.querySelector('.activity-name')?.value||'').trim();
        if(!title)return;
        const id=String(a.dataset.syncId||a.dataset.activityId||'');
        out.push({id,phase,title,key:`${phase}::${norm(title)}`});
      });
    });
    return out;
  }
  function domainRows(){
    try{return (domain()?.getActivities?.()||[]).map(a=>({id:String(a.id||a.sourceId||''),phase:String(a.phaseType||''),title:String(a.title||''),status:String(a.status||''),analysisPresent:a.analysisPresent!==false,key:`${a.phaseType||''}::${norm(a.title||'')}`}));}
    catch{return [];}
  }
  function planKeys(){
    try{return (plan()?.getSnapshot?.()?.rows||[]).filter(r=>r.trigger==='activity_closed').map(r=>({event:r.eventLabel||r.id,key:String(r.activityKey||'')}));}
    catch{return [];}
  }
  function titlePart(key){const i=String(key||'').indexOf('::');return i>=0?String(key).slice(i+2):String(key||'');}
  function phasePart(key){const i=String(key||'').indexOf('::');return i>=0?String(key).slice(0,i):'';}

  function compare(){
    const ana=analysisRows(),dom=domainRows(),keys=planKeys();
    const comparisons=keys.map(k=>{
      const exact=dom.find(d=>d.key===k.key)||null;
      const sameTitle=dom.filter(d=>norm(d.title)===norm(titlePart(k.key)));
      const samePhase=dom.filter(d=>d.phase===phasePart(k.key));
      const anaExact=ana.find(a=>a.key===k.key)||null;
      let verdict='OK',level='ok',hint='';
      if(!anaExact){verdict='CHIAVE NON PRESENTE IN ANALISI';level='bad';}
      else if(!exact){
        verdict='ANALISI OK · DOMAIN NON COINCIDE';level='bad';
        if(sameTitle.length)hint='Stesso titolo nel Domain ma fase diversa: '+sameTitle.map(x=>x.phase).join(', ');
        else if(samePhase.length)hint='Stessa fase nel Domain ma titolo diverso: '+samePhase.map(x=>x.title).join(' | ');
        else hint='Nessuna corrispondenza per fase o titolo nel Domain.';
      }else if(exact.id!==anaExact.id){verdict='CHIAVE OK · ID DIVERSO';level='warn';hint=`Analisi ID ${anaExact.id||'—'} / Domain ID ${exact.id||'—'}`;}
      return {event:k.event,key:k.key,analysis:anaExact,domain:exact,sameTitle,samePhase,verdict,level,hint};
    });
    return {ana,dom,keys,comparisons};
  }

  function styles(){
    if(document.getElementById('domainInventoryV94Styles'))return;
    const s=document.createElement('style');s.id='domainInventoryV94Styles';s.textContent=`
      #domainInventoryV94{position:fixed;left:8px;right:8px;bottom:calc(46vh + 16px);z-index:99997;background:#0d1519;color:#e6eef1;border:1px solid #425b66;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.24);font:9px/1.3 Arial,sans-serif;max-height:34vh;display:flex;flex-direction:column}
      #domainInventoryV94.collapsed{max-height:none}#domainInventoryV94.collapsed .di94-body{display:none}.di94-head{display:flex;align-items:center;gap:7px;padding:6px 8px;background:#152128;border-radius:8px 8px 0 0}.di94-head strong{font-size:10px}.di94-head span{color:#94a9b2;font-size:7.5px}.di94-head .spacer{flex:1}.di94-btn{height:23px;padding:0 7px;border:1px solid #48616b;border-radius:5px;background:#203038;color:#e8eff2;font-size:7.5px;font-weight:700}.di94-body{overflow:auto;padding:6px}.di94-summary{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px}.di94-pill{padding:3px 5px;border:1px solid #31464f;border-radius:4px;background:#142126}.di94-section{margin:6px 0 3px;color:#93a9b2;font-size:7px;font-weight:800;text-transform:uppercase}.di94-table{display:grid;grid-template-columns:minmax(150px,1.2fr) minmax(185px,1.45fr) minmax(185px,1.45fr) minmax(140px,1fr);border:1px solid #30454e;border-radius:5px;overflow:hidden}.di94-cell{padding:4px 5px;border-right:1px solid #2a3d45;border-bottom:1px solid #2a3d45;overflow-wrap:anywhere}.di94-cell:nth-child(4n){border-right:0}.di94-h{background:#1c2a31;color:#8fa4ad;font-size:6.8px;font-weight:800;text-transform:uppercase}.di94-ok{background:#11231b}.di94-warn{background:#2a2417}.di94-bad{background:#35191b}.di94-key{font-family:monospace;color:#b7d3de;font-size:7.2px}.di94-good{color:#8bd0a2;font-weight:800}.di94-warning{color:#e1bd70;font-weight:800}.di94-error{color:#ff969d;font-weight:800}.di94-list{display:grid;gap:3px}.di94-item{display:grid;grid-template-columns:150px 95px 1fr 100px;gap:5px;padding:4px 5px;border:1px solid #2c4149;border-radius:4px;background:#132026}.di94-item code{color:#a8c8d4;font-size:7px;overflow-wrap:anywhere}.di94-item .status{font-weight:800}.di94-item.missing{background:#35191b}
      @media(max-width:900px){#domainInventoryV94{left:4px;right:4px;bottom:55vh;max-height:38vh}.di94-table{display:block}.di94-h{display:none}.di94-cell{border-right:0!important}.di94-cell:nth-child(4n){border-bottom:2px solid #4a6470}.di94-item{grid-template-columns:1fr}.di94-item code{font-size:6.8px}}
    `;document.head.appendChild(s);
  }

  function render(){
    if(!body)return;
    const c=compare();
    const bad=c.comparisons.filter(x=>x.level==='bad').length;
    const comp=c.comparisons.map(x=>{
      const cls=x.level==='bad'?'di94-bad':x.level==='warn'?'di94-warn':'di94-ok';
      const stat=x.level==='bad'?'di94-error':x.level==='warn'?'di94-warning':'di94-good';
      const a=x.analysis?`${x.analysis.phase} · ${x.analysis.title} · ${x.analysis.id||'ID vuoto'}`:'NON TROVATA';
      const d=x.domain?`${x.domain.phase} · ${x.domain.title} · ${x.domain.status} · ${x.domain.id}`:'NON TROVATA';
      return `<div class="di94-cell ${cls}">${esc(x.event)}</div><div class="di94-cell di94-key ${cls}">${esc(x.key)}</div><div class="di94-cell ${cls}">Analisi: ${esc(a)}<br>Domain: ${esc(d)}</div><div class="di94-cell ${cls}"><span class="${stat}">${esc(x.verdict)}</span>${x.hint?`<br>${esc(x.hint)}`:''}</div>`;
    }).join('');
    const domList=c.dom.map(d=>`<div class="di94-item"><code>${esc(d.id||'ID vuoto')}</code><strong>${esc(d.phase||'fase vuota')}</strong><span>${esc(d.title)}</span><span class="status">${esc(d.status)}${d.analysisPresent?'':' · ORFANA'}</span><code style="grid-column:1/-1">${esc(d.key)}</code></div>`).join('');
    const anaList=c.ana.map(a=>`<div class="di94-item"><code>${esc(a.id||'ID vuoto')}</code><strong>${esc(a.phase||'fase vuota')}</strong><span>${esc(a.title)}</span><span></span><code style="grid-column:1/-1">${esc(a.key)}</code></div>`).join('');
    body.innerHTML=`<div class="di94-summary"><span class="di94-pill">Analisi <strong>${c.ana.length}</strong></span><span class="di94-pill">Domain <strong>${c.dom.length}</strong></span><span class="di94-pill">Chiavi Piano <strong>${c.keys.length}</strong></span><span class="di94-pill">Mismatch <strong class="${bad?'di94-error':'di94-good'}">${bad}</strong></span></div><div class="di94-section">Confronto chiavi Piano</div><div class="di94-table"><div class="di94-cell di94-h">Evento</div><div class="di94-cell di94-h">Chiave Piano</div><div class="di94-cell di94-h">Analisi vs Domain</div><div class="di94-cell di94-h">Verdetto</div>${comp}</div><div class="di94-section">Inventario Activity Domain</div><div class="di94-list">${domList||'<div class="di94-item">Domain vuoto</div>'}</div><div class="di94-section">Inventario Analisi Offerta</div><div class="di94-list">${anaList||'<div class="di94-item">Analisi vuota</div>'}</div>`;
  }

  function install(){
    if(panel)return;styles();panel=document.createElement('section');panel.id='domainInventoryV94';panel.innerHTML='<div class="di94-head"><strong>Diagnostica identità attività v94</strong><span>Analisi ↔ Activity Domain ↔ Piano</span><div class="spacer"></div><button class="di94-btn" data-copy>Copia inventario</button><button class="di94-btn" data-toggle>Nascondi</button></div><div class="di94-body"></div>';document.body.appendChild(panel);body=panel.querySelector('.di94-body');
    panel.querySelector('[data-toggle]').addEventListener('click',e=>{collapsed=!collapsed;panel.classList.toggle('collapsed',collapsed);e.currentTarget.textContent=collapsed?'Mostra':'Nascondi';});
    panel.querySelector('[data-copy]').addEventListener('click',async e=>{const c=compare();try{await navigator.clipboard.writeText(JSON.stringify(c,null,2));e.currentTarget.textContent='Copiato';setTimeout(()=>e.currentTarget.textContent='Copia inventario',900);}catch{e.currentTarget.textContent='Errore';}});
    render();
  }

  const timer=setInterval(()=>{if(!document.hidden)render();},300);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
  window.DABSTER_DOMAIN_INVENTORY_V94_API={analysisRows,domainRows,planKeys,compare,render};
})();