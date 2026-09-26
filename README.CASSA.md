# VPN L2TP/IPsec tra Host, Mikrotik e LAN Casa Del Formaggio

## Obiettivo
Permettere a un PC nella rete `192.168.1.0/24` (LAN Ufficio) di collegarsi via VPN al router Mikrotik, ottenendo un indirizzo IP della rete interna Mikrotik (`192.168.88.0/24`).

In questo modo il PC si comporta come se fosse collegato fisicamente alla rete Mikrotik.
Il Mikrotik, a sua volta, si collegherà tramite VPN al server di Casa del Formaggio (LAN `192.168.0.0/24`), rendendo accessibili i dispositivi interni, inclusa la cassa (`192.168.0.201`).

---

## Schema di rete


LAN BB's Way
   - Classe: 192.168.1.X
   - IP Host: 192.168.1.XXX
   - IP Mikrotik: 192.168.1.152
LAN Mikrotik
   - Classe: 192.168.88.X
LAN Casa del Formaggio
   - Classe: 192.168.0.X
   - IP Cassa: 192.168.0.201
---

## Configurazione Mikrotik VPN Lan Ufficio - LAN Mikrotik

### 1. Creazione del pool di indirizzi VPN
1. `IP → Pool → +`
2. **Name**: `office-vpn-pool`  
3. **Addresses**: `192.168.88.200-192.168.88.220`  
4. `Apply → OK`

---

### 2. Creazione di un profilo PPP per VPN LAN Ufficio - LAN Mikrotik
1. `PPP → Profiles → +`
2. **Name**: `office-vpn-profile`  
3. **Local Address**: `192.168.88.1`  
4. **Remote Address**: `office-vpn-pool`  
5. **DNS Server**: `192.168.88.1`  
7. `Apply → OK`

---

### 3. Creazione di un utente VPN
1. `PPP → Secrets → +`
2. **Name**: `sviluppo`  
3. **Password**: `***`  (MASTERPASSWORD)
4. **Service**: `l2tp`  
5. **Profile**: `vpn-profile`  
6. `Apply → OK`

---

### 4. Attivazione del server L2TP/IPsec
1. `PPP → Interfaces → L2TP Server`
3. **Enabled**: spuntato  
4. **Default Profile**: `office-vpn-profile`  
5. **Use IPsec**: spuntato  
6. **IPsec Secret**: `TUOSEGRETO`  (MASTERPASSWORD)
7. `Apply → OK`

---


### 5. Configurazione della VPN con Casa Del Formaggio
1. `Files → + → import`
2. Caricare il file `ca.crt`, `user.crt`, `user.key` (forniti da CDF)
3. `System → Certificates`
4. Importare i certificati `ca.crt`, `user.crt`, `user.key` (Nel seguente ordine)
5. `PPP → Interface → + → OVPN Client`
6. Impostare:
   - **Name**: `ovpn-cdf-server`  
   - **Connect To**: `188.12.139.253`
   - **Port**: `1494`
   - **User**: `luca.corradi`
   - **Password**: `***`
   - **Profile**: `default-encryption`
   - **Certificate**: `user.crt` 

### 6. Configurazione del routing
1. `IP → Routes → +`
2. **Dst. Address**: `192.168.0.0/24`, **Gateway**: `ovpn-cdf-server`
3. `Apply → OK`
4. `IP → Firewall → NAT → +`
5. **Chain**: `srcnat`, **Src. Address**: `192.168.88.0/24`, **Src. Address**: `192.168.0.0/24`, **Out. Interface**: `ovpn-cdf-server`, **Action**: `masquerade`
6. `Apply → OK`


---


## Configurazione Windows (Client VPN)

1. Vai su: **Impostazioni → Rete e Internet → VPN → Aggiungi connessione VPN**  
2. Imposta:
   - **Provider**: Windows (integrato)  
   - **Nome**: `VPN Mikrotik`  
   - **Server**: `192.168.1.152`  
   - **Tipo**: `L2TP/IPsec con chiave precondivisa`  
   - **Chiave precondivisa**: `TUOSEGRETO`  (MASTERPASSWORD)
   - **Nome utente**: `sviluppo`  
   - **Password**: quella impostata in Mikrotik  
3. Salva → Connetti

---

## Configurazione Debian (Client VPN)