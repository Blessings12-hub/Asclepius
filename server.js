import "dotenv/config";
import express from "express";
import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import PptxGenJS from "pptxgenjs";
import PDFDocument from "pdfkit";
import pdf from "pdf-parse/lib/pdf-parse.js";
import { kv, docs, files, backups, cloud, mode, ready, onVercel, UPLOAD_DIR } from "./lib/store.js";
import { seedCourses, seedRefs, courseId } from "./lib/seed.js";
import { makeBackup, backupIfStale, listBackups, snapshot, restore } from "./lib/backup.js";
import { ai, parseJSON, info as aiInfo, ctxChars } from "./lib/ai.js";

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
async function getCourses() {
  let c = await kv.get("courses", null);
  if (!c) { c = seedCourses(); await kv.set("courses", c); }
  return c;
}
const DEFAULTS = { focusMin: 25, shortMin: 5, longMin: 15, longEvery: 4, dailyGoalMin: 120 };
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
const tok = () => crypto.createHmac("sha256", SECRET).update(PASSWORD || "").digest("hex");
const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const authed = (req) => {
  const m = /(?:^|;\s*)t=([a-f0-9]+)/.exec(req.headers.cookie || "");
  return !!PASSWORD && !!m && same(m[1], tok());
};
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
  if (!same(String(req.body.password ?? ""), PASSWORD)) { await sleep(700); throw bad("Wrong password", 401); }
  res.setHeader("Set-Cookie", `t=${tok()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${req.secure ? "; Secure" : ""}`);
  res.json({ ok: 1 });
}));

// Everything below needs working storage. On Vercel that means Supabase must be set up.
app.use("/api", (req, res, next) =>
  ready ? next() : res.status(503).json({ error: "Cloud storage is not set up yet. Add SUPABASE_URL and SUPABASE_SECRET_KEY in your Vercel environment variables, run schema.sql in Supabase, then redeploy." }));

// Nightly backup, called by Vercel Cron with "Authorization: Bearer <CRON_SECRET>"
app.get("/api/cron/backup", wrap(async (req, res) => {
  if (!CRON_SECRET || !same(req.headers.authorization || "", `Bearer ${CRON_SECRET}`)) throw bad("unauthorized", 401);
  res.json({ made: await makeBackup("auto") });
}));

app.use("/api", guard);

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
app.post("/api/materials", upload.single("file"), wrap(async (req, res) => {
  const { courseId, url = "", translate: tr } = req.body;
  const type = ["note", "link", "3d", "photo", "file"].includes(req.body.type) ? req.body.type : "note";
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
      catch { body = ""; warning = "Saved, but the text inside this PDF could not be read, so it will not appear in search or study help."; }
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
app.post("/api/ai", wrap(async (req, res) => {
  const { courseId, mode: m, prompt = "" } = req.body;
  const course = (await getCourses()).find((c) => c.id === courseId);
  const modes = {
    chat: "Answer the question clearly and accurately for a medical student.",
    guide: "Write a structured study guide: key concepts, mechanisms, high-yield facts, common exam pitfalls, and 10 practice questions with answers.",
    quiz: "Write 10 exam-style multiple choice questions with 5 options, correct answers and short explanations.",
  };
  const sys = `You are a study tutor for a medical student. Course: ${course?.title}. ${modes[m] || modes.chat} Prefer the student's own materials below when relevant, and say when something is not in them. Flag anything uncertain.\n\nMATERIALS:\n${await context(courseId)}`;
  res.json({ text: await claude(sys, prompt || "Make it for the whole course.") });
}));

// ---- presentations (PowerPoint + PDF) ----
const UA = { "user-agent": "Asclepius/0.2 (personal study app)" };
async function wikiImage(q) {
  try {
    const u = "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=900&gsrsearch=" + encodeURIComponent(q + " filetype:bitmap");
    const j = await (await fetch(u, { headers: UA })).json();
    for (const p of Object.values(j.query?.pages || {})) {
      const i = p.imageinfo?.[0];
      if (i && /\.(jpe?g|png)$/i.test(i.thumburl || "")) {
        const b = Buffer.from(await (await fetch(i.thumburl, { headers: UA })).arrayBuffer());
        const lic = i.extmetadata?.LicenseShortName?.value || "see source";
        return { b, png: /\.png$/i.test(i.thumburl), credit: `Image: ${p.title.replace("File:", "")}, Wikimedia Commons, ${lic}` };
      }
    }
  } catch {}
  return null;
}
app.post("/api/present", wrap(async (req, res) => {
  const { courseId, topic, format } = req.body;
  const raw = await claude(
    'Return ONLY JSON: an array of 8-12 slides, each {"title":string,"bullets":[3-5 short strings],"notes":string,"image":"2-4 word search query for a real diagram or photo"}. Plain, natural student-written wording. No markdown, no mention of AI.',
    `Topic: ${topic}\n\nMy materials:\n${(await context(courseId)).slice(0, Math.min(ctxChars, 20000))}`, 6000);
  const slides = JSON.parse(raw.replace(/```json|```/g, "").trim());
  const imgs = await Promise.all(slides.map((s) => wikiImage(s.image || s.title)));
  if (format === "pdf") {
    let out;
    try {
      const doc = new PDFDocument({ layout: "landscape", size: "A4", info: { Title: topic, Author: OWNER, Producer: "", Creator: "" } });
      const chunks = []; doc.on("data", (c) => chunks.push(c));
      slides.forEach((s, i) => {
        if (i) doc.addPage();
        const m = imgs[i];
        doc.fontSize(30).fillColor("#14232B").text(s.title, 60, 50, { width: 720 });
        doc.fontSize(20).list(s.bullets, 60, 120, { width: m ? 400 : 720, bulletRadius: 3, textIndent: 16, bulletIndent: 8 });
        if (m) { doc.image(m.b, 490, 120, { fit: [300, 280] }); doc.fontSize(8).fillColor("#5a6d70").text(m.credit, 490, 410, { width: 300 }); }
      });
      doc.end(); await new Promise((r) => doc.on("end", r));
      out = Buffer.concat(chunks);
    } catch (e) {
      if (/ENOENT|\.afm/i.test(e.message)) throw new Error("PDF export is not working on this server (font files missing). Use PowerPoint instead.");
      throw e;
    }
    res.type("pdf").send(out);
  } else {
    const p = new PptxGenJS();
    p.author = OWNER; p.company = ""; p.title = topic; p.layout = "LAYOUT_WIDE";
    slides.forEach((s, i) => {
      const sl = p.addSlide(), m = imgs[i];
      sl.addText(s.title, { x: 0.6, y: 0.4, w: 12, h: 1, fontSize: 32, bold: true, color: "14232B" });
      sl.addText(s.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })), { x: 0.8, y: 1.6, w: m ? 7 : 11.5, h: 5, fontSize: 22, color: "14232B", valign: "top" });
      if (m) {
        sl.addImage({ data: `image/${m.png ? "png" : "jpeg"};base64,${m.b.toString("base64")}`, x: 8.2, y: 1.6, w: 4.5, h: 3.6, sizing: { type: "contain", w: 4.5, h: 3.6 } });
        sl.addText(m.credit, { x: 8.2, y: 5.3, w: 4.5, h: 0.5, fontSize: 8, color: "5A6D70" });
      }
      sl.addNotes(s.notes || "");
    });
    res.type("application/vnd.openxmlformats-officedocument.presentationml.presentation").send(await p.write({ outputType: "nodebuffer" }));
  }
}));

