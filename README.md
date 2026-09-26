## Installazione e avvio

- **Server (Plesk, Docker + nginx)**: vedi `GUIDA-DEPLOY.md`.
- **In locale per sviluppare**: servono Node 20.6 o superiore e un MySQL raggiungibile. Compila `env/.env.local` con i tuoi valori, poi:

```bash
npm install
npx tsx --env-file=env/.env.local src/index.ts
```

Lo schema del database è in `sql/init.sql` (tabelle e dati di base: reparti e tipi di operazione).

# 📦 Palmare Magazzino

Applicazione per la gestione delle operazioni di magazzino tramite palmare.  
Il sistema consente la tracciabilità dei prodotti, delle movimentazioni e l’associazione ai frigoriferi, con integrazione al gestionale **Passepartout**.

---

## 🚀 Flusso Operativo

### Schermata 1: Selezione Reparto
- L’utente seleziona un reparto (es. Negozio, Cucina, …).

### Schermata 2: Selezione Operazione
- Operazioni disponibili:
  - **Scarico per Lavorazione** → utilizzo prodotto per preparazioni interne
  - **Carico da Produzione** → inserimento in magazzino di un prodotto creato (es. lasagne)
  - **Spostamento Magazzino** → spostamento di prodotto tra magazzini
  - **Carico da Fornitore** → inserimento da DDT in arrivo
- Le operazioni disponibili dipendono dal reparto selezionato.

### Schermata 3: Dettagli Operazione
Campi disponibili (con visibilità variabile):
- Addetto *(SelectSearch da Passepartout)*
- Magazzino From *(SelectSearch da Passepartout)*
- Magazzino To *(SelectSearch da Passepartout)*
- Data *(precompilata con data odierna)*
- Fornitore *(SelectSearch da Passepartout)*

**Campi per tipo operazione:**
- Scarico per Lavorazione → Addetto, Magazzino From, Data  
- Carico da Produzione → Addetto, Magazzino To, Data  
- Spostamento Magazzino → Addetto, Magazzino From, Magazzino To, Data  
- Carico da Fornitore → Addetto, Magazzino To, Fornitore, Data  

### Schermata 4: Inserimento Prodotti
Per ogni prodotto:
- Codice *(barcode o inserimento manuale)*  
- Dettagli prodotto *(readonly)*  
- Quantità *(con U.M. associata)*  
- Frigo *(SelectSearch dal DB interno, precompilato con ultimo valore usato)*  

### Schermata 5: Riepilogo
Mostra:
- Reparto
- Operazione
- Dettagli operazione
- Prodotti
- Addetto

**Al click su “OK”:**
1. Invio documento a Passepartout
2. Registrazione nel DB interno (frigoriferi) per tracciare il prodotto.

### Schermata 6: Grafici (solo desktop)
- Selezione prodotto + range date  
- Grafici per ogni frigo associato al prodotto, con relative temperature.  
- Temperature estratte da DB MicrosoftSQL.

---

## 📑 Anagrafiche

### Reparti
- ID
- Nome
- Descrizione

### Tipi Operazione
- ID
- Nome
- Descrizione  
- Associazione n↔n con Reparti

### Frigoriferi
- ID
- Nome
- Descrizione

### Operazioni
- ID
- Reparto ID
- Tipo Operazione ID
<!-- - Addetto ID -->
<!-- - Magazzino From ID -->
<!-- - Magazzino To ID -->
- Data
- Document ID (Passepartout)
<!-- - Fornitore ID -->

### Righe Operazione
- ID
- Operazione ID
<!-- - Prodotto [Cod univoco]
- Prodotto [Nome per leggibilità] -->
<!-- - Quantità -->
- Frigo ID

---

## 🛠️ Stack Tecnico

- **RDBMS**: MySQL  
- **Client**: React + Vite  
- **UI**: React Router + Mantine  
- **Server**: Node.js  
- **Grafici**: Grafana (da approfondire)  
- **Integrazione**:  
  - Passepartout API (`IMenu.GetArticoloAlias()`, `IMenu.GetDocumento()`)  
  - DB MicrosoftSQL per temperature frigoriferi  


### Domande e risposte
- Le entità Frigo nel nostro db dovranno essere associate a un Magazzino?
No perché un magazzino può avere anche 5 frigo al suo interno ed é un’informazione che non ci aiuta a livello operativo.


- Quando scarichiamo qualcosa (ad esempio Scarico per Lavorazione) dobbiamo dire al db dei frigoriferi che quel prodotto è stato scaricato? 
Sì ma lo gestiamo leggendo le quantità transate a posteriori. Passepartout ha traccia del magazzino e dei movimenti, se vogliamo leggere le giancenze i quel giorno lo leggiamo da lì, poi leggiamo nel nostro db in che frigo era per incrociare i dati delle temperature. I movimenti li abbiamo già, usiamo quelli perché andrebbero se no trasferiti tutti gli scontrini di vendita ogni giorno.


- Ovvero, nei grafici della temperatura, quando è che smettono di esserci dei dati? Con la progettazione attuale non esistono delle “date di fine”.
Vedi sopra 

