// Service worker minimo: serve solo a rendere il PDA installabile sui palmari. Non mette in cache niente di proposito:
// ogni operazione passa comunque da Passepartout, e una cache terrebbe i palmari sulla versione vecchia dopo un aggiornamento.
//
// Niente gestore "fetch", neanche vuoto: Chrome recente salta i gestori vuoti, ma la WebView delle app kiosk (Chromium
// più vecchio) fa passare ogni chiamata all'API dal service worker e lì fallisce ("Errore durante il fetch dei reparti",
// 30/10/2026). Per installare l'app Chrome non lo chiede più (dalla versione 108 su Android).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
