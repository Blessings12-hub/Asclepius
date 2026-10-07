import "dotenv/config";
import express from "express";
import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pdf from "pdf-parse/lib/pdf-parse.js";
import { kv, docs, files, backups, cloud, mode, ready, onVercel, UPLOAD_DIR } from "./lib/store.js";
import { seedCourses, seedRefs, courseId, STARTER_VERSION } from "./lib/seed.js";
import { makeBackup, backupIfStale, listBackups, snapshot, restore } from "./lib/backup.js";
import { ai, parseJSON, info as aiInfo, ctxChars } from "./lib/ai.js";
import { research, referenceText, findPictures, fetchImage, pool } from "./lib/media.js";
import { deepResearch, fitSources, sourceBlock, subjectKind, disciplineOf } from "./lib/research.js";
import { makeZip } from "./lib/zip.js";
import { getVapid, sendPush } from "./lib/push.js";
import { THEMES, tidy, normalizeDeck, chosen, buildPptx, buildSlidePdf, normalizeGuide, normalizeSection, normalizeExtras, buildGuidePdf } from "./lib/deck.js";

const { PASSWORD, SECRET = "change-me", OWNER = "Student", PORT = 3000, CRON_SECRET } = process.env;
if (!onVercel && !cloud) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const id = () => crypto.randomBytes(6).toString("hex");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- dates: the browser sends its own local day (YYYY-MM-DD) so streaks follow YOUR midnight, not the server's ----
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const dnum = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5;
const dstr = (n) => new Date(n * 864e5).toISOString().slice(0, 10);
// Accept the browser's day if it is plausible: up to 30 days back (sessions saved late after being offline)
// and at most 1 day ahead (time zones). Anything else falls back to the server's date.
const dayOf = (v) => {
  const server = new Date().toISOString().slice(0, 10);
  const diff = DAY.test(String(v)) ? dnum(String(v)) - dnum(server) : NaN;
  return diff >= -30 && diff <= 1 ? String(v) : server;
};

// ---- course list, settings, reference tables (small documents, created on first use) ----
let starterChecked = false;
async function getCourses() {
  let c = await kv.get("courses", null);
  if (!c) { c = seedCourses(); await kv.set("courses", c); await kv.set("starterV", STARTER_VERSION); starterChecked = true; return c; }
  if (!starterChecked) {
    // one time per starter version: add courses that were missing (never renames, removes or changes what you already have)
    starterChecked = true;
    if ((await kv.get("starterV", 0)) < STARTER_VERSION) {
      // MBChB here is 5 years: move any old Year 6 courses into Year 5 (same ids, so materials, cards and progress stay attached)
      let moved = false;
      c = c.map((x) => (+x.year > 5 ? (moved = true, { ...x, year: 5 }) : x));
      if (moved) await kv.set("courses", c);
      const have = new Set(c.map((x) => String(x.title).trim().toLowerCase()));
      const add = seedCourses().filter((x) => !have.has(x.title.toLowerCase()));
      if (add.length) { c = [...c, ...add]; await kv.set("courses", c); }
      await kv.set("starterV", STARTER_VERSION);
    }
  }
  return c;
}
const DEFAULTS = { focusMin: 25, shortMin: 5, longMin: 15, longEvery: 4, dailyGoalMin: 120, reminderTime: "", cardLimit: 0, notify: { cards: true, blocks: true, exams: true, streak: true } };
const getSettings = async () => ({ ...DEFAULTS, ...(await kv.get("settings", {})) });
async function getRefs() {
  let r = await kv.get("refs", null);
  if (!r) { r = seedRefs(); await kv.set("refs", r); }
  return r;
}
// add to one day's activity counters (cards reviewed, quiz answers, focus seconds)
async function bump(day, field, n = 1) {
  const days = await kv.get("days", {});
  const d = (days[day] ||= {});
  d[field] = Math.max(0, (d[field] || 0) + n);
  await kv.set("days", days);
}

// ---- AI helpers ----
const tidyList = (a, n, max) => (Array.isArray(a) ? a : []).map((x) => tidy(typeof x === "string" ? x : x?.text, max)).filter(Boolean).slice(0, n);
const claude = (system, user, max = 4000, opts) => ai(system, user, max, opts);
const translate = (t) =>
  claude("Translate the text into English. Keep structure and medical terms accurate. If it is already English, return it unchanged. Output only the text.", t.slice(0, 20000), 8000);
async function pageText(url) {
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error("Could not open that link");
  return (await r.text()).replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 30000);
}
const context = async (courseId) =>
  (await docs.list("materials", { courseId })).filter((m) => m.body).map((m) => `# ${m.title}\n${m.body}`).join("\n\n").slice(0, ctxChars);

// ---- app + auth ----
const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "20mb" }));
const SESSION_MS = 30 * 864e5;
const sign = (exp) => crypto.createHmac("sha256", SECRET).update(`${PASSWORD || ""}|${exp}`).digest("hex");
const mkTok = () => { const exp = Date.now() + SESSION_MS; return `${exp.toString(16)}.${sign(exp)}`; };
const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
// The cookie holds an expiry time and a signature. Changing PASSWORD or SECRET signs everyone out.
const authed = (req) => {
  const m = /(?:^|;\s*)t=([a-f0-9]+)\.([a-f0-9]{64})/.exec(req.headers.cookie || "");
  if (!PASSWORD || !m) return false;
  const exp = parseInt(m[1], 16);
  return exp > Date.now() && same(m[2], sign(exp));
};
// Basic browser protections on every response
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    ...(req.secure ? { "Strict-Transport-Security": "max-age=15552000" } : {}),
  });
  if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
  next();
});

// ---- login lockout: too many wrong passwords from one address locks it for a while ----
const memFails = {};
const failKey = (req) => crypto.createHash("sha256").update(String(req.ip || "?")).digest("hex").slice(0, 16);
const loadFails = async () => { if (!ready) return memFails; try { return await kv.get("loginFails", {}); } catch { return memFails; } };
const saveFails = async (f) => { Object.assign(memFails, f); if (ready) await kv.set("loginFails", f).catch(() => {}); };
const lockMinutes = (n) => (n < 5 ? 0 : Math.min(60, 5 * 2 ** (n - 5)));
const guard = (req, res, next) => (authed(req) ? next() : res.status(401).json({ error: "login" }));
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch((e) => res.status(e.status || 500).json({ error: e.message }));
const bad = (msg, status = 400) => Object.assign(new Error(msg), { status });

// Health: public yes/no flags only (no secrets). Signed in, it also tests the storage connection.
app.get("/api/health", wrap(async (req, res) => {
  const h = {
    ok: true, storage: mode, vercel: onVercel, passwordSet: !!PASSWORD, secretChanged: SECRET !== "change-me",
    aiKeySet: aiInfo().configured, aiProvider: aiInfo().provider, aiModels: aiInfo().models, cronSecretSet: !!CRON_SECRET,
  };
  if (authed(req) && ready) {
    try { await kv.get("settings", null); h.storageOk = true; } catch (e) { h.storageOk = false; h.storageError = e.message; }
  }
  res.json(h);
}));
app.post("/api/login", wrap(async (req, res) => {
  if (!PASSWORD) throw bad("The server has no PASSWORD set. Add PASSWORD in your environment variables and redeploy.", 500);
  const fails = await loadFails(), k = failKey(req), now = Date.now(), f = fails[k] || { n: 0, until: 0 };
  if (f.until > now) {
    const mins = Math.ceil((f.until - now) / 6e4);
    throw bad(`Too many wrong passwords. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`, 429);
  }
  if (!same(String(req.body.password ?? ""), PASSWORD)) {
    f.n += 1; f.last = now; f.until = now + lockMinutes(f.n) * 6e4; fails[k] = f;
    for (const x of Object.keys(fails)) if (now - (fails[x].last || 0) > 864e5) delete fails[x];
    await saveFails(fails);
    await sleep(700);
    const left = 5 - f.n;
    throw bad(left > 0 ? `Wrong password. ${left} ${left === 1 ? "try" : "tries"} left before a short lock.` : "Too many wrong passwords. Locked for a while.", 401);
  }
  if (fails[k]) { delete fails[k]; await saveFails(fails); }
  res.setHeader("Set-Cookie", `t=${mkTok()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}${req.secure ? "; Secure" : ""}`);
  res.json({ ok: 1 });
}));
app.post("/api/logout", (req, res) => {
  res.setHeader("Set-Cookie", `t=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${req.secure ? "; Secure" : ""}`);
  res.json({ ok: 1 });
});

// Everything below needs working storage. On Vercel that means Supabase must be set up.
app.use("/api", (req, res, next) =>
  ready ? next() : res.status(503).json({ error: "Cloud storage is not set up yet. Add SUPABASE_URL and SUPABASE_SECRET_KEY in your Vercel environment variables, run schema.sql in Supabase, then redeploy." }));

// Nightly backup, called by Vercel Cron with "Authorization: Bearer <CRON_SECRET>"
app.get("/api/cron/backup", wrap(async (req, res) => {
  if (!CRON_SECRET || !same(req.headers.authorization || "", `Bearer ${CRON_SECRET}`)) throw bad("unauthorized", 401);
  res.json({ made: await makeBackup("auto") });
}));


// =====================================================================================
// NOTIFICATIONS WHEN THE APP IS CLOSED (Web Push, no extra packages)
// The phone registers once (Settings and tools). A scheduler then calls /api/cron/notify every minute or so
// (a free pinger such as cron-job.org works) and the server sends whatever is due: timetable blocks, the daily
// flashcard reminder, exam countdowns and a streak nudge.
// =====================================================================================
const STREAK_AT = 19 * 60, EXAM_AT = 8 * 60; // minutes after local midnight
const hm2m = (v) => +String(v).slice(0, 2) * 60 + +String(v).slice(3, 5);
const devId = (sub) => crypto.createHash("sha1").update(sub.endpoint).digest("hex").slice(0, 8);
const getSubs = async () => ((await kv.get("push", { subs: [] })).subs || []);
const putSubs = (subs) => kv.set("push", { subs });
async function pushTo(subs, payload, opts) {
  const vapid = await getVapid(kv), out = [];
  await Promise.all(subs.map(async (sub) => { out.push({ dev: devId(sub), ...(await sendPush(vapid, sub, payload, opts)) }); }));
  const gone = new Set(out.filter((r) => r.gone).map((r) => r.dev));
  if (gone.size) await putSubs((await getSubs()).filter((s) => !gone.has(devId(s))));
  return out;
}
async function runNotify(nowMs = Date.now()) {
  const subs = await getSubs();
  await kv.set("notifyLast", nowMs);
  if (!subs.length) return { devices: 0, sent: 0 };
  const [settings, timetable, exams, days, courses, sent] = await Promise.all([getSettings(), kv.get("timetable", []), kv.get("exams", []), kv.get("days", {}), getCourses(), kv.get("notifySent", {})]);
  const prefs = { cards: true, blocks: true, exams: true, streak: true, ...(settings.notify || {}) };
  const cname = (id) => (courses.find((c) => c.id === id) || {}).title || "";
  let due = null, count = 0; const fresh = {};
  for (const sub of subs) {
    const loc = new Date(nowMs + (+sub.tz || 0) * 60000), day = loc.toISOString().slice(0, 10), mins = loc.getUTCHours() * 60 + loc.getUTCMinutes(), wd = loc.getUTCDay(), dev = devId(sub);
    const todo = [];
    if (prefs.blocks) for (const b of timetable) {
      const st = /^\d\d:\d\d$/.test(b.start) ? hm2m(b.start) : -1;
      if (st < 0 || mins < st || mins >= st + 10 || !(b.days || [0, 1, 2, 3, 4, 5, 6]).includes(wd)) continue;
      const what = b.title || cname(b.courseId) || (b.kind === "break" ? "Break" : b.kind === "meal" ? "Meal" : "Study block");
      todo.push({ key: `blk:${b.id}`, payload: { title: b.kind === "study" ? "Study time" : b.kind === "break" ? "Break time" : what, body: `${what} · ${b.start} to ${b.end}`, tag: "blk-" + b.id, url: b.kind === "study" ? "/?go=focus" : "/" } });
    }
    if (prefs.cards && settings.reminderTime && mins >= hm2m(settings.reminderTime)) {
      due ??= Math.min((await docs.list("cards", { numLte: nowMs, project: ["due"] })).length, await cardsLeftToday(day));
      if (due > 0) todo.push({ key: "cards", payload: { title: "Flashcards are due", body: `${due} card${due === 1 ? "" : "s"} waiting. A few minutes keeps them fresh.`, tag: "cards", url: "/" } });
    }
    if (prefs.exams && mins >= EXAM_AT) for (const e of exams) {
      const left = dnum(e.date) - dnum(day);
      if (![0, 1, 3, 7, 14].includes(left)) continue;
      todo.push({ key: "exam:" + e.id, payload: { title: left === 0 ? "Exam today" : left === 1 ? "Exam tomorrow" : `Exam in ${left} days`, body: `${e.title || cname(e.courseId) || "Exam"}${e.title && cname(e.courseId) ? " · " + cname(e.courseId) : ""}`, tag: "exam-" + e.id, url: "/?go=focus" } });
    }
    if (prefs.streak && mins >= STREAK_AT) {
      const st = streakOf(days, day);
      if (st.current > 0 && !st.activeToday) todo.push({ key: "streak", payload: { title: `Keep your ${st.current}-day streak`, body: "You have not studied yet today. One card or a few minutes of focus is enough.", tag: "streak", url: "/" } });
    }
    for (const t of todo) {
      const k = `${dev}:${t.key}:${day}`;
      if (sent[k] || fresh[k]) continue;
      const r = (await pushTo([sub], t.payload, { ttl: t.key.startsWith("blk") ? 600 : 6 * 3600 }))[0];
      if (r.ok || r.gone) { fresh[k] = nowMs; count++; }
    }
  }
  if (Object.keys(fresh).length || Object.keys(sent).length > 400) {
    const keep = Object.fromEntries(Object.entries({ ...sent, ...fresh }).filter(([, ts]) => nowMs - ts < 4 * 864e5));
    await kv.set("notifySent", keep);
  }
  return { devices: subs.length, sent: count };
}
// Called by a scheduler. Accepts "Authorization: Bearer <CRON_SECRET>" or ?key=<CRON_SECRET> (for pingers that cannot set headers).
app.all("/api/cron/notify", wrap(async (req, res) => {
  const given = (req.headers.authorization || "").replace(/^Bearer /, "") || String(req.query.key || "");
  if (!CRON_SECRET || !same(given, CRON_SECRET)) throw bad("unauthorized", 401);
  res.json(await runNotify());
}));

app.use("/api", guard);