// ---- flashcards (spaced repetition) ----
app.post("/api/cards/generate", wrap(async (req, res) => {
  const { courseId, prompt = "" } = req.body;
  const out = parseJSON(await claude('Return ONLY a JSON array of 15 flashcards [{"front":string,"back":string}] for a medical student. Short, one fact per card, from the materials when possible.', `Focus: ${prompt || "whole course"}\n\n${await context(courseId)}`, 5000));
  if (!Array.isArray(out)) throw new Error("The AI answer was not in the expected format. Try again.");
  const now = Date.now();
  const cards = out.filter((c) => c && c.front && c.back).map((c) => ({ id: id(), courseId, front: String(c.front), back: String(c.back), due: now, ease: 2.5, interval: 0 }));
  await docs.putMany("cards", cards);
  res.json({ added: cards.length });
}));
app.get("/api/cards/due", wrap(async (q, res) => res.json(await docs.list("cards", { numLte: Date.now(), sortNum: true, limit: 50 }))));
app.post("/api/cards/:id/review", wrap(async (req, res) => {
  const c = await docs.get("cards", req.params.id), g = +req.body.grade;
  if (!c) throw bad("No such card", 404);
  if (![0, 1, 2, 3].includes(g)) throw bad("Bad grade");
  if (g === 0) { c.ease = Math.max(1.3, c.ease - 0.2); c.interval = 0; c.due = Date.now() + 6e5; }
  else {
    c.interval = c.interval ? Math.round(c.interval * c.ease * [0, 0.8, 1, 1.3][g]) || 1 : [0, 1, 2, 4][g];
    c.ease = Math.max(1.3, c.ease + [0, -0.1, 0, 0.1][g]); c.due = Date.now() + c.interval * 864e5;
  }
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
  const lim = { focusMin: [1, 180], shortMin: [1, 60], longMin: [1, 120], longEvery: [2, 10], dailyGoalMin: [10, 720] };
  const cur = await getSettings();
  for (const k of Object.keys(lim)) {
    if (req.body[k] === undefined) continue;
    const v = Math.round(+req.body[k]);
    if (!(v >= lim[k][0] && v <= lim[k][1])) throw bad(`${k} must be between ${lim[k][0]} and ${lim[k][1]}`);
    cur[k] = v;
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
app.use(express.static("public"));

// JSON errors instead of HTML error pages
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
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
