import {cents} from './domain.js';

export function createBillingDomain(store){
  const invoices=()=>store.getState().billing?.invoices||[];

  function normalizedInvoiceLines(invoice){
    if(Array.isArray(invoice?.lines)){
      return invoice.lines.map((line,index)=>({
        ...line,
        id:line.id||`${invoice.id}:line:${index+1}`,
        amount:cents(line.amount),
        allocations:(line.allocations||[]).map(a=>({offerLineId:a.offerLineId,amount:cents(a.amount)}))
      }));
    }
    // Compatibilità con il vecchio prototipo che salvava le allocazioni direttamente sulla fattura.
    const legacy=(invoice?.allocations||[]).map(a=>({offerLineId:a.offerLineId,amount:cents(a.amount)}));
    if(!legacy.length)return [];
    return [{
      id:`${invoice.id}:legacy-line`,
      description:invoice.description||'Riga fattura legacy',
      amount:cents(legacy.reduce((sum,a)=>sum+a.amount,0)),
      originType:'offer',
      allocations:legacy
    }];
  }

  function billedByLine(){
    const totals=new Map();
    invoices().forEach(invoice=>{
      normalizedInvoiceLines(invoice).forEach(line=>{
        (line.allocations||[]).forEach(a=>totals.set(a.offerLineId,cents((totals.get(a.offerLineId)||0)+Number(a.amount||0))));
      });
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
      if(!a.offerLineId)errors.push('Allocazione senza Riga Offerta.');
      else if(!remaining.has(a.offerLineId))errors.push(`Riga offerta inesistente: ${a.offerLineId}`);
      else if(amount<=0)errors.push(`Importo non valido per ${a.offerLineId}`);
      else if(amount>remaining.get(a.offerLineId))errors.push(`Importo superiore al residuo per ${a.offerLineId}`);
      else remaining.set(a.offerLineId,cents(remaining.get(a.offerLineId)-amount));
    });
    return {valid:errors.length===0,errors};
  }

  function validateInvoice(invoice){
    const errors=[];
    const lines=normalizedInvoiceLines(invoice);
    if(!invoice?.id)errors.push('La fattura deve avere un ID stabile.');
    if(!lines.length)errors.push('La fattura deve contenere almeno una Riga Fattura.');

    const lineIds=new Set();
    const allAllocations=[];
    lines.forEach(line=>{
      if(lineIds.has(line.id))errors.push(`ID Riga Fattura duplicato: ${line.id}`);
      lineIds.add(line.id);
      if(line.amount<=0)errors.push(`Importo Riga Fattura non valido: ${line.description||line.id}`);

      const allocations=line.allocations||[];
      const allocated=cents(allocations.reduce((sum,a)=>sum+Number(a.amount||0),0));
      const free=line.originType==='free';
      if(free&&allocations.length){
        errors.push(`Una Riga libera non può avere allocazioni a Righe Offerta: ${line.description||line.id}`);
      }
      if(!free&&!allocations.length){
        errors.push(`Riga Fattura senza allocazioni: ${line.description||line.id}`);
      }
      if(!free&&allocated!==line.amount){
        errors.push(`Riga Fattura non quadrata: ${line.description||line.id} · importo ${line.amount} · attribuito ${allocated}`);
      }
      allAllocations.push(...allocations);
    });

    const allocationValidation=validateAllocations(allAllocations);
    errors.push(...allocationValidation.errors);
    return {valid:errors.length===0,errors,lines};
  }

  function registerInvoice(invoice){
    const validation=validateInvoice(invoice);
    if(!validation.valid)throw new Error(validation.errors.join(' · '));
    const current=invoices();
    if(current.some(x=>x.id===invoice.id))throw new Error(`Fattura già presente: ${invoice.id}`);
    if(invoice.number&&current.some(x=>String(x.number||'').trim()===String(invoice.number).trim()))throw new Error(`Numero fattura già presente: ${invoice.number}`);
    const cleanInvoice={...invoice,lines:validation.lines};
    delete cleanInvoice.allocations;
    store.patch('billing',{invoices:[...current,cleanInvoice]},'billing:invoice-added');
    return balances();
  }

  function canDeleteOfferLine(id){
    return !invoices().some(inv=>normalizedInvoiceLines(inv).some(line=>(line.allocations||[]).some(a=>a.offerLineId===id&&Number(a.amount||0)>0)));
  }

  return {balances,validateAllocations,validateInvoice,registerInvoice,normalizedInvoiceLines,canDeleteOfferLine};
}
