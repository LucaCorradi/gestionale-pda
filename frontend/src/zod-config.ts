import { z } from "zod"

// Zod 4 per andare più veloce genera codice JavaScript a runtime (new Function) con lo spread negli oggetti: il bundle
// legacy non lo può tradurre e la WebView vecchia dei kiosk si ferma con "Unexpected token ..." alla prima validazione
// (i reparti, 30/10/2026). Senza JIT Zod usa il percorso normale, già tradotto dal bundle legacy.
//
// Zod legge l'impostazione quando CREA uno schema, non quando lo usa: questo file va importato per primo in main.tsx,
// prima di qualunque modulo che definisce schemi.
z.config({ jitless: true })
