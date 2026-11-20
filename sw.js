/*
 * Cartellino - funzionamento senza rete della pagina web (PWA).
 * - pagine: prima la rete (versione aggiornata), senza rete l'ultima copia salvata;
 * - file del programma e icone: dalla copia salvata (cambiano nome a ogni versione);
 * - elenco clienti (licenze.json): SEMPRE dalla rete, mai dalla copia (serve al blocco licenza).
 * "202611200925" viene sostituito a ogni pubblicazione.
 */
const CACHE = "cartellinoprova-202611200925";
const PAGES = ["./", "attiva", "privacy", "login", "home", "leave", "invito", "azienda.html", "manifest.json", "icon-192.png", "apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(PAGES.map((p) => c.add(p).catch(() => undefined))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("cartellinoprova-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("licenze.json")) return; // sempre dalla rete

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => {
          const c = await caches.open(CACHE);
          return (await c.match(url.pathname)) || (await c.match(req, { ignoreSearch: true })) || (await c.match("./")) || Response.error();
        })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
