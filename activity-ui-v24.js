/* Activity picker - native select backed by the full Dabster activity registry */
(function(){
  const RAW_ACTIVITIES=`
ATT001|L10 Analisi Energetica|Pratiche|IM
ATT002|Progetto 37/08 IM|Pratiche|IM
ATT003|Pratica INAIL|Pratiche|IM
ATT004|Detrazione Fiscale/Conto Termico|Pratiche|IM
ATT005|Attestato Prestazione Energetica|Pratiche|IM
ATT006|Rischio Fulminazione 81-10|Pratiche|IE
ATT007|Relazione Illuminotecnica|Pratiche|IE
ATT008|Progetto 37/08 IE|Pratiche|IE
ATT009|Acustica Requisiti Passivi|Pratiche|AC
ATT010|Acustica Clima Acustico|Pratiche|AC
ATT011|Acustica Impatto Acustico|Pratiche|AC
ATT012|Elaborati Grafici Esame Progetto VVF|Pratiche|VVF
ATT013|Relazione Esame Progetto VVF|Pratiche|VVF
ATT014|Integrazione VVF|Pratiche|VVF
ATT015|Progetto Preliminare IE|Progetto Preliminare|IE
ATT016|Progetto preliminare IM|Progetto Preliminare|IM
ATT017|Elaborati grafici IM|Progetto Definitivo|IM
ATT018|Elaborati grafici IE|Progetto Definitivo|IE
ATT019|Schemi IM|Progetto Definitivo|IM
ATT020|Schemi IE|Progetto Definitivo|IE
ATT021|Quadri elettrici|Progetto Definitivo|IE
ATT022|Computo Metrico IM|Progetto Definitivo|IM
ATT023|Computo Metrico IE|Progetto Definitivo|IE
ATT024|Relazioni IM|Progetto Definitivo|IM
ATT025|Relazioni IE|Progetto Definitivo|IE
ATT026|Elaborati grafici IM|Progetto Esecutivo|IM
ATT027|Elaborati grafici IE|Progetto Esecutivo|IE
ATT028|Schemi IM|Progetto Esecutivo|IM
ATT029|Schemi IE|Progetto Esecutivo|IE
ATT030|Quadri elettrici|Progetto Esecutivo|IE
ATT031|Computo Metrico IM|Progetto Esecutivo|IM
ATT032|Computo Metrico IE|Progetto Esecutivo|IE
ATT033|Relazioni IM|Progetto Esecutivo|IM
ATT034|Relazioni IE|Progetto Esecutivo|IE
ATT035|Piano manutenzione IM|Progetto Esecutivo|IM
ATT036|Piano manutenzione IE|Progetto Esecutivo|IE
ATT037|Report Cantiere IE|Direzione Lavori|IE
ATT038|Report Cantiere IM|Direzione Lavori|IM
ATT039|Relazione Collaudo IE|Direzione Lavori|IE
ATT040|Relazione Collaudo IM|Direzione Lavori|IM
ATT041|SCIA VVF|Direzione Lavori|VVF
ATT042|Relazione Collaudo VVF|Direzione Lavori|VVF
ATT043|Collaudo Acustico|Direzione Lavori|AC
ATT044|Attestato Prestazione Energetica|Direzione Lavori|IM
ATT045|Verifica Contabilità IE|Direzione Lavori|IE
ATT046|Verifica Contabilità IM|Direzione Lavori|IM
ATT047|Validazione IM|Consulenze Varie|IM
ATT048|Validazione IE|Consulenze Varie|IE
ATT049|Due Diligence IM|Consulenze Varie|IM
ATT050|Due Diligence IE|Consulenze Varie|IE
ATT051|As Built IM|Consulenze Varie|IM
ATT052|As Built IE|Consulenze Varie|IE
ATT053|Dichiarazione Rispondenza|Consulenze Varie|IE
ATT054|Rinnovo CPI|Consulenze Varie|VVF
ATT055|Audit Energetico|Consulenze Varie|IM
ATT056|Supporto Gara IE|Consulenze Varie|IE
ATT057|Supporto Gara IM|Consulenze Varie|IM
ATT058|Adeguamento DPR 462/01|Consulenze Varie|IE
ATT060|Direzione Lavori Generica IE|Direzione Lavori|IE
ATT061|Direzione Lavori Generica IM|Direzione Lavori|IM
ATT062|Layout Architettonico|Progetto Preliminare|IM
ATT063|AGGIORNAMENTO DISEGNI|Direzione Lavori|VVF
ATT064|Diagnosi Energetica|Pratiche|IM
ATT066|Valutazione Preliminare antincendio|Pratiche|VVF
ATT067|Progetto IM|Progetto Definitivo|IM
ATT068|Progetto IE|Progetto Definitivo|IE
ATT069|marketing|Consulenze Varie|ED
ATT070|pratica ENEA|Consulenze Varie|IM
ATT071|Fattibilità energetica|Pratiche|IM
ATT072|documenti Gara IM|Consulenze Varie|IM
ATT073|documenti Gara IE|Consulenze Varie|IE
ATT074|ASSISTENZA PM|Consulenze Varie|IM
ATT075|Verifica Progetto|Consulenze Varie|IM
ATT076|As Built OE|Consulenze Varie|ED
ATT077|redazione APE|Consulenze Varie|IM
ATT078|Sopralluogo Verifica Prevenzione Incendi|Direzione Lavori|VVF
ATT079|Consulenza Generica VVF|Consulenze Varie|VVF
ATT080|ANALISI PRELIMINARE PREVENZIONE INCENDI|Progetto Preliminare|VVF
ATT081|DOCENZA REVIT|Consulenze Varie|ED
ATT082|PNRR|Pratiche|IM
ATT083|CORRISPONDENZA|Progetto Esecutivo|IM
ATT084|VdR Legionella|Pratiche|IM
ATT085|Assistenza tecnica IM|Consulenze Varie|IM
ATT086|Assistenza tecnica IE|Consulenze Varie|IE
ATT087|Assistenza tecnica OE|Consulenze Varie|ED
ATT088|SUPPORTO BIM|Progetto Esecutivo|IM
ATT089|Sopralluogo IE|Consulenze Varie|IE
ATT090|Pratica Ambientale|Pratiche|IM
ATT091|Progetto esecutivo|Progetto Esecutivo|IE
ATT092|Progetto esecutivo|Progetto Esecutivo|IM
ATT093|Elaborati grafici|Progetto Definitivo|ED
ATT094|Computo Metrico|Progetto Definitivo|ED
ATT095|Analisi energetica|Progetto Definitivo|IM
ATT096|AS BUILT IM|Consulenze Varie|IM
ATT097|AS BUILT IE|Direzione Lavori|IE
ATT098|AS BUILT IM|Direzione Lavori|IM
ATT099|AS BUILT OPERE EDILI|Direzione Lavori|ED
ATT100|Classificazione aree con pericolo espolosione AtEx|Consulenze Varie|IE
ATT101|Progetto illuminazione pubblica|Pratiche|IE
ATT102|ELABORATI GRAFICI VVF|Progetto Esecutivo|VVF
ATT103|ELABORATI VVF|Progetto Definitivo|VVF
ATT104|DIREZIONE LAVORI GENERICA|Direzione Lavori|ED
ATT105|Progetto Esecutivo Opere Edili|Progetto Esecutivo|ED
ATT106|CSP - Coordinamento sicurezza in fase progettuale|Direzione Lavori|ED
ATT107|CSE - Coordinatore sicurezza in fase esecutiva|Direzione Lavori|ED
ATT108|Pratica ATEX|Pratiche|IE
ATT109|Responsabile Impianti|Direzione Lavori|IE
ATT110|Due Diligence OE|Consulenze Varie|ED
ATT111|Ore CP o RS|Pratiche|GV
ATT112|Ore CP o RS|Progetto Preliminare|GV
ATT113|Ore CP o RS|Progetto Definitivo|GV
ATT114|Ore CP o RS|Progetto Esecutivo|GV
ATT115|Ore CP o RS|Direzione Lavori|GV
ATT116|Ore CP o RS|Consulenze Varie|GV
ATT117|FSE VVF|Pratiche|VVF
ATT118|Calcolo idraulico rete SPK IM|Progetto Esecutivo|IM
ATT119|Relazione di impatto riflessivo ENAC|Consulenze Varie|IE
ATT178|PUA|Pratiche|IM
ATT179|PUA|Pratiche|IE
ATT281|Calcoli Illuminotecnici|Progetto Esecutivo|IE
ATT319|Elaborati grafici VVF|Progetto Preliminare|VVF
ATT417|Pratica antiabbagliamento da fotovoltaico|Consulenze Varie|IE
ATT475|RELAZIONE FABBITILITA' COLONNINE RICARICA VEICOLI|Consulenze Varie|IE
ATT478|PRATICA STMG TERNA|Pratiche|IE
ATT485|Attività di supporto e consulenza al progetto|Progetto Esecutivo|VVF
ATT486|Integrazioni SCIA VVF|Direzione Lavori|VVF
ATT494|Direzione lavori antincendio|Direzione Lavori|VVF
ATT498|Relazione prevenzione incendi|Progetto Definitivo|VVF
ATT503|PROGETTO VVF|Progetto Esecutivo|VVF
ATT619|Autorizzazione paesaggistica|Pratiche|ED
ATT620|Pratica edilizia CILA|Pratiche|ED
ATT621|Pratica edilizia SCIA|Pratiche|ED
ATT622|Pratica edilizia PDC|Pratiche|ED
ATT625|Accesso agli atti|Pratiche|ED
ATT653|Modellazione BIM|Progetto Definitivo|IM
ATT654|Modellazione BIM|Progetto Definitivo|IE
ATT655|Modellazione BIM|Progetto Esecutivo|IM
ATT656|Modellazione BIM|Progetto Esecutivo|IE
ATT710|Commissioning IM|Direzione Lavori|IM
ATT711|Commissioning IE|Direzione Lavori|IE
ATT712|Commissioning VVF|Direzione Lavori|VVF
`.trim();

  const ACTIVITIES=RAW_ACTIVITIES.split('\n').map(line=>{
    const [code,name,category,discipline]=line.split('|');
    return {code,name,category,discipline};
  });
  const CATEGORY_ORDER=['Pratiche','Progetto Preliminare','Progetto Definitivo','Progetto Esecutivo','Direzione Lavori','Consulenze Varie'];
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function optionsMarkup(current){
    const knownNames=new Set(ACTIVITIES.map(x=>x.name));
    const custom=current && !knownNames.has(current)
      ? `<optgroup label="Attività già inserita"><option value="${esc(current)}">${esc(current)}</option></optgroup>`
      : '';
    const groups=CATEGORY_ORDER.map(category=>{
      const items=ACTIVITIES.filter(x=>x.category===category);
      return `<optgroup label="${esc(category)}">${items.map(x=>`<option value="${esc(x.name)}" data-code="${esc(x.code)}" data-discipline="${esc(x.discipline)}" data-category="${esc(x.category)}">${esc(x.code)} · ${esc(x.name)} · ${esc(x.discipline)}</option>`).join('')}</optgroup>`;
    }).join('');
    return `<option value="">Seleziona attività…</option>${custom}${groups}`;
  }

  function syncMetadata(select){
    const opt=select.selectedOptions?.[0];
    select.dataset.activityCode=opt?.dataset?.code||'';
    select.dataset.activityDiscipline=opt?.dataset?.discipline||'';
    select.dataset.activityCategory=opt?.dataset?.category||'';
    select.title=opt?.dataset?.code ? `${opt.dataset.code} · ${opt.dataset.category} · ${opt.dataset.discipline}` : '';
  }

  function prepare(activity){
    if(!activity || activity.dataset.nativeActivitySelect==='1')return;
    const old=activity.querySelector('.activity-name');
    if(!old)return;

    const current=String(old.value||'').trim();
    const select=document.createElement('select');
    select.className=old.className || 'activity-name';
    select.classList.add('activity-name','activity-native-select');
    select.setAttribute('aria-label','Attività');
    select.innerHTML=optionsMarkup(current);
    select.value=current;
    syncMetadata(select);

    old.replaceWith(select);

    const wrap=select.closest('.activity-autocomplete-wrap') || select.parentElement;
    wrap?.querySelectorAll('.activity-suggest-menu,.activity-dropdown-toggle').forEach(el=>el.remove());
    wrap?.classList.remove('activity-autocomplete-wrap');

    select.addEventListener('change',()=>{
      syncMetadata(select);
      select.dispatchEvent(new Event('input',{bubbles:true}));
    });

    activity.dataset.nativeActivitySelect='1';
  }

  function install(attempt=0){
    const root=document.getElementById('phaseWorkCards');
    if(!root){if(attempt<180)setTimeout(()=>install(attempt+1),60);return;}

    root.querySelectorAll('.activity-card').forEach(prepare);
    new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(node=>{
      if(!(node instanceof HTMLElement))return;
      if(node.matches('.activity-card'))setTimeout(()=>prepare(node),25);
      node.querySelectorAll?.('.activity-card').forEach(x=>setTimeout(()=>prepare(x),25));
    }))).observe(root,{childList:true,subtree:true});

    const style=document.createElement('style');
    style.textContent=`
      #phaseWorkloadSection .activity-native-select{
        width:100%!important;min-width:0!important;height:30px!important;
        padding:0 30px 0 8px!important;border:1px solid #d4dde1!important;
        border-radius:6px!important;background:#fff!important;color:#394952!important;
        font-size:11.5px!important;cursor:pointer!important;
      }
      #phaseWorkloadSection .activity-native-select:focus{
        border-color:#718e99!important;box-shadow:0 0 0 2px rgba(113,142,153,.11)!important;outline:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  install();
})();
