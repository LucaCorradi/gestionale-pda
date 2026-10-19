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

## Compatibilità con palmari datati ("aggiorna WebView")
Vite di suo compila per browser recenti (`<script type="module">`, sintassi JS moderna): sui palmari con
la Android System WebView vecchia — specie quelli senza Play Store per aggiornarla — la pagina non parte
e Android mostra "aggiorna WebView" invece di caricarla.

`vite.config.ts` usa **`@vitejs/plugin-legacy`**: ogni build produce, oltre al bundle moderno, un secondo
bundle transpilato ed espanso con i polyfill (`*-legacy-*.js`), caricato automaticamente dai browser che
non supportano `<script type="module">` (vedi lo script di rilevamento in `dist/index.html`). I palmari
aggiornati continuano a scaricare solo il bundle moderno, più leggero: non cambia nulla per loro.

Questo risolve la sintassi JS non supportata, **non il CSS**: Mantine 8 usa funzionalità CSS recenti
(livelli, `:where()`, a volte container query). Se un palmare molto vecchio carica la pagina ma il layout
è rotto, il problema è il motore di rendering della WebView, non più risolvibile da qui: serve aggiornare
la WebView di sistema sul dispositivo (sideload dell'APK se non c'è Play Store) o sostituire il dispositivo.

**Verificato sul campo:** su un palmare datato il bundle legacy non è bastato a far funzionare l'app dentro
l'app kiosk (che usa una propria WebView interna, probabilmente ancora più indietro/limitata di quella di
sistema). Aprendo lo stesso indirizzo in **Chrome** installato sul dispositivo funziona: per quel palmare
la soluzione adottata è usare Chrome al posto del contenitore kiosk. Il plugin legacy resta comunque utile
per gli altri dispositivi con WebView di sistema datata (quella verificata funzionare).
