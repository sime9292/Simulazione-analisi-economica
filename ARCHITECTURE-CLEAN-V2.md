# Dabster prototype — Clean V2 architecture

This branch is the consolidation baseline before implementing invoicing.

## Goal

The existing prototype evolved through successive UI patches. Clean V2 keeps the current interface and demo while moving business rules into a small set of explicit modules. Future business features, especially invoicing, must depend on these modules rather than reading calculated values back from the DOM.

## Source of truth

Business modules live in `clean/`:

- `store.js` — central application state.
- `domain.js` — offer statuses, seven operating phases, confirmation categories and numeric helpers.
- `economic-engine.js` — pure economic calculation function. No DOM access.
- `economic-adapter.js` — the only bridge between the current economic UI and the economic engine.
- `offer-workflow.js` — offer lifecycle, manual official offer amount, post-confirmation amount and offer lines, invoice-readiness validation.
- `billing-domain.js` — invoice allocation model and residual amounts by stable offer-line ID.
- `bootstrap.js` — starts Clean V2 and exposes the clean APIs.

`window.DABSTER_STORE` is the central state exposed to the prototype. `window.DABSTER_BILLING_DOMAIN` is the domain API that future invoice screens must use.

## Offer lifecycle

`In lavorazione -> Completata -> Inviata -> Confermata`

- Analysis is editable only in `In lavorazione`.
- `Dimensionamento Opere` is an independent technical reference and never writes proposal amounts into Analysis.
- `Importo Offerta` is entered manually by the user and represents the commercial amount sent to the client.
- `Importo Conferma` can differ from `Importo Offerta`.
- `Importo Conferma` and `Righe Offerta` are shown only after the offer is `Confermata`.
- A confirmed offer can exist before being invoice-ready.

## Confirmed offer lines

Each offer line has a stable `id`, `phase`, `category`, `description` and `amount`.

Initial generated rows correspond to the active Analysis phases. The user may change description and amount after confirmation. The invoice-readiness check requires:

1. total offer lines = total confirmation;
2. category totals = confirmation breakdown (`Consulenza`, `Progetti`, `Direzione lavori`);
3. every row has phase and description;
4. valued reimbursements/external costs are internally assigned to a phase.

Reimbursements and external costs never create separate commercial offer lines.

## Economic rules

`economic-engine.js` is the only authoritative economic formula implementation.

- Gross = proposals of active rows, including reimbursement/external sales.
- Direct costs = internal phase costs + reimbursements + external supplier costs.
- MOL = Gross - Direct costs.
- General expenses = 35% of Proposal of active operating phases only.
- Reimbursements and external rows are excluded from the general-expense base.
- MON = MOL - General expenses.
- Profit % = MON / Gross.
- Trade percentage is a non-negative markup.
- At 0% trade, negotiated amount equals proposal exactly.
- Above 0%, each row is increased and rounded upward to the next EUR 100 before totals are summed.
- KPI values remain based on Proposal, not Trade.

## Invoicing contract

Future invoice UI must not identify an offer row by description. It must allocate invoice amounts using `offerLineId`.

`billing-domain.js` provides:

- line balances (`confirmedAmount`, `billedAmount`, `remainingAmount`);
- validation against overbilling;
- invoice registration with stable invoice IDs;
- protection against deleting an offer line already used in invoicing.

The future hierarchy is therefore:

`Commessa -> Offerta confermata -> Riga Offerta -> Allocazioni Fattura -> Fattura/Pagamento`

This allows partial invoicing and multiple invoices against the same line without losing traceability.

## Legacy compatibility layer

Some historical files are still loaded temporarily because they build complex prototype UI elements (activity registry, planning cards and Kanban). They are compatibility/presentation code, not the source of truth for new business logic.

Important cleanup already applied:

- removed the global `EventTarget.prototype.addEventListener` monkeypatch;
- removed the global `MutationObserver` monkeypatch;
- removed the old duplicate economic engine from the trade patch file;
- removed stale economic formulas from the reimbursements/external-cost module;
- removed Dimensionamento -> Analysis transfer logic;
- removed the offer-lines loader from the planning presentation module;
- preloaded the remaining legacy UI chain in parallel to reduce the network waterfall.

No new billing functionality should be added to `app-v*.js`, `trade-rounding-v20.js`, or `offer-lines-v63.js`.
