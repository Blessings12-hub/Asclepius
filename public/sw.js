// Asclepius service worker: lets the app open and show what you used before, even with no signal.
const SHELL = "asclepius-shell-v14", DATA = "asclepius-data-v14";
const PRECACHE = ["/", "/slidebank.js", "/codeblue.js", "/manifest.json", "/icon.svg", "/icon-192.png", "/apple-touch-icon.png", "/404.html"];
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
    // saved microscopy / ECG / imaging slides: keep the picture for offline study
    if (u.hostname === "upload.wikimedia.org") e.respondWith(caches.open(DATA).then((c) => c.match(r).then((hit) => hit || fetch(r).then((res) => { if (res.ok || res.type === "opaque") c.put(r, res.clone()); return res; }).catch(() => Response.error()))));
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

// ---- notifications while the app is closed (sent by the server through Web Push) ----
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: "Asclepius", body: e.data ? e.data.text() : "" }; }
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = wins.find((c) => c.visibilityState === "visible");
    // the app is on screen: show a small in-app message instead of a system notification
    if (open) { open.postMessage({ type: "push", title: d.title, body: d.body }); return; }
    await self.registration.showNotification(d.title || "Asclepius", { body: d.body || "", icon: "/icon-192.png", badge: "/favicon-48.png", tag: d.tag || undefined, renotify: !!d.tag, data: { url: d.url || "/" } });
  })());
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of wins) { if ("focus" in c) { c.postMessage({ type: "go", url }); return c.focus(); } }
    return self.clients.openWindow(url);
  })());
});
