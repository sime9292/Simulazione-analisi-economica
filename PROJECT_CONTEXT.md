# Dabster gestionale — PROJECT CONTEXT

> Fonte operativa persistente per continuare lo sviluppo tra chat diverse.
> Prima di modificare codice, leggere questo file, `ARCHITECTURE-CLEAN-V2.md`, controllare l'HEAD corrente di `clean-v2-demo` e ispezionare i file interessati.

## 1. Regola fondamentale branch

Repository: `sime9292/Simulazione-analisi-economica`

Branch operativo per prove e sviluppo corrente:

- `clean-v2-demo`

Branch da NON modificare:

- `main`
- `clean-v2`
- `clean-v2-base`

Base protetta da mantenere invariata:

- `675b07a25e22a15f7e5af83330af4c6c09727913`

Non creare o spostare una V3 solo per continuare il lavoro tra chat. Una futura V3 avrà senso solo dopo un checkpoint funzionale stabile della Clean V2 Demo, con trigger/fatturabile/riconciliazione consolidati e regressioni verificate.

## 2. Checkpoint corrente

File HTML principale della demo:

- `v38.html`

Il nome `v38.html` è rimasto il contenitore principale anche se i moduli caricati hanno versioni successive.

Ultimo checkpoint funzionale verificato PRIMA della creazione di questo file di contesto:

- commit `306311f5c6efc2c9de7c0e8fe04fe88301386d3e`
- messaggio: `Load Kanban billing trigger verification v59`

Checkpoint precedente importante:

- `3a0693eb60beadfd6c9ddeae7de8e98bcbd653ef` — `Load direct Billing Plan apply interface`

Tra `3a0693...` e `306311...` sono stati aggiunti il flusso Trigger/Fatturabile/Riconciliazione, il Piano in Nuova fattura trigger-aware e la verifica Kanban → trigger.

## 3. Architettura Clean V2 da rispettare

La documentazione architetturale di base è in:

- `ARCHITECTURE-CLEAN-V2.md`

Principio centrale: le regole business nuove non devono dipendere dal DOM come fonte di verità.

Moduli Clean principali:

- `clean/store.js` — stato centrale
- `clean/domain.js` — dominio offerta/fasi
- `clean/economic-engine.js` — calcoli economici puri
- `clean/economic-adapter.js` — ponte UI ↔ motore economico
- `clean/offer-workflow.js` — ciclo di vita offerta/conferma/righe offerta
- `clean/billing-domain.js` — allocazioni e residui di fatturazione tramite ID stabili
- `clean/bootstrap.js` — bootstrap API Clean

Regola: una Riga Offerta deve essere identificata tramite `offerLineId`, non tramite descrizione testuale.

## 4. Flusso gestionale consolidato

Flusso funzionale definito:

`Offerta → Conferma → Righe Offerta → Piano di fatturazione → Trigger → Fatturabile → Nuova fattura → Righe Offerta → Righe Fattura`

Significato dei livelli:

- **Righe Offerta** = struttura commerciale venduta al cliente.
- **Piano di fatturazione** = stabilisce quando e quanto può diventare fatturabile.
- **Trigger** = evento gestionale che fa maturare una quota del Piano.
- **Fatturabile** = quota maturata e non ancora consumata da fatture riconciliate.
- **Righe Fattura** = rappresentazione del documento cliente.
- **Allocazioni interne** = collegano Righe Fattura e Righe Offerta.
- **Riconciliazioni Piano** = collegano una Riga Fattura a uno o più eventi del Piano.

Le tre dimensioni non devono essere confuse:

1. **residuo commerciale Riga Offerta**;
2. **maturazione economica evento Piano**;
3. **consumo dell'evento Piano da parte delle fatture**.

## 5. Offerta e Conferma

Ciclo principale:

`In lavorazione → Completata → Inviata → Confermata`

Regole consolidate:

- Analisi economica modificabile nella fase prevista dal workflow.
- `Dimensionamento Opere` è riferimento tecnico indipendente.
- Il Dimensionamento NON deve trasferire automaticamente importi nell'Analisi.
- `Importo Offerta` è il valore commerciale inviato al cliente.
- `Importo Conferma` può essere diverso dall'Importo Offerta.
- Dopo la conferma esistono le Righe Offerta, con ID stabili.