// ---- notifications: register this phone, test, status ----
app.get("/api/push/key", wrap(async (q, res) => res.json({ key: (await getVapid(kv)).pub })));
app.post("/api/push/subscribe", wrap(async (req, res) => {
  const sub = req.body.sub || {};
  if (!/^https:\/\//.test(String(sub.endpoint || "")) || !sub.keys?.p256dh || !sub.keys?.auth) throw bad("That does not look like a push subscription");
  const tz = Math.max(-840, Math.min(840, Math.round(+req.body.tz) || 0));
  const subs = (await getSubs()).filter((s) => s.endpoint !== sub.endpoint);
  subs.push({ endpoint: String(sub.endpoint).slice(0, 700), keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) }, tz, at: Date.now() });
  await putSubs(subs.slice(-10)); res.json({ ok: 1, devices: Math.min(subs.length, 10) });
}));
app.post("/api/push/unsubscribe", wrap(async (req, res) => { await putSubs((await getSubs()).filter((s) => s.endpoint !== String(req.body.endpoint))); res.json({ ok: 1 }); }));
app.get("/api/push/status", wrap(async (q, res) => res.json({ devices: (await getSubs()).length, lastCheck: await kv.get("notifyLast", null), cronSecretSet: !!CRON_SECRET, notify: (await getSettings()).notify })));
app.post("/api/push/test", wrap(async (req, res) => {
  const subs = await getSubs();
  if (!subs.length) throw bad("No phone is registered yet. Turn notifications on first.");
  const r = await pushTo(subs, { title: "Asclepius", body: "Notifications are working, even with the app closed.", tag: "test", url: "/" }, { ttl: 300, urgency: "high" });
  res.json({ results: r.map((x) => ({ ok: x.ok, status: x.status, gone: x.gone })) });
}));

// ---- uploaded files ----
const FILE_KEY = /^[a-f0-9]{12}\.[a-z0-9]{1,8}$/;
const MIME = { ".pdf": "application/pdf", ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".txt": "text/plain", ".md": "text/markdown", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };
const extOf = (n) => path.extname(String(n || "")).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 9);
const upload = multer({
  // diskStorage creates its folder immediately, which would crash on Vercel's read-only disk
  storage: cloud || onVercel ? multer.memoryStorage() : multer.diskStorage({ destination: UPLOAD_DIR, filename: (q, f, cb) => cb(null, id() + extOf(f.originalname)) }),
  limits: { fileSize: 200 * 1024 * 1024 },
});
// save a multer upload where it belongs and return its storage key
async function keepUpload(f) {
  if (!cloud) return f.filename;
  const ext = extOf(f.originalname) || ".bin";
  const key = id() + ext;
  await files.put(key, f.buffer, MIME[ext] || f.mimetype || "application/octet-stream");
  return key;
}
const fileBytes = (key, f) => (f?.buffer ? f.buffer : files.read(key));

// Browser uploads big files straight to storage (Vercel only accepts ~4.5 MB through the server).
app.post("/api/upload-url", wrap(async (req, res) => {
  if (!cloud) return res.json({ mode: "local" });
  if ((+req.body.size || 0) > 200 * 1024 * 1024) throw bad("That file is over 200 MB");
  const ext = extOf(req.body.filename) || ".bin";
  const key = id() + ext;
  res.json({ mode: "cloud", key, uploadUrl: await files.signUpload(key), contentType: MIME[ext] || "application/octet-stream" });
}));
app.get("/files/:name", guard, wrap(async (req, res) => {
  if (!FILE_KEY.test(req.params.name)) return res.status(404).end();
  if (cloud) return res.redirect(302, await files.url(req.params.name));
  res.sendFile(req.params.name, { root: path.resolve(UPLOAD_DIR) });
}));

// ---- courses & materials ----
app.get("/api/courses", wrap(async (q, res) => res.json(await getCourses())));
const cleanTopics = (t) => (Array.isArray(t) ? t : String(t || "").split("\n")).map((x) => String(x).trim().slice(0, 120)).filter(Boolean).slice(0, 80);
const okYear = (y) => Number.isInteger(+y) && +y >= 1 && +y <= 8;
app.post("/api/courses", wrap(async (req, res) => {
  const year = +req.body.year, title = String(req.body.title || "").trim().slice(0, 100);
  if (!okYear(year) || !title) throw bad("Give the course a name");
  const list = await getCourses();
  const c = { id: id(), year, title, topics: cleanTopics(req.body.topics) };
  list.push(c);
  await kv.set("courses", list);
  res.json(c);
}));
app.patch("/api/courses/:id", wrap(async (req, res) => {
  const list = await getCourses(), c = list.find((x) => x.id === req.params.id);
  if (!c) throw bad("Course not found", 404);
  if (req.body.title !== undefined) { const t = String(req.body.title).trim().slice(0, 100); if (!t) throw bad("Give the course a name"); c.title = t; }
  if (req.body.year !== undefined) { if (!okYear(req.body.year)) throw bad("Pick a year from 1 to 8"); c.year = +req.body.year; }
  if (req.body.topics !== undefined) c.topics = cleanTopics(req.body.topics);
  await kv.set("courses", list); res.json(c);
}));
app.delete("/api/courses/:id", wrap(async (req, res) => {
  const list = await getCourses();
  if (!list.some((x) => x.id === req.params.id)) throw bad("Course not found", 404);
  const n = (await docs.list("materials", { courseId: req.params.id })).length;
  if (n && req.query.force !== "1") throw bad(`This course has ${n} material(s). Move them or confirm deletion first.`, 409);
  for (const m of await docs.list("materials", { courseId: req.params.id })) { if (m.file) await files.del(m.file).catch(() => {}); await docs.del("materials", m.id); }
  await kv.set("courses", list.filter((x) => x.id !== req.params.id)); res.json({ ok: 1 });
}));
// merge a list of {year,title,topics} into your courses. Same year+title = update topics; otherwise add. Never deletes.
async function mergeOutline(items) {
  const list = await getCourses(); let added = 0, updated = 0;
  for (const it of items) {
    const year = +it.year, title = String(it.title || "").trim().slice(0, 100);
    if (!okYear(year) || !title) continue;
    const topics = cleanTopics(it.topics);
    const ex = list.find((c) => c.year === year && c.title.toLowerCase() === title.toLowerCase());
    if (ex) { const have = new Set((ex.topics || []).map((t) => t.toLowerCase())); const add = topics.filter((t) => !have.has(t.toLowerCase())); if (add.length) { ex.topics = [...(ex.topics || []), ...add]; updated++; } }
    else { list.push({ id: courseId(year, title), year, title, topics }); added++; }
  }
  await kv.set("courses", list); return { added, updated, courses: list };
}
app.post("/api/outline/starter", wrap(async (req, res) => res.json(await mergeOutline(seedCourses()))));
app.post("/api/outline/parse", wrap(async (req, res) => {
  const text = String(req.body.text || "").trim().slice(0, 30000);
  if (text.length < 20) throw bad("Paste the outline text first");
  const out = parseJSON(await claude(
    'You convert a medical school programme outline into JSON. Return ONLY a JSON array [{"year":number,"title":string,"topics":[string]}]. Use only what the text says: do not invent courses or topics. If a year is not stated, use 1. Keep topic names short.',
    text.slice(0, ctxChars), 6000));
  if (!Array.isArray(out)) throw bad("Could not read an outline from that text");
  res.json({ items: out.filter((x) => x && x.title).map((x) => ({ year: +x.year || 1, title: String(x.title), topics: cleanTopics(x.topics) })) });
}));
app.post("/api/outline/apply", wrap(async (req, res) => {
  if (!Array.isArray(req.body.items) || !req.body.items.length) throw bad("Nothing to apply");
  const r = await mergeOutline(req.body.items); res.json({ added: r.added, updated: r.updated });
}));
app.get("/api/materials", wrap(async (req, res) => res.json(await docs.list("materials", { courseId: String(req.query.courseId || "-") }))));
app.get("/api/atlas", wrap(async (req, res) => res.json((await docs.list("materials", {})).filter((m) => m.type === "image" && m.file).map((m) => ({ id: m.id, courseId: m.courseId, title: m.title, body: m.body, file: m.file, boxes: m.boxes || [] })))));
app.post("/api/materials", upload.single("file"), wrap(async (req, res) => {
  const { courseId, url = "", translate: tr } = req.body;
  const type = ["note", "link", "3d", "photo", "file", "image"].includes(req.body.type) ? req.body.type : "note";
  if (!(await getCourses()).some((c) => c.id === courseId)) throw bad("Pick a course first");
  let body = String(req.body.body || "").slice(0, 200000), file = "", fileName = "";
  if (req.file) { fileName = req.file.originalname; file = await keepUpload(req.file); }
  else if (req.body.fileKey) {
    if (!FILE_KEY.test(req.body.fileKey)) throw bad("Bad file reference");
    file = req.body.fileKey; fileName = String(req.body.fileName || file);
  }
  let warning = "";
  try {
    if (type === "link" && url) body = await pageText(url);
    if (file && /\.(txt|md)$/i.test(fileName)) body = (await fileBytes(file, req.file)).toString("utf8");
    if (file && /\.pdf$/i.test(fileName)) {
      // an unreadable PDF is still worth keeping: you can open it, just not search it
      try { body = (await pdf(await fileBytes(file, req.file))).text.slice(0, 60000); }
      catch { body = ""; }
      if (body.trim().length < 40) {
        // scanned PDF (no text layer): let Gemini read the pages (OCR), up to ~15 MB
        const bytes = await fileBytes(file, req.file);
        if (aiInfo().provider === "gemini" && bytes.length <= 15e6) {
          try { body = (await claude("Transcribe all text in this PDF in reading order. Describe figures or tables briefly in square brackets. Keep medical terms exact. Output the text only.", "Read this scanned document.", 8000, { image: { mime: "application/pdf", data: bytes.toString("base64") } })).slice(0, 60000); }
          catch (e) { warning = "Saved, but the scan could not be read (" + e.message + ")."; }
        }
        if (!body.trim() && !warning) warning = "Saved, but the text inside this PDF could not be read, so it will not appear in search or study help. Scanned PDFs need a Gemini key.";
      }
    }
    if (tr === "1" && body) body = await translate(body);
  } catch (e) {
    if (file) await files.del(file); // do not leave an orphaned upload behind when the save fails
    throw e;
  }
  const m = { id: id(), courseId, type, title: String(req.body.title || "Untitled").slice(0, 200), url: String(url).slice(0, 2000), body, file };
  await docs.put("materials", m);
  res.json(warning ? { ...m, warning } : m);
}));
app.delete("/api/materials/:id", wrap(async (req, res) => {
  const m = await docs.get("materials", req.params.id);
  if (m?.file) await files.del(m.file);
  await docs.del("materials", req.params.id);
  res.json({ ok: 1 });
}));

// ---- translate anything on the spot ----
app.post("/api/translate", wrap(async (req, res) => {
  const t = /^https?:\/\//i.test(req.body.text.trim()) ? await pageText(req.body.text.trim()) : req.body.text;
  res.json({ text: await translate(t) });
}));

