# Guida al deploy del gestionale PDA su Plesk (host `pda.cdf`)

Backend in **Docker**, frontend statico servito da **nginx di Plesk**, database **MySQL** di Plesk.

```
palmare ──► nginx (Plesk)  pda.cdf
              ├── /        →  file statici del frontend (httpdocs)
              └── /api/    →  127.0.0.1:8787  →  container Docker "backend"
                                                    ├── MySQL di Plesk (127.0.0.1:3306)
                                                    ├── Passepartout SOAP   (192.168.0.201:7610)
                                                    ├── DB frigoriferi      (192.168.0.104:1433)
                                                    └── Stampante Zebra     (192.168.0.125:9100)
```

## Cosa c'è nel pacchetto

```
GUIDA-DEPLOY.md         questa guida
backend/                codice del backend + Dockerfile + docker-compose.yml
  env.production.example   modello del file di configurazione (.env)
  nginx-plesk.conf         direttive da incollare in Plesk
  sql/init.sql             schema del database + dati di base
frontend/               sito già compilato (da copiare in httpdocs)
frontend-sorgenti/      sorgenti del frontend (servono solo per ricompilarlo negli aggiornamenti)
```

Il frontend è già compilato con l'indirizzo API relativo `/api`: funziona su qualunque host e con http o https,
senza dover ricompilare.

---

## 0. Prerequisiti (da controllare una volta)

**Sul server Plesk** (via SSH):
```
docker --version
docker compose version     # deve funzionare "docker compose" (con lo spazio)
```

**Dal server, la rete del negozio deve essere raggiungibile.** Il backend gira con la rete del server, quindi vale
quello che vede il server. Controllali da SSH (ognuno deve rispondere "ok"):
```
curl -s -m 5 -o /dev/null -w "Passepartout SOAP: HTTP %{http_code}\n" "http://192.168.0.201:7610/?wsdl"
timeout 5 bash -c '</dev/tcp/192.168.0.104/1433' && echo "DB frigoriferi: ok"
timeout 5 bash -c '</dev/tcp/192.168.0.201/3306' && echo "DB Passepartout: ok"
timeout 5 bash -c '</dev/tcp/192.168.0.125/9100' && echo "Stampante etichette: ok"
```
Se uno non risponde, il problema è di rete/VPN/firewall tra il server e quella macchina, non dell'app: sistemalo prima
di andare avanti (le stampe di etichette e i documenti in Passepartout dipendono da questi).

**Sui palmari e sui PC**: il nome `pda.cdf` deve risolvere all'indirizzo del server. `.cdf` non è un dominio pubblico:
serve un record nel DNS del router/della rete (oppure una voce nel file hosts dei dispositivi). Verifica da un
palmare/PC con `ping pda.cdf`.

---

## 1. Crea il sito in Plesk

Plesk → *Siti web e domini* → *Aggiungi dominio* → `pda.cdf` (sito vuoto, "Hosting web").

**HTTP o HTTPS?** Un nome interno come `pda.cdf` non può avere un certificato Let's Encrypt. Le strade:
- **HTTP semplice** (la più semplice): i palmari leggono i codici a barre come tastiera, non serve HTTPS. In Plesk →
  *Hosting e DNS* → *Sicurezza* (o *Impostazioni hosting*) togli il reindirizzamento automatico HTTP → HTTPS.
  In `.env` metterai `CLIENT_URL=http://pda.cdf`.
- **HTTPS con certificato autofirmato / della tua rete**: funziona, ma ogni palmare deve fidarsi del certificato.
  In `.env` metterai `CLIENT_URL=https://pda.cdf`.

## 2. Crea il database MySQL

1. Plesk → *Database* → *Aggiungi database*: nome es. `cdf_warehouse_pda`, e un utente dedicato con password
   (permessi solo su quel database). Segna **nome database, utente e password**: servono al passo 3.
2. Importa lo schema, con **una** di queste due strade:
   - **phpMyAdmin** (Plesk → Database → *Strumenti Web* → phpMyAdmin) → scegli il database → *Importa* → seleziona
     `backend/sql/init.sql` → *Esegui*.
   - **Da SSH**: `mysql -u UTENTE -p cdf_warehouse_pda < backend/sql/init.sql`
3. Controlla: nel database devono esserci 5 tabelle (`departments`, `operation_types`, `departments_operation_types`,
   `operations`, `operation_rows`), con 2 reparti (Negozio, Cucina) e 4 tipi di operazione. Il file è ripetibile senza
   danni. I nomi dei reparti e quali operazioni compaiono per quale reparto si modificano direttamente nelle tabelle.

> **Vuoi tenere lo storico del vecchio server** (movimenti già fatti e frigoriferi associati, che servono ai grafici)?
> Invece di `init.sql` importa un dump del vecchio database:
> `mysqldump -u UTENTE -p NOME_VECCHIO_DB > dump.sql` sul vecchio server, poi importa `dump.sql` qui.
> Non serve importare anche `init.sql`.

