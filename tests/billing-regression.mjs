import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const sourcePath=new URL('../clean/billing-domain.js',import.meta.url);
let source=await fs.readFile(sourcePath,'utf8');
source=source.replace("import {cents} from './domain.js';","const cents=n=>Math.round(Number(n||0)*100)/100;");
const moduleUrl='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const {createBillingDomain}=await import(moduleUrl);

const offerLines=[
  {id:'26_142pe01:phase:preliminare',phase:'preliminare',category:'projects',description:'Progettazione preliminare impianti',amount:8000},
  {id:'26_142pe01:phase:esecutivo',phase:'esecutivo',category:'projects',description:'Progettazione esecutiva impianti',amount:22000},
  {id:'26_142pe01:phase:dl',phase:'dl',category:'direction',description:'Direzione lavori impianti',amount:18000},
  {id:'26_142pe01:phase:consulenze',phase:'consulenze',category:'consulting',description:'Assistenza prevenzione incendi',amount:6000}
];
const id=phase=>`26_142pe01:phase:${phase}`;

const initialInvoices=[
  {id:'ft-118',number:'FT 2026/118',date:'2026-04-15',lines:[
    {id:'ft-118-1',description:'Acconto 20% incarico professionale',amount:10800,originType:'offer',allocations:[
      {offerLineId:id('preliminare'),amount:1600},{offerLineId:id('esecutivo'),amount:4400},{offerLineId:id('dl'),amount:3600},{offerLineId:id('consulenze'),amount:1200}
    ]}
  ]},
  {id:'ft-171',number:'FT 2026/171',date:'2026-06-30',lines:[
    {id:'ft-171-1',description:'Saldo progettazione preliminare impianti',amount:6400,originType:'offer',allocations:[{offerLineId:id('preliminare'),amount:6400}]},
    {id:'ft-171-2',description:'SAL progettazione esecutiva - consegna elaborati',amount:8800,originType:'offer',allocations:[{offerLineId:id('esecutivo'),amount:8800}]}
  ]},
  {id:'ft-219',number:'FT 2026/219',date:'2026-07-31',lines:[
    {id:'ft-219-1',description:'SAL Direzione Lavori n. 1',amount:4500,originType:'offer',allocations:[{offerLineId:id('dl'),amount:4500}]}
  ]}
];

function clone(v){return JSON.parse(JSON.stringify(v));}
function makeStore(){
  const state={offerLines:clone(offerLines),billing:{invoices:clone(initialInvoices)}};
  return {
    state,
    getState(){return state;},
    patch(key,value){state[key]={...(state[key]||{}),...clone(value)};}
  };
}
function byPhase(balances,phase){return balances.find(x=>x.phase===phase);}
function total(balances,key){return Math.round(balances.reduce((s,x)=>s+Number(x[key]||0),0)*100)/100;}
function expectThrow(fn,pattern){
  let thrown=null;try{fn();}catch(err){thrown=err;}
  assert.ok(thrown,'Era atteso un errore ma l’operazione è stata accettata.');
  if(pattern)assert.match(String(thrown.message||thrown),pattern);
}

const store=makeStore();
const billing=createBillingDomain(store);

// Scenario 0: situazione reale iniziale dell'offerta demo.
let balances=billing.balances();
assert.equal(total(balances,'confirmedAmount'),54000);
assert.equal(total(balances,'billedAmount'),30500);
assert.equal(total(balances,'remainingAmount'),23500);
assert.equal(byPhase(balances,'preliminare').remainingAmount,0);
assert.equal(byPhase(balances,'esecutivo').remainingAmount,8800);
assert.equal(byPhase(balances,'dl').remainingAmount,9900);
assert.equal(byPhase(balances,'consulenze').remainingAmount,4800);

// Scenario 1: UNA sola Riga Fattura da 5.000 € evade parzialmente DUE Righe Offerta.
billing.registerInvoice({
  id:'ft-252',number:'252 /E',date:'2026-08-28',lines:[{
    id:'ft-252-1',description:'Acconto / SAL incarico professionale',amount:5000,originType:'offer',allocations:[
      {offerLineId:id('esecutivo'),amount:2500},
      {offerLineId:id('dl'),amount:2500}
    ]
  }]
});
balances=billing.balances();
assert.equal(total(balances,'billedAmount'),35500);
assert.equal(total(balances,'remainingAmount'),18500);
assert.equal(byPhase(balances,'esecutivo').remainingAmount,6300);
assert.equal(byPhase(balances,'dl').remainingAmount,7400);

// Scenario 2: fattura successiva sulla stessa offerta; chiude l'esecutivo e fattura parte consulenze.
billing.registerInvoice({
  id:'ft-253',number:'253 /E',date:'2026-08-29',lines:[{
    id:'ft-253-1',description:'Saldo progettazione e quota consulenza',amount:7300,originType:'offer',allocations:[
      {offerLineId:id('esecutivo'),amount:6300},
      {offerLineId:id('consulenze'),amount:1000}
    ]
  }]
});
balances=billing.balances();
assert.equal(byPhase(balances,'esecutivo').remainingAmount,0);
assert.equal(byPhase(balances,'consulenze').remainingAmount,3800);
assert.equal(total(balances,'remainingAmount'),11200);