// ---- study help ----
const courseLabel = (c) => (c ? `Year ${c.year} · ${c.title}` : "");
const CHAT_RULES = "Reply in clean Markdown that reads well on a phone: start with a direct one or two sentence answer, then short sections with ## headings and bullet points, **bold** for key terms, and a small table when comparing things. Be concise. No emojis, no filler, no 'great question'.";
const GUIDE_RULES = `Return ONLY a JSON object for a medical student's study guide, in exactly this shape:
{"title":string,"overview":"2-3 sentences: what this is and why it matters","sections":[{"heading":string,"points":["Term: short clear explanation", ...4-8 items],"mnemonic":"optional memory aid or empty string"}],"high_yield":["5-8 exam-ready facts"],"pitfalls":["3-6 common mistakes or confusions"],"questions":[{"q":string,"a":string}]}
Use 4-7 sections that follow a logical order (definition, mechanism or anatomy, clinical features, investigations, management, complications). Give 8-10 practice questions with short answers. Every string is plain text: no markdown symbols, no asterisks, no numbering, no emojis. Where it fits, begin a point with a short term and a colon.`;
app.post("/api/ai", wrap(async (req, res) => {
  const { courseId, mode: m, prompt = "" } = req.body;
  const course = (await getCourses()).find((c) => c.id === courseId);
  const mats = await context(courseId);
  const who = `You are a study tutor for a medical student. Course: ${course?.title}.`;
  const own = "Prefer the student's own materials when relevant, and say when something is not in them. Flag anything uncertain.";
  if (m === "guide") {
    const topic = String(prompt).trim() || course?.title || "";
    const refs = await research(topic, 3);
    const sys = `${who} ${GUIDE_RULES} ${own} Use the REFERENCE text (public encyclopedia extracts) only to fill gaps, never to contradict the student's materials; add "(check textbook)" after anything you are unsure of.\n\nMATERIALS:\n${mats}\n\nREFERENCE:\n${referenceText(refs)}`;
    const raw = await claude(sys, `Topic: ${topic || "the whole course"}`, 5000, { json: true });
    let g = null;
    try { g = normalizeGuide(parseJSON(raw), topic); } catch {}
    if (!g || !g.sections.length) return res.json({ text: tidy(raw, 20000) });
    g.sources = refs.map((r) => ({ title: r.title + " (Wikipedia)", url: r.url }));
    return res.json({ guide: g, course: courseLabel(course) });
  }
  const modes = {
    chat: `Answer the question clearly and accurately for a medical student. ${CHAT_RULES}`,
    quiz: "Write 10 exam-style multiple choice questions with 5 options, correct answers and short explanations, in clean Markdown.",
  };
  const sys = `${who} ${modes[m] || modes.chat} ${own}\n\nMATERIALS:\n${mats}`;
  res.json({ text: await claude(sys, prompt || "Give an overview of the whole course.") });
}));
// ---- deep study guide, built in steps so each step stays inside the host's time limit ----
// 1) /api/research: read many websites   2) /api/guide/outline: plan the sections
// 3) /api/guide/section (once per section, the browser runs several at a time)   4) /api/guide/extras: glossary, questions
const refBudget = (kind) => Math.min(Math.floor(ctxChars * (kind === "drugs" ? 0.7 : 0.6)), kind === "drugs" ? 70000 : 48000);
const cleanSources = (r) => (Array.isArray(r?.sources) ? r.sources : []).slice(0, 30).map((x, i) => ({
  n: +x.n || i + 1, site: tidy(x.site, 60), title: tidy(x.title, 160), url: /^https?:\/\//.test(x.url) ? String(x.url).slice(0, 260) : "",
  links: Array.isArray(x.links) ? x.links.slice(0, 8) : [], text: String(x.text || "").slice(0, 22000),
})).filter((x) => x.text.length > 100);
const studentMats = async (courseId, cap) => (await context(courseId)).slice(0, Math.min(cap, Math.floor(ctxChars * 0.2))); // small-context providers (Groq) get smaller slices
const WRITER = "You are a senior medical educator writing a detailed study guide for a medical student. Plain text only: no markdown symbols, no asterisks, no emojis, Give drug doses (usual adult dose, route and frequency, plus paediatric, renal or elderly adjustment when it is standard) only when a numbered SOURCE states them or they are well established, and never invent one: write 'see formulary' when unsure. FULL-DETAIL RULE: the student wants everything a full course expects, so give every type, subtype, classification, stage and grade, and the defining numbers (normal values, cut-offs, criteria, doses) when sources state them. Ground facts in the numbered SOURCES where you can, use your own knowledge to fill gaps, and add '(check textbook)' after anything you are not sure of. Where sources disagree, say so. COURSE RULE: write like a good university textbook for this exact course, so that a student who learns only this guide knows the whole topic. Keep background physiology and anatomy to what is needed to understand the point. COMPLETENESS RULE: when a topic is a collection (medicines, microorganisms, enzymes, vitamins, nerves, muscles, arteries, syndromes, drugs of a class), name every item a medical syllabus would expect, never just a few examples, and never leave an item out to save space.";
const subjOf = (course, topic) => subjectKind(course?.title, topic);
const CLASSIF = "Classification at a glance";
const PHARMGEN_NOTE = "GENERAL PHARMACOLOGY CHECKLIST: every definition; every route of administration (advantages, disadvantages, example drugs); every pharmacokinetic parameter with its formula and a worked example (bioavailability, volume of distribution, clearance, half-life, steady state, loading and maintenance dose); every pharmacodynamic idea (types of agonist and antagonist, receptor families and second messengers, dose-response curve, potency, efficacy, therapeutic index, tolerance, tachyphylaxis); lists of CYP450 inducers, inhibitors and substrates; the types of adverse drug reaction (A to F) with examples; types of drug interaction with example drug pairs; pharmacogenetic examples; dose changes in pregnancy, children, the elderly, renal and hepatic disease with example drugs. Use tables for lists of examples.";
const guideNote = (kind, course, topic) => (kind === "pharmgen" ? PHARMGEN_NOTE : kind === "drugs" ? "" : disciplineOf(course?.title, topic).note);
app.post("/api/research", wrap(async (req, res) => {
  const course = (await getCourses()).find((c) => c.id === req.body.courseId);
  const topic = tidy(req.body.topic || course?.title, 100);
  if (!topic) throw bad("Type a topic first");
  const r = await deepResearch(topic, { courseTitle: course?.title || "", grounded: aiInfo().provider === "gemini" });
  if (!r.sources.length) throw new Error("Could not read any website for this topic right now. Check the topic spelling and try again.");
  const fitted = fitSources(r.sources, refBudget(r.kind));
  res.json({ topic, kind: r.kind, report: r.report, sources: fitted });
}));
app.post("/api/guide/outline", wrap(async (req, res) => {
  const course = (await getCourses()).find((c) => c.id === req.body.courseId);
  const topic = tidy(req.body.topic || course?.title, 100), src = cleanSources(req.body.research);
  const kind = subjOf(course, topic);
  const note = guideNote(kind, course, topic);
  const generalSys = `${WRITER} Plan the guide. Return ONLY JSON: {"title":"specific title","overview":"3-4 sentences: what this topic is, why it matters, how the guide is organised","objectives":["6-8 short statements of what the student should be able to explain or do afterwards"],"sections":[{"heading":"short heading","focus":"one or two sentences on exactly what this section covers, naming the items (types, subtypes, organisms, structures, stages) it must include"}]}
Make 10-16 sections in a logical teaching order, covering EVERY type and subtype the course expects (for example every classification, stage, grade, variant and subtype of the topic) that fits the subject: for diseases use definition and epidemiology, aetiology and pathogenesis, classification, clinical features, investigations, management including the drugs with doses, complications and prognosis; for chemistry use structure, nomenclature, properties, reactions and mechanisms, biological and clinical relevance; for anatomy use gross anatomy, relations, blood supply, innervation, clinical anatomy; for biochemistry use pathway or molecule, enzymes, regulation, disorders; for microbiology split the topic so that EVERY important organism appears in some section's focus. If the topic is a collection of items, put the names of the items in each section's focus so none is missed. Sections must not overlap. ${note}`;
  const drugSys = `${WRITER} Plan a DRUG-CENTRED pharmacology guide, laid out like the chapter of a pharmacology course book. The student needs every medicine: types, subtypes, the drugs of each, their effects, uses, adverse effects and doses, and only the little physiology that explains a drug target. Return ONLY JSON: {"title":"specific title","overview":"3-4 sentences: which drugs and classes this guide covers and how it is organised","objectives":["6-8 statements such as 'Name every type, subtype and drug of each class with its effects, uses, adverse effects, contraindications and usual dose'"],"sections":[{"heading":"drug class or group","focus":"Drugs: the generic name of EVERY drug in this class or group, separated by commas (include older and newer agents and the ones used in Africa and on the WHO Essential Medicines List). Then one clause on what else the section covers."}]}
Organise by TYPE and SUBTYPE so nothing is missing: for autonomic drugs that means cholinergic (muscarinic M1 to M5 agonists and antagonists, nicotinic NM and NN agonists and blockers, reversible and irreversible cholinesterase inhibitors, cholinesterase reactivators) and adrenergic (alpha1, alpha2, beta1, beta2 and beta3 agonists and blockers, dopamine agonists, indirect and mixed-acting agents, ganglion blockers, adrenergic neurone blockers, drugs that affect catecholamine synthesis, storage and reuptake); other topics get their own types and subtypes in the same way. Make 8-24 sections, one per drug class or subclass, with at most 14 drugs in a section (split a bigger class into subclasses; for a broad topic such as antimicrobials or cardiovascular drugs, one per class: penicillins, cephalosporins, macrolides and so on). Use the SOURCES lists and your own knowledge so that no drug a medical student could be examined on is missing. Do not write a general-principles section unless the topic itself is general. Sections must not overlap and each drug appears in exactly one class section. Do NOT write the classification overview section yourself: it is added automatically as section 1.`;
  const talk = req.body.style === "talk";
  const TALK_OUT = " THIS IS A PRESENTATION (a lecture talk to give), not a study guide: order the sections as the parts of a talk (why it matters, the core content, clinical application, a final section of key takeaways). Drug topics keep their one-section-per-class plan.";
  const sys = (kind === "drugs" ? drugSys : generalSys) + (talk ? TALK_OUT : "");
  const raw = await claude(sys, `Topic: ${topic}\nCourse: ${course?.title || ""}\n\nSTUDENT MATERIALS:\n${await studentMats(req.body.courseId, 3000)}\n\n${kind === "drugs" ? "SOURCES (read them for drug names):\n" + sourceBlock(fitSources(src, Math.min(30000, Math.floor(ctxChars * 0.4)))) : "SOURCES (titles):\n" + src.map((s) => `[${s.n}] ${s.site}: ${s.title}`).join("\n")}`, kind === "drugs" ? 5200 : 3600, { json: true });
  const o = parseJSON(raw);
  const sections = (Array.isArray(o.sections) ? o.sections : []).filter((s) => !(kind === "drugs" && /^classification/i.test(String(s?.heading || "")))).slice(0, kind === "drugs" ? 26 : 18).map((s) => ({ heading: tidy(s?.heading, 90), focus: tidy(s?.focus, kind === "drugs" ? 900 : 400) })).filter((s) => s.heading);
  if (sections.length < 3) throw new Error("The AI did not plan the guide properly. Please try again.");
  // a drug guide always opens with the whole classification, like the first page of a pharmacology chapter
  if (kind === "drugs") sections.unshift({ heading: CLASSIF, focus: "The whole classification of the topic as a tree: every type, subtype and class with ALL the drugs in it, then every receptor, enzyme, channel or transporter target with where it is and what it does when activated or blocked." });
  res.json({ title: tidy(o.title, 100) || topic, overview: tidy(o.overview, 900), objectives: tidyList(o.objectives, 8, 200), sections, kind });
}));
app.post("/api/guide/section", wrap(async (req, res) => {
  const course = (await getCourses()).find((c) => c.id === req.body.courseId);
  const topic = tidy(req.body.topic || course?.title, 100), src = cleanSources(req.body.research), o = req.body.outline || {};
  const i = +req.body.index, sec = Array.isArray(o.sections) ? o.sections[i] : null;
  if (!sec) throw bad("Unknown section");
  const kind = subjOf(course, topic);
  const note = guideNote(kind, course, topic);
  const generalSys = `${WRITER} Write ONE section of the guide. Return ONLY JSON: {"intro":"3-4 sentence paragraph that explains the idea in plain words","points":["Term: explanation in 1-2 full sentences", ...10-14 items, specific and factual, with the defining numbers],"tables":[{"title":"short","head":["col1","col2",...2-4 columns],"rows":[["..",".."],...3-25 rows]}] (one or two tables, or an empty list),"mnemonic":"memory aid or empty string","clinical":"1-3 sentences: a clinical or practical example that makes it stick","refs":[numbers of the sources you used]}
Include a table when the content is a comparison, a classification, a criterion or score, a list of items (organisms, enzymes, nerves, muscles, conditions) or a drug treatment list (drug, dose and route, duration): then list EVERY item the focus names. Be detailed enough to study from, like a full course. Do not repeat other sections. ${note}`;
  const OVERVIEW = kind === "drugs" && /^classification at a glance/i.test(sec.heading);
  const drugSys = OVERVIEW
    ? `${WRITER} Write the CLASSIFICATION OVERVIEW that opens a pharmacology guide: the whole topic on one page, like the classification chart of a pharmacology course book. Physiology only as far as a drug target needs it. Return ONLY JSON: {"intro":"1-2 sentences on how the drugs of this topic are organised","tables":[{"title":"Classification of the drugs","head":["Type","Subtype or target","Drugs (every one)"],"rows":[["main type or class","subtype, receptor or enzyme it acts on","generic names of ALL the drugs in it, separated by commas"], ...ONE ROW FOR EVERY CLASS OR SUBCLASS, so that every drug of the topic appears]},{"title":"Targets and what they do","head":["Target","Where it is found","Effect when activated or blocked"],"rows":[["receptor, enzyme, channel or transporter subtype","main organs or tissues","the effect, organ by organ, in short words"], ...every target subtype that matters for this topic (for autonomic drugs: M1 to M5, NM, NN, alpha1, alpha2, beta1, beta2, beta3, D1; for other topics the enzymes, channels, receptors or transporters involved). If the topic has no such targets, leave this table out]}],"points":["Rule or exam fact: 1-2 sentences", ...6-10 items such as general rules that apply to the whole topic, the drug of choice for each main use, and the most examined contrasts],"mnemonic":"memory aid or empty string","clinical":"1-2 sentences: a prescribing example","refs":[numbers of the sources you used]}
Table cells must be short (under 300 characters for drug lists, under 150 otherwise).`
    : `${WRITER} Write ONE drug-class section of a pharmacology guide, like a page of a pharmacology course book. The student wants the medicines, so keep physiology and pathophysiology to one sentence at most. Return ONLY JSON: {"intro":"1-2 sentences: what the class is for and its shared mechanism","tables":[{"title":"Actions and uses","head":["Drug","Subtype or target and mechanism","Effects (what it does)","Main uses"],"rows":[["generic name","receptor or enzyme subtype and one-line mechanism","the pharmacological effects, organ by organ","uses"], ...ONE ROW FOR EVERY DRUG named in the focus, up to 16 rows]},{"title":"Adverse effects, cautions and dose","head":["Drug","Adverse effects","Contraindications and interactions","Usual dose, route and frequency"],"rows":[["generic name","main adverse effects","contraindications, cautions, key interactions","adult dose, route, frequency (child, renal or maximum dose if standard)"], ...THE SAME DRUGS IN THE SAME ORDER]}],"points":["Term: explanation in 1-2 full sentences", ...8-12 items covering: what the whole class has in common (adverse effects, contraindications, pregnancy and breastfeeding, interactions), monitoring, drugs of choice, antidotes or reversal agents, special features of individual drugs (prodrugs, enzyme inducers or inhibitors, black-box warnings), pharmacokinetic points that change use (onset, half-life, route of elimination), and resistance where it applies],"mnemonic":"memory aid or empty string","clinical":"1-3 sentences: a prescribing example","refs":[numbers of the sources you used]}
Do NOT leave out any drug in the focus, and add an important drug of this class that the focus missed. Give doses only from the sources or well-established practice, otherwise write 'see formulary'. Table cells must be short (under 200 characters). If this section is not a list of drugs, leave "tables" as an empty list and put the content in the points.`;
  const talk = req.body.style === "talk";
  const TALK_SEC = ` This section belongs to a PRESENTATION that will be summarised into PowerPoint slides, so make it rich in content: add a "script" field with 5-8 spoken sentences the presenter can say to teach this section, give 10-14 detailed points that include classifications, numbers, criteria, examples and exceptions, and still include the table or tables when they fit.`;
  const sys = (kind === "drugs" ? drugSys : generalSys) + (talk ? TALK_SEC : "");
  const others = o.sections.map((s, k) => `${k + 1}. ${s.heading}`).join("; ");
  const planned = OVERVIEW ? o.sections.slice(1).map((s) => `${s.heading} (${s.focus})`).join("\n").slice(0, 7000) : "";
  const raw = await claude(sys, `Guide: ${tidy(o.title, 100) || topic}\nAll sections: ${others}${planned ? "\nPLANNED CLASS SECTIONS WITH THEIR DRUGS:\n" + planned : ""}\nWRITE SECTION ${i + 1}: ${sec.heading}\nFocus: ${sec.focus}\n\nSTUDENT MATERIALS:\n${await studentMats(req.body.courseId, 5000)}\n\nSOURCES:\n${sourceBlock(src)}`, kind === "drugs" ? (OVERVIEW ? 6500 : 8000) : talk ? 5200 : 4600, { json: true });
  res.json({ section: normalizeSection(parseJSON(raw), sec.heading) });
}));
app.post("/api/guide/extras", wrap(async (req, res) => {
  const course = (await getCourses()).find((c) => c.id === req.body.courseId);
  const topic = tidy(req.body.topic || course?.title, 100), o = req.body.outline || {};
  const kind = subjOf(course, topic);
  const sys = `${WRITER} Return ONLY JSON: {"glossary":[{"term":"..","def":"one clear sentence"}, ...10-14 key terms],"high_yield":["8-10 exam-ready facts, each one sentence"],"pitfalls":["5-7 common mistakes or confusions, each saying what is wrong and what is right"],"questions":[{"q":"..","a":"short complete answer"}, ...15-20 items mixing recall, mechanism and clinical application]}${kind === "drugs" ? "\nThis is a drug guide: make the questions about the medicines themselves (which drug for which condition, adverse effect to drug, contraindication, interaction, antidote, drug of choice, which drug does not belong in the class). High-yield facts are drug-of-choice, classic adverse effects, interactions and contraindications. Glossary terms are drug classes, drug names and pharmacology terms." : ""}`;
  const digest = (Array.isArray(req.body.digest) ? req.body.digest : []).map((x) => tidy(x, 700)).join("\n").slice(0, Math.min(9000, Math.floor(ctxChars * 0.3)));
  const raw = await claude(sys, `Guide: ${tidy(o.title, 100) || topic}\nSections: ${(o.sections || []).map((s) => s.heading).join("; ")}\n\nCONTENT OF THE GUIDE (for consistency):\n${digest}\n\nSOURCES:\n${sourceBlock(fitSources(cleanSources(req.body.research), Math.min(14000, Math.floor(ctxChars * 0.3))))}`, 3800, { json: true });
  res.json({ extras: normalizeExtras(parseJSON(raw)) });
}));
app.post("/api/guide/pdf", wrap(async (req, res) => {
  const g = normalizeGuide(req.body.guide, "Study guide");
  if (!g.sections.length) throw bad("There is no study guide to download yet");
  const course = (await getCourses()).find((c) => c.id === req.body.courseId);
  try { res.type("pdf").send(await buildGuidePdf(g, { owner: OWNER, course: courseLabel(course) })); }
  catch (e) { throw /ENOENT|\.afm/i.test(e.message) ? new Error("PDF export is not working on this server (font files missing).") : e; }
}));