## 6. Nuova fattura — comportamento deciso

Ordine UI:

1. Righe Offerta
2. Piano di fatturazione
3. Righe Fattura
4. Riconciliazione Piano quando necessaria

Regole:

- `Da fatturare` sulle Righe Offerta è SEMPRE modificabile manualmente.
- Il Piano è una precompilazione assistita, non un vincolo di compilazione della fattura.
- `Applica` / `Applica dal Piano` valorizza gli importi delle Righe Offerta.
- Non deve creare direttamente Righe Fattura.
- Successivamente l'utente usa `Aggiungi righe selezionate`.
- La fattura è sempre manuale, anche in ambiente Test.
- È disponibile il metodo nativo `applySourceAllocations` nel billing workspace: usare questo contratto invece di automazioni DOM fragili per compilare le Righe Offerta.

## 7. Piano di fatturazione e Fatturabile

`Fatturabile` NON è manuale.

Concetto:

`Fatturabile evento = importo evento maturato - importo già riconciliato/fatturato su quell'evento`

Stati evento Piano:

`Non maturato → Fatturabile → Parziale → Fatturato`

Possibili stati tecnici aggiuntivi:

- `Incompleto`
- stato di anomalia per trigger riaperto dopo fatturazione

Esempio:

Evento PDC = 9.000 €.

- maturato, 0 € riconciliati → `Fatturabile`, 9.000 €
- fattura riconciliata 6.000 € → `Parziale`, fatturabile residuo 3.000 €
- ulteriore fattura riconciliata 3.000 € → `Fatturato`, fatturabile 0 €

## 8. Trigger definiti

Trigger previsti e validati concettualmente:

### Offerta confermata

Un evento con trigger di conferma matura quando l'offerta è `Confermata`.

### Attività conclusa

Regola:

Quando un'attività nel Kanban `Attività Commessa` passa a `Chiusa`, gli eventi del Piano collegati a quell'attività diventano maturati/fatturabili.

Riapertura attività:

- se sull'evento non è stato fatturato nulla → torna `Non maturato`;
- se è già stato fatturato qualcosa → NON cancellare o invertire lo storico economico;
- mantenere lo stato economico già maturato/consumato;
- segnalare anomalia `trigger riaperto`.

## 9. Collegamento Kanban → Piano — stato attuale e target

### Target architetturale

Il collegamento definitivo deve essere:

`Stato attività / API dominio → evento applicativo condiviso → motore Trigger → Piano → Fatturabile`

Il Kanban deve essere una UI del dato attività, non la fonte business da leggere tramite scraping.

### Implementazione corrente

File rilevanti:

- `billing-trigger-v58.js`
- `kanban-billing-link-v59.js`
- `activity-ui-v24.js`

`billing-trigger-v58.js` contiene già il calcolo degli stati evento, fatturabile, riconciliazioni e API Trigger.

`kanban-billing-link-v59.js` aggiunge verifica del passaggio attività e dispatch di eventi applicativi come:

- `dabster-kanban-status-change`
- `dabster-billing-plan-ready`
- `dabster-kanban-trigger-verified`

ATTENZIONE: il bridge v59 osserva ancora il Kanban/DOM tramite `MutationObserver` per intercettare/verificare il cambio di stato. È un miglioramento rispetto alle automazioni di click, ma NON è ancora il target architetturale definitivo.

Prossimo consolidamento: spostare l'emissione di `activity status changed` nel punto in cui il modello attività cambia stato, e fare consumare quell'evento al billing trigger senza dover rileggere la board.

## 10. Riconciliazione Piano ↔ Fattura

Informazione da conservare:

`invoiceLineId → planEventId → importo riconciliato`

Nell'implementazione corrente le righe fattura possono contenere `planReconciliations`.

Regole:

