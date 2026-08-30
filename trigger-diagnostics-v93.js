/* v93 - PASSIVE diagnostics only. Never mutates Kanban, Activity Domain, Plan or Trigger. */
(function(){
  if(window.DABSTER_TRIGGER_DIAGNOSTICS_V93)return;
  window.DABSTER_TRIGGER_DIAGNOSTICS_V93=true;

  const logs=[];
  let panel=null,body=null,lastStatusEvent=null,lastDomainEvent=null,lastTriggerEvent=null,collapsed=false;
  const maxLogs=28;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
  const now=()=>new Date().toLocaleTimeString('it-IT',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit',fractionalSecondDigits:3});
  const domain=()=>window.DABSTER_ACTIVITY_DOMAIN_V84||window.DABSTER_ACTIVITY_DOMAIN_V82||window.DABSTER_ACTIVITY_DOMAIN||null;
  const plan=()=>window.DABSTER_BILLING_PLAN_V47||null;
  const trigger=()=>window.DABSTER_BILLING_TRIGGER_V85||window.DABSTER_BILLING_TRIGGER_V58||null;

  function safe(fn,fallback=null){try{const v=fn();return v===undefined?fallback:v;}catch{return fallback;}}
  function addLog(type,text,data){
    logs.unshift({time:now(),type,text,data:data||null});
    if(logs.length>maxLogs)logs.length=maxLogs;
    render();
  }
  function eventMap(){
    const events=safe(()=>trigger()?.getSnapshot?.()?.events,[])||[];
    return new Map(events.map(x=>[String(x.id),x]));
  }
  function diagnosticRows(){
    const rows=safe(()=>plan()?.getSnapshot?.()?.rows,[])||[],events=eventMap(),d=domain();
    return rows.map(row=>{
      const evt=events.get(String(row.id))||null;
      const resolved=row.trigger==='activity_closed'?safe(()=>d?.resolveKey?.(row.activityKey),null):null;
      let verdict='OK',level='ok';
      if(row.trigger==='activity_closed'){
        if(!row.activityKey){verdict='activityKey vuota';level='bad';}
        else if(!resolved){verdict='CHIAVE NON RISOLTA';level='bad';}
        else if(resolved.status==='chiusa'&&!evt?.matured){verdict='DOMINIO CHIUSO, TRIGGER NON MATURATO';level='bad';}
        else if(resolved.status!=='chiusa'&&evt?.matured){verdict='TRIGGER MATURO CON ATTIVITÀ NON CHIUSA';level='bad';}
        else if(resolved.status==='chiusa'&&evt?.matured){verdict='CHIUSA → MATURATO';level='ok';}
        else{verdict=`attività ${resolved.status||'?'}`;level='wait';}
      }else if(row.trigger==='confirmation'){
        verdict=evt?.matured?'CONFERMA → MATURATO':'attende conferma';level=evt?.matured?'ok':'wait';
      }
      return {row,evt,resolved,verdict,level};
    });
  }
  function snapshotForLog(label){
    const rows=diagnosticRows().filter(x=>x.row.trigger==='activity_closed').map(x=>({
      event:x.row.eventLabel,id:x.row.id,key:x.row.activityKey,
      activity:x.resolved?{id:x.resolved.id,phase:x.resolved.phaseType,title:x.resolved.title,status:x.resolved.status}:null,
      matured:!!x.evt?.matured,status:x.evt?.status||'',billable:Number(x.evt?.billable||0)
    }));
    addLog('snap',label,rows);
  }
  function scheduleObservation(label){
    snapshotForLog(`${label} · immediato`);
    setTimeout(()=>snapshotForLog(`${label} · +20 ms`),20);
    setTimeout(()=>snapshotForLog(`${label} · +100 ms`),100);
    setTimeout(()=>snapshotForLog(`${label} · +350 ms`),350);
  }

  function styles(){
    if(document.getElementById('triggerDiagV93Styles'))return;
    const s=document.createElement('style');s.id='triggerDiagV93Styles';s.textContent=`
      #triggerDiagV93{position:fixed;left:8px;right:8px;bottom:8px;z-index:99998;background:#10191e;color:#e9f0f3;border:1px solid #3b5966;border-radius:9px;box-shadow:0 10px 30px rgba(0,0,0,.28);font:10px/1.3 Arial,sans-serif;max-height:46vh;display:flex;flex-direction:column}
      #triggerDiagV93.collapsed{max-height:none}#triggerDiagV93.collapsed .td93-body{display:none}
      .td93-head{display:flex;align-items:center;gap:8px;padding:7px 9px;background:#17242b;border-radius:9px 9px 0 0}.td93-head strong{font-size:10.5px}.td93-head span{color:#9fb1ba;font-size:8px}.td93-head .spacer{flex:1}.td93-btn{height:25px;padding:0 8px;border:1px solid #48636e;border-radius:5px;background:#20333c;color:#e7eef1;font-size:8px;font-weight:700;cursor:pointer}
      .td93-body{overflow:auto;padding:7px}.td93-summary{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:7px}.td93-pill{padding:4px 6px;border:1px solid #334c57;border-radius:5px;background:#162329;color:#b9c9d0;font-size:8px}.td93-pill strong{color:#fff}
      .td93-table{display:grid;grid-template-columns:minmax(145px,1.1fr) minmax(190px,1.55fr) minmax(185px,1.45fr) 72px 78px minmax(145px,1.1fr);border:1px solid #324b56;border-radius:6px;overflow:hidden}.td93-cell{min-width:0;padding:5px 6px;border-right:1px solid #2e444e;border-bottom:1px solid #2e444e;overflow-wrap:anywhere}.td93-cell:nth-child(6n){border-right:0}.td93-headcell{background:#203039;color:#9fb1ba;font-size:7px;font-weight:800;text-transform:uppercase}.td93-row-ok{background:#13251d}.td93-row-wait{background:#262217}.td93-row-bad{background:#35191b}.td93-key{font-family:monospace;color:#b9d6e1;font-size:7.6px}.td93-good{color:#8fd0a6;font-weight:800}.td93-wait{color:#e3bf70;font-weight:800}.td93-bad{color:#ff969d;font-weight:800}
      .td93-logtitle{margin:8px 0 4px;font-size:8px;font-weight:800;color:#9fb1ba;text-transform:uppercase}.td93-log{display:grid;gap:3px}.td93-logitem{padding:4px 6px;border:1px solid #2e444e;border-radius:5px;background:#142127}.td93-logitem .time{color:#7fa3b2;font-family:monospace}.td93-logitem .type{color:#e0b86b;font-weight:800}.td93-logitem pre{margin:3px 0 0;white-space:pre-wrap;word-break:break-word;color:#b7c7ce;font:7.5px/1.25 monospace;max-height:72px;overflow:auto}
      @media(max-width:900px){#triggerDiagV93{left:4px;right:4px;bottom:4px;max-height:54vh}.td93-table{display:block}.td93-headcell{display:none}.td93-cell{border-right:0!important}.td93-cell:nth-child(6n){border-bottom:2px solid #4a6470}.td93-cell:before{display:inline-block;width:82px;color:#829da8;font-size:6.8px;font-weight:800}.td93-cell:nth-child(6n+1):before{content:'EVENTO '}.td93-cell:nth-child(6n+2):before{content:'ACTIVITY KEY '}.td93-cell:nth-child(6n+3):before{content:'DOMINIO '}.td93-cell:nth-child(6n+4):before{content:'MATURATO '}.td93-cell:nth-child(6n+5):before{content:'FATTURABILE '}.td93-cell:nth-child(6n):before{content:'DIAGNOSI '}}
    `;document.head.appendChild(s);
  }
  function install(){
    if(panel)return;
    styles();panel=document.createElement('section');panel.id='triggerDiagV93';panel.innerHTML=`<div class="td93-head"><strong>Diagnostica Trigger v93 · sola lettura</strong><span>Kanban → Activity Domain → Piano → Trigger</span><div class="spacer"></div><button class="td93-btn" data-copy>Copia JSON</button><button class="td93-btn" data-clear>Pulisci log</button><button class="td93-btn" data-toggle>Nascondi</button></div><div class="td93-body"></div>`;document.body.appendChild(panel);body=panel.querySelector('.td93-body');
    panel.querySelector('[data-toggle]').addEventListener('click',e=>{collapsed=!collapsed;panel.classList.toggle('collapsed',collapsed);e.currentTarget.textContent=collapsed?'Mostra':'Nascondi';});
    panel.querySelector('[data-clear]').addEventListener('click',()=>{logs.length=0;render();});
    panel.querySelector('[data-copy]').addEventListener('click',async()=>{const data={time:new Date().toISOString(),statusEvent:lastStatusEvent,domainEvent:lastDomainEvent,triggerEvent:lastTriggerEvent,rows:diagnosticRows().map(x=>({event:x.row.eventLabel,id:x.row.id,activityKey:x.row.activityKey,resolved:x.resolved,matured:!!x.evt?.matured,triggerStatus:x.evt?.status,billable:x.evt?.billable,verdict:x.verdict})),logs};try{await navigator.clipboard.writeText(JSON.stringify(data,null,2));e.currentTarget.textContent='Copiato';setTimeout(()=>e.currentTarget.textContent='Copia JSON',900);}catch{e.currentTarget.textContent='Errore copia';}});
    render();
  }
  function render(){
    if(!body)return;
    const d=domain(),p=plan(),t=trigger(),rows=diagnosticRows();
    const activityRows=rows.filter(x=>x.row.trigger==='activity_closed'),problems=rows.filter(x=>x.level==='bad').length;
    const totalBillable=safe(()=>t?.getSnapshot?.()?.billable,0)||0;
    const cells=rows.map(x=>{
      const r=x.row,e=x.evt,a=x.resolved,cls=x.level==='bad'?'td93-row-bad':x.level==='wait'?'td93-row-wait':'td93-row-ok',stateCls=x.level==='bad'?'td93-bad':x.level==='wait'?'td93-wait':'td93-good';
      const domainText=r.trigger==='confirmation'?'—':a?`${a.phaseType} · ${a.title} · ${a.status} · ${a.id}`:'NON RISOLTA';
      return `<div class="td93-cell ${cls}">${esc(r.eventLabel||r.id)}</div><div class="td93-cell td93-key ${cls}">${esc(r.activityKey||'(conferma offerta)')}</div><div class="td93-cell ${cls}">${esc(domainText)}</div><div class="td93-cell ${cls}"><strong class="${e?.matured?'td93-good':'td93-wait'}">${e?.matured?'SÌ':'NO'}</strong><br>${esc(e?.status||'—')}</div><div class="td93-cell ${cls}">${money(e?.billable||0)} €</div><div class="td93-cell ${cls}"><span class="${stateCls}">${esc(x.verdict)}</span></div>`;
    }).join('');
    body.innerHTML=`<div class="td93-summary"><span class="td93-pill">Domain <strong>${d?'v'+(d.version||'?'):'NON PRONTO'}</strong></span><span class="td93-pill">Plan <strong>${p?'OK':'NON PRONTO'}</strong></span><span class="td93-pill">Trigger <strong>${t?'OK':'NON PRONTO'}</strong></span><span class="td93-pill">Eventi attività <strong>${activityRows.length}</strong></span><span class="td93-pill">Fatturabile <strong>${money(totalBillable)} €</strong></span><span class="td93-pill">Anomalie <strong class="${problems?'td93-bad':'td93-good'}">${problems}</strong></span></div><div class="td93-table"><div class="td93-cell td93-headcell">Evento Piano</div><div class="td93-cell td93-headcell">activityKey salvata</div><div class="td93-cell td93-headcell">Attività risolta nel Domain</div><div class="td93-cell td93-headcell">Trigger</div><div class="td93-cell td93-headcell">Fatturabile</div><div class="td93-cell td93-headcell">Diagnosi</div>${cells||'<div class="td93-cell" style="grid-column:1/-1">Carica prima il caso Test v92.</div>'}</div><div class="td93-logtitle">Timeline ultimi eventi</div><div class="td93-log">${logs.map(l=>`<div class="td93-logitem"><span class="time">${esc(l.time)}</span> <span class="type">${esc(l.type)}</span> ${esc(l.text)}${l.data?`<pre>${esc(JSON.stringify(l.data,null,2))}</pre>`:''}</div>`).join('')||'<div class="td93-logitem">Nessun cambio stato registrato.</div>'}</div>`;
  }

  window.addEventListener('dabster-activity-status-change',e=>{
    const a=e.detail?.activity||{};lastStatusEvent={time:now(),id:e.detail?.activityId||a.id,title:a.title,phase:a.phaseType,previous:e.detail?.previousStatus,status:e.detail?.status,source:e.detail?.source};
    addLog('STATUS',`${a.phaseType||'?'} · ${a.title||a.id||'?'}: ${e.detail?.previousStatus||'?'} → ${e.detail?.status||'?'}`,lastStatusEvent);
    scheduleObservation(`dopo STATUS ${a.title||a.id||''}`);
  });
  window.addEventListener('dabster-activity-domain-change',e=>{lastDomainEvent={time:now(),reason:e.detail?.reason,count:e.detail?.activities?.length};addLog('DOMAIN',`change · ${e.detail?.reason||'?'}`,lastDomainEvent);});
  window.addEventListener('dabster-billing-trigger-change',e=>{lastTriggerEvent={time:now(),billable:e.detail?.summary?.billable,count:e.detail?.summary?.count};addLog('TRIGGER','billing-trigger-change',lastTriggerEvent);});
  window.addEventListener('dabster-billing-plan-ready',()=>addLog('PLAN','billing-plan-ready'));
  window.addEventListener('dabster-offer-confirmed',()=>addLog('OFFER','offer-confirmed'));

  const timer=setInterval(()=>{if(!document.hidden)render();},250);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
  window.DABSTER_TRIGGER_DIAGNOSTICS_V93_API={rows:diagnosticRows,logs:()=>logs.slice(),render};
})();