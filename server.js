import "dotenv/config";
import express from "express";
import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import PptxGenJS from "pptxgenjs";
import PDFDocument from "pdfkit";

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
app.use(express.json({ limit: "2mb" }));
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
app.post("/api/present", wrap(async (req, res) => {
  const { courseId, topic, format } = req.body;
  const raw = await claude(
    "Return ONLY JSON: an array of 8-12 slides, each {\"title\":string,\"bullets\":[3-5 short strings],\"notes\":string}. Plain, natural student-written wording. No markdown, no mention of AI.",
    `Topic: ${topic}\n\nMy materials:\n${context(courseId).slice(0, 20000)}`, 6000);
  const slides = JSON.parse(raw.replace(/```json|```/g, "").trim());
  if (format === "pdf") {
    const doc = new PDFDocument({ layout: "landscape", size: "A4", info: { Title: topic, Author: OWNER, Producer: "", Creator: "" } });
    const chunks = []; doc.on("data", (c) => chunks.push(c));
    slides.forEach((s, i) => {
      if (i) doc.addPage();
      doc.fontSize(30).fillColor("#14232B").text(s.title, 60, 60, { width: 720 });
      doc.moveDown().fontSize(20).list(s.bullets, { bulletRadius: 3, textIndent: 16, bulletIndent: 8 });
    });
    doc.end(); await new Promise((r) => doc.on("end", r));
    res.type("pdf").send(Buffer.concat(chunks));
  } else {
    const p = new PptxGenJS();
    p.author = OWNER; p.company = ""; p.title = topic; p.layout = "LAYOUT_WIDE";
    slides.forEach((s) => {
      const sl = p.addSlide();
      sl.addText(s.title, { x: 0.6, y: 0.4, w: 12, h: 1, fontSize: 32, bold: true, color: "14232B" });
      sl.addText(s.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })), { x: 0.8, y: 1.6, w: 11.5, h: 5, fontSize: 22, color: "14232B", valign: "top" });
      sl.addNotes(s.notes || "");
    });
    res.type("application/vnd.openxmlformats-officedocument.presentationml.presentation").send(await p.write({ outputType: "nodebuffer" }));
  }
}));

app.listen(PORT, () => console.log(`Asclepius running at http://localhost:${PORT}`));
