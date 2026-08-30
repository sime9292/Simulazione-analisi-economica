/* v64 - Clear only static HTML offer values before application modules read them. */
(function(){
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const field=label=>[...document.querySelectorAll('#tab-dati label.field')].find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))||null;
  const ctrl=label=>field(label)?.querySelector('input,select,textarea')||null;
  const set=(el,value)=>{if(!el)return;el.value=String(value);};

  const comm=ctrl('Commessa');
  if(comm instanceof HTMLSelectElement){
    if(![...comm.options].some(o=>o.value===''))comm.insertBefore(new Option('Seleziona un elemento',''),comm.firstChild);
    comm.value='';
  }
  set(ctrl('Titolo'),'');
  set(ctrl('Codice'),'');
  set(ctrl('Data offerta'),'');
  const status=ctrl('Stato');
  if(status instanceof HTMLSelectElement){
    let opt=[...status.options].find(o=>norm(o.value||o.textContent)==='in lavorazione');
    if(!opt){opt=new Option('In lavorazione','In lavorazione');status.add(opt);}
    status.value=opt.value;
  }
  const amounts=[...document.querySelectorAll('#tab-dati .accordion.amounts label.field')];
  ['Importo stimato','Importo opere','Consulenza','Progetti','Direzione lavori'].forEach(label=>{
    const el=amounts.find(x=>norm(x.querySelector(':scope > span')?.textContent).startsWith(norm(label)))?.querySelector('input');
    if(el)el.value='0,00';
  });
  const total=document.getElementById('totaleOfferta');if(total)total.value='0,00';
  document.querySelectorAll('#tab-dati .tag-input').forEach(x=>x.innerHTML='');
  document.querySelectorAll('#tab-dati textarea').forEach(x=>x.value='');
})();