// ---- presentations (PowerPoint + PDF) ----
// The deck is the SHORT version of the study guide: one slide per guide section, a few summary points each, plus pictures.
// Step 1 (/api/deck): write the slides from the guide and find several picture choices per slide. Returns JSON for a preview.
// Step 2 (/api/deck/export): the student's final choices come back and become a PowerPoint, slide PDF, or a zip with everything.
const DECK_RULES = (n, guided) => `You are an expert medical educator building a polished, visual lecture deck for a medical student. Return ONLY a JSON object:
{"title":"short specific title","subtitle":"one line","cover":{"image":"2-4 word search query for a real photo or diagram that suits the whole topic"},"slides":[...]}
Make exactly ${n} slides in "slides", the last one being the summary (the title slide, outline and sources slides are added automatically, so do not write them). Each slide: {"layout":"bullets"|"steps"|"compare"|"facts"|"summary","kicker":"section label, 1-3 words","title":"max 8 words","notes":"${guided ? "3-5" : "2-4"} sentences the presenter can say",${guided ? '"guideSection":number (the presentation section it mostly comes from),' : ""} ...fields below}
- bullets: "bullets" (${guided ? "3-4 SHORT summary points, each 6-14 words" : "3-5 items, each under 22 words"}, start key ones with a short term and a colon like "Preload: ..."), "image" (2-4 word search query for a real labelled diagram, anatomy picture, histology slide, scan, ECG, structure drawing or clinical photo), "image2" (a different, broader query).
- steps: "steps":[{"head":"2-4 words","text":"one short sentence"}] with 3-5 items (pathways, stages, algorithms).
- compare: "left":{"head":string,"bullets":[3 short items]},"right":{"head":string,"bullets":[3 short items]}.
- facts: "facts":[{"value":"short value such as 60-100 bpm","label":"what it is"}] with 3-4 items.
- summary: "title":"Key takeaways","bullets":[4-5 exam-ready points].
${guided ? "The slides are a SHORT SUMMARY of the detailed PRESENTATION below, which holds the full detail and the speaker script. Cover the whole presentation in order, merging small sections or splitting big ones so that you end with exactly the number of slides asked for. Keep every slide short and easy to grasp, with only the most important facts. Each slide's notes are 3-5 sentences the presenter can say, drawn from the presentation's script. Use only facts that appear in the presentation." : "Follow a teaching order: why it matters, mechanism or anatomy, clinical features, investigations, management, complications, summary. Use the student's materials first and the REFERENCE text to fill gaps."}
At least 70% of slides should be "bullets" with image queries; use steps, compare and facts only where they really fit, each at most twice. Plain, natural wording like good student slides. Text only: no markdown symbols, no emojis, no mention of AI. Never invent numbers; leave out anything you are unsure of.`;
const guideDigest = (g) => g.sections.map((s, i) => `${i + 1}. ${s.heading}: ${s.intro.slice(0, 300)} | ${s.points.slice(0, 8).map((p) => p.slice(0, 150)).join(" | ")}${s.script ? " | SCRIPT: " + s.script.slice(0, 260) : ""}${(s.tables || []).length ? " | (table: " + s.tables[0].head.join("/") + (/^drug$/i.test(s.tables[0].head[0]) ? "; drugs: " + s.tables[0].rows.map((r) => r[0]).join(", ").slice(0, 400) : "") + ")" : ""}`).join("\n") + (g.high_yield.length ? "\nHIGH-YIELD: " + g.high_yield.slice(0, 5).join(" | ") : "");
app.post("/api/deck", wrap(async (req, res) => {
  const { courseId } = req.body;
  const course = (await getCourses()).find((c) => c.id === courseId);
  const guide = req.body.guide ? normalizeGuide(req.body.guide, req.body.topic) : null;
  const topic = tidy(req.body.topic || guide?.title || course?.title, 100);
  if (!topic) throw bad("Type a topic first");
  // the student picks the TOTAL number of slides; the title slide, outline and sources slides are three of them
  const total = Math.min(30, Math.max(6, Math.round(+req.body.slides) || 12)), n = Math.max(3, total - 3);
  let raw, refs = [], guided = !!(guide && guide.sections.length >= 3);
  if (guided) {
    raw = await claude(DECK_RULES(n, true), `Topic: ${topic}\nCourse: ${course?.title || ""}\n\nPRESENTATION (full detail lives in its PDF):\nTitle: ${guide.title}\nOverview: ${guide.overview}\n${guideDigest(guide).slice(0, Math.min(ctxChars - 2000, 26000))}`, Math.min(9500, 2200 + n * 380), { json: true });
  } else {
    const [rf, mats] = await Promise.all([research(topic, 4), context(courseId)]);
    refs = rf;
    raw = await claude(DECK_RULES(n, false), `Topic: ${topic}\nCourse: ${course?.title || ""}\n\nSTUDENT MATERIALS:\n${mats.slice(0, Math.min(ctxChars, 14000))}\n\nREFERENCE:\n${referenceText(refs)}`, Math.min(9500, 2200 + n * 380), { json: true });
  }
  const web = guided ? guide.sources.filter((x) => x.url).slice(0, 6).map((x) => ({ title: `${x.site}: ${x.title}`.slice(0, 80), url: x.url })) : refs.map((r) => ({ title: r.title + " (Wikipedia)", url: r.url }));
  const deck = normalizeDeck({ ...parseJSON(raw), course: courseLabel(course), sources: web, fromGuide: guided, guideTitle: guided ? guide.title : "", guideSections: guided ? guide.sections.slice(0, 16).map((s, i) => ({ n: i + 1, heading: s.heading })) : [] }, topic);
  if (deck.slides.length < 3) throw new Error("The AI did not return enough slides. Please try again.");
  // search the web for pictures: several candidates per slide so the student can swap them
  const jobs = [{ o: deck.cover, qs: [deck.cover.image, topic] }, ...deck.slides.filter((s) => s.layout === "bullets").map((s) => ({ o: s, qs: [s.image, s.image2, `${topic} ${s.title}`] }))];
  await pool(jobs, 5, async (j) => { j.o.cands = await findPictures(j.qs, 4); }, Date.now() + 26000);
  const used = new Set();
  for (const o of [deck.cover, ...deck.slides]) {
    o.pick = o.cands.findIndex((c) => !used.has(c.url)); // different picture on every slide
    if (o.pick >= 0) used.add(o.cands[o.pick].url);
  }
  res.json({ deck, themes: Object.fromEntries(Object.entries(THEMES).map(([k, v]) => [k, v.label])) });
}));
async function loadPictures(deck, limit) {
  const imgs = new Map(); let total = 0;
  await pool([deck.cover, ...deck.slides].map(chosen).filter(Boolean), 6, async (c) => {
    const im = await fetchImage(c.url);
    if (im && total + im.b.length <= limit) { total += im.b.length; imgs.set(c.url, im); } // keep the response under Vercel's ~4.5 MB limit
  }, Date.now() + 25000);
  return imgs;
}
const friendlyPdf = (e, alt) => (/ENOENT|\.afm/i.test(e.message) ? new Error("PDF export is not working on this server (font files missing)." + (alt || "")) : e);
app.post("/api/deck/export", wrap(async (req, res) => {
  const deck = normalizeDeck({ ...req.body.deck, fromGuide: req.body.deck?.fromGuide }, req.body.deck?.topic);
  const fmt = req.body.format === "pdf" ? "pdf" : "pptx", tk = THEMES[req.body.theme] ? req.body.theme : "clinical";
  const imgs = await loadPictures(deck, 3400000);
  let out;
  try { out = fmt === "pdf" ? await buildSlidePdf(deck, imgs, tk, OWNER) : await buildPptx(deck, imgs, tk, OWNER); }
  catch (e) { throw friendlyPdf(e, " Use PowerPoint instead."); }
  res.set("X-Pictures", String(imgs.size));
  res.type(fmt === "pdf" ? "pdf" : "application/vnd.openxmlformats-officedocument.presentationml.presentation").send(out);
}));
// everything in one download: the detailed guide PDF + the short PowerPoint
app.post("/api/pack/export", wrap(async (req, res) => {
  const deck = normalizeDeck(req.body.deck, req.body.deck?.topic), guide = normalizeGuide(req.body.guide, deck.title);
  const tk = THEMES[req.body.theme] ? req.body.theme : "clinical";
  const course = (await getCourses()).find((c) => c.id === req.body.courseId);
  const imgs = await loadPictures(deck, 2800000);
  const base = (deck.title || "study").replace(/[^\w\- ]+/g, "").trim().slice(0, 50) || "study";
  const out = [];
  if (guide.sections.length) { try { out.push({ name: guide.kind === "presentation" ? `${base} - presentation (full detail).pdf` : `${base} - study guide.pdf`, data: await buildGuidePdf(guide, { owner: OWNER, course: courseLabel(course) }, tk) }); } catch (e) { throw friendlyPdf(e); } }
  out.push({ name: `${base} - PowerPoint.pptx`, data: await buildPptx(deck, imgs, tk, OWNER) });
  res.set("X-Pictures", String(imgs.size));
  res.type("zip").send(makeZip(out));
}));

