# Deploy su Plesk — PDA magazzino

```
palmari e PC (VPN) ──► https://pda.lacdf.it ──► nginx di Plesk ──► /      file statici (document root)
                                                                └─► /api/ 127.0.0.1:8789 ──► pda_backend
                                                                                             ├── MySQL del PDA  (172.18.20.1, rete cdfnet)
                                                                                             ├── Passepartout SOAP (192.168.0.201:7610)
                                                                                             ├── DB Passepartout, sola lettura (192.168.0.201)
                                                                                             ├── DB frigoriferi (192.168.0.104:1433)
                                                                                             └── Zebra etichette (192.168.0.125:9100)
```

Backend in Docker nella rete `cdfnet`, porta **8789** solo su localhost. Il codice arriva da GitHub con **Git di Plesk**; dopo
ogni aggiornamento si lancia sul server `deploy/aggiorna-server.sh`, che compila il frontend, lo copia nella document root e
ricostruisce il backend. Sul PC non si prepara niente (niente più zip).

> **L'API non ha autenticazione e può creare documenti in Passepartout**: si raggiunge solo dalla VPN (record DNS sull'IP
> interno) e la porta 8789 resta su localhost. Non aprirla nel firewall.

## 0. Passaggio dalla vecchia installazione (`pda.cdf`, due repository, zip)

Da fare **una volta**, poi si segue questa guida come per una prima installazione:

1. Il **database resta lo stesso**: nel nuovo `.env` si rimettono `DB_NAME`, `DB_USER`, `DB_PASSWORD` del vecchio (si
   copiano da `/var/www/vhosts/pda.cdf/pda-backend/.env` insieme alle credenziali di Passepartout e frigoriferi). Non serve `init.sql`.
2. Spegni il vecchio container prima di avviare il nuovo (hanno lo stesso nome `pda_backend` e la stessa porta):
   ```
   cd /var/www/vhosts/pda.cdf/pda-backend && docker compose down
   ```
3. Il registro dei prodotti creati: copia `/var/www/vhosts/pda.cdf/pda-backend/logs/created-products.log` in
   `logs/` della nuova cartella (passo 4), prima di avviare.
4. Il dominio `pda.cdf` può restare acceso finché tutti i palmari aprono `https://pda.lacdf.it` (vedi "Palmari datati" in
   fondo): le sue direttive nginx puntano già a `127.0.0.1:8789`, quindi parla con il backend nuovo, ma mostra il frontend
   che ha in `httpdocs` e non riceve gli aggiornamenti. Quando non serve più, in Plesk togli `pda.cdf` e la vecchia cartella
   `pda-backend` (dopo aver copiato il registro, punto 3).

## 1. Database

Solo per un'installazione da zero: Plesk → *Database* → *Aggiungi database* (es. `cdf_warehouse_pda`), utente
**ammesso da `172.18.20.%`**, poi importa `deploy/sql/init.sql` (phpMyAdmin → Importa, oppure
`mysql -u UTENTE -p cdf_warehouse_pda < deploy/sql/init.sql`). Il file è ripetibile senza danni.

## 2. Dominio

1. DNS di `lacdf.it`: record **A** `pda` → **IP interno** del server. Dal negozio `nslookup pda.lacdf.it` deve dare quell'IP.
2. Plesk → *Aggiungi sottodominio* `pda` di `lacdf.it`. Annota la **document root** (Hosting → "Document root").
3. *Hosting*: spunta "Supporto SSL/TLS", certificato **`*.lacdf.it`**, "Reindirizzamento permanente 301 da HTTP a HTTPS".

## 3. Codice sul server (Git di Plesk, repository privato)

1. Plesk → abbonamento `lacdf.it` → **Git** → *Aggiungi repository* → **Repository remoto**, URL
   `git@github.com:LucaCorradi/gestionale-pda.git` (forma SSH). Copia la **chiave SSH pubblica** che compare.
2. GitHub → repository → *Settings* → **Deploy keys** → *Add deploy key*: incolla, "Allow write access" **spento**.
3. Plesk: ramo `main`, deploy **Manuale**, percorso `gestionale-pda` (fuori dalla document root), niente azioni
   aggiuntive → *Deploy*.

## 4. Configurazione

```
cd /var/www/vhosts/lacdf.it/gestionale-pda
cp .env.production.example .env
nano .env
chmod 600 .env
mkdir -p logs
```
Da compilare: `DOCROOT` (la document root del punto 2.2), `DB_*`, `PASSEPARTOUT_SOAP_USER/PASSWORD`,
`PASSEPARTOUT_DB_USER/PASSWORD`, `FRIDGES_DB_USER/PASSWORD`. Gli altri valori (indirizzi, stampante, misure etichette, gruppo
operatori, magazzini nascosti) sono già impostati: controllali. Un `$` nelle password va scritto `$$`.

## 5. Prerequisiti di rete (una volta)

Dal server devono rispondere le macchine del negozio (il container esce passando dal server):
```
docker network ls | grep cdfnet
curl -s -m 5 -o /dev/null -w "Passepartout SOAP: HTTP %{http_code}\n" "http://192.168.0.201:7610/?wsdl"
timeout 5 bash -c '</dev/tcp/192.168.0.104/1433' && echo "DB frigoriferi: ok"
timeout 5 bash -c '</dev/tcp/192.168.0.201/3306' && echo "DB Passepartout: ok"
timeout 5 bash -c '</dev/tcp/192.168.0.125/9100' && echo "Stampante etichette: ok"
```
Se uno non risponde il problema è di rete/VPN/firewall, non dell'app.

