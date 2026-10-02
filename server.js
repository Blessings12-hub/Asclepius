import "dotenv/config";
import express from "express";
import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import PptxGenJS from "pptxgenjs";
import PDFDocument from "pdfkit";
import pdf from "pdf-parse/lib/pdf-parse.js";

const { PASSWORD, ANTHROPIC_API_KEY, SECRET = "change-me", MODEL = "claude-sonnet-4-6", OWNER = "Student", PORT = 3000 } = process.env;
const DB = "data/db.json";
fs.mkdirSync("data/uploads", { recursive: true });

// ---- storage (one JSON file; fine for a single user) ----
const SUBJECTS = {
  1: ["Anatomy", "Physiology", "Biochemistry", "Histology & Embryology"],
  2: ["Pathology", "Pharmacology", "Microbiology", "Immunology"],
  3: ["Internal Medicine", "General Surgery", "Paediatrics", "Clinical Skills"],
  4: ["Obstetrics & Gynaecology", "Psychiatry", "Neurology", "Dermatology"],
  5: ["Emergency Medicine", "Radiology", "Orthopaedics", "Ophthalmology & ENT"],
  6: ["Family Medicine", "Public Health", "Forensic Medicine", "Internship Rotations"],
};
const id = () => crypto.randomBytes(6).toString("hex");
let db = fs.existsSync(DB)
  ? JSON.parse(fs.readFileSync(DB, "utf8"))
  : { courses: Object.entries(SUBJECTS).flatMap(([y, l]) => l.map((title) => ({ id: id(), year: +y, title }))), materials: [] };
const save = () => fs.writeFileSync(DB, JSON.stringify(db, null, 1));
db.cards ||= []; db.plan ||= []; db.results ||= [];
save();

// ---- AI helpers ----
async function claude(system, user, max = 4000) {
  if (!ANTHROPIC_API_KEY) throw new Error("Add ANTHROPIC_API_KEY to .env");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: max, system, messages: [{ role: "user", content: user }] }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || "AI request failed");
  return j.content.map((c) => c.text || "").join("");
}
const translate = (t) =>
  claude("Translate the text into English. Keep structure and medical terms accurate. If it is already English, return it unchanged. Output only the text.", t.slice(0, 20000), 8000);
async function pageText(url) {
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error("Could not open that link");
  return (await r.text()).replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 30000);
}
const context = (courseId) =>
  db.materials.filter((m) => m.courseId === courseId && m.body).map((m) => `# ${m.title}\n${m.body}`).join("\n\n").slice(0, 40000);

// ---- app + auth ----
const app = express();
app.use(express.json({ limit: "20mb" }));
const tok = () => crypto.createHmac("sha256", SECRET).update(PASSWORD || "").digest("hex");
const authed = (req) => (req.headers.cookie || "").split(/;\s*/).includes("t=" + tok());
app.post("/api/login", (req, res) => {
  if (!PASSWORD || req.body.password !== PASSWORD) return res.status(401).json({ error: "Wrong password" });
  res.setHeader("Set-Cookie", `t=${tok()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`);
  res.json({ ok: 1 });
});
const guard = (req, res, next) => (authed(req) ? next() : res.status(401).json({ error: "login" }));
app.use("/api", guard);
app.use("/files", guard, express.static("data/uploads"));
app.use(express.static("public"));