- Se l'utente usa `Applica dal Piano`, il riferimento all'evento deve essere trasportato verso la fattura e proposto automaticamente in riconciliazione.
- Se l'utente fattura manualmente dalle Righe Offerta, prima del salvataggio deve esserci una piccola sezione `Riconciliazione Piano`.
- Se esiste un solo evento compatibile, il sistema lo propone automaticamente.
- Se esistono più eventi compatibili, l'utente sceglie o ripartisce.
- Deve esistere l'opzione `Fuori Piano`.

### Fuori Piano

Una fattura `Fuori Piano`:

- riduce il residuo commerciale della Riga Offerta;
- NON consuma nessun evento del Piano;
- NON deve rendere artificialmente `Fatturato` un evento del Piano.

## 11. Dashboard Fatturazione

Ordine colonne concordato:

`Commessa/Offerta | CC | CP | Importo confermato | Fatturato | Residuo | Fatturabile`

Dove:

- `CC` = Capo Commessa
- `CP` = Capo Progetto

KPI superiori principali:

`Valore confermato | Fatturato | Fatturabile ora | Residuo`

La `% fatturato` può restare come informazione nelle tabelle, ma non è un KPI principale.

## 12. Menu Da fatturare

Il menu `Da fatturare` deve mostrare gli EVENTI maturati del Piano, non semplicemente le Righe Offerta.

Colonne di riferimento:

`Commessa | Offerta | CC | CP | Evento | Fatturabile`

Cliccando un evento:

- aprire `Nuova fattura`;
- offerta già selezionata;
- Piano visibile;
- evento facilmente identificabile/applicabile;
- NON emettere automaticamente la fattura.

## 13. Ambiente Test

Il Test è solo un acceleratore dati.

Sequenza:

1. `Carica Offerta + Analisi`
2. `Conferma + Righe Offerta`
3. `Carica Piano fatturazione`
4. fattura creata SEMPRE manualmente dall'utente

Il Test non deve saltare le decisioni operative della fatturazione.

### Caso Test principale

Offerta: `26_022pe01`

Totale: 19.000 €

Righe Offerta:

- PUA = 3.000 €
- Progetto impianti per PDC = 10.000 €
- Parere Preventivo VVF = 6.000 €

Fonte storica reale per il Piano:

- Acconto 10% su conferimento = 1.900 €
- PDC 90% su consegna = 9.000 €
- VVF 90% su ottenimento = 5.400 €
- residuo PUA = 2.700 € senza trigger esplicitato

REGOLA: non inventare trigger mancanti nella logica definitiva.

Il vecchio seed Test aveva un evento PUA con `activity_closed` inventato; l'implementazione v58 lo filtra/rimuove nel caso `26_022pe01`. Questa correzione va preservata.

Nel Test:

- CC può essere `GEA` o `GRE` secondo il caso demo;
- CP può essere un valore demo coerente.

## 14. Implementazione già presente al checkpoint funzionale 306311

Dopo il vecchio checkpoint `3a0693...` sono stati introdotti commit che includono:

- `Add billable trigger and reconciliation flow`
- `Load billing trigger and billable reconciliation v58`
- `Make invoice plan panel trigger-aware`
- `Load trigger-aware invoice plan panel v58`
- `Load trigger-aware Billing Plan source v58`
- `Keep Da fatturare after billing dashboard`
- `Add Kanban trigger verification and stable Test re-entry`
- `Load Kanban billing trigger verification v59`

Funzionalità visibili nel codice corrente:

- calcolo `billedForEvent` dalle riconciliazioni delle righe fattura;
- calcolo stato evento e `billable` residuo;
- gestione conferma/offerta e attività chiusa;
- stato anomalia per attività riaperta dopo fatturazione;
- applicazione evento Piano alle Righe Offerta con `applySourceAllocations`;
- memoria temporanea `planEventId` durante la costruzione delle Righe Fattura;
- proposta automatica di evento compatibile;
- opzione `Fuori Piano`;
- pannello Piano in Nuova fattura trigger-aware;
- verifica Kanban → maturazione trigger;
- protezione del Test da rientri che alterano accidentalmente il caso caricato.

Queste funzioni devono essere verificate prima di essere riscritte: non duplicare logica già esistente.