## 6. Avvio

Da SSH come root:
```
cd /var/www/vhosts/lacdf.it/gestionale-pda
bash deploy/aggiorna-server.sh
docker compose logs -f backend
```
Nei log, in ordine: dove si collega ogni database (mai la password), `DataSource connected`, `PassepartoutDataSource connected`,
`FridgeDataSource connected`, `Server is running`, e dopo circa 30 secondi `[products]: indice caricato`. Controllo:
`curl http://127.0.0.1:8789/api/health` → `{"ok":true}`; `docker port pda_backend` → `8789/tcp -> 127.0.0.1:8789`.

## 7. nginx

Plesk → `pda.lacdf.it` → *Impostazioni Apache e Nginx* → "Direttive aggiuntive per nginx", sezione **HTTPS** → incolla
`deploy/nginx-pda.conf`.

## 8. Verifica finale

1. Apri `https://pda.lacdf.it` dal negozio: scelta del **reparto** e pulsante *Gestione prodotti*.
2. **Operatori**: scegli reparto e operazione; in *Operatore* solo le persone del gruppo `palmarimagazzino`, in *Magazzino*
   niente "Magazzino predefinito".
3. **Gestione prodotti**: scansiona un prodotto esistente e un'etichetta stampata (`99...`).
4. **Etichetta**: dalla scheda di un prodotto *Stampa etichetta* → esce dalla Zebra.
5. **Documento di prova**: un movimento vero con un articolo di prova, poi controlla in Passepartout. *La conferma crea
   davvero il documento.*
6. **Installazione sui palmari**: apri `https://pda.lacdf.it` con **Chrome** → menu ⋮ → *Installa app* (o *Aggiungi a
   schermata Home*). Compare l'icona "PDA" e il PDA si apre senza barre del browser. Può prendere il posto del contenitore
   kiosk. Su `http://pda.cdf` non si installa: serve HTTPS.

## Aggiornare in futuro

1. Sul PC: `npm run build` in `backend` e in `frontend` (in sviluppo i tipi non si controllano), commit e push.
2. Plesk → Git → **Scarica aggiornamenti** e **Deploy**. Il `.env` e `logs/` restano.
3. SSH come root: `cd /var/www/vhosts/lacdf.it/gestionale-pda && bash deploy/aggiorna-server.sh`.
4. Versione vecchia nel browser o sul palmare = cache: Ctrl+Shift+R (sul palmare, svuota la cache di Chrome).

Cambiare la configurazione (stampante, misure etichette, gruppo operatori, magazzini nascosti): modifica `.env`, poi
`docker compose up -d --force-recreate`. I formati dei barcode a quantità variabile (`backend/config/barcode-variabili.json`)
si modificano **nel repository** e si pubblicano con un aggiornamento: una modifica fatta solo sul server viene sovrascritta.

## Backup

- Database: backup dei database di Plesk.
- `gestionale-pda/.env` (password) e `gestionale-pda/logs/` (registro dei prodotti creati): aggiungerli ai backup.

## Problemi specifici di questa app

Per quelli generali (DNS, certificato, nginx, Docker) vedi `trappole.md` della skill `plesk-webapp`.

| Sintomo | Causa e rimedio |
|---|---|
| `container name "/pda_backend" is already in use` | Gira ancora il vecchio container: passo 0.2. |
| Nei log `PassepartoutDataSource`/`FridgeDataSource failed` | Rete (passo 5) o credenziali nel `.env`. `/api/health` resta ok: controlla solo il DB del PDA. |
| Errore all'apertura del reparto: "DataSource failed to connect" | Le API controllano tutti i database a ogni richiesta: se uno non risponde, falliscono tutte. Guarda quale nei log. |
| La prima ricerca dopo un riavvio dura circa 30 secondi | Il backend carica l'elenco articoli da Passepartout: riprova dopo `indice caricato`. |
| "Nessun operatore nel gruppo ..." | In Passepartout ogni operatore deve avere la scheda *Personale* **e** essere nel gruppo. |
| "Nessun magazzino da mostrare" | `PASSEPARTOUT_HIDDEN_WAREHOUSES` nasconde tutto: correggi e ricrea il container. |
| "Stampante ... non raggiungibile" | Il server non arriva a 192.168.0.125:9100, o `LABEL_PRINTER_HOST` vuoto/sbagliato. |
| Etichetta tagliata | `LABEL_WIDTH_MM`, `LABEL_HEIGHT_MM`, `LABEL_PRINTER_DPI` nel `.env`, poi `--force-recreate`. |
| **Palmari datati**: errore di certificato o pagina che non si apre su `https://pda.lacdf.it` | I palmari con Android molto vecchio possono non riconoscere il certificato o il TLS moderno. Prima prova con **Chrome** aggiornato invece del contenitore kiosk. Se non basta, lascia a quel palmare `http://pda.cdf` (passo 0.4), sapendo che il suo frontend resta fermo alla versione caricata a mano. |
| **Palmare datato**: il PDA installato come app si chiude appena aperto, in Chrome invece funziona | Disinstalla l'app, apri **una volta** `https://pda.lacdf.it/?app=no` in Chrome, poi menu ⋮ → *Aggiungi a schermata Home*: senza manifest Chrome crea il semplice collegamento, come prima. Vale solo per quel palmare (`?app=si` torna indietro). |
