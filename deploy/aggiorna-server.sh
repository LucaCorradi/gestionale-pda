#!/usr/bin/env bash
# Aggiorna PDA sul server dopo che Plesk (Git) ha scaricato il codice nuovo. Da lanciare come root, dalla
# cartella del repository (quella con docker-compose.yml e .env):
#
#   bash deploy/aggiorna-server.sh
#
# 1. compila le interfacce in un container Node (sul server non serve installare Node);
# 2. le copia nelle loro document root (variabili DOCROOT_* nel .env), lasciando stare .well-known (certificati);
#    un'interfaccia con la variabile vuota si salta (si può partire da una sola);
# 3. ricostruisce e riavvia il backend: le migrazioni del database si applicano da sole all'avvio;
# 4. aspetta che /api/health risponda.
# Si può rilanciare quante volte si vuole.
set -euo pipefail

# Interfacce da compilare: "cartella:VARIABILE_DEL_.env_con_la_document_root". La prima è obbligatoria.
INTERFACCE=("frontend:DOCROOT")
NODE_IMMAGINE="node:24-bookworm-slim"
SERVIZIO="backend"   # nome del servizio in docker-compose.yml

RADICE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RADICE"

passo() { printf '\n== %s\n' "$1"; }
errore() { printf 'ERRORE: %s\n' "$1" >&2; exit 1; }

[ -f .env ] || errore "manca il file .env in $RADICE (copia .env.production.example e compilalo)"
# valore di una variabile del .env, vuoto se la riga manca
leggi_env() { { grep -E "^$1=" .env || true; } | tail -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }
PORTA="$(leggi_env PORT)"
PORTA="${PORTA:-8789}"
command -v rsync >/dev/null || errore "manca rsync (apt install rsync)"

# I file compilati appartengono a chi possiede il repository (l'utente di Plesk), non a root: così il prossimo
# aggiornamento da Plesk non trova file che non può toccare
PROPRIETARIO="$(stat -c '%u:%g' "$RADICE")"

prima=1
for voce in "${INTERFACCE[@]}"; do
  cartella="${voce%%:*}"
  variabile="${voce#*:}"
  docroot="$(leggi_env "$variabile")"
  if [ -z "$docroot" ]; then
    [ "$prima" = 1 ] && errore "$variabile non impostato nel .env"
    passo "$cartella saltata: $variabile non impostato nel .env"
    continue
  fi
  prima=0
  [ -d "$docroot" ] || errore "la document root $docroot non esiste (crea prima il dominio in Plesk)"

  passo "Compilo $cartella (API relativa /api)"
  docker run --rm -u "$PROPRIETARIO" -e HOME=/tmp -e VITE_API_URL=/api -e npm_config_cache=/tmp/.npm \
    -v "$RADICE/$cartella:/app" -w /app "$NODE_IMMAGINE" sh -c "npm ci --no-audit --no-fund && npm run build"

  passo "Copio $cartella/dist in $docroot"
  # --delete toglie i file della versione precedente: la document root deve contenere SOLO questa interfaccia
  rsync -a --delete --exclude=.well-known --chown="$(stat -c '%U:%G' "$docroot")" "$RADICE/$cartella/dist/" "$docroot/"
done

passo "Ricostruisco e riavvio il backend"
docker compose up -d --build

passo "Attendo che il backend risponda"
for _ in $(seq 1 30); do
  # /api/health risponde 503 se il database non c'è: aspetta anche quello
  if curl -fsS "http://127.0.0.1:$PORTA/api/health" >/dev/null 2>&1; then
    printf '\nAggiornamento completato (commit %s).\n' "$(git -C "$RADICE" rev-parse --short HEAD 2>/dev/null || echo '?')"
    exit 0
  fi
  sleep 2
done
docker compose logs --tail=60 "$SERVIZIO"
errore "il backend non risponde dopo un minuto: guarda i log qui sopra"