// ---- flashcards (spaced repetition) ----
// FSRS-4.5 (default weights). grade 1 Again, 2 Hard, 3 Good, 4 Easy. Old cards are converted on their first review.
const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const clampD = (d) => Math.min(10, Math.max(1, d));
function fsrs(c, g) {
  const now = Date.now(), F = 19 / 81;
  if (!c.stab) {
    if (c.interval > 0) { c.stab = c.interval; c.diff = clampD(11 - (c.ease || 2.5) * 2); c.last = now - c.interval * 864e5; } // legacy card
    else { c.stab = W[g - 1]; c.diff = clampD(W[4] - W[5] * (g - 3)); c.last = now; c.fsrsNew = 1; }
  }
  if (!c.fsrsNew) {
    const t = Math.max(0, (now - (c.last || now)) / 864e5), R = Math.pow(1 + (F * t) / c.stab, -0.5);
    const d0 = clampD(W[7] * W[4] + (1 - W[7]) * (c.diff - W[6] * (g - 3)));
    if (g === 1) c.stab = Math.max(0.1, Math.min(c.stab, W[11] * Math.pow(c.diff, -W[12]) * (Math.pow(c.stab + 1, W[13]) - 1) * Math.exp(W[14] * (1 - R))));
    else c.stab = c.stab * (1 + Math.exp(W[8]) * (11 - c.diff) * Math.pow(c.stab, -W[9]) * (Math.exp(W[10] * (1 - R)) - 1) * (g === 2 ? W[15] : 1) * (g === 4 ? W[16] : 1));
    c.diff = d0;
  }
  delete c.fsrsNew; c.last = now;
  if (g === 1) { c.interval = 0; c.due = now + 6e5; }
  else { c.interval = Math.max(1, Math.round(c.stab)); c.due = now + c.interval * 864e5; }
}
// cloze cards: "The {{c1::femoral nerve}} supplies the quadriceps." -> one card per cloze number
app.post("/api/cards/cloze", wrap(async (req, res) => {
  const { courseId } = req.body, text = String(req.body.text || "").slice(0, 4000);
  if (!(await getCourses()).some((c) => c.id === courseId)) throw bad("Pick a course first");
  const re = /\{\{c(\d+)::(.*?)(?:::(.*?))?\}\}/g, nums = [...new Set([...text.matchAll(re)].map((m) => m[1]))];
  if (!nums.length) throw bad("Wrap the hidden words like {{c1::this}}");
  const now = Date.now();
  const cards = nums.map((n) => ({
    id: id(), courseId, due: now, ease: 2.5, interval: 0,
    front: text.replace(re, (m, k, a, h) => (k === n ? "[" + (h || "…") + "]" : a)),
    back: text.replace(re, (m, k, a) => (k === n ? "**" + a + "**" : a)).replace(/\*\*/g, ""),
  }));
  cards.forEach((c, i) => { const a = [...text.matchAll(re)].filter((m) => m[1] === nums[i]).map((m) => m[2]).join(", "); c.back = a + "\n\n" + c.back; });
  await docs.putMany("cards", cards); res.json({ added: cards.length });
}));
app.post("/api/cards/cloze-ai", wrap(async (req, res) => {
  const { courseId, prompt = "" } = req.body;
  const out = parseJSON(await claude('Return ONLY a JSON array of 12 cloze sentences for a medical student, each a string with one or two key terms wrapped like {{c1::term}} (use c1, c2 for separate blanks). One fact per sentence, from the materials when possible.', `Focus: ${prompt || "whole course"}\n\n${await context(courseId)}`, 4000));
  if (!Array.isArray(out)) throw new Error("The AI answer was not in the expected format. Try again.");
  let added = 0;
  for (const t of out.filter((x) => typeof x === "string" && /\{\{c\d+::/.test(x))) {
    const re = /\{\{c(\d+)::(.*?)\}\}/g, nums = [...new Set([...t.matchAll(re)].map((m) => m[1]))], now = Date.now();
    await docs.putMany("cards", nums.map((n) => ({ id: id(), courseId, due: now, ease: 2.5, interval: 0, front: t.replace(re, (m, k, a) => (k === n ? "[…]" : a)), back: [...t.matchAll(re)].filter((m) => m[1] === n).map((m) => m[2]).join(", ") + "\n\n" + t.replace(re, "$2") })));
    added += nums.length;
  }
  res.json({ added });
}));
// image-occlusion cards: boxes are {x,y,w,h} in percent of the image, each with a label
app.post("/api/cards/occlude", wrap(async (req, res) => {
  const { courseId, file, title = "" } = req.body, boxes = (Array.isArray(req.body.boxes) ? req.body.boxes : []).slice(0, 60);
  if (!FILE_KEY.test(String(file))) throw bad("Bad image reference");
  if (!(await getCourses()).some((c) => c.id === courseId)) throw bad("Pick a course first");
  const num = (v) => Math.max(0, Math.min(100, +v || 0)), now = Date.now();
  const cards = boxes.filter((b) => +b.w > 0 && +b.h > 0).map((b) => ({
    id: id(), courseId, due: now, ease: 2.5, interval: 0, img: file,
    box: { x: num(b.x), y: num(b.y), w: num(b.w), h: num(b.h) },
    front: "Name the hidden structure" + (title ? " (" + String(title).slice(0, 80) + ")" : ""), back: String(b.label || "(no label)").slice(0, 200),
  }));
  if (!cards.length) throw bad("Draw at least one box");
  await docs.putMany("cards", cards); res.json({ added: cards.length });
}));
app.post("/api/cards/generate", wrap(async (req, res) => {
  const { courseId, prompt = "" } = req.body;
  const out = parseJSON(await claude('Return ONLY a JSON array of 15 flashcards [{"front":string,"back":string}] for a medical student. Short, one fact per card, from the materials when possible.', `Focus: ${prompt || "whole course"}\n\n${await context(courseId)}`, 5000));
  if (!Array.isArray(out)) throw new Error("The AI answer was not in the expected format. Try again.");
  const now = Date.now();
  const cards = out.filter((c) => c && c.front && c.back).map((c) => ({ id: id(), courseId, front: String(c.front), back: String(c.back), due: now, ease: 2.5, interval: 0 }));
  await docs.putMany("cards", cards);
  res.json({ added: cards.length });
}));
// daily review limit (0 = no limit): reviews done today count against it
async function cardsLeftToday(day) {
  const lim = (await getSettings()).cardLimit || 0;
  if (!lim) return Infinity;
  return Math.max(0, lim - ((await kv.get("days", {}))[dayOf(day)]?.cards || 0));
}
app.get("/api/cards/due", wrap(async (q, res) => {
  const left = await cardsLeftToday(q.query.day), list = await docs.list("cards", { numLte: Date.now(), sortNum: true, limit: 50 });
  res.json(list.slice(0, left));
}));
app.get("/api/cards/count", wrap(async (q, res) => {
  const left = await cardsLeftToday(q.query.day), n = (await docs.list("cards", { numLte: Date.now(), project: ["due"] })).length;
  res.json({ due: Math.min(n, left), total: n });
}));
app.get("/api/heatmap", wrap(async (q, res) => {
  const days = await kv.get("days", {}), t = dnum(dayOf(q.query.day)), out = {};
  for (let i = 0; i < 182; i++) { const d = dstr(t - i), v = days[d]; if (v) out[d] = { focusSec: v.focusSec || 0, cards: v.cards || 0, quiz: v.quiz || 0 }; }
  res.json(out);
}));
app.post("/api/cards/:id/review", wrap(async (req, res) => {
  const c = await docs.get("cards", req.params.id), g = +req.body.grade;
  if (!c) throw bad("No such card", 404);
  if (![0, 1, 2, 3].includes(g)) throw bad("Bad grade");
  const rid = String(req.body.rid || "").slice(0, 40);
  if (rid && c.lastRid === rid) return res.json({ ok: 1, duplicate: 1 });
  if (rid) c.lastRid = rid;
  fsrs(c, g + 1);
  c.reviews = (c.reviews || 0) + 1;
  await Promise.all([docs.put("cards", c), bump(dayOf(req.body.day), "cards")]);
  res.json({ ok: 1 });
}));

// ---- question bank + weak topics ----
app.post("/api/quiz", wrap(async (req, res) => {
  const { courseId, prompt = "" } = req.body;
  const questions = parseJSON(await claude('Return ONLY a JSON array of 10 exam-style questions [{"topic":string (2-3 words),"q":string,"options":[5 strings],"answer":index 0-4,"why":string}].', `Focus: ${prompt || "whole course"}\n\n${await context(courseId)}`, 5000));
  res.json({ questions });
}));
app.post("/api/results", wrap(async (req, res) => {
  const day = dayOf(req.body.day);
  const results = await kv.get("results", []);
  results.push({ courseId: String(req.body.courseId || ""), topic: String(req.body.topic || "General").slice(0, 60), correct: !!req.body.correct, t: Date.now(), day });
  if (results.length > 5000) results.splice(0, results.length - 5000); // older answers live on in the daily counts
  await Promise.all([kv.set("results", results), bump(day, "quiz")]);
  res.json({ ok: 1 });
}));
const weakTopics = (results) => {
  const t = {};
  results.forEach((r) => { const k = r.topic; t[k] ||= { topic: k, n: 0, ok: 0 }; t[k].n++; t[k].ok += r.correct; });
  return Object.values(t).filter((x) => x.n >= 2).map((x) => ({ ...x, pct: Math.round((100 * x.ok) / x.n) })).sort((a, b) => a.pct - b.pct).slice(0, 8);
};
app.get("/api/stats", wrap(async (q, res) => res.json(weakTopics(await kv.get("results", [])))));

// ---- daily timetable (alarms run in the app; this stores the plan) ----
app.get("/api/timetable", wrap(async (q, res) => res.json(await kv.get("timetable", []))));
app.put("/api/timetable", wrap(async (req, res) => {
  const hm = /^([01]\d|2[0-3]):[0-5]\d$/, kinds = ["study", "break", "meal", "other"];
  const blocks = (Array.isArray(req.body.blocks) ? req.body.blocks : []).slice(0, 80).map((b) => ({
    id: String(b.id || id()).slice(0, 40), start: String(b.start), end: String(b.end),
    kind: kinds.includes(b.kind) ? b.kind : "study", title: String(b.title || "").slice(0, 80), courseId: String(b.courseId || "").slice(0, 60),
    days: (Array.isArray(b.days) && b.days.length ? b.days : [0, 1, 2, 3, 4, 5, 6]).map(Number).filter((d) => d >= 0 && d <= 6),
  }));
  for (const b of blocks) { if (!hm.test(b.start) || !hm.test(b.end)) throw bad("Times must look like 08:30"); if (b.end <= b.start) throw bad(`"${b.title || b.kind}" must end after it starts`); }
  await kv.set("timetable", blocks); res.json(blocks);
}));

// ---- question bank: clinical cases, lab interpretation, viva, practical (answers hidden until revealed) ----
const QKINDS = { case: "clinical case questions (a short vignette, then a question needing diagnosis, next step or management reasoning)", lab: "lab and investigation interpretation questions (give realistic values with units, ask what they show, the likely cause and what to do next; state the reference ranges you rely on)", viva: "oral-exam (viva) questions with a model answer a student could say in about a minute", predicted: "questions most likely to be asked in the exam on THIS material (mix of short-answer and essay prompts; favour what the material stresses)", paper: "exam questions", practical: "practical-exam questions (identify, describe, explain or compare, as set in practical exams for this subject)" };
app.get("/api/qbank", wrap(async (req, res) => res.json(await docs.list("qbank", req.query.courseId ? { courseId: String(req.query.courseId) } : {}))));
app.post("/api/qbank/generate", wrap(async (req, res) => {
  const { courseId, kind = "case", prompt = "" } = req.body, count = Math.min(12, Math.max(3, +req.body.count || 8));
  const course = (await getCourses()).find((c) => c.id === courseId);
  if (!course) throw bad("Pick a course first");
  if (!QKINDS[kind]) throw bad("Unknown question type");
  const raw = await claude(`Return ONLY a JSON array of ${count} ${QKINDS[kind]} for a medical student studying "${course.title}" in a Zambian MBChB. Each item: {"topic":string (2-4 words),"q":string,"a":string (complete model answer: the key points, a short reason, and the usual next step if clinical)}. Plain text, no Markdown. Vary the topics. Do not invent facts: if a value or detail is uncertain, leave it out.`, `Focus: ${prompt || "the whole course"}\n\n${req.body.text ? "SOURCE MATERIAL:\n" + String(req.body.text).slice(0, 14000) : await context(courseId)}`, 7000);
  const list = parseJSON(raw);
  if (!Array.isArray(list)) throw new Error("The AI answer was not in the expected format. Try again.");
  const items = list.filter((x) => x && x.q && x.a).map((x) => ({ id: id(), courseId, kind, topic: String(x.topic || "").slice(0, 60), q: String(x.q).slice(0, 1500), a: String(x.a).slice(0, 2500), at: Date.now() }));
  if (!items.length) throw new Error("No questions came back. Try again.");
  await docs.putMany("qbank", items); res.json({ added: items.length });
}));
// paste your own question(s) in any language: translated to English, answered, and saved with the other questions
app.post("/api/qbank/ask", wrap(async (req, res) => {
  const { courseId } = req.body, text = String(req.body.text || "").trim(), kind = QKINDS[req.body.kind] ? req.body.kind : "own";
  const course = (await getCourses()).find((c) => c.id === courseId);
  if (!course) throw bad("Pick a course first");
  if (text.length < 8) throw bad("Paste the question first");
  const raw = await claude('The student pastes one or more exam questions in ANY language (one question, or several numbered ones; a question may include answer options or lab values). Return ONLY a JSON array (at most 10 items) [{"lang":string (name of the original language, in English),"orig":string (that question exactly as pasted),"topic":string (2-4 words),"q":string (the question translated into English; keep numbers, units, options and drug names exact; if it is already English keep it unchanged),"a":string (a complete model answer in English: the key points, a short reason, and the usual next step if clinical; for multiple choice name the correct option and say why the others are wrong)}]. Split into separate items only when they are clearly separate questions. Plain text, no Markdown. Do not invent facts or values: if something is uncertain or the question is ambiguous, say so inside the answer.', `Course: ${course.title} (Zambian MBChB)\n\nQUESTIONS:\n${text.slice(0, 12000)}`, 7000);
  const list = parseJSON(raw);
  if (!Array.isArray(list)) throw new Error("The AI answer was not in the expected format. Try again.");
  const items = list.filter((x) => x && x.q && x.a).slice(0, 10).map((x) => {
    const lang = String(x.lang || "").slice(0, 40), eng = /^english$/i.test(lang);
    return { id: id(), courseId, kind, own: true, topic: String(x.topic || "").slice(0, 60), q: String(x.q).slice(0, 1500), a: String(x.a).slice(0, 2500), lang: eng ? "" : lang, orig: eng ? "" : String(x.orig || "").slice(0, 1500), at: Date.now() };
  });
  if (!items.length) throw new Error("No answer came back. Try again.");
  await docs.putMany("qbank", items); res.json({ added: items.length, lang: items[0].lang });
}));
app.delete("/api/qbank/:id", wrap(async (req, res) => { await docs.del("qbank", req.params.id); res.json({ ok: 1 }); }));

// ---- microscopy slides: Wikimedia Commons images (open licences), saved per course, AI problems per slide ----
const COMMONS = /^https:\/\/upload\.wikimedia\.org\//;
const SLIDE_SETS = ["micro", "macro", "ecg", "rad"]; // micro = slides under the microscope, macro = specimens and patients seen by eye
app.get("/api/slides", wrap(async (req, res) => res.json(await docs.list("slides", req.query.courseId ? { courseId: String(req.query.courseId) } : {}))));
app.post("/api/slides", wrap(async (req, res) => {
  const b = req.body;
  if (!COMMONS.test(String(b.thumb))) throw bad("Only Wikimedia Commons images can be saved here");
  if (!(await getCourses()).some((c) => c.id === b.courseId)) throw bad("Pick a course first");
  const sl = { id: id(), courseId: b.courseId, title: String(b.title || "Slide").slice(0, 200), thumb: String(b.thumb).slice(0, 500), page: String(b.page || "").slice(0, 500), set: SLIDE_SETS.includes(b.set) ? b.set : "micro", topic: String(b.topic || "").slice(0, 120), desc: String(b.desc || "").slice(0, 600), credit: String(b.credit || "").slice(0, 200), license: String(b.license || "").slice(0, 80), at: Date.now() };
  await docs.put("slides", sl); res.json(sl);
}));
// move a slide between microscopy and macroscopy (older saves were all kept under microscopy)
app.post("/api/slides/:id/move", wrap(async (req, res) => {
  const sl = await docs.get("slides", req.params.id);
  if (!sl) throw bad("Slide not found", 404);
  const to = String(req.body.set);
  if (!["micro", "macro"].includes(to) || !["micro", "macro"].includes(sl.set || "micro")) throw bad("Only microscopy and macroscopy slides can be moved");
  sl.set = to; await docs.put("slides", sl); res.json(sl);
}));
app.delete("/api/slides/:id", wrap(async (req, res) => { await docs.del("slides", req.params.id); res.json({ ok: 1 }); }));
app.post("/api/slides/:id/ask", wrap(async (req, res) => {
  const sl = await docs.get("slides", req.params.id);
  if (!sl) throw bad("Slide not found", 404);
  const cr = (await getCourses()).find((c) => c.id === sl.courseId);
  const trusted = `Trusted file title: ${sl.title}\nTrusted description: ${sl.desc || "(none)"}${cr ? `\nThe student saved it under the course "${cr.title}"${sl.topic ? `, topic "${sl.topic}"` : ""}. Use this only to pitch the level and the clinical link; the title stays the ground truth.` : ""}`;
  const FOCUS = { ecg: "You are an ECG tutor. Use a systematic approach: rate, rhythm, axis, P waves, PR interval, QRS, ST segment, T waves, QT. 'stain' should be 'ECG'.", rad: "You are a radiology tutor. Use a systematic approach (technical quality, then ABCDE or the relevant system) and describe findings before diagnosing. 'stain' should be the imaging modality.", micro: "You are a histology, pathology, haematology and microbiology tutor. This is a slide seen under the microscope: give the stain and the magnification clues, then the cells and architecture to look for.", macro: "You are a gross pathology and anatomy tutor. This is a specimen, dissection, culture plate or patient seen with the naked eye (macroscopy), not a slide. Describe it the way a pathologist describes a gross specimen: organ, size and shape, colour, surface, consistency, cut surface and relations. 'stain' should be 'Gross specimen (no stain)' or the relevant technique, for example 'Culture on agar' or 'Clinical photograph'. Give the microscopic correlate in one of the features." }[sl.set || "micro"];
  const sys = FOCUS + ' Return ONLY JSON {"what":string (what the slide shows, using the trusted title as ground truth),"stain":string (stain, technique or modality, or "unknown"),"features":[3-6 short things to look for or look at],"questions":[4 items {"q":string,"a":string}: identify the tissue or lesion, name the stain or technique, describe key features, give the diagnosis or function and one clinical link],"sure":true or false}. Plain text. Never contradict the trusted title; if you cannot see something, say so and set sure to false.';
  let raw, seen = false;
  if (aiInfo().provider === "gemini" && COMMONS.test(sl.thumb)) {
    try {
      const r = await fetch(sl.thumb, { headers: { "User-Agent": "Asclepius/0.9 (personal medical study app)" }, signal: AbortSignal.timeout(15000) });
      const buf = Buffer.from(await r.arrayBuffer()), mime = (r.headers.get("content-type") || "").split(";")[0];
      if (r.ok && /^image\/(jpeg|png)$/.test(mime) && buf.length < 5e6) { raw = await claude(sys, trusted, 2500, { json: true, image: { mime, data: buf.toString("base64") } }); seen = true; }
    } catch { /* fall back to text only */ }
  }
  if (!raw) raw = await claude(sys + " You cannot see the image, so base everything on the trusted title and description and set sure to false.", trusted, 2500, { json: true });
  const qa = parseJSON(raw); qa.seen = seen;
  sl.qa = qa; await docs.put("slides", sl); res.json(sl);
}));

// ---- exams, countdown and auto-timetable ----
app.get("/api/exams", wrap(async (q, res) => res.json((await kv.get("exams", [])).sort((a, b) => a.date.localeCompare(b.date)))));
app.post("/api/exams", wrap(async (req, res) => {
  const { courseId, date, title = "" } = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw bad("Pick the exam date");
  const ex = await kv.get("exams", []);
  ex.push({ id: id(), courseId: String(courseId || "").slice(0, 60), date, title: String(title).slice(0, 80) });
  await kv.set("exams", ex.slice(-60)); res.json({ ok: 1 });
}));
app.delete("/api/exams/:id", wrap(async (req, res) => { await kv.set("exams", (await kv.get("exams", [])).filter((e) => e.id !== req.params.id)); res.json({ ok: 1 }); }));
// builds one daily template: study blocks shared out by how close each exam is and how weak you are, with breaks between
app.post("/api/exams/autoplan", wrap(async (req, res) => {
  const hm = /^([01]\d|2[0-3]):[0-5]\d$/, from = String(req.body.from || "08:00"), to = String(req.body.to || "16:00");
  const S = Math.min(120, Math.max(15, +req.body.study || 50)), R = Math.min(60, Math.max(0, req.body.brk === undefined || req.body.brk === "" ? 10 : +req.body.brk));
  if (!hm.test(from) || !hm.test(to) || to <= from) throw bad("Check the start and end times");
  const day = dayOf(req.body.day), today = dnum(day), courses = await getCourses(), results = await kv.get("results", []);
  const exams = (await kv.get("exams", [])).filter((e) => dnum(e.date) >= today && courses.some((c) => c.id === e.courseId));
  if (!exams.length) throw bad("Add at least one upcoming exam with a course first");
  const toM = (v) => +v.slice(0, 2) * 60 + +v.slice(3), fm = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  const slots = []; for (let m = toM(from); m + S <= toM(to); m += S + R) slots.push(m);
  if (!slots.length) throw bad("That window is too short for one study block");
  const rank = exams.map((e) => {
    const left = Math.max(1, dnum(e.date) - today), rs = results.filter((r) => r.courseId === e.courseId).slice(-60);
    const weak = rs.length >= 5 ? 1 - rs.filter((r) => r.correct).length / rs.length : 0.5;
    const byTopic = {}; rs.forEach((r) => { byTopic[r.topic] ||= { n: 0, ok: 0 }; byTopic[r.topic].n++; byTopic[r.topic].ok += r.correct; });
    const worst = Object.entries(byTopic).filter(([, v]) => v.n >= 2).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n)[0];
    return { e, w: (1 / Math.sqrt(left)) * (0.5 + weak), worst: worst && worst[0], left };
  });
  const tot = rank.reduce((a, r) => a + r.w, 0); let alloc = rank.map((r) => ({ ...r, n: Math.floor((slots.length * r.w) / tot) }));
  let rest = slots.length - alloc.reduce((a, r) => a + r.n, 0);
  [...alloc].sort((a, b) => b.w / tot * slots.length - b.n - (a.w / tot * slots.length - a.n)).forEach((r) => { if (rest > 0) { r.n++; rest--; } });
  alloc = alloc.filter((r) => r.n > 0).sort((a, b) => a.left - b.left);
  const order = []; alloc.forEach((r) => { for (let i = 0; i < r.n; i++) order.push(r); });
  const blocks = [];
  slots.forEach((m, i) => {
    const r = order[i], c = courses.find((x) => x.id === r.e.courseId);
    blocks.push({ id: id(), start: fm(m), end: fm(m + S), kind: "study", title: `Revise ${c.title}${r.worst && i % 2 === 0 ? ": " + r.worst : ""}`.slice(0, 80), courseId: c.id, days: [0, 1, 2, 3, 4, 5, 6] });
    if (R && i < slots.length - 1) blocks.push({ id: id(), start: fm(m + S), end: fm(m + S + R), kind: "break", title: "Break", courseId: "", days: [0, 1, 2, 3, 4, 5, 6] });
  });
  await kv.set("timetable", blocks);
  res.json({ blocks, summary: alloc.map((r) => `${courses.find((c) => c.id === r.e.courseId).title}: ${r.n} block(s), exam in ${r.left} day(s)`) });
}));

// ---- past papers: pull out the questions, model answers and repeating topics ----
app.post("/api/papers/analyze", wrap(async (req, res) => {
  const { courseId, title = "" } = req.body, text = String(req.body.text || "").trim().slice(0, 14000);
  const course = (await getCourses()).find((c) => c.id === courseId);
  if (!course) throw bad("Pick a course first");
  if (text.length < 80) throw bad("Paste the paper's text (or pick a material that has text)");
  const j = parseJSON(await claude('Return ONLY JSON {"questions":[{"topic":string (2-4 words),"q":string (the question as set),"a":string (a complete model answer with the key points a marker expects)}],"topics":[{"topic":string,"count":number}]} from this past exam paper. Include every question you can read (max 25). "topics" counts how many questions touch each topic. Do not invent questions that are not in the text. Plain text.', `Course: ${course.title}\n\n${text}`, 8000));
  const qs = (j.questions || []).filter((x) => x && x.q && x.a).slice(0, 25);
  if (!qs.length) throw new Error("No questions could be read from that text. Check the paste and try again.");
  const paperId = id(), now = Date.now();
  await docs.putMany("qbank", qs.map((x) => ({ id: id(), courseId, kind: "paper", topic: String(x.topic || "").slice(0, 60), q: String(x.q).slice(0, 1500), a: String(x.a).slice(0, 2500), at: now })));
  await docs.put("papers", { id: paperId, courseId, title: String(title || "Past paper").slice(0, 100), topics: (j.topics || []).filter((t) => t && t.topic).slice(0, 25).map((t) => ({ topic: String(t.topic).slice(0, 60), count: Math.max(1, Math.round(+t.count || 1)) })), at: now });
  res.json({ added: qs.length });
}));
app.get("/api/papers", wrap(async (req, res) => {
  const list = await docs.list("papers", req.query.courseId ? { courseId: String(req.query.courseId) } : {}), freq = {};
  list.forEach((p) => (p.topics || []).forEach((t) => { freq[t.topic.toLowerCase()] ||= { topic: t.topic, count: 0 }; freq[t.topic.toLowerCase()].count += t.count; }));
  res.json({ papers: list.map((p) => ({ id: p.id, title: p.title, at: p.at })), topics: Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 20) });
}));

