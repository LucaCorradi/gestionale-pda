## Avvio del Progetto in Locale

Per avviare il progetto in locale, utilizza il comando seguente:

```bash
DOCKER_TAG=local-$(date +%F) docker compose --env-file ./env/.env.local -f docker-compose.yml -f docker-compose.local.yml --project-name "cdf_warehouse_pda" up -d
```

Questo comando avvierà i container Docker necessari per il progetto.

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