import {cents} from './domain.js';

export function createBillingDomain(store){
  const invoiceAllocations=()=>store.getState().billing?.invoices||[];

  function billedByLine(){
    const totals=new Map();
    invoiceAllocations().forEach(invoice=>{
      (invoice.allocations||[]).forEach(a=>totals.set(a.offerLineId,cents((totals.get(a.offerLineId)||0)+Number(a.amount||0))));
    });
    return totals;
  }

  function balances(){
    const billed=billedByLine();
    return (store.getState().offerLines||[]).map(line=>({
      offerLineId:line.id,
      phase:line.phase,
      category:line.category,
      description:line.description,
      confirmedAmount:cents(line.amount),
      billedAmount:cents(billed.get(line.id)||0),
      remainingAmount:cents(line.amount-(billed.get(line.id)||0))
    }));
  }

  function validateAllocations(allocations=[]){
    const remaining=new Map(balances().map(x=>[x.offerLineId,x.remainingAmount]));
    const errors=[];
    allocations.forEach(a=>{
      const amount=cents(a.amount);
      if(!remaining.has(a.offerLineId))errors.push(`Riga offerta inesistente: ${a.offerLineId}`);
      else if(amount<=0)errors.push(`Importo non valido per ${a.offerLineId}`);
      else if(amount>remaining.get(a.offerLineId)+.01)errors.push(`Importo superiore al residuo per ${a.offerLineId}`);
      else remaining.set(a.offerLineId,cents(remaining.get(a.offerLineId)-amount));
    });
    return {valid:errors.length===0,errors};
  }

  function registerInvoice(invoice){
    if(!invoice?.id)throw new Error('La fattura deve avere un ID stabile.');
    const allocations=(invoice.allocations||[]).map(a=>({offerLineId:a.offerLineId,amount:cents(a.amount)}));
    const validation=validateAllocations(allocations);
    if(!validation.valid)throw new Error(validation.errors.join(' · '));
    const current=store.getState().billing?.invoices||[];
    if(current.some(x=>x.id===invoice.id))throw new Error(`Fattura già presente: ${invoice.id}`);
    store.patch('billing',{invoices:[...current,{...invoice,allocations}]},'billing:invoice-added');
    return balances();
  }

  function canDeleteOfferLine(id){
    return !invoiceAllocations().some(inv=>(inv.allocations||[]).some(a=>a.offerLineId===id&&Number(a.amount||0)>0));
  }

  return {balances,validateAllocations,registerInvoice,canDeleteOfferLine};
}
