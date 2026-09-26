# Warehouse Client (PDA magazzino)

Webapp React per il palmare di magazzino: wizard per i documenti di magazzino (scarico, carico, spostamento, carico da fornitore) e gestione dei prodotti. Il backend è in un altro repository (`pda_backend`).

Stack: **React 19 + TypeScript + Vite + Mantine 8 + Redux Toolkit + React Router + Zod**.

---

## Requisiti
- **Node 20.19 o superiore** (richiesto da Vite: con Node 18 il server di sviluppo non parte)
- npm 9+

## Setup rapido
```bash
npm install
npm run dev
```
Il server di sviluppo (porta 5173) è raggiungibile anche dalla rete locale (`host: true`), per provarlo dal palmare.

## Script
```bash
npm run dev          # sviluppo
npm run build:dev    # build con le impostazioni di sviluppo
npm run build:prod   # build di produzione (dist/)
npm run preview      # serve la build in locale
```

## Indirizzo del backend (`VITE_API_BASE_URL`)
| File | Valore | Uso |
|---|---|---|
| `.env.development` | `http://localhost:8787/api` | sviluppo sul proprio PC |
| `.env.production` | `/api` | produzione: relativo, il backend sta sullo stesso host dietro nginx (funziona con qualsiasi nome host, http o https) |
| `.env.development.local` (non in git) | es. `http://IP-DEL-PC:8787/api` | prove dal palmare: il palmare non può usare `localhost`, serve l'IP del PC di sviluppo |

Il PC di sviluppo deve permettere in firewall le porte 5173 (frontend) e 8787 (backend).

## Architettura
- **Routing** (`src/AppRoutes.tsx`)
  - `/` → Step1 (reparto) e pulsante *Gestione prodotti*
  - `/wizard/step2` → tipo di operazione
  - `/wizard/step3` → dettagli (data, operatore, magazzini, fornitore, numero documento)
  - `/wizard/step4` → prodotti
  - `/wizard/summary` → riepilogo e conferma
  - `/products` → Gestione prodotti
  - `/charts` → grafici temperature (desktop)
- **Shell**: `AppLayout` con `AppShell` (header e footer solo su desktop).
- **State** (Redux slice `wizardSlice`): `currentStep`, `history`, `stepsData` (cache dei dati per passo), `selections` (scelte dell'utente); azioni `goToStep`, `setStepData`, `setSelection`, `truncateToStep`, `reset`.
- **HTTP**: `lib/api.ts` → `httpGet` / `httpPost` (fetch nativo). In caso di errore lanciano `ApiError` con lo stato HTTP e il messaggio inviato dal server.
- **Zod**: schemi copiati 1:1 dal backend in `src/schemas/`.

## Funzioni per il palmare
- **Wizard documenti**: Operatore e Magazzino sono pulsanti (`components/ButtonSelect.tsx`); il Fornitore è un menu con ricerca testuale. Il frigorifero è facoltativo.
- **Lista prodotti di un documento**: toccando una scheda si apre per cambiare la quantità, modificarla (matita) o eliminarla (cestino).
- **Prodotto non trovato** durante l'inserimento: si propone di crearlo al volo (`components/product/CreateProductForm.tsx`).
- **Gestione prodotti** (`features/products/ProductManagement.tsx`): due sezioni *Per codice* e *Per descrizione*, stampa etichetta barcode (`components/product/PrintLabelPanel.tsx`), aggiunta di un alias a un articolo esistente, creazione di un articolo nuovo (senza categoria e a prezzo zero: li imposta l'ufficio).
- I campi dove si scansiona un codice selezionano tutto il testo al tocco, così la scansione successiva sovrascrive il precedente.

## Schermi piccoli
La pagina deve restare nello schermo del palmare (320-412 px di larghezza) senza scorrere di lato: niente elementi affiancati che non vanno a capo (pulsanti con testo lungo, campo + pulsante), che sforerebbero i bordi. Il contenitore delle pagine (`WizardStepContainer`) si adatta alla larghezza solo se il contenuto lo permette.

## Deploy
Vedi `GUIDA-DEPLOY.md` nel repository del backend: il frontend compilato (`dist/`) va copiato nella document root del sito, il backend gira in Docker.