## 3. Backend (Docker)

Sul server, in una cartella **fuori dalla document root**, es. `/var/www/vhosts/pda.cdf/pda-backend/`:

1. Copia lì il **contenuto** della cartella `backend/` del pacchetto (con scp/SFTP o il File Manager di Plesk).
2. Crea il file di configurazione e compilalo:
   ```
   cd /var/www/vhosts/pda.cdf/pda-backend
   cp env.production.example .env
   nano .env
   ```
   Da compilare: `DB_NAME`, `DB_USER`, `DB_PASSWORD` (quelli del passo 2), `PASSEPARTOUT_SOAP_USER/PASSWORD`,
   `PASSEPARTOUT_DB_USER/PASSWORD`, `FRIDGES_DB_USER/PASSWORD` e `CLIENT_URL` (`http://pda.cdf` o `https://pda.cdf`).
   Gli altri valori (indirizzi, stampante, misure etichette, gruppo operatori, magazzini da nascondere) sono già impostati: controllali. In particolare `PASSEPARTOUT_HIDDEN_WAREHOUSES=Magazzino predefinito` nasconde nei palmari i magazzini elencati (nomi separati da virgola).
   Una password con `$` va scritta con `$$`. Poi proteggi il file: `chmod 600 .env`.
3. Crea la cartella del registro prodotti e avvia:
   ```
   mkdir -p logs
   docker compose up -d --build
   ```
   La prima volta scarica l'immagine di Node e installa le dipendenze: qualche minuto.
4. Guarda che parta bene:
   ```
   docker compose logs -f backend
   ```
   Devi vedere, in ordine: `DataSource connected`, `PassepartoutDataSource connected`, `FridgeDataSource connected`,
   `Server is running at http://127.0.0.1:8787`, e dopo circa 30 secondi
   `[products]: indice caricato (... articoli letti ...)`. Esci dai log con Ctrl+C (il container resta acceso).
5. Prova l'API dal server:
   ```
   curl http://127.0.0.1:8787/api/whoami        # → I am online!
   curl http://127.0.0.1:8787/api/departments   # → i due reparti
   ```

Il container si riavvia da solo se il server viene riavviato (`restart: unless-stopped`).

> **Il backend ascolta solo su `127.0.0.1`** (variabile `LISTEN_HOST` nel `docker-compose.yml`). L'API non ha
> autenticazione e può creare documenti in Passepartout: non deve essere raggiungibile dalla rete, ci arriva solo
> nginx. Non aprire la porta 8787 nel firewall.

## 4. Frontend

Copia il **contenuto** della cartella `frontend/` del pacchetto nella document root del dominio (di solito
`/var/www/vhosts/pda.cdf/httpdocs/`), sostituendo i file di prova di Plesk (es. `index.html` predefinito).
Devono trovarsi direttamente in `httpdocs/`: `index.html`, la cartella `assets/`, `cdf_logo.png`, `.htaccess`.

## 5. Direttive nginx (collegano `/api` al backend)

Plesk → *Siti web e domini* → `pda.cdf` → *Impostazioni Apache e Nginx* → **"Direttive aggiuntive per nginx"** →
incolla il contenuto di `backend/nginx-plesk.conf` → *OK*. Plesk ricarica nginx da solo. Se ci sono due campi
(HTTP e HTTPS) incollale in quello che usi.

Se Plesk rifiuta le direttive con "duplicate location" hai incollato un altro blocco `location /`: tieni solo
quello di `nginx-plesk.conf` (vedi i commenti nel file).

## 6. Verifica finale

Da un PC o da un palmare in rete:

