/* Nails by Jen – service worker. Keeps the app opening fast and working offline.
   Change the version number below whenever you upload a new index.html, so the phone picks it up. */
const VERSION = "nbj-v1";
const SHELL = ["./", "./index.html", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];
const LIBS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const keyOf = req => { const u = new URL(req.url); return u.origin + u.pathname; };   /* ignore ?owner and ?cache-busters */

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isLib = LIBS.includes(url.hostname) || (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/"));
  if (url.origin !== location.origin && !isLib) return;          /* Firebase data and login always go straight to the network */

  if (isLib) {                                                    /* fonts + Firebase scripts: cache first */
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      const res = await fetch(req); if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res;
    }).catch(() => caches.match(req)));
    return;
  }
  /* your own files: network first (always the newest), cached copy when offline */
  e.respondWith(fetch(req).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(keyOf(req), copy)); }
    return res;
  }).catch(async () => (await caches.match(keyOf(req))) || (req.mode === "navigate" ? caches.match("./index.html") : Response.error())));
});