const upload = multer({
  storage: multer.diskStorage({
    destination: "data/uploads",
    filename: (q, f, cb) => cb(null, id() + path.extname(f.originalname).toLowerCase()),
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
});
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => res.status(500).json({ error: e.message }));

// ---- courses & materials ----
app.get("/api/courses", (q, res) => res.json(db.courses));
app.post("/api/courses", (req, res) => {
  const c = { id: id(), year: +req.body.year, title: String(req.body.title).slice(0, 100) };
  db.courses.push(c); save(); res.json(c);
});
app.get("/api/materials", (req, res) => res.json(db.materials.filter((m) => m.courseId === req.query.courseId)));
app.post("/api/materials", upload.single("file"), wrap(async (req, res) => {
  const { courseId, type, title, url = "", translate: tr } = req.body;
  let body = req.body.body || "";
  if (type === "link" && url) body = await pageText(url);
  if (req.file && /\.(txt|md)$/i.test(req.file.originalname)) body = fs.readFileSync(req.file.path, "utf8");
  if (req.file && /\.pdf$/i.test(req.file.originalname)) body = (await pdf(fs.readFileSync(req.file.path))).text.slice(0, 60000);
  if (tr === "1" && body) body = await translate(body);
  const m = { id: id(), courseId, type, title: title || "Untitled", url, body, file: req.file?.filename || "" };
  db.materials.push(m); save(); res.json(m);
}));
app.delete("/api/materials/:id", (req, res) => {
  const m = db.materials.find((x) => x.id === req.params.id);
  if (m?.file) fs.rmSync("data/uploads/" + m.file, { force: true });
  db.materials = db.materials.filter((x) => x.id !== req.params.id); save(); res.json({ ok: 1 });
});

// ---- translate anything on the spot ----
app.post("/api/translate", wrap(async (req, res) => {
  const t = /^https?:\/\//i.test(req.body.text.trim()) ? await pageText(req.body.text.trim()) : req.body.text;
  res.json({ text: await translate(t) });
}));

// ---- study help ----
app.post("/api/ai", wrap(async (req, res) => {
  const { courseId, mode, prompt = "" } = req.body;
  const course = db.courses.find((c) => c.id === courseId);
  const modes = {
    chat: "Answer the question clearly and accurately for a medical student.",
    guide: "Write a structured study guide: key concepts, mechanisms, high-yield facts, common exam pitfalls, and 10 practice questions with answers.",
    quiz: "Write 10 exam-style multiple choice questions with 5 options, correct answers and short explanations.",
  };
  const sys = `You are a study tutor for a medical student. Course: ${course?.title}. ${modes[mode] || modes.chat} Prefer the student's own materials below when relevant, and say when something is not in them. Flag anything uncertain.\n\nMATERIALS:\n${context(courseId)}`;
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
    `Topic: ${topic}\n\nMy materials:\n${context(courseId).slice(0, 20000)}`, 6000);
  const slides = JSON.parse(raw.replace(/```json|```/g, "").trim());
  const imgs = await Promise.all(slides.map((s) => wikiImage(s.image || s.title)));
  if (format === "pdf") {
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
    res.type("pdf").send(Buffer.concat(chunks));
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
const parseJSON = (t) => JSON.parse(t.replace(/```json|```/g, "").trim());
app.post("/api/cards/generate", wrap(async (req, res) => {
  const { courseId, prompt = "" } = req.body;
  const out = parseJSON(await claude('Return ONLY a JSON array of 15 flashcards [{"front":string,"back":string}] for a medical student. Short, one fact per card, from the materials when possible.', `Focus: ${prompt || "whole course"}\n\n${context(courseId)}`, 5000));
  out.forEach((c) => db.cards.push({ id: id(), courseId, front: c.front, back: c.back, due: Date.now(), ease: 2.5, interval: 0 }));
  save(); res.json({ added: out.length });
}));
app.get("/api/cards/due", (q, res) => res.json(db.cards.filter((c) => c.due <= Date.now()).slice(0, 50)));
app.post("/api/cards/:id/review", (req, res) => {
  const c = db.cards.find((x) => x.id === req.params.id), g = +req.body.grade;
  if (!c) return res.status(404).json({ error: "No such card" });
  if (g === 0) { c.ease = Math.max(1.3, c.ease - 0.2); c.interval = 0; c.due = Date.now() + 6e5; }
  else {
    c.interval = c.interval ? Math.round(c.interval * c.ease * [0, 0.8, 1, 1.3][g]) || 1 : [0, 1, 2, 4][g];
    c.ease = Math.max(1.3, c.ease + [0, -0.1, 0, 0.1][g]); c.due = Date.now() + c.interval * 864e5;
  }
  save(); res.json({ ok: 1 });
});

// ---- question bank + weak topics ----
app.post("/api/quiz", wrap(async (req, res) => {
  const { courseId, prompt = "" } = req.body;
  const questions = parseJSON(await claude('Return ONLY a JSON array of 10 exam-style questions [{"topic":string (2-3 words),"q":string,"options":[5 strings],"answer":index 0-4,"why":string}].', `Focus: ${prompt || "whole course"}\n\n${context(courseId)}`, 5000));
  res.json({ questions });
}));
app.post("/api/results", (req, res) => {
  db.results.push({ courseId: req.body.courseId, topic: String(req.body.topic).slice(0, 60), correct: !!req.body.correct });
  save(); res.json({ ok: 1 });
});
app.get("/api/stats", (q, res) => {
  const t = {};
  db.results.forEach((r) => { const k = r.topic; t[k] ||= { topic: k, n: 0, ok: 0 }; t[k].n++; t[k].ok += r.correct; });
  res.json(Object.values(t).filter((x) => x.n >= 2).map((x) => ({ ...x, pct: Math.round((100 * x.ok) / x.n) })).sort((a, b) => a.pct - b.pct).slice(0, 8));
});

// ---- study planner ----
app.get("/api/plan", (q, res) => res.json([...db.plan].sort((a, b) => (a.date || "9").localeCompare(b.date || "9"))));
app.post("/api/plan", (req, res) => { db.plan.push({ id: id(), title: String(req.body.title).slice(0, 120), date: req.body.date || "", done: false }); save(); res.json({ ok: 1 }); });
app.patch("/api/plan/:id", (req, res) => { const p = db.plan.find((x) => x.id === req.params.id); if (p) p.done = !!req.body.done; save(); res.json({ ok: 1 }); });
app.delete("/api/plan/:id", (req, res) => { db.plan = db.plan.filter((x) => x.id !== req.params.id); save(); res.json({ ok: 1 }); });

// ---- photo capture: handwriting, slides, book pages ----
app.post("/api/capture", upload.single("image"), wrap(async (req, res) => {
  const f = req.file;
  if (!f) throw new Error("No image received");
  const mt = { ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" }[path.extname(f.filename)] || "image/jpeg";
  const body = await claude(
    "Transcribe all text in the image in reading order, describing any diagram or table briefly in square brackets. Then write clean English study notes from it, translating if the text is not English and keeping medical terms accurate. Use two parts headed 'Transcription' and 'Notes (English)'.",
    [{ type: "image", source: { type: "base64", media_type: mt, data: fs.readFileSync(f.path).toString("base64") } }, { type: "text", text: "Process this page." }], 6000);
  const m = { id: id(), courseId: req.body.courseId, type: "photo", title: req.body.title || "Photo notes", url: "", body, file: f.filename };
  db.materials.push(m); save(); res.json(m);
}));

// ---- Anki import/export (tab-separated text, Anki's own text format) ----
app.get("/api/anki/export", (req, res) => {
  const c = db.courses.find((x) => x.id === req.query.courseId);
  const clean = (t) => String(t).replace(/[\t\r\n]+/g, " ");
  const rows = db.cards.filter((x) => !req.query.courseId || x.courseId === req.query.courseId)
    .map((x) => [clean(x.front), clean(x.back), (c?.title || "asclepius").replace(/\s+/g, "_")].join("\t"));
  res.set("Content-Disposition", 'attachment; filename="cards.txt"').type("text/plain")
    .send(["#separator:tab", "#html:false", "#tags column:3", ...rows].join("\n"));
});
app.post("/api/anki/import", (req, res) => {
  let n = 0;
  String(req.body.text || "").split(/\r?\n/).forEach((l) => {
    if (!l || l.startsWith("#")) return;
    const p = l.split("\t");
    if (p.length < 2) return;
    const strip = (t) => t.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").trim();
    db.cards.push({ id: id(), courseId: req.body.courseId, front: strip(p[0]), back: strip(p[1]), due: Date.now(), ease: 2.5, interval: 0 });
    n++;
  });
  save(); res.json({ added: n });
});

// ---- search across everything, with citations ----
const tokens = (t) => String(t).toLowerCase().match(/[a-z0-9]{3,}/g) || [];
app.post("/api/search", wrap(async (req, res) => {
  const q = String(req.body.query || "").trim();
  if (!q) throw new Error("Type a question first");
  const kw = await claude("List 8 English search keywords and synonyms for this medical question, comma separated, nothing else.", q, 100).catch(() => "");
  const terms = [...new Set(tokens(q + " " + kw))];
  const passages = [];
  db.materials.forEach((m) => {
    if (req.body.courseId && m.courseId !== req.body.courseId) return;
    const text = m.body || "";
    for (let i = 0; i < text.length; i += 700) passages.push({ m, text: text.slice(i, i + 900) });
  });
  const df = {};
  terms.forEach((t) => (df[t] = passages.filter((p) => p.text.toLowerCase().includes(t)).length));
  const top = passages
    .map((p) => { const l = p.text.toLowerCase(); return { ...p, s: terms.reduce((a, t) => a + (l.includes(t) ? 1 / Math.log(2 + df[t]) : 0), 0) }; })
    .filter((p) => p.s > 0).sort((a, b) => b.s - a.s).slice(0, 8);
  if (!top.length) return res.json({ answer: "Nothing in your materials matches that yet. Add notes or files on this topic first.", sources: [] });
  const sources = top.map((p, i) => {
    const c = db.courses.find((x) => x.id === p.m.courseId);
    return { n: i + 1, title: p.m.title, courseId: p.m.courseId, course: c ? `Year ${c.year}, ${c.title}` : "", snippet: p.text };
  });
  const answer = await claude(
    "Answer using ONLY the numbered passages. Cite each claim like [1] or [2][3]. If the passages do not answer the question, say so plainly.",
    `Question: ${q}\n\n` + sources.map((s) => `[${s.n}] (${s.title}) ${s.snippet}`).join("\n\n"), 1500);
  res.json({ answer, sources });
}));

app.listen(PORT, () => console.log(`Asclepius running at http://localhost:${PORT}`));