1. Apri `http://pda.cdf` (o https): appare la scelta del **reparto** (Negozio / Cucina) e il pulsante *Gestione prodotti*.
2. Da SSH, tramite nginx: `curl http://pda.cdf/api/whoami` → `I am online!`.
3. **Operatori**: scegli un reparto e un'operazione: nell'elenco *Operatore* devono comparire solo le persone del
   gruppo `palmarimagazzino`, e **Magazzino** deve mostrare i magazzini senza quelli nascosti (niente "Magazzino predefinito"). Nel carico da fornitore il campo *Fornitore* ha la ricerca testuale. Se compare un errore "Nessun operatore nel gruppo": in Passepartout ogni operatore deve
   avere la scheda *Personale* **e** essere nel gruppo (l'assegnazione al solo utente non basta).
4. **Gestione prodotti**: scansiona un codice a barre di un prodotto esistente → compare la scheda. Prova anche una
   scansione di un'etichetta stampata (`99...`).
5. **Etichetta**: nella scheda di un prodotto imposta 1 e premi *Stampa etichetta*: deve uscire dalla Zebra.
6. **Documento di prova**: fai un movimento vero con un articolo di prova (ad esempio un carico), conferma e controlla
   in Passepartout che il documento sia stato creato. *Attenzione: la conferma crea davvero il documento.*

## Dopo la messa in servizio

- **Nuovi articoli da palmare**: senza categoria e a prezzo zero (li completa l'ufficio), alias sempre di tipo `Generico`.
- **Codici dei prodotti creati da palmare**: partono da **90001** (intervallo separato dal contatore di "genera
  codice" di Passepartout, che un articolo creato dal web service non fa avanzare). Prezzo a zero: lo imposta l'ufficio.
- **Registro dei prodotti creati**: `pda-backend/logs/created-products.log`, una riga JSON per prodotto creato o alias
  aggiunto. Non contiene l'operatore (lo registra già Passepartout).
- **Articoli di prova**: se ne crei durante i test, elimina a mano da Passepartout (via web service non si possono
  cancellare).
- **Backup**: il database segue i backup Plesk dei database. Aggiungi ai backup anche `pda-backend/` (contiene `.env`
  e il registro `logs/`). Il file `.env` ha le password: tienilo fuori da git e dal sito.

## Aggiornare l'app in futuro

**Backend** (sul server, nella cartella con `docker-compose.yml`): sostituisci i file del codice con quelli nuovi
(**non** toccare `.env` e `logs/`). Se la versione nuova ha variabili in più, confronta `.env` con `env.production.example` e aggiungi quelle che mancano (per esempio `PASSEPARTOUT_HIDDEN_WAREHOUSES`). Poi:
```
docker compose up -d --build
docker compose logs -f backend
```
Se dopo un aggiornamento vedi errori che sembrano già corretti, prima verifica che sul server ci siano davvero i file
nuovi (un'estrazione parziale sopra la cartella vecchia è la causa più comune); poi ricostruisci senza cache:
`docker compose build --no-cache && docker compose up -d`.

**Frontend** (sul PC di sviluppo, con **Node 20.19 o superiore**):
```
cd frontend-sorgenti
npm install
npm run build:prod
```
poi carica il contenuto della cartella `dist/` in `httpdocs/`, sovrascrivendo. Se il browser mostra ancora la versione
vecchia è cache: Ctrl+Shift+R.

**Modificare la configurazione** (stampante, misure etichette, gruppo operatori, magazzini nascosti...): modifica `.env` e riavvia:
`docker compose up -d --force-recreate`.

## Comandi utili

```
docker compose ps                    # stato del container
docker compose logs --tail 100 backend
docker compose restart backend
docker compose down                  # ferma e rimuove il container (dati e logs restano)
```

## Risoluzione problemi

| Sintomo | Causa probabile e rimedio |
|---|---|
| Pagina bianca / 404 aprendo `http://pda.cdf/products` | Mancano `error_page 404 /index.html;` e `proxy_intercept_errors on;` (passo 5), o sono nella sezione HTTP/HTTPS sbagliata. |
| **502 Bad Gateway** su `/api/...` | Il backend non risponde: `docker compose ps` e `docker compose logs backend`. Controlla che ascolti su 127.0.0.1:8787 e che nginx punti a quella porta. |
| Nei log `ER_ACCESS_DENIED_ERROR` (MySQL) | Utente o password del database sbagliati in `.env`, oppure l'utente non ha permessi sul database. Con password che contengono `$` ricordati il raddoppio (`$$`). |
| Nei log `PassepartoutDataSource`/`FridgeDataSource failed` | Rete: il server non raggiunge 192.168.0.201 / 192.168.0.104 (vedi prerequisiti), o credenziali sbagliate in `.env`. |
| Errore all'apertura del reparto: "DataSource failed to connect" | Il backend controlla tutti i database a ogni richiesta: se uno non risponde, tutte le chiamate falliscono. Guarda quale nei log. |
| Subito dopo un riavvio la prima ricerca per descrizione o la prima creazione di un prodotto ci mettono circa 30 secondi | Il backend sta caricando l'elenco articoli da Passepartout. Riprova dopo `indice caricato` nei log. |
| "Nessun magazzino da mostrare" | `PASSEPARTOUT_HIDDEN_WAREHOUSES` nasconde tutti i magazzini di Passepartout: correggi l'elenco in `.env` e ricrea il container. |
| "Nessun operatore nel gruppo ..." | Vedi punto 3 della verifica finale: scheda *Personale* + gruppo `palmarimagazzino`. |
| "Stampante ... non raggiungibile" | Il server non arriva a 192.168.0.125:9100 (rete/firewall) oppure `LABEL_PRINTER_HOST` è sbagliato o vuoto. |
| Etichetta tagliata o con il barcode fuori posto | Misure o risoluzione: `LABEL_WIDTH_MM`, `LABEL_HEIGHT_MM`, `LABEL_PRINTER_DPI` in `.env`, poi `docker compose up -d --force-recreate`. |
| Il palmare non trova `pda.cdf` | DNS/hosts: il nome deve risolvere all'IP del server. |
| Compare il vecchio sito dopo un aggiornamento del frontend | Cache del browser (Ctrl+Shift+R) o file non sovrascritti in `httpdocs`. |
