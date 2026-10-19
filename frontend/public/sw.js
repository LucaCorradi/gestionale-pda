// Service worker minimo: serve solo a rendere il PDA installabile sui palmari. Non mette in cache niente di proposito:
// ogni operazione passa comunque da Passepartout, e una cache terrebbe i palmari sulla versione vecchia dopo un aggiornamento.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