// ---- clinical logbook (procedures and targets; never put patient details here) ----
const LOG_DEFAULTS = { "IV cannulation": 10, "Venepuncture": 20, "Suturing": 10, "Urinary catheterisation": 5, "NG tube insertion": 5, "ECG recording": 10, "Normal delivery": 10, "Lumbar puncture": 2, "Arterial blood gas": 3, "BLS / CPR": 2, "Wound dressing": 10, "Blood transfusion set-up": 3, "Chest drain": 2, "Plaster / cast application": 2 };
const LEVELS = ["observed", "assisted", "supervised", "independent"];
app.get("/api/log", wrap(async (q, res) => res.json({ entries: (await kv.get("logbook", [])).sort((a, b) => b.date.localeCompare(a.date)), targets: await kv.get("logTargets", LOG_DEFAULTS), levels: LEVELS })));
app.post("/api/log", wrap(async (req, res) => {
  const b = req.body, procedure = String(b.procedure || "").trim().slice(0, 80), notes = String(b.notes || "").slice(0, 300);
  if (!procedure) throw bad("Name the procedure");
  if (!LEVELS.includes(b.level)) throw bad("Pick your level");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.date))) throw bad("Pick the date");
  if (/\d{6,}/.test(notes + procedure) || /\b(mr|mrs|ms|miss)\.?\s+[A-Z][a-z]+/.test(notes)) throw bad("Remove patient names and ID or phone numbers from the note. Keep the logbook anonymous.");
  const log = await kv.get("logbook", []);
  log.push({ id: id(), date: b.date, rotation: String(b.rotation || "").slice(0, 60), procedure, level: b.level, notes });
  await kv.set("logbook", log.slice(-1500)); res.json({ ok: 1 });
}));
app.delete("/api/log/:id", wrap(async (req, res) => { await kv.set("logbook", (await kv.get("logbook", [])).filter((e) => e.id !== req.params.id)); res.json({ ok: 1 }); }));
app.put("/api/log/targets", wrap(async (req, res) => {
  const t = {}; Object.entries(req.body.targets || {}).slice(0, 60).forEach(([k, v]) => { if (k.trim() && +v >= 0 && +v <= 500) t[k.trim().slice(0, 80)] = Math.round(+v); });
  await kv.set("logTargets", t); res.json(t);
}));

// ---- differential diagnosis trainer, case presenter ----
app.post("/api/ddx", wrap(async (req, res) => {
  const { courseId, symptom = "", student = "", answer } = req.body;
  const course = (await getCourses()).find((c) => c.id === courseId);
  if (answer && student) {
    return res.json({ feedback: await claude(`You are a clinical tutor. ${CHAT_RULES} Compare the student's differential with the model answer: what they got right, what they missed (especially anything dangerous), how they should order it, and the single best next step. Be kind and specific. Educational only.`, `Case: ${String(req.body.vignette).slice(0, 1500)}\nModel answer: ${JSON.stringify(answer).slice(0, 3000)}\nStudent differential: ${String(student).slice(0, 1500)}`, 900) });
  }
  const j = parseJSON(await claude('Return ONLY JSON {"vignette":string (age, sex, setting, presenting complaint and key history/exam/investigation findings, WITHOUT the diagnosis),"answer":{"final":string (most likely diagnosis),"differential":[{"dx":string,"for":string,"against":string}] (4-6),"cantMiss":[strings] (dangerous diagnoses to exclude),"tests":[strings],"first":string (immediate next step)}}. Plain text. Common presentations in Zambian hospitals are fine (malaria, TB, HIV, sickle cell, etc.) but keep it realistic.', `Student is studying: ${course?.title || "general medicine"}. Presenting symptom: ${String(symptom).slice(0, 100) || "choose a common one"}`, 2500, { json: true }));
  res.json(j);
}));
app.post("/api/present", wrap(async (req, res) => {
  const text = String(req.body.text || "").trim().slice(0, 5000);
  if (text.length < 40) throw bad("Write or paste what you know about the patient first");
  if (/\d{6,}/.test(text)) throw bad("Remove ID or phone numbers first. Use age and sex only, never a name.");
  res.json({ text: await claude(`You coach medical students on case presentations. ${CHAT_RULES} Rewrite the student's notes as a spoken ward-round presentation in this order: one-line summary, presenting complaint, history of presenting complaint, relevant PMH/drugs/allergies/family/social, systems review, examination, investigations, assessment with differential, plan. Use ONLY facts the student gave; write "(not given)" for gaps, never invent findings. Then add "## Coaching" with 3-5 specific tips on wording, order and what a consultant would ask next. Educational only.`, text, 1800) });
}));

