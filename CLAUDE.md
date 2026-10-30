# PDA magazzino — Casa del Formaggio (Parma)

Contesto per chi riprende il progetto (persone o Claude Code). Installazione e aggiornamenti sul server: `DEPLOY.md`.
Il funzionamento per l'utente (schermate, operazioni, anagrafiche) è in `backend/README.md`; i dettagli del frontend in
`frontend/README.md`; l'integrazione con la cassa in `backend/README.CASSA.md`.

## 1. Cos'è

Web app per i **palmari di magazzino** del negozio: wizard per i documenti di magazzino (scarico per lavorazione, carico da
produzione, spostamento, carico da fornitore) che vengono **creati in Passepartout** via web service SOAP, gestione dei
prodotti da palmare (ricerca per barcode, creazione e modifica articoli, alias, stampa etichette Zebra) e grafici delle
temperature dei frigoriferi (DB Telenet).

Nata da un progetto di sviluppatori esterni (The BB's Way: CircleCI, immagine Docker Hub, server `bbsway.dev`): tutto ciò che
riguardava la loro pipeline è stato tolto e **non va reintrodotto**. Fino a ottobre 2026 stava in due repository
(`pda_backend`, `pda_frontend`) e si installava con zip preparati sul PC; ora è un repository unico secondo lo standard
`plesk-webapp` (storia dei due conservata con `git subtree`).

Produzione: `https://pda.lacdf.it` (IP interno, solo VPN, certificato `*.lacdf.it`). Prima era `http://pda.cdf`.

## 2. Stack e struttura

Diverso dallo standard per ragioni storiche, **tenuto così di proposito** (riscriverlo non porterebbe nulla all'utente):
- **Backend**: Node 24 + Express 5 + TypeScript ESM, eseguito con **tsx** anche in produzione (TypeORM carica le entità dai
  `.ts` e gli import non hanno estensione: compilarlo in JS romperebbe entrambe le cose). `npm run build` = `tsc --noEmit`,
  solo controllo dei tipi. **TypeORM** (non Prisma), schema in `deploy/sql/init.sql`, `synchronize: false`, nessuna
  migrazione automatica: una modifica allo schema va scritta in SQL e applicata a mano sul server.
  Express 5 gestisce da solo gli errori delle rotte async (niente `express-async-errors`).
- **Frontend**: React 19 + Vite 7 + **Mantine 8** + Redux Toolkit + React Router 7 + Zod. `@vitejs/plugin-legacy` per le
  WebView datate dei palmari (non toglierlo).

```
backend/
  appDataSource.ts            MySQL del PDA (movimenti, reparti, tipi di operazione)
  passepartoutDataSource.ts   SQL Server di Passepartout: SOLO LETTURA (grafico giacenze)
  fridgeDataSource.ts         SQL Server Telenet dei frigoriferi
  config/barcode-variabili.json  formati dei barcode a quantità variabile (montato nel container, letto a ogni scansione)
  src/index.ts                avvio, CORS, /api/health, router
  src/routes, services, schemas, models (entità TypeORM *Entity.ts)
  src/utils/passepartout/     client SOAP: documenti, articoli, personale, magazzini, fornitori
  src/utils/labels/           ZPL per la Zebra, EAN-8, barcode variabili, invio raw TCP
frontend/src/
  lib/api.ts                  httpGet/httpPost con BASE_URL (relativo /api in produzione)
  theme.ts                    tema Mantine sul brand
  styles/brand-tokens.css     copia identica di casa-del-formaggio-brand/tokens.css
  features/                   steps (wizard), summary, products, charts
deploy/                       aggiorna-server.sh, nginx-pda.conf, sql/init.sql
docker-compose.yml            container pda_backend, rete cdfnet, porta 8789 solo localhost
```

## 3. Sviluppo in locale

```bash
# backend (porta 8787): compila backend/env/.env.local (fuori da git) con i valori di .env.production.example.
# Il MySQL del server rifiuta questo PC: per le prove DB_* puntano al MySQL locale cdf_warehouse_pda_test.
cd backend && npm install && npm run dev

# frontend (porta 5173, esposto in LAN per provare dal palmare)
cd frontend && npm install && npm run dev
```
Il frontend in sviluppo chiama `http(s)://<host da cui si apre la pagina>:8787/api`: dal palmare basta aprire
`http://IP-DEL-PC:5173` (porte 5173 e 8787 aperte nel firewall del PC). `VITE_API_URL` in `frontend/.env.local` la sovrascrive.

**Prima di ogni push: `npm run build` in entrambe le cartelle** (in sviluppo tsx e Vite non controllano i tipi).

## 4. Regole e trappole

- **Passepartout**: si scrive **solo via SOAP**, il suo database si legge soltanto (regola dell'utente). Gli articoli creati
  da palmare prendono codici da **90001** in su (il contatore di "genera codice" di Passepartout non avanza via web service).
  Ogni creazione/modifica finisce in `logs/created-products.log` (una riga JSON, senza operatore).
- La stessa serie 90001+ la usa anche **gestionale-fatture** per gli articoli nuovi delle fatture: la scelta del codice è protetta da
  un blocco condiviso (`utils/sharedLock.ts`, cartella `/var/lib/cdf-condivisi/passepartout` dell'host montata in entrambi i
  container, blocco `codici-articolo`). Va tenuto uguale a `backend/src/lib/blocco-condiviso.ts` di gestionale-fatture.
- **Inventario** (pagina `/inventory`, `services/inventoryService.ts`): in Passepartout un documento Inventario **somma** le sue
  quantità all'inventario dell'articolo (provato il 20/10/2026: 3 poi 5 dà 8, anche negativo): il palmare manda la **differenza**
  contato − esistenza letta al momento della conferma (`GetDisponibilitaArticoli`). Inventario parziale: gli articoli non contati
  non cambiano. Le differenze di ogni inventario restano nelle righe del documento Inventario e in `logs/inventories.log`.
- **Nomi dei magazzini**: il client SOAP li restituisce senza spazi finali, ma in Passepartout c'è "MAGAZZINO " con lo spazio.
  Per giacenze e inventari si usa il nome esatto (`PassepartoutHandler.exactWarehouseName`).
- **Carico fornitore** tolto dalle operazioni quotidiane (filtro in `operationService.getOperationTypesByDepartmentID`): ora arriva
  dalle fatture con gestionale-fatture. Resta nel database.
- L'API **non ha autenticazione**: deve restare raggiungibile solo dalla VPN (DNS sull'IP interno, porta su 127.0.0.1).
- `/api/health` controlla solo il DB del PDA; le altre rotte passano da `databaseMiddleware`, che pretende **tutti e tre** i
  database: se Passepartout o Telenet non rispondono, falliscono tutte le chiamate (comportamento voluto da prima, da
  valutare con l'utente se cambiarlo).
- Dopo un riavvio il backend carica in background l'elenco articoli da Passepartout (~30 s): nginx ha timeout di 120 s.
  L'indice si aggiorna da solo ogni 15 minuti (completo ogni 6 ore) e una ricerca non aspetta l'aggiornamento più di 3 s:
  prima la ricarica completa partiva dalla prima ricerca del mattino, che restava bloccata (28/10/2026).
- **Palmari datati**: la WebView del contenitore kiosk di un palmare non regge nemmeno il bundle legacy; la soluzione
  scelta dall'utente è usare Chrome. Con HTTPS su `pda.lacdf.it` un Android molto vecchio potrebbe rifiutare il certificato:
  prima domanda "kiosk o Chrome?", poi eventualmente `http://pda.cdf` per quel dispositivo.
  `z.config({ jitless: true })` in `main.tsx` non va tolto: senza, Zod genera codice a runtime con lo spread negli oggetti
  che il bundle legacy non traduce, e la WebView del kiosk si ferma su "Unexpected token" / "Nessun reparto disponibile".
- **Web app installabile** (dal 19/10/2026): `public/manifest.webmanifest`, icone `icona-192/512.png` e `apple-touch-icon.png`
  (pittogramma cacao del brand su avorio), `public/sw.js` registrato in `main.tsx` solo in produzione. Il service worker
  **non mette in cache niente** di proposito: una cache terrebbe i palmari sulla versione vecchia dopo un aggiornamento.
  Si installa solo in HTTPS (`pda.lacdf.it`). **Nessun gestore `fetch`**, nemmeno vuoto: nella WebView dei kiosk faceva
  fallire tutte le chiamate all'API ("Errore durante il fetch dei reparti"), mentre Chrome funzionava (30/10/2026).
- Campi di testo a 16 px sui touch (iPhone ingrandisce la pagina sotto quella misura) e `interactive-widget=resizes-content`
  nel viewport: non toglierli.

**Interfaccia sui palmari (regole del titolare, 20/10/2026): lo schermo è piccolo, si lavora con una mano, tutto deve
comportarsi allo stesso modo in ogni pagina.** Ogni comportamento ricorrente sta in UN componente comune: le pagine lo usano,
non lo riscrivono (niente gestori di tastiera, selezione o layout copiati a mano).

| Cosa | Componente (frontend/src) | Regola |
|---|---|---|
| Pagina | `components/WizardStepContainer` | ogni schermata ci sta dentro (altezza dell'area visibile, tastiera esclusa) |
| Parte che scorre | `components/AreaScorrevole` | UNA per pagina; se è un modulo con pulsanti propri, `className="area-flessibile"` |
| Pulsanti in fondo | `components/BarraAzioni` (anche dentro `NavigationButtons`) | ultimo elemento; secondario (`variant="default"`) a sinistra, principale a destra, etichette brevi |
| Campi codice/alias/barcode | `components/CampoDaSparare` | mai un `TextInput` a mano: la tastiera NON si apre quando il cursore ci arriva da solo (lo scanner scrive comunque), si apre al tocco; Invio = `onScan` |
| Campi numerici | `NumberInput` (tema in `theme.ts`) | al tocco il numero si seleziona: impostato una volta nel tema |
| Testo libero (descrizioni) | `TextInput` | lì la tastiera serve subito: normale |
| Elenchi | `.riga-elenco` (index.css) | niente tabelle a più colonne: una riga per voce su due livelli, dato importante a destra, `lineClamp` sulle descrizioni |

- **Conciso**: niente frasi di spiegazione sotto i titoli, testi vuoti brevi ("Nessun articolo contato"); le spiegazioni vanno nel
  README. Azioni rare meno in evidenza e affiancate a quelle frequenti (es. "Gestione prodotti" 2/3 e "Inventario" 1/3).
- **Tastiera**: `.contenitore-passo` (index.css) fa restringere solo l'area flessibile (minimo 120 px, poi scorre la pagina); titoli,
  campi e pulsanti restano interi. In `calc()` gli operatori vanno tra spazi (`- var(…)`): un `-var(` annulla tutto il calcolo e i
  pulsanti salgono (è successo il 20/10).
- **Risposte delle rotte**: `outputValidationMiddleware` vuole lo schema del **singolo elemento** (gli elenchi li gestisce da solo:
  un `z.array` dà "expected array").
- **Prima di consegnare**: `npm run build` in backend e frontend; pagina a **360 px** (strumenti del browser) o sul palmare, con la
  tastiera aperta: nessuno scorrimento orizzontale, pulsanti in fondo e interi; `grep` di `<TextInput`, `onKeyDown`,
  `selectAllOn`, `<ScrollArea` per verificare che nessuna pagina abbia rifatto a mano quello che fanno i componenti comuni.

**Grafica: linee guida del brand, come in gestionale-code.** Solo i colori di `styles/brand-tokens.css`, riportati in
`theme.ts` come tavolozze Mantine (miele primario con testo cacao, grigi di Mantine sostituiti dai neutri caldi; pulsanti-icona disattivati in miele
attenuato, `index.css`). Provato il 19/10 il cacao come primario: il titolare ha preferito tornare al miele, con i pulsanti
importanti ("Gestione prodotti") pieni invece che in variante chiara e in
`brandCssVariables` (fondo avorio, testo cacao, link caramello, varianti light/outline leggibili). Restano di Mantine i colori
di **stato** (red, yellow, green degli avvisi) e quelli delle serie nel grafico dei frigoriferi (`getColorFor`). Quando
cambia il file del brand: ricopiare `tokens.css` e aggiornare gli esadecimali in `theme.ts`.

## 5. Stato

### Fatto
Wizard dei documenti di magazzino verso Passepartout · gestione prodotti da palmare (barcode, alias, creazione e modifica,
prezzo e categoria) · etichette Zebra EAN-8 · barcode a peso/quantità variabile (formato del retail) · grafici frigoriferi · inventario parziale (ottobre 2026) ·
repository unico con deploy standard e web app installabile (ottobre 2026).

### Aperto
- **In produzione su `pda.lacdf.it` dal 19/10/2026** con il nuovo flusso (Git di Plesk + `aggiorna-server.sh`), funzionante.
  Da provare sui palmari reali, soprattutto i più vecchi (HTTPS, installazione da Chrome), poi spegnere `pda.cdf` e la
  vecchia cartella `pda-backend` (`DEPLOY.md` §0.4) e archiviare su GitHub `pda_backend` / `pda_frontend`.

## 6. Come lavorare con l'utente

Italiano; è il titolare, conosce il dominio meglio dei dettagli di deploy: comandi esatti per i passaggi operativi. Dire
sempre se una modifica richiede di toccare lo schema del database (qui a mano, niente migrazioni automatiche). Prima di
cercare un bug dopo un deploy, escludere la versione vecchia (cache del palmare, pull non fatto, script non rilanciato).
