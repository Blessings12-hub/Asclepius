// Asclepius service worker: lets the app open and show what you used before, even with no signal.
const SHELL = "asclepius-shell-v8", DATA = "asclepius-data-v8";
const PRECACHE = ["/", "/manifest.json", "/icon.svg", "/icon-192.png", "/apple-touch-icon.png", "/404.html"];
const NEVER = /^\/api\/(backup|anki|health|cron|login|logout)/; // never stored: exports, backups, status, sign-in
const BIG = 15 * 1024 * 1024; // do not keep uploaded files larger than this

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener("activate", (e) =>
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL && k !== DATA).map((k) => caches.delete(k)))).then(() => self.clients.claim())));

const put = (name, req, res) => { const cp = res.clone(); caches.open(name).then((c) => c.put(req, cp)).catch(() => {}); };

// try the network first; if it fails or is slow, use the saved copy
function networkFirst(req, name, ms = 6000) {
  return new Promise((resolve) => {
    let done = false;
    const fallback = () => caches.match(req, { ignoreSearch: false }).then((hit) => hit || null);
    const timer = setTimeout(async () => { const hit = await fallback(); if (hit && !done) { done = true; resolve(hit); } }, ms);
    fetch(req).then(async (res) => {
      clearTimeout(timer);
      if (res.ok) {
        const len = +res.headers.get("content-length") || 0;
        if (len < BIG) put(name, req, res);
      }
      if (!done) { done = true; resolve(res); }
    }).catch(async () => {
      clearTimeout(timer);
      const hit = await fallback();
      if (!done) { done = true; resolve(hit || Response.error()); }
    });
  });
}
// show the saved copy straight away and refresh it in the background
function staleWhileRevalidate(req, name) {
  return caches.open(name).then((c) => c.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
    return hit || net.then((r) => r || Response.error());
  }));
}

self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || r.headers.has("range")) return;
  if (u.origin !== location.origin) {
    // the 3D viewer script, so lessons with models still open offline
    if (u.hostname === "cdnjs.cloudflare.com") e.respondWith(staleWhileRevalidate(r, SHELL));
    return;
  }
  if (NEVER.test(u.pathname)) return;
  if (u.pathname.startsWith("/api/") || u.pathname.startsWith("/files/")) { e.respondWith(networkFirst(r, DATA)); return; }
  if (r.mode === "navigate") {
    e.respondWith(fetch(r).then((res) => { if (res.ok && u.pathname === "/") put(SHELL, "/", res); return res; })
      .catch(() => caches.match("/").then((hit) => hit || Response.error())));
    return;
  }
  e.respondWith(staleWhileRevalidate(r, SHELL));
});