// ---- lecture recorder: audio -> transcript (Gemini) -> notes + flashcards ----
const audioUp = multer({ storage: multer.memoryStorage(), limits: { fileSize: 18 * 1024 * 1024 } });
app.post("/api/lecture/transcribe", audioUp.single("audio"), wrap(async (req, res) => {
  if (aiInfo().provider !== "gemini") throw bad("Lecture transcription needs a Gemini key (GEMINI_API_KEY).");
  if (!req.file) throw bad("No audio received");
  const mime = (req.file.mimetype || "audio/webm").split(";")[0];
  if (!/^audio\//.test(mime) && !/^video\/(webm|mp4)$/.test(mime)) throw bad("That is not an audio file");
  const text = await claude("Transcribe this lecture recording faithfully in English (keep medical terms and drug names exact). If a speaker switches language, translate to English in brackets. Skip silence and noise. Output the transcript only, in paragraphs.", "Transcribe.", 8000, { image: { mime, data: req.file.buffer.toString("base64") } });
  res.json({ text: text.trim() });
}));
app.post("/api/lecture/notes", wrap(async (req, res) => {
  const { courseId } = req.body, text = String(req.body.text || "").trim().slice(0, 40000);
  if (!(await getCourses()).some((c) => c.id === courseId)) throw bad("Pick a course first");
  if (text.length < 100) throw bad("The transcript is too short to make notes from");
  const j = parseJSON(await claude('Return ONLY JSON {"notes":string (clean lecture notes in Markdown: headings, bullets, **bold** key terms, a short summary at the top, a "Likely exam points" list at the end),"cards":[{"front":string,"back":string}] (12-20 flashcards of the key facts)}. Use only what the lecturer said; do not add facts.', text, 7000));
  const now = Date.now(), cards = (j.cards || []).filter((x) => x && x.front && x.back).slice(0, 25).map((x) => ({ id: id(), courseId, due: now, ease: 2.5, interval: 0, front: String(x.front).slice(0, 400), back: String(x.back).slice(0, 800) }));
  if (cards.length) await docs.putMany("cards", cards);
  res.json({ notes: String(j.notes || ""), cards: cards.length });
}));

// ---- Anki .apkg export / import (basic cards; scheduling and media are not carried over) ----
app.get("/api/anki/apkg", wrap(async (req, res) => {
  let DatabaseSync; try { ({ DatabaseSync } = await import("node:sqlite")); } catch { throw bad("This server cannot build .apkg files (it needs Node 22.5 or newer). Use the text export instead.", 501); }
  const JSZip = (await import("jszip")).default, os = await import("node:os"), fsn = await import("node:fs"), pth = await import("node:path"), crypto = await import("node:crypto");
  const cid = String(req.query.courseId || ""), course = (await getCourses()).find((x) => x.id === cid);
  const cards = await docs.list("cards", cid ? { courseId: cid } : {});
  if (!cards.length) throw bad("No cards to export");
  const f = pth.join(os.tmpdir(), "asc-" + id() + ".anki2"), db = new DatabaseSync(f), now = Math.floor(Date.now() / 1000), mid = 1700000000001, did = 1700000000002;
  db.exec(`CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null, dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null, decks text not null, dconf text not null, tags text not null);
CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null, tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null);
CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null, usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null, factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null, odid integer not null, flags integer not null, data text not null);
CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null, lastIvl integer not null, factor integer not null, time integer not null, type integer not null);
CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);
CREATE INDEX ix_notes_usn on notes (usn); CREATE INDEX ix_cards_usn on cards (usn); CREATE INDEX ix_cards_nid on cards (nid); CREATE INDEX ix_cards_sched on cards (did, queue, due);`);
  const fld = (n, o) => ({ name: n, ord: o, sticky: false, rtl: false, font: "Arial", size: 20, media: [] });
  const models = { [mid]: { id: mid, name: "Asclepius Basic", type: 0, mod: now, usn: -1, sortf: 0, did, css: ".card{font-family:arial;font-size:20px;text-align:center;color:black;background:white;white-space:pre-wrap}", latexPre: "", latexPost: "", latexsvg: false, req: [[0, "any", [0]]], tags: [], vers: [], flds: [fld("Front", 0), fld("Back", 1)], tmpls: [{ name: "Card 1", ord: 0, qfmt: "{{Front}}", afmt: "{{FrontSide}}<hr id=answer>{{Back}}", bqfmt: "", bafmt: "", did: null, bfont: "", bsize: 0 }] } };
  const deck = (i, name) => ({ id: i, name, mod: now, usn: -1, lrnToday: [0, 0], revToday: [0, 0], newToday: [0, 0], timeToday: [0, 0], collapsed: false, desc: "", dyn: 0, conf: 1, extendNew: 0, extendRev: 0 });
  const dconf = { 1: { id: 1, mod: 0, name: "Default", usn: 0, maxTaken: 60, autoplay: true, timer: 0, replayq: true, new: { bury: true, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 7], order: 1, perDay: 20 }, rev: { bury: true, ease4: 1.3, ivlFct: 1, maxIvl: 36500, perDay: 200, hard: 1.2, fuzz: 0.05 }, lapse: { delays: [10], leechAction: 1, leechFails: 8, minInt: 1, mult: 0 }, dyn: false } };
  db.prepare("INSERT INTO col VALUES (1,?,?,?,11,0,0,0,?,?,?,?,?)").run(now, now * 1000, now * 1000, JSON.stringify({ activeDecks: [1], curDeck: 1, newSpread: 0, collapseTime: 1200, timeLim: 0, estTimes: true, dueCounts: true, curModel: String(mid), nextPos: cards.length + 1, sortType: "noteFld", sortBackwards: false, addToCur: true }), JSON.stringify(models), JSON.stringify({ 1: deck(1, "Default"), [did]: deck(did, ("Asclepius" + (course ? "::" + course.title : "")).replace(/["\\]/g, "")) }), JSON.stringify(dconf), "{}");
  const iN = db.prepare("INSERT INTO notes VALUES (?,?,?,?,-1,?,?,?,?,0,'')"), iC = db.prepare("INSERT INTO cards VALUES (?,?,?,0,?,-1,0,0,?,0,0,0,0,0,0,0,0,'')");
  const clean = (t) => String(t).replace(/\x1f/g, " ");
  cards.forEach((c, i) => {
    const nid = 1700000100000 + i, front = clean(c.front), back = clean(c.back), csum = parseInt(crypto.createHash("sha1").update(front).digest("hex").slice(0, 8), 16);
    iN.run(nid, crypto.randomBytes(5).toString("base64url"), mid, now, "asclepius", front + "\x1f" + back, front, csum);
    iC.run(nid + 500000, nid, did, now, i + 1);
  });
  db.close();
  const zip = new JSZip(); zip.file("collection.anki2", fsn.readFileSync(f)); zip.file("media", "{}"); fsn.unlinkSync(f);
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  res.set("Content-Disposition", 'attachment; filename="asclepius.apkg"').type("application/octet-stream").send(buf);
}));
app.post("/api/anki/apkg-import", audioUp.single("file"), wrap(async (req, res) => {
  let DatabaseSync; try { ({ DatabaseSync } = await import("node:sqlite")); } catch { throw bad("This server cannot read .apkg files (it needs Node 22.5 or newer). Export from Anki as a text file instead.", 501); }
  if (!req.file) throw bad("Choose an .apkg file");
  if (!(await getCourses()).some((c) => c.id === req.body.courseId)) throw bad("Pick a course first");
  const JSZip = (await import("jszip")).default, os = await import("node:os"), fsn = await import("node:fs"), pth = await import("node:path");
  const zip = await JSZip.loadAsync(req.file.buffer).catch(() => { throw bad("That file is not a valid .apkg"); });
  const entry = zip.file("collection.anki21") || zip.file("collection.anki2");
  if (!entry) throw bad("This deck uses Anki's newest format. In Anki, export again and tick 'Support older Anki versions', or export as a text file.");
  const f = pth.join(os.tmpdir(), "asc-in-" + id() + ".db"); fsn.writeFileSync(f, await entry.async("nodebuffer"));
  let rows; try { const db = new DatabaseSync(f, { readOnly: true }); rows = db.prepare("SELECT flds FROM notes LIMIT 3000").all(); db.close(); } catch { throw bad("Could not read that deck"); } finally { fsn.unlinkSync(f); }
  const strip = (t) => t.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(div|p)>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
  const now = Date.now(), cards = [];
  rows.forEach((r) => {
    const p = String(r.flds).split("\x1f").map(strip); if (!p[0]) return;
    const cl = /\{\{c\d+::(.*?)(?:::.*?)?\}\}/g;
    if (cl.test(p[0])) cards.push({ id: id(), courseId: req.body.courseId, due: now, ease: 2.5, interval: 0, front: p[0].replace(/\{\{c\d+::.*?\}\}/g, "[…]"), back: [...p[0].matchAll(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/g)].map((m) => m[1]).join(", ") + "\n\n" + p[0].replace(/\{\{c\d+::(.*?)(?:::.*?)?\}\}/g, "$1") + (p[1] ? "\n" + p[1] : "") });
    else if (p[1]) cards.push({ id: id(), courseId: req.body.courseId, due: now, ease: 2.5, interval: 0, front: p[0].slice(0, 600), back: p.slice(1).filter(Boolean).join("\n").slice(0, 1500) });
  });
  if (cards.length) await docs.putMany("cards", cards.slice(0, 3000));
  res.json({ added: Math.min(cards.length, 3000) });
}));

// ---- label quiz boxes on atlas images ----
app.post("/api/atlas/:id/boxes", wrap(async (req, res) => {
  const m = await docs.get("materials", req.params.id);
  if (!m || m.type !== "image") throw bad("No such image", 404);
  const num = (v) => Math.max(0, Math.min(100, +v || 0));
  m.boxes = (Array.isArray(req.body.boxes) ? req.body.boxes : []).slice(0, 40).filter((b) => +b.w > 0 && +b.h > 0).map((b) => ({ x: num(b.x), y: num(b.y), w: num(b.w), h: num(b.h), label: String(b.label || "").slice(0, 120) }));
  await docs.put("materials", m); res.json({ saved: m.boxes.length });
}));

// ---- concept map + mnemonics ----
app.post("/api/map", wrap(async (req, res) => {
  const { courseId, prompt = "" } = req.body;
  const course = (await getCourses()).find((c) => c.id === courseId);
  const raw = await claude('Return ONLY JSON {"center":string,"branches":[{"label":string,"items":[3-5 short strings],"mnemonic":"a memorable mnemonic or empty string"}]} - a concept map with 5-7 branches for a medical student. Plain text, short labels (max 6 words).', `Topic: ${prompt || course?.title}\n\n${await context(courseId)}`, 3000, { json: true });
  res.json(parseJSON(raw));
}));
// ---- anatomy 3D: public Sketchfab search (no key needed) + structure explainer ----
app.get("/api/anatomy/search", wrap(async (req, res) => {
  const q = String(req.query.q || "human skeleton").slice(0, 80);
  let r;
  try { r = await fetch("https://api.sketchfab.com/v3/search?type=models&count=24&sort_by=-likeCount&q=" + encodeURIComponent(q + " anatomy"), { signal: AbortSignal.timeout(15000) }); }
  catch { throw bad("Could not reach Sketchfab. Check your connection and try again.", 502); }
  if (!r.ok) throw bad("Sketchfab search failed (" + r.status + ")", 502);
  const j = await r.json();
  res.json((j.results || []).map((m) => {
    const imgs = (m.thumbnails?.images || []).slice().sort((a, b) => a.width - b.width);
    return { uid: m.uid, name: m.name, by: m.user?.displayName || m.user?.username || "", thumb: (imgs.find((i) => i.width >= 200) || imgs[imgs.length - 1] || {}).url || "", license: m.license?.label || m.license || "", faces: m.faceCount || 0 };
  }).filter((m) => /^[a-f0-9]{32}$/.test(m.uid)));
}));
app.post("/api/anatomy/explain", wrap(async (req, res) => {
  const part = String(req.body.part || "").slice(0, 120);
  if (!part) throw bad("Pick a structure first");
  res.json({ text: await claude(`You are an anatomy tutor for a medical student. ${CHAT_RULES} Cover where it is, attachments (origin/insertion for muscles), relations, nerve supply, blood supply, function, and one clinical point. Flag anything uncertain.`, "Structure: " + part, 900) });
}));

// ---- practice: timed mock exam, OSCE stations, patient simulator ----
app.post("/api/mock", wrap(async (req, res) => {
  const { courseId, kind = "mcq", prompt = "" } = req.body;
  const course = (await getCourses()).find((c) => c.id === courseId);
  const ctx = `Course: ${course?.title || "general medicine"}. Focus: ${prompt || "whole course"}\n\n${await context(courseId)}`;
  if (kind === "osce") {
    const raw = await claude('Return ONLY a JSON object {"station":string,"scenario":string (what the candidate is told),"task":string,"checklist":[10-14 short marking points],"pitfalls":[3-5 strings]} for one OSCE station (history, examination, procedure or communication) suited to the course. Use plain text.', ctx, 3000, { json: true });
    return res.json({ osce: parseJSON(raw) });
  }
  const questions = parseJSON(await claude('Return ONLY a JSON array of 10 exam-style questions [{"topic":string (2-3 words),"q":string (a short clinical vignette with age, sex, presentation and findings, then the question),"options":[5 strings],"answer":index 0-4,"why":string}]. Test reasoning, not recall.', ctx, 6000));
  res.json({ questions });
}));
app.post("/api/sim", wrap(async (req, res) => {
  const { courseId, hidden, log = [], say = "" } = req.body;
  const course = (await getCourses()).find((c) => c.id === courseId);
  if (!hidden) {
    const raw = await claude('Return ONLY JSON {"case":"hidden case file: age, sex, background, true diagnosis, history details, exam and investigation findings, red herrings","opening":"the patient\'s first sentence to the doctor, in plain everyday words"} for a realistic patient suited to a medical student studying: ' + (course?.title || "general medicine") + (say ? ". Preference: " + say : "") + ". Vary age, sex and setting (a Zambian clinic or hospital is fine).", "Create the case.", 2500, { json: true });
    return res.json(parseJSON(raw));
  }
  const sys = `You are role-playing a patient for a medical student's practice. Hidden case file (never reveal the diagnosis unless the student commits to one):\n${String(hidden).slice(0, 4000)}\nRules: answer only what is asked, in short everyday language, like a real patient. If the student asks to examine or order a test, give the finding from the case file in square brackets, e.g. [BP 150/95]. If they start a message with "Diagnosis:", step out of role and give brief feedback: what they got right, what they missed, key questions they skipped, and a better next step. Educational only.`;
  const convo = log.slice(-24).map((m) => (m.who === "me" ? "Doctor: " : "Patient: ") + String(m.text).slice(0, 600)).join("\n");
  res.json({ reply: await claude(sys, `${convo}\nDoctor: ${String(say).slice(0, 800)}\nPatient:`, 800) });
}));
// turn the topics you get wrong into planner items
app.post("/api/plan/weak", wrap(async (req, res) => {
  const weak = weakTopics(await kv.get("results", [])).filter((x) => x.pct < 70).slice(0, 5);
  const plan = await kv.get("plan", []); let n = 0;
  const day = (i) => { const d = new Date(Date.now() + i * 864e5); return d.toISOString().slice(0, 10); };
  weak.forEach((w, i) => { const title = "Revise: " + w.topic + " (" + w.pct + "% right)"; if (!plan.some((p) => p.title === title && !p.done)) { plan.push({ id: id(), title, date: day(i + 1), done: false }); n++; } });
  await kv.set("plan", plan); res.json({ added: n });
}));

// ---- study planner ----
app.get("/api/plan", wrap(async (q, res) => res.json([...(await kv.get("plan", []))].sort((a, b) => (a.date || "9").localeCompare(b.date || "9")))));
app.post("/api/plan", wrap(async (req, res) => {
  const plan = await kv.get("plan", []);
  plan.push({ id: id(), title: String(req.body.title).slice(0, 120), date: req.body.date || "", done: false });
  await kv.set("plan", plan); res.json({ ok: 1 });
}));
app.patch("/api/plan/:id", wrap(async (req, res) => {
  const plan = await kv.get("plan", []);
  const p = plan.find((x) => x.id === req.params.id);
  if (p) { p.done = !!req.body.done; await kv.set("plan", plan); }
  res.json({ ok: 1 });
}));
app.delete("/api/plan/:id", wrap(async (req, res) => {
  await kv.set("plan", (await kv.get("plan", [])).filter((x) => x.id !== req.params.id)); res.json({ ok: 1 });
}));

// ---- photo capture: handwriting, slides, book pages ----
app.post("/api/capture", upload.single("image"), wrap(async (req, res) => {
  const f = req.file;
  if (!f) throw new Error("No image received");
  const key = await keepUpload(f);
  const mt = { ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" }[extOf(f.originalname)] || "image/jpeg";
  const body = await claude(
    "Transcribe all text in the image in reading order, describing any diagram or table briefly in square brackets. Then write clean English study notes from it, translating if the text is not English and keeping medical terms accurate. Use two parts headed 'Transcription' and 'Notes (English)'.",
    "Process this page.", 6000, { image: { mime: mt, data: (await fileBytes(key, f)).toString("base64") } });
  const m = { id: id(), courseId: req.body.courseId, type: "photo", title: String(req.body.title || "Photo notes").slice(0, 200), url: "", body, file: key };
  await docs.put("materials", m); res.json(m);
}));

// ---- Anki import/export (tab-separated text, Anki's own text format) ----
app.get("/api/anki/export", wrap(async (req, res) => {
  const cid = String(req.query.courseId || "");
  const c = (await getCourses()).find((x) => x.id === cid);
  const clean = (t) => String(t).replace(/[\t\r\n]+/g, " ");
  const rows = (await docs.list("cards", cid ? { courseId: cid } : {}))
    .map((x) => [clean(x.front), clean(x.back), (c?.title || "asclepius").replace(/\s+/g, "_")].join("\t"));
  res.set("Content-Disposition", 'attachment; filename="cards.txt"').type("text/plain")
    .send(["#separator:tab", "#html:false", "#tags column:3", ...rows].join("\n"));
}));
app.post("/api/anki/import", wrap(async (req, res) => {
  const cards = [], now = Date.now();
  String(req.body.text || "").split(/\r?\n/).forEach((l) => {
    if (!l || l.startsWith("#")) return;
    const p = l.split("\t");
    if (p.length < 2) return;
    const strip = (t) => t.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").trim();
    cards.push({ id: id(), courseId: req.body.courseId, front: strip(p[0]), back: strip(p[1]), due: now, ease: 2.5, interval: 0 });
  });
  if (cards.length) await docs.putMany("cards", cards);
  res.json({ added: cards.length });
}));

// ---- search across everything, with citations ----
const tokens = (t) => String(t).toLowerCase().match(/[a-z0-9]{3,}/g) || [];
// Instant keyword search (no AI): notes and files, flashcards, courses and topics, study plan
app.get("/api/find", wrap(async (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  if (q.length < 2) return res.json({ materials: [], cards: [], courses: [], plan: [] });
  const words = q.split(/\s+/).filter(Boolean).slice(0, 6);
  const all = (t) => { const l = String(t || "").toLowerCase(); return words.every((w) => l.includes(w)); };
  const snip = (text) => {
    const t = String(text || ""), l = t.toLowerCase();
    const at = Math.max(0, Math.min(...words.map((w) => (l.indexOf(w) < 0 ? 1e9 : l.indexOf(w)))));
    const from = at > 1e8 ? 0 : Math.max(0, at - 60);
    return (from ? "…" : "") + t.slice(from, from + 220).replace(/\s+/g, " ") + (from + 220 < t.length ? "…" : "");
  };
  const [courses, mats, cards, plan] = await Promise.all([getCourses(), docs.list("materials", {}), docs.list("cards", {}), kv.get("plan", [])]);
  const cname = (id) => { const c = courses.find((x) => x.id === id); return c ? `Year ${c.year}, ${c.title}` : ""; };
  res.json({
    materials: mats.filter((m) => all(m.title + " " + (m.body || ""))).slice(0, 25)
      .map((m) => ({ id: m.id, title: m.title, courseId: m.courseId, course: cname(m.courseId), snippet: snip(all(m.title) && !all(m.body) ? m.title : m.body || m.title) })),
    cards: cards.filter((c) => all(c.front + " " + c.back)).slice(0, 25)
      .map((c) => ({ id: c.id, front: c.front, back: c.back, courseId: c.courseId, course: cname(c.courseId) })),
    courses: courses.filter((c) => all(c.title + " " + (c.topics || []).join(" "))).slice(0, 15)
      .map((c) => ({ id: c.id, title: c.title, year: c.year, topics: (c.topics || []).filter((t) => all(t)).slice(0, 5) })),
    plan: plan.filter((p) => all(p.title)).slice(0, 10).map((p) => ({ id: p.id, title: p.title, date: p.date, done: !!p.done })),
  });
}));
app.post("/api/search", wrap(async (req, res) => {
  const q = String(req.body.query || "").trim();
  if (!q) throw new Error("Type a question first");
  const kw = await claude("List 8 English search keywords and synonyms for this medical question, comma separated, nothing else.", q, 100).catch(() => "");
  const terms = [...new Set(tokens(q + " " + kw))];
  const passages = [];
  (await docs.list("materials", req.body.courseId ? { courseId: req.body.courseId } : {})).forEach((m) => {
    const text = m.body || "";
    for (let i = 0; i < text.length; i += 700) passages.push({ m, text: text.slice(i, i + 900) });
  });
  const df = {};
  terms.forEach((t) => (df[t] = passages.filter((p) => p.text.toLowerCase().includes(t)).length));
  const top = passages
    .map((p) => { const l = p.text.toLowerCase(); return { ...p, s: terms.reduce((a, t) => a + (l.includes(t) ? 1 / Math.log(2 + df[t]) : 0), 0) }; })
    .filter((p) => p.s > 0).sort((a, b) => b.s - a.s).slice(0, 8);
  if (!top.length) return res.json({ answer: "Nothing in your materials matches that yet. Add notes or files on this topic first.", sources: [] });
  const courses = await getCourses();
  const sources = top.map((p, i) => {
    const c = courses.find((x) => x.id === p.m.courseId);
    return { n: i + 1, title: p.m.title, courseId: p.m.courseId, course: c ? `Year ${c.year}, ${c.title}` : "", snippet: p.text };
  });
  const answer = await claude(
    "Answer using ONLY the numbered passages. Cite each claim like [1] or [2][3]. If the passages do not answer the question, say so plainly.",
    `Question: ${q}\n\n` + sources.map((s) => `[${s.n}] (${s.title}) ${s.snippet}`).join("\n\n"), 1500);
  res.json({ answer, sources });
}));

// =====================================================================================
// NEW: settings, focus sessions, progress
// =====================================================================================
app.get("/api/settings", wrap(async (q, res) => res.json(await getSettings())));
app.put("/api/settings", wrap(async (req, res) => {
  const lim = { focusMin: [1, 180], shortMin: [1, 60], longMin: [1, 120], longEvery: [2, 10], dailyGoalMin: [10, 720], cardLimit: [0, 500] };
  const cur = await getSettings();
  for (const k of Object.keys(lim)) {
    if (req.body[k] === undefined) continue;
    const v = Math.round(+req.body[k]);
    if (!(v >= lim[k][0] && v <= lim[k][1])) throw bad(`${k} must be between ${lim[k][0]} and ${lim[k][1]}`);
    cur[k] = v;
  }
  if (req.body.reminderTime !== undefined) {
    const t = String(req.body.reminderTime);
    if (t && !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) throw bad("Reminder time must look like 19:30");
    cur.reminderTime = t;
  }
  if (req.body.notify && typeof req.body.notify === "object") {
    cur.notify = { ...DEFAULTS.notify, ...(cur.notify || {}) };
    for (const k of Object.keys(DEFAULTS.notify)) if (req.body.notify[k] !== undefined) cur.notify[k] = !!req.body.notify[k];
  }
  await kv.set("settings", cur);
  res.json(cur);
}));

// A day "counts" for the streak if you did at least a minute of focus, one card, or one quiz answer.
const active = (d) => !!d && ((d.focusSec || 0) >= 60 || (d.cards || 0) > 0 || (d.quiz || 0) > 0);
function streakOf(days, today) {
  const keys = Object.keys(days).filter((k) => DAY.test(k) && active(days[k])).map(dnum).sort((a, b) => a - b);
  const set = new Set(keys), t = dnum(today);
  let best = 0, run = 0, prev = null;
  for (const n of keys) { run = prev !== null && n === prev + 1 ? run + 1 : 1; best = Math.max(best, run); prev = n; }
  // a streak stays alive until the day ends, so count back from yesterday if you haven't studied yet today
  let cur = 0, n = set.has(t) ? t : t - 1;
  while (set.has(n)) { cur++; n--; }
  return { current: cur, best, activeToday: set.has(t) };
}

app.post("/api/sessions", wrap(async (req, res) => {
  const seconds = Math.round(+req.body.seconds);
  if (!(seconds >= 60 && seconds <= 4 * 3600)) throw bad("That session length looks wrong");
  const cid = String(req.body.cid || "").slice(0, 40);
  const sessions = await kv.get("sessions", []);
  if (cid && sessions.some((s) => s.cid === cid)) return res.json({ ok: 1, duplicate: 1 }); // a retry of one already saved
  const day = dayOf(req.body.day);
  const s = { id: id(), cid, courseId: String(req.body.courseId || ""), seconds, day, t: Date.now() };
  sessions.push(s);
  if (sessions.length > 5000) sessions.splice(0, sessions.length - 5000);
  await Promise.all([kv.set("sessions", sessions), bump(day, "focusSec", seconds)]);
  res.json(s);
}));
app.get("/api/sessions", wrap(async (req, res) => {
  const courses = await getCourses();
  const list = (await kv.get("sessions", [])).slice(-30).reverse()
    .map((s) => ({ ...s, course: courses.find((c) => c.id === s.courseId)?.title || "" }));
  res.json(list);
}));
app.delete("/api/sessions/:id", wrap(async (req, res) => {
  const sessions = await kv.get("sessions", []);
  const s = sessions.find((x) => x.id === req.params.id);
  if (!s) return res.json({ ok: 1 });
  await Promise.all([kv.set("sessions", sessions.filter((x) => x.id !== s.id)), bump(s.day, "focusSec", -s.seconds)]);
  res.json({ ok: 1 });
}));

// light summary for the Today page
app.get("/api/summary", wrap(async (req, res) => {
  const day = dayOf(req.query.day);
  const [days, settings] = await Promise.all([kv.get("days", {}), getSettings()]);
  res.json({ day, today: days[day] || {}, streak: streakOf(days, day), goalMin: settings.dailyGoalMin });
}));

// full dashboard
app.get("/api/progress", wrap(async (req, res) => {
  const day = dayOf(req.query.day), t = dnum(day), now = Date.now();
  const [courses, days, settings, sessions, results, cards] = await Promise.all([
    getCourses(), kv.get("days", {}), getSettings(), kv.get("sessions", []), kv.get("results", []),
    docs.list("cards", { project: ["interval", "due"] }),
  ]);
  const sec = (n) => days[dstr(n)]?.focusSec || 0;
  const daily = Array.from({ length: 14 }, (_, i) => { const d = dstr(t - 13 + i); return { day: d, focusSec: days[d]?.focusSec || 0, cards: days[d]?.cards || 0, quiz: days[d]?.quiz || 0 }; });
  const rows = courses.map((c) => {
    // Mastery = average of (a) quiz accuracy over your last 100 answers here and (b) the share of this
    // course's flashcards you have held for 7+ days. Each part needs at least 5 answers / 5 cards to count.
    const rs = results.filter((r) => r.courseId === c.id).slice(-100);
    const quizPct = rs.length >= 5 ? Math.round((100 * rs.filter((r) => r.correct).length) / rs.length) : null;
    const cs = cards.filter((x) => x.courseId === c.id);
    const learned = cs.filter((x) => (x.interval || 0) >= 7).length;
    const cardsPct = cs.length >= 5 ? Math.round((100 * learned) / cs.length) : null;
    const parts = [quizPct, cardsPct].filter((v) => v !== null);
    const secs = sessions.filter((s) => s.courseId === c.id).reduce((a, s) => a + s.seconds, 0);
    return {
      id: c.id, year: c.year, title: c.title,
      mastery: parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : null,
      quizPct, quizN: rs.length, cardsPct, cardsTotal: cs.length, cardsLearned: learned,
      cardsDue: cs.filter((x) => (x.due || 0) <= now).length, hours: +(secs / 3600).toFixed(1),
    };
  });
  res.json({
    day, goalMin: settings.dailyGoalMin, streak: streakOf(days, day), today: days[day] || {},
    totals: { allSec: Object.values(days).reduce((a, d) => a + (d.focusSec || 0), 0), weekSec: Array.from({ length: 7 }, (_, i) => sec(t - i)).reduce((a, b) => a + b, 0), sessions: sessions.length },
    daily, courses: rows, weak: weakTopics(results),
  });
}));

// =====================================================================================
// NEW: drug and lab reference (editable)
// =====================================================================================
const FIELDS = { drugs: ["name", "cls", "use", "adverse", "notes"], labs: ["test", "range", "notes"] };
const kindOf = (req) => { if (!Object.hasOwn(FIELDS, req.params.kind)) throw bad("Unknown table", 404); return req.params.kind; };
const cleanRef = (kind, b) => Object.fromEntries(FIELDS[kind].map((f) => [f, String(b?.[f] ?? "").trim().slice(0, 600)]));
app.get("/api/refs", wrap(async (q, res) => res.json(await getRefs())));
app.post("/api/refs/:kind", wrap(async (req, res) => {
  const kind = kindOf(req), row = cleanRef(kind, req.body);
  if (!row[FIELDS[kind][0]]) throw bad("The first field (name) cannot be empty");
  const refs = await getRefs();
  const r = { id: id(), ...row };
  refs[kind].push(r);
  await kv.set("refs", refs); res.json(r);
}));
app.put("/api/refs/:kind/:rid", wrap(async (req, res) => {
  const kind = kindOf(req), row = cleanRef(kind, req.body);
  if (!row[FIELDS[kind][0]]) throw bad("The first field (name) cannot be empty");
  const refs = await getRefs();
  const i = refs[kind].findIndex((x) => x.id === req.params.rid);
  if (i < 0) throw bad("Row not found", 404);
  refs[kind][i] = { id: req.params.rid, ...row };
  await kv.set("refs", refs); res.json(refs[kind][i]);
}));
app.delete("/api/refs/:kind/:rid", wrap(async (req, res) => {
  const kind = kindOf(req), refs = await getRefs();
  refs[kind] = refs[kind].filter((x) => x.id !== req.params.rid);
  await kv.set("refs", refs); res.json({ ok: 1 });
}));
app.post("/api/refs/:kind/reset", wrap(async (req, res) => {
  const kind = kindOf(req), refs = await getRefs();
  refs[kind] = seedRefs()[kind];
  await kv.set("refs", refs); res.json({ ok: 1 });
}));

// =====================================================================================
// NEW: backup and restore
// =====================================================================================
const BK_ID = /^\d{8}T\d{6}-(auto|manual|pre-restore)$/;
const bkId = (v) => { if (!BK_ID.test(String(v))) throw bad("Bad backup id"); return String(v); };
app.get("/api/backup", wrap(async (q, res) => res.json({ storage: mode, items: await listBackups() })));
app.post("/api/backup", wrap(async (q, res) => res.json(await makeBackup("manual"))));
app.post("/api/backup/auto", wrap(async (q, res) => res.json({ made: await backupIfStale("auto") })));
app.get("/api/backup/download", wrap(async (req, res) => {
  const snap = req.query.id ? await backups.get(bkId(req.query.id)) : await snapshot();
  if (!snap) throw bad("Backup not found", 404);
  res.set("Content-Disposition", `attachment; filename="asclepius-backup-${String(snap.at || "").slice(0, 10)}.json"`).type("application/json").send(JSON.stringify(snap));
}));
app.post("/api/backup/restore", wrap(async (req, res) => {
  const snap = req.body.id ? await backups.get(bkId(req.body.id)) : req.body.data;
  if (!snap) throw bad("Backup not found", 404);
  res.json({ restored: await restore(snap) });
}));
app.delete("/api/backup/:id", wrap(async (req, res) => { await backups.del(bkId(req.params.id)); res.json({ ok: 1 }); }));

// ---- static app shell (on Vercel the public/ folder is served by the CDN instead) ----
const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");
app.use(express.static(PUBLIC_DIR));
app.get("/", (req, res) => res.sendFile("index.html", { root: PUBLIC_DIR }));
// Unknown address: JSON for API calls, a friendly page for people
app.use((req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "That address does not exist on this server." });
  res.status(404).sendFile("404.html", { root: PUBLIC_DIR });
});

// JSON errors instead of HTML error pages
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.status !== 400 && !err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.type === "entity.too.large" ? "That is too large to send in one go" : err.message || "Server error" });
});

// Vercel runs the exported app itself; elsewhere we listen on a port.
if (!onVercel) {
  app.listen(PORT, () => console.log(`Asclepius running at http://localhost:${PORT} (storage: ${mode})`));
  const tick = () => backupIfStale("auto").catch((e) => console.error("backup:", e.message));
  setTimeout(tick, 5000).unref();
  setInterval(tick, 6 * 3600e3).unref();
}
export default app;
