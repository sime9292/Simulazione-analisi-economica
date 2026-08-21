/* Activity picker - native browser select for maximum reliability */
(function(){
  const ACTIVITIES=[
    'Analisi documentale e sopralluoghi',
    'Progettazione preliminare impianti',
    'Progettazione definitiva impianti',
    'Progettazione esecutiva impianti',
    'Direzione lavori impianti',
    'Valutazione progetto antincendio',
    'Progetto prevenzione incendi',
    'Assistenza iter autorizzativo',
    'SCIA e assistenza al collaudo'
  ];

  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function prepare(activity){
    if(!activity || activity.dataset.nativeActivitySelect==='1')return;
    const old=activity.querySelector('.activity-name');
    if(!old)return;

    const current=String(old.value||'').trim();
    const select=document.createElement('select');
    select.className=old.className || 'activity-name';
    select.classList.add('activity-name','activity-native-select');
    select.setAttribute('aria-label','Attività');

    const values=[...ACTIVITIES];
    if(current && !values.includes(current))values.unshift(current);
    select.innerHTML=`<option value="">Seleziona attività…</option>${values.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}`;
    select.value=current;

    old.replaceWith(select);

    const wrap=select.closest('.activity-autocomplete-wrap') || select.parentElement;
    wrap?.querySelectorAll('.activity-suggest-menu,.activity-dropdown-toggle').forEach(el=>el.remove());
    wrap?.classList.remove('activity-autocomplete-wrap');

    select.addEventListener('change',()=>{
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
        width:100%!important;
        min-width:0!important;
        height:28px!important;
        padding:0 28px 0 8px!important;
        border:1px solid #d4dde1!important;
        border-radius:6px!important;
        background:#fff!important;
        color:#394952!important;
        font-size:11.5px!important;
        cursor:pointer!important;
      }
      #phaseWorkloadSection .activity-native-select:focus{
        border-color:#718e99!important;
        box-shadow:0 0 0 2px rgba(113,142,153,.11)!important;
        outline:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  install();
})();