- Dobbiamo farci dire da Luca quali operazioni sono selezionabili in Schermata 2 in base al reparto selezionato.
Per ora tutto su tutti.

- Magazzini, Addetti e Fornitore dopo che li peschiamo dal db Passepartout, dobbiamo salvarli nel nostro db con l’ID? No. Io nel nostro db terrei solo i frigoriferi e il suo link ai prodotti. Oppure con un codice univoco di qualche tipo, o altri dati?
Dupluchetei il meno possibile per evitare casini se non necessario

---

## 🛒 Gestione prodotti (ricerca / creazione da palmare)

Dal palmare si può cercare un prodotto per alias, cercarlo per descrizione, aggiungere un alias a un articolo esistente o crearne uno nuovo in Passepartout. Nell'inserimento prodotti dei documenti, se l'alias non esiste si propone di creare l'articolo al volo.

**Endpoint** (`/api/products/...`): `lookup` (per alias), `by-code`, `search` (per descrizione), `catalog` (IVA, unità, tipi alias, categorie), `create`, `add-alias`.

**Come funziona**
- Tutto passa dal web service SOAP di Passepartout (`GetArticolo`, `GetArticoloAlias`, `GetArticoli`, `PutArticolo`). **Nessun accesso diretto al DB MSSQL**, né in lettura né in scrittura, per queste funzioni.
- Ricerca per descrizione, categorie e prossimo codice usano un indice in memoria ricavato da `GetArticoli`: caricamento completo all'avvio (circa 30 secondi, in background), poi solo le modifiche recenti; ricarico completo ogni 6 ore.
- Il codice articolo va sempre passato a `PutArticolo` (Passepartout via SOAP non lo genera). Il pulsante "genera codice" di Passepartout usa un contatore interno che un articolo creato via SOAP **non** fa avanzare: per non produrre codici doppi il palmare usa un intervallo separato, `90001`-`99999` (vedi `PDA_CODE_FIRST` in `articleCatalog.ts`).
- Gli articoli nascono con prezzo 0 su tutti i listini; il prezzo lo imposta l'ufficio. Le aliquote IVA ammesse sono in `src/utils/passepartout/article/articleCatalog.ts`.
- Non esiste cancellazione articoli via SOAP: eventuali articoli di prova vanno eliminati a mano da Passepartout.

**Registro dei prodotti creati**: una riga JSON per evento in `logs/created-products.log` (in Docker: volume `./logs:/app/logs`, percorso configurabile con `CREATED_PRODUCTS_LOG_PATH`). Non contiene l'operatore: chi crea l'articolo lo registra già Passepartout.

## ⚙️ Configurazione operatori

`PASSEPARTOUT_EMPLOYEES_GROUP` (nei file `env/.env.*`): gruppo di Passepartout da cui prendere gli operatori mostrati nei palmari. Più gruppi separati da virgola; vuoto = tutti. Se il gruppo non esiste il palmare mostra un errore invece di far sparire il campo Operatore.

## 🏷️ Etichette barcode (Zebra di rete, ZPL)

In *Gestione prodotti*, una volta trovato il prodotto (per alias o per descrizione) compare il pannello "Etichetta barcode" con la quantità di etichette e il pulsante *Stampa etichetta* (`POST /api/products/print-label`).

- **Barcode EAN-8** = prefisso (`LABEL_EAN8_PREFIX`, default `99`) + codice interno a 5 cifre + cifra di controllo. Esempio: codice `20882` → `99208820`. La cifra di controllo la calcola anche la stampante (`^B8`). Gli articoli con codice non a 5 cifre numeriche (es. `PLU 0085`, a peso) non hanno etichetta.
- **Etichetta**: descrizione (da Passepartout) su due righe in alto, sotto il barcode. Misure `LABEL_WIDTH_MM` x `LABEL_HEIGHT_MM` (default 50 x 20 mm, larghezza x altezza) a `LABEL_PRINTER_DPI` (default 203). `LABEL_BARCODE_MODULE_DOTS` (default 3) regola la larghezza del barcode: 3 = circa 25 mm, 2 = circa 17 mm.
- **Stampante**: `LABEL_PRINTER_HOST` e `LABEL_PRINTER_PORT` (default 9100), invio grezzo su TCP. Con `LABEL_PRINTER_HOST` vuoto la stampa è disattivata e il palmare mostra un errore chiaro. Il server deve raggiungere la stampante in rete (in produzione il backend gira in Docker sul server).
- Massimo 100 etichette per richiesta.

**Ricerca del prodotto da un valore letto** (`POST /api/products/lookup`, usata anche dai documenti e dai grafici): si prova nell'ordine (1) alias esatto, (2) barcode delle nostre etichette (prefisso + codice a 5 cifre + controllo valido: da `99208820` si ricava `20882`), (3) codice prodotto diretto. Il passo 2 serve perché Passepartout riconosce quel formato alla cassa ma il web service no. La verifica di "alias già usato" (creazione prodotto, aggiunta alias) guarda invece solo gli alias veri.