// Scenario 3: non può superare il residuo di una Riga Offerta.
assert.equal(billing.validateInvoice({id:'x-over',number:'X',lines:[{
  id:'x-over-1',description:'DL oltre residuo',amount:7400.01,originType:'offer',allocations:[{offerLineId:id('dl'),amount:7400.01}]
}]}).valid,false);

// Scenario 4: importo Riga Fattura e allocazioni devono quadrare.
const unbalanced=billing.validateInvoice({id:'x-unbalanced',number:'X2',lines:[{
  id:'x-unbalanced-1',description:'Riga non quadrata',amount:5000,originType:'offer',allocations:[
    {offerLineId:id('dl'),amount:2500},{offerLineId:id('consulenze'),amount:2000}
  ]
}]});
assert.equal(unbalanced.valid,false);
assert.ok(unbalanced.errors.some(x=>x.includes('non quadrata')));

// Scenario 5: una Riga Fattura collegata alle offerte non può perdere le allocazioni.
const missingAlloc=billing.validateInvoice({id:'x-noalloc',number:'X3',lines:[{
  id:'x-noalloc-1',description:'Riga collegata senza origine',amount:1000,originType:'offer',allocations:[]
}]});
assert.equal(missingAlloc.valid,false);
assert.ok(missingAlloc.errors.some(x=>x.includes('senza allocazioni')));

// Scenario 6: Riga libera valida, ma non deve ridurre il residuo delle Righe Offerta.
const beforeFree=clone(billing.balances());
billing.registerInvoice({id:'ft-254',number:'254 /E',date:'2026-08-30',lines:[{
  id:'ft-254-1',description:'Prestazione extra non prevista in offerta',amount:1000,originType:'free',allocations:[]
}]});
assert.deepEqual(billing.balances(),beforeFree);

// Scenario 7: una Riga libera non può contemporaneamente evadere una Riga Offerta.
assert.equal(billing.validateInvoice({id:'x-freealloc',number:'X4',lines:[{
  id:'x-freealloc-1',description:'Riga libera incoerente',amount:500,originType:'free',allocations:[{offerLineId:id('consulenze'),amount:500}]
}]}).valid,false);

// Scenario 8: numero fattura duplicato bloccato anche con ID tecnico diverso.
expectThrow(()=>billing.registerInvoice({id:'ft-254-copy',number:'254 /E',date:'2026-08-30',lines:[{
  id:'ft-254-copy-1',description:'Duplicata',amount:100,originType:'free',allocations:[]
}]}),/Numero fattura già presente/);

// Scenario 9: ID Riga Fattura duplicato nello stesso documento.
const duplicateLine=billing.validateInvoice({id:'x-dupline',number:'X5',lines:[
  {id:'same',description:'A',amount:100,originType:'free',allocations:[]},
  {id:'same',description:'B',amount:100,originType:'free',allocations:[]}
]});
assert.equal(duplicateLine.valid,false);
assert.ok(duplicateLine.errors.some(x=>x.includes('ID Riga Fattura duplicato')));

// Scenario 10: il controllo residuo è cumulativo anche con più Righe Fattura nello stesso documento.
const cumulative=billing.validateInvoice({id:'x-cumulative',number:'X6',lines:[
  {id:'x-cumulative-1',description:'Consulenza parte 1',amount:2000,originType:'offer',allocations:[{offerLineId:id('consulenze'),amount:2000}]},
  {id:'x-cumulative-2',description:'Consulenza parte 2',amount:2000,originType:'offer',allocations:[{offerLineId:id('consulenze'),amount:2000}]}
]});
assert.equal(cumulative.valid,false); // residuo consulenze 3.800 €

// Scenario 11: fatturazione esatta del residuo DL è ammessa e porta la riga a zero.
billing.registerInvoice({id:'ft-255',number:'255 /E',date:'2026-08-31',lines:[{
  id:'ft-255-1',description:'Saldo Direzione Lavori',amount:7400,originType:'offer',allocations:[{offerLineId:id('dl'),amount:7400}]
}]});
assert.equal(byPhase(billing.balances(),'dl').remainingAmount,0);

// Scenario 12: una Riga Offerta già fatturata non può essere eliminata.
assert.equal(billing.canDeleteOfferLine(id('dl')),false);
assert.equal(billing.canDeleteOfferLine(id('esecutivo')),false);

console.log('✓ Billing regression: 13 scenari superati');
console.log(JSON.stringify({
  initial:{confirmed:54000,billed:30500,residual:23500},
  afterGrouped:{invoiceLine:5000,esecutivoAllocation:2500,dlAllocation:2500,remaining:18500},
  afterSecondInvoice:{remaining:11200},
  finalDLResidual:byPhase(billing.balances(),'dl').remainingAmount
},null,2));