## 15. File correnti più rilevanti per Billing/Trigger

Prima di interventi su questa area ispezionare almeno:

- `v38.html`
- `ARCHITECTURE-CLEAN-V2.md`
- `clean/billing-domain.js`
- `clean/offer-workflow.js`
- `billing-workspace-v39.js`
- `billing-dashboard-v38.js`
- `billing-dashboard-totals-v40.js`
- `billing-plan-v47.js`
- `billing-plan-invoice-v51.js`
- `billing-plan-source-v52.js`
- `billing-trigger-v58.js`
- `kanban-billing-link-v59.js`
- `test-plan-seed-v47.js`
- `test-data-entry-v50.js`
- `tests/billing-regression.mjs`

Non aggiungere nuove regole business di fatturazione a moduli legacy generici se esiste un modulo di dominio/API dedicato.

## 16. Decisioni consolidate da NON reinterpretare

- Le Righe Offerta sono commerciali, non eventi di fatturazione.
- Il Piano stabilisce maturazione e quote, ma non emette fatture.
- `Da fatturare` nelle Righe Offerta resta manualmente modificabile.
- `Fatturabile` del Piano è calcolato, non manuale.
- La fattura è sempre creata manualmente.
- `Applica dal Piano` precompila; non crea direttamente Righe Fattura.
- Le fatture possono essere parziali.
- Un evento può essere consumato da più fatture.
- Una fattura può contenere Righe Offerta diverse.
- Le allocazioni usano ID stabili.
- `Fuori Piano` riduce il residuo Riga Offerta ma non consuma il Piano.
- Una riapertura attività non cancella storia economica già fatturata.
- Trigger mancanti non vanno inventati.
- Dimensionamento Opere resta riferimento e non trasferisce importi verso Analisi.

## 17. NEXT STEP

Prima di aggiungere nuove UI o nuovi seed, consolidare l'architettura del collegamento:

`Kanban / modello attività → Piano → Trigger → Fatturabile`

Passi raccomandati:

1. individuare il punto autorevole in cui un'attività cambia stato;
2. esporre da quel punto un'API o evento dominio (`activity-status-changed`);
3. fare consumare tale evento a `billing-trigger-v58` (o successore), senza scansione del DOM come fonte primaria;
4. mantenere `kanban-billing-link-v59.js` solo come compatibilità/verifica durante la transizione;
5. testare chiusura, riapertura senza fatture e riapertura dopo fattura parziale/totale;
6. verificare Dashboard Fatturazione e `Da fatturare` sul medesimo stato calcolato;
7. verificare riconciliazione automatica, scelta multipla e `Fuori Piano`;
8. aggiornare questo file dopo il checkpoint.

## 18. Protocollo per una nuova chat

Messaggio minimo da usare:

> Continuiamo lo sviluppo del gestionale Dabster. Repository `sime9292/Simulazione-analisi-economica`, branch operativo `clean-v2-demo`. Prima di modificare codice leggi `PROJECT_CONTEXT.md`, `ARCHITECTURE-CLEAN-V2.md`, controlla l'HEAD corrente del branch e i file interessati. Non modificare `main`, `clean-v2` o `clean-v2-base`. Continua dal `NEXT STEP` del contesto senza duplicare funzionalità già implementate.

La nuova chat deve sempre verificare il repository reale: `PROJECT_CONTEXT.md` descrive le decisioni, ma l'HEAD Git stabilisce lo stato effettivo del codice.

## 19. Protocollo dopo ogni modifica

Dopo ogni modifica al codice:

1. lavorare solo su `clean-v2-demo`;
2. comunicare SHA esatto del nuovo commit;
3. comunicare URL demo raw.githack;
4. indicare sinteticamente file modificati e comportamento introdotto;
5. aggiornare `PROJECT_CONTEXT.md` quando cambia una decisione consolidata, un'API importante, lo stato implementato o il `NEXT STEP`.

URL demo di riferimento sul branch:

`https://raw.githack.com/sime9292/Simulazione-analisi-economica/clean-v2-demo/v38.html`
