export const PHASES=[
  {id:'preliminare',label:'Progetto preliminare e Pratiche',category:'projects'},
  {id:'definitivo',label:'Progetto PFTE',category:'projects'},
  {id:'valutazione_vvf',label:'Valutazione Progetto Antincendio',category:'consulting'},
  {id:'esecutivo',label:'Progetto Esecutivo',category:'projects'},
  {id:'dl',label:'Direzione Lavori',category:'direction'},
  {id:'scia_vvf',label:'SCIA Antincendio',category:'consulting'},
  {id:'consulenze',label:'Consulenze varie',category:'consulting'}
];

export const OFFER_STATUSES=['In lavorazione','Completata','Inviata','Confermata'];

export function normalize(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
}

export function numberFromItalian(value){
  return Number(String(value??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0;
}

export function money(value){
  return Number(value||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
}

export function cents(value){return Math.round(Number(value||0)*100)/100;}
export function roundUp100(value){return value>0?Math.ceil((Number(value)-1e-9)/100)*100:0;}

export function phaseDefinition(id){return PHASES.find(p=>p.id===id)||null;}
export function phaseCategory(id){return phaseDefinition(id)?.category||'projects';}

export function confirmationCategoryLabel(category){
  return category==='consulting'?'Consulenza':category==='direction'?'Direzione lavori':'Progetti';
}
