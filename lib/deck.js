// Builds the files: PowerPoint, slide PDF and study-guide PDF, plus the cleaning that keeps AI text tidy.
import PptxGenJS from "pptxgenjs";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js"; // fonts are built into this file, so it also works on Vercel
import fs from "fs";
import { fileURLToPath } from "url";
import { fetchImage, pool } from "./media.js";
import { layoutDiagram } from "./diagram.js";
// DejaVu fonts (free licence) know subscripts, charges, arrows and Greek letters, so reactions print as real symbols
const FONT_DIR = fileURLToPath(new URL("./fonts/", import.meta.url));
let FONTS = null;
const loadFonts = () => {
  if (FONTS !== null) return FONTS;
  try { FONTS = Object.fromEntries([["Helvetica", "DejaVuSans"], ["Helvetica-Bold", "DejaVuSans-Bold"], ["Helvetica-Oblique", "DejaVuSans-Oblique"], ["Times-Bold", "DejaVuSerif-Bold"]].map(([k, f]) => [k, fs.readFileSync(FONT_DIR + f + ".ttf")])); }
  catch { FONTS = false; }
  return FONTS;
};
const uniSafe = (s) => String(s ?? "").replace(/[\u0000-\u0008\u000B-\u001F]/g, "").replace(/\u00a0/g, " ");

const THEMES = {
  clinical: { label: "Clinical teal", dark: "0F3B3A", mid: "1F7A5C", accent: "2FB58C", light: "F3F8F6", ink: "14232B", muted: "5A6D70", soft: "DCEBE6" },
  midnight: { label: "Midnight blue", dark: "0B1F3A", mid: "2563EB", accent: "4DA3FF", light: "F3F6FB", ink: "101B2D", muted: "5B6B80", soft: "DCE6F5" },
  warm: { label: "Warm", dark: "2B2118", mid: "C2410C", accent: "F59E0B", light: "FBF7F2", ink: "27200F", muted: "6B5E50", soft: "F1E4D3" },
};
const theme = (k) => THEMES[k] || THEMES.clinical;

// ---- text cleaning ----
// remove markdown leftovers (**, ##, bullets, backticks) so nothing odd lands on a slide
const tidy = (s, max = 400) => String(s ?? "")
  .replace(/```[a-z]*/gi, "").replace(/\*\*|__|`/g, "").replace(/^\s*#{1,6}\s+/gm, "").replace(/^\s*(?:[-*•▪●]|\d+[.)])\s+/gm, "")
  .replace(/\[\d+\]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
const list = (a, n, max) => (Array.isArray(a) ? a : []).map((x) => tidy(typeof x === "string" ? x : x?.text, max)).filter(Boolean).slice(0, n);

// PDF built-in fonts only know Western characters, so swap medical symbols for readable text
const MAP = { "→": "->", "←": "<-", "↔": "<->", "↑": "(up) ", "↓": "(down) ", "≥": ">=", "≤": "<=", "≈": "~", "≠": "!=", "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta", "Δ": "delta ", "κ": "kappa", "λ": "lambda", "μ": "mc", "σ": "sigma", "ω": "omega", "π": "pi", "‑": "-", "−": "-", "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "⁺": "+", "⁻": "-", "✓": "yes", "✔": "yes", "✗": "no", "•": "-", "…": "...", "’": "'", "‘": "'", "“": '"', "”": '"', "–": "-", "—": "-", "\u00a0": " " };
const pdfSafe = (s) => String(s ?? "").replace(/[^\x20-\x7E\u00A0-\u00FF]/g, (c) => MAP[c] ?? "").replace(/\u00a0/g, " ");
const pdfSafeLatin = pdfSafe;

// "Term: explanation" -> bold term + rest
const splitLead = (t) => { const m = /^(.{2,42}?):\s+(.+)$/.exec(t); return m && !/^https?$/i.test(m[1]) ? [m[1], m[2]] : [null, t]; };

// ---- deck normalisation (used on the way out of the AI and on the way into the export) ----
const LAYOUTS = ["bullets", "steps", "compare", "facts", "summary"];
function normalizeDeck(raw, topic) {
  const d = raw && typeof raw === "object" ? raw : {};
  const fromGuide = !!d.fromGuide; // slides that summarise a study guide stay short: 4 bullets of about 15 words
  const slides = (Array.isArray(d.slides) ? d.slides : []).slice(0, 30).map((s) => {
    const layout = LAYOUTS.includes(s?.layout) ? s.layout : "bullets";
    const o = {
      layout, title: tidy(s?.title, 90) || "Untitled", kicker: tidy(s?.kicker, 40), notes: tidy(s?.notes, 900),
      bullets: list(s?.bullets, fromGuide ? 4 : 6, fromGuide ? 115 : 170), guideSection: Math.max(0, Math.min(20, Math.round(+s?.guideSection) || 0)), image: tidy(s?.image, 60), image2: tidy(s?.image2, 60),
      cands: Array.isArray(s?.cands) ? s.cands.slice(0, 5).map((c) => ({ url: String(c.url || ""), w: +c.w || 0, h: +c.h || 0, credit: tidy(c.credit, 220), page: String(c.page || ""), src: String(c.src || "") })) : [],
      pick: Number.isInteger(s?.pick) ? s.pick : 0,
    };
    o.steps = (Array.isArray(s?.steps) ? s.steps : []).slice(0, 5).map((x) => ({ head: tidy(x?.head, 40), text: tidy(x?.text, 150) })).filter((x) => x.head || x.text);
    const side = (x) => ({ head: tidy(x?.head, 40), bullets: list(x?.bullets, 5, 130) });
    o.left = side(s?.left); o.right = side(s?.right);
    o.facts = (Array.isArray(s?.facts) ? s.facts : []).slice(0, 4).map((x) => ({ value: tidy(x?.value, 18), label: tidy(x?.label, 60) })).filter((x) => x.value && x.label);
    // fall back to plain bullets when a special layout came back empty
    if (layout === "steps" && o.steps.length < 2) o.layout = "bullets";
    if (layout === "compare" && !(o.left.bullets.length && o.right.bullets.length)) o.layout = "bullets";
    if (layout === "facts" && o.facts.length < 2) o.layout = "bullets";
    if (!o.bullets.length && o.layout === "bullets") o.bullets = [o.title];
    return o;
  });
  const cover = d.cover || {};
  return {
    title: tidy(d.title, 100) || tidy(topic, 100) || "Presentation",
    subtitle: tidy(d.subtitle, 140),
    topic: tidy(topic, 100),
    course: tidy(d.course, 100),
    cover: { image: tidy(cover.image, 60), cands: (cover.cands || []).slice(0, 5).map((c) => ({ url: String(c.url || ""), w: +c.w || 0, h: +c.h || 0, credit: tidy(c.credit, 220), page: String(c.page || ""), src: String(c.src || "") })), pick: Number.isInteger(cover.pick) ? cover.pick : 0 },
    slides, fromGuide, guideTitle: tidy(d.guideTitle, 100),
    guideSections: (Array.isArray(d.guideSections) ? d.guideSections : []).slice(0, 16).map((x, i) => ({ n: +x?.n || i + 1, heading: tidy(x?.heading, 90) })).filter((x) => x.heading),
    sources: (Array.isArray(d.sources) ? d.sources : []).slice(0, 6).map((x) => ({ title: tidy(x?.title, 80), url: /^https?:\/\//.test(x?.url) ? String(x.url).slice(0, 160) : "" })),
  };
}
const chosen = (o) => (o.pick >= 0 && o.cands[o.pick]) || null;

// fit an image of ratio r into a box (inches or points), centred
const fit = (r, x, y, w, h) => { const bw = Math.min(w, h * r), bh = bw / r; return { x: x + (w - bw) / 2, y: y + (h - bh) / 2, w: bw, h: bh }; };
const ratioOf = (c) => (c.w && c.h ? c.w / c.h : 1.4);

// ---------------------------------------------------------------------------------------
// PowerPoint
// ---------------------------------------------------------------------------------------
async function buildPptx(deck, imgs, themeKey, owner) {
  const T = theme(themeKey), p = new PptxGenJS();
  p.layout = "LAYOUT_WIDE"; p.author = owner; p.company = ""; p.title = deck.title;
  const HEAD = "Georgia", BODY = "Calibri", W = 13.333, H = 7.5;
  const shadow = () => ({ type: "outer", color: "000000", opacity: 0.12, blur: 8, offset: 2, angle: 90 });
  let n = 0;

  const footer = (sl, dark, s) => {
    n++;
    sl.addText(s?.guideSection ? `Full detail: study guide (PDF), section ${s.guideSection}` : deck.title, { x: 0.6, y: 7.0, w: 9, h: 0.3, fontFace: BODY, fontSize: 10, color: dark ? T.soft : T.muted, margin: 0 });
    sl.addText(String(n), { x: W - 1.1, y: 7.0, w: 0.5, h: 0.3, fontFace: BODY, fontSize: 10, color: dark ? T.soft : T.muted, align: "right", margin: 0 });
  };
  const heading = (sl, s) => {
    if (s.kicker) sl.addText(s.kicker.toUpperCase(), { x: 0.6, y: 0.35, w: 9, h: 0.3, fontFace: BODY, fontSize: 12, bold: true, color: T.mid, charSpacing: 3, margin: 0 });
    sl.addText(s.title, { x: 0.6, y: 0.65, w: 12.1, h: 0.9, fontFace: HEAD, fontSize: s.title.length > 55 ? 26 : 32, bold: true, color: T.ink, valign: "middle", margin: 0, fit: "shrink" });
    sl.addShape(p.ShapeType.rect, { x: 0.6, y: 1.6, w: 0.9, h: 0.07, fill: { color: T.accent }, line: { color: T.accent, width: 0 } });
  };
  // one run per bullet: mixing bold and normal runs inside one bullet made pptxgenjs split the paragraph
  const runs = (items, color, size) => items.map((b) => ({ text: b, options: { fontFace: BODY, fontSize: size, color, bullet: { indent: 20 }, paraSpaceAfter: 12, breakLine: true } }));
  const picture = (sl, c, x, y, w, h, creditColor) => {
    const im = c && imgs.get(c.url);
    if (!im) return false;
    sl.addShape(p.ShapeType.roundRect, { x, y, w, h, fill: { color: "FFFFFF" }, line: { color: T.soft, width: 1 }, rectRadius: 0.12, shadow: shadow() });
    const f = fit(ratioOf(c), x + 0.15, y + 0.15, w - 0.3, h - 0.3);
    sl.addImage({ data: `${im.mime};base64,${im.b.toString("base64")}`, ...f });
    sl.addText(c.credit, { x, y: y + h + 0.08, w, h: 0.55, fontFace: BODY, fontSize: 8, color: creditColor || T.muted, valign: "top", margin: 0, fit: "shrink" });
    return true;
  };

  // title slide
  {
    const sl = p.addSlide(); sl.background = { color: T.dark }; n++;
    sl.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 0.28, h: H, fill: { color: T.accent }, line: { color: T.accent, width: 0 } });
    const c = chosen(deck.cover), has = c && imgs.has(c.url);
    const tw = has ? 6.6 : 11.5;
    if (deck.course) sl.addText(deck.course.toUpperCase(), { x: 0.9, y: 1.2, w: tw, h: 0.4, fontFace: BODY, fontSize: 14, bold: true, color: T.accent, charSpacing: 4, margin: 0 });
    sl.addText(deck.title, { x: 0.9, y: 1.8, w: tw, h: 2.6, fontFace: HEAD, fontSize: deck.title.length > 40 ? 38 : 46, bold: true, color: "FFFFFF", valign: "top", margin: 0, fit: "shrink" });
    if (deck.subtitle) sl.addText(deck.subtitle, { x: 0.9, y: 4.5, w: tw, h: 1.0, fontFace: BODY, fontSize: 20, color: T.soft, valign: "top", margin: 0, fit: "shrink" });
    sl.addText(`${owner}  ·  ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, { x: 0.9, y: 6.6, w: tw, h: 0.35, fontFace: BODY, fontSize: 13, color: T.soft, margin: 0 });
    if (has) picture(sl, c, 8.0, 0.9, 4.85, 5.0, T.soft);
  }
  // agenda (when the deck summarises a study guide, this slide lists what the guide PDF contains)
  const agenda = deck.slides.filter((s) => s.layout !== "summary").map((s) => s.title).slice(0, 10);
  if (agenda.length >= 4) {
    const sl = p.addSlide(); sl.background = { color: T.light };
    heading(sl, { title: "What we will cover", kicker: "Outline" });
    const half = Math.ceil(agenda.length / 2);
    agenda.forEach((t, i) => {
      const col = i < half ? 0 : 1, row = col ? i - half : i, x = 0.6 + col * 6.2, y = 2.1 + row * 0.8;
      sl.addShape(p.ShapeType.ellipse, { x, y, w: 0.55, h: 0.55, fill: { color: T.mid }, line: { color: T.mid, width: 0 } });
      sl.addText(String(i + 1), { x, y, w: 0.55, h: 0.55, align: "center", valign: "middle", fontFace: BODY, fontSize: 15, bold: true, color: "FFFFFF", margin: 0 });
      sl.addText(t, { x: x + 0.75, y: y - 0.05, w: 5.2, h: 0.65, fontFace: BODY, fontSize: 18, color: T.ink, valign: "middle", margin: 0, fit: "shrink" });
    });
    footer(sl);
  }
  // content
  for (const s of deck.slides) {
    const dark = s.layout === "summary", sl = p.addSlide(); sl.background = { color: dark ? T.dark : T.light };
    if (s.notes) sl.addNotes(s.notes);
    if (dark) {
      sl.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 0.28, h: H, fill: { color: T.accent }, line: { color: T.accent, width: 0 } });
      sl.addText(s.kicker || "Summary", { x: 0.9, y: 0.5, w: 9, h: 0.3, fontFace: BODY, fontSize: 12, bold: true, color: T.accent, charSpacing: 3, margin: 0 });
      sl.addText(s.title, { x: 0.9, y: 0.85, w: 11.5, h: 0.9, fontFace: HEAD, fontSize: 34, bold: true, color: "FFFFFF", margin: 0, valign: "middle", fit: "shrink" });
      const items = s.bullets.slice(0, 6), rowH = Math.min(0.95, 4.6 / items.length);
      items.forEach((b, i) => {
        const y = 2.1 + i * rowH;
        sl.addShape(p.ShapeType.ellipse, { x: 0.9, y: y + 0.05, w: 0.42, h: 0.42, fill: { color: T.accent }, line: { color: T.accent, width: 0 } });
        sl.addText(String(i + 1), { x: 0.9, y: y + 0.05, w: 0.42, h: 0.42, align: "center", valign: "middle", fontFace: BODY, fontSize: 13, bold: true, color: T.dark, margin: 0 });
        sl.addText(b, { x: 1.6, y, w: 11, h: rowH - 0.1, fontFace: BODY, fontSize: 19, color: "FFFFFF", valign: "top", margin: 0, fit: "shrink" });
      });
      footer(sl, true);
      continue;
    }
    heading(sl, s);
    if (s.layout === "steps") {
      const k = s.steps.length, gap = 0.3, cw = (12.1 - gap * (k - 1)) / k;
      s.steps.forEach((st, i) => {
        const x = 0.6 + i * (cw + gap);
        sl.addShape(p.ShapeType.roundRect, { x, y: 2.1, w: cw, h: 4.3, fill: { color: "FFFFFF" }, line: { color: T.soft, width: 1 }, rectRadius: 0.12, shadow: shadow() });
        sl.addShape(p.ShapeType.ellipse, { x: x + 0.25, y: 2.35, w: 0.7, h: 0.7, fill: { color: T.mid }, line: { color: T.mid, width: 0 } });
        sl.addText(String(i + 1), { x: x + 0.25, y: 2.35, w: 0.7, h: 0.7, align: "center", valign: "middle", fontFace: HEAD, fontSize: 20, bold: true, color: "FFFFFF", margin: 0 });
        sl.addText(st.head, { x: x + 0.25, y: 3.25, w: cw - 0.5, h: 0.7, fontFace: BODY, fontSize: 18, bold: true, color: T.ink, valign: "top", margin: 0, fit: "shrink" });
        sl.addText(st.text, { x: x + 0.25, y: 4.0, w: cw - 0.5, h: 2.2, fontFace: BODY, fontSize: 15, color: T.muted, valign: "top", margin: 0, fit: "shrink" });
      });
    } else if (s.layout === "compare") {
      [[s.left, T.mid, 0.6], [s.right, T.accent, 6.85]].forEach(([c, col, x]) => {
        sl.addShape(p.ShapeType.roundRect, { x, y: 2.1, w: 5.85, h: 4.5, fill: { color: "FFFFFF" }, line: { color: T.soft, width: 1 }, rectRadius: 0.12, shadow: shadow() });
        sl.addShape(p.ShapeType.rect, { x, y: 2.1, w: 5.85, h: 0.75, fill: { color: col }, line: { color: col, width: 0 } });
        sl.addText(c.head, { x: x + 0.3, y: 2.1, w: 5.25, h: 0.75, fontFace: BODY, fontSize: 20, bold: true, color: col === T.accent ? T.dark : "FFFFFF", valign: "middle", margin: 0 });
        sl.addText(runs(c.bullets, T.ink, 17), { x: x + 0.3, y: 3.05, w: 5.3, h: 3.4, valign: "top", margin: 0, fit: "shrink" });
      });
    } else if (s.layout === "facts") {
      const k = s.facts.length, gap = 0.3, cw = (12.1 - gap * (k - 1)) / k, many = s.bullets.length > 0;
      s.facts.forEach((f, i) => {
        const x = 0.6 + i * (cw + gap);
        sl.addShape(p.ShapeType.roundRect, { x, y: 2.1, w: cw, h: many ? 2.2 : 3.4, fill: { color: "FFFFFF" }, line: { color: T.soft, width: 1 }, rectRadius: 0.12, shadow: shadow() });
        sl.addText(f.value, { x: x + 0.2, y: 2.25, w: cw - 0.4, h: many ? 1.0 : 1.6, fontFace: HEAD, fontSize: 38, bold: true, color: T.mid, align: "center", valign: "middle", margin: 0, fit: "shrink" });
        sl.addText(f.label, { x: x + 0.2, y: many ? 3.3 : 3.9, w: cw - 0.4, h: many ? 0.9 : 1.4, fontFace: BODY, fontSize: 15, color: T.muted, align: "center", valign: "top", margin: 0, fit: "shrink" });
      });
      if (many) sl.addText(runs(s.bullets.slice(0, 3), T.ink, 18), { x: 0.8, y: 4.6, w: 11.7, h: 2.2, valign: "top", margin: 0, fit: "shrink" });
    } else {
      const c = chosen(s), has = c && imgs.has(c.url), chars = s.bullets.join("").length;
      const size = chars > 620 ? 16 : chars > 450 ? 18 : chars > 300 ? 20 : 22;
      if (!has) sl.addShape(p.ShapeType.rect, { x: 0.6, y: 2.0, w: 0.06, h: 4.6, fill: { color: T.soft }, line: { color: T.soft, width: 0 } });
      sl.addText(runs(s.bullets, T.ink, size), { x: has ? 0.6 : 0.95, y: 2.0, w: has ? 7.1 : 11.6, h: 4.8, valign: "top", margin: 0, fit: "shrink" });
      if (has) picture(sl, c, 8.2, 1.95, 4.6, 4.2);
    }
    footer(sl, false, s);
  }
  // sources
  const credits = [deck.cover, ...deck.slides].map((o) => chosen(o)).filter((c) => c && imgs.has(c.url)).map((c) => c.credit);
  if (credits.length || deck.sources.length) {
    const sl = p.addSlide(); sl.background = { color: T.light };
    heading(sl, { title: "Sources and picture credits", kicker: "References" });
    if (deck.sources.length) sl.addText([{ text: "Read more", options: { bold: true, breakLine: true, color: T.mid, fontSize: 14 } }, ...deck.sources.map((x) => ({ text: x.title + (x.url ? " - " + x.url : ""), options: { breakLine: true, fontSize: 11 } }))], { x: 0.6, y: 2.0, w: 5.8, h: 4.7, fontFace: BODY, color: T.ink, valign: "top", margin: 0, paraSpaceAfter: 5, fit: "shrink" });
    if (credits.length) sl.addText([{ text: "Pictures", options: { bold: true, breakLine: true, color: T.mid, fontSize: 14 } }, ...credits.map((c) => ({ text: c, options: { breakLine: true, fontSize: 10 } }))], { x: 6.9, y: 2.0, w: 5.8, h: 4.7, fontFace: BODY, color: T.ink, valign: "top", margin: 0, paraSpaceAfter: 4, fit: "shrink" });
    sl.addText(deck.fromGuide ? "Every source is listed in full in the study guide PDF. Keep the picture credits when you share this." : "Check the facts against your textbooks. Keep the picture credits when you share this.", { x: 0.6, y: 6.55, w: 12, h: 0.3, fontFace: BODY, fontSize: 10, italic: true, color: T.muted, margin: 0 });
    footer(sl);
  }
  return p.write({ outputType: "nodebuffer" });
}

// ---------------------------------------------------------------------------------------
// Slide PDF (A4 landscape, 842 x 595 pt). Same look as the PowerPoint.
// ---------------------------------------------------------------------------------------
const hex = (h) => "#" + h;
const ab = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); // pdfkit's standalone build wants an ArrayBuffer
function collect(doc) { const ch = []; doc.on("data", (c) => ch.push(c)); return new Promise((res) => doc.on("end", () => res(Buffer.concat(ch)))); }
function shrinkText(doc, text, w, maxH, size, min, font) {
  doc.font(font);
  while (size > min) { doc.fontSize(size); if (doc.heightOfString(text, { width: w }) <= maxH) break; size -= 1; }
  return size;
}
async function buildSlidePdf(deck, imgs, themeKey, owner) {
  const T = theme(themeKey), U = 842 / 13.333;
  const doc = new PDFDocument({ size: [842, 473.6], margin: 0, info: { Title: pdfSafe(deck.title), Author: pdfSafe(owner), Producer: "", Creator: "" } });
  const done = collect(doc);
  let n = 0, first = true;
  const page = (bg) => { if (!first) doc.addPage(); first = false; doc.rect(0, 0, 842, 473.6).fill(hex(bg)); n++; };
  const txt = (s, x, y, w, h, o = {}) => {
    const t = pdfSafe(s), font = o.font || "Helvetica", size = shrinkText(doc, t, w * U, h * U, o.size || 12, o.min || 8, font);
    doc.font(font).fontSize(size).fillColor(hex(o.color || T.ink)).text(t, x * U, y * U, { width: w * U, height: h * U, align: o.align || "left", characterSpacing: o.cs || 0, ellipsis: true, lineGap: o.gap || 0 });
  };
  const footer = (dark, s) => {
    txt(s?.guideSection ? `Full detail: study guide (PDF), section ${s.guideSection}` : deck.title, 0.6, 7.0, 9, 0.3, { size: 8, color: dark ? T.soft : T.muted });
    txt(String(n), W - 1.1, 7.0, 0.5, 0.3, { size: 8, color: dark ? T.soft : T.muted, align: "right" });
  };
  const W = 13.333;
  const heading = (s) => {
    if (s.kicker) txt(s.kicker.toUpperCase(), 0.6, 0.38, 9, 0.3, { size: 9, font: "Helvetica-Bold", color: T.mid, cs: 2 });
    txt(s.title, 0.6, 0.7, 12.1, 0.8, { size: s.title.length > 55 ? 22 : 26, min: 16, font: "Times-Bold" });
    doc.rect(0.6 * U, 1.6 * U, 0.9 * U, 4).fill(hex(T.accent));
  };
  const bulletList = (items, x, y, w, h, color, size, min = 10) => {
    const gap = 9;
    let sz = size;
    const total = () => items.reduce((a, b) => (doc.font("Helvetica").fontSize(sz), a + doc.heightOfString(pdfSafe(b), { width: w * U - 18 }) + gap), 0);
    while (sz > min && total() > h * U) sz -= 1;
    let cy = y * U;
    for (const b of items) {
      const [lead, rest] = splitLead(pdfSafe(b));
      doc.circle(x * U + 4, cy + sz * 0.55, 2.6).fill(hex(color === "FFFFFF" ? T.accent : T.mid));
      doc.fillColor(hex(color));
      if (lead) { doc.font("Helvetica-Bold").fontSize(sz).text(lead + ": ", x * U + 18, cy, { width: w * U - 18, continued: true }); doc.font("Helvetica").text(rest); }
      else doc.font("Helvetica").fontSize(sz).text(pdfSafe(b), x * U + 18, cy, { width: w * U - 18 });
      cy = doc.y + gap;
    }
  };
  const card = (x, y, w, h) => { doc.roundedRect(x * U, y * U, w * U, h * U, 8).fillAndStroke("#FFFFFF", hex(T.soft)); };
  const picture = (c, x, y, w, h, cc) => {
    const im = c && imgs.get(c.url); if (!im) return false;
    const f = fit(ratioOf(c), x + 0.15, y + 0.15, w - 0.3, h - 0.3);
    card(x, y, w, h);
    try { doc.image(ab(im.b), f.x * U, f.y * U, { width: f.w * U, height: f.h * U }); } catch { return false; }
    txt(c.credit, x, y + h + 0.08, w, 0.55, { size: 7, color: cc || T.muted });
    return true;
  };

  { // title
    page(T.dark);
    doc.rect(0, 0, 18, 473.6).fill(hex(T.accent));
    const c = chosen(deck.cover), has = c && imgs.has(c.url), tw = has ? 6.6 : 11.5;
    if (deck.course) txt(deck.course.toUpperCase(), 0.9, 1.2, tw, 0.4, { size: 11, font: "Helvetica-Bold", color: T.accent, cs: 3 });
    txt(deck.title, 0.9, 1.8, tw, 2.6, { size: deck.title.length > 40 ? 32 : 38, min: 22, font: "Times-Bold", color: "FFFFFF" });
    if (deck.subtitle) txt(deck.subtitle, 0.9, 4.5, tw, 1.0, { size: 16, min: 11, color: T.soft });
    txt(`${owner}  |  ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, 0.9, 6.6, tw, 0.35, { size: 11, color: T.soft });
    if (has) picture(c, 8.0, 0.9, 4.85, 5.0, T.soft);
  }
  const agenda = deck.slides.filter((s) => s.layout !== "summary").map((s) => s.title).slice(0, 10);
  if (agenda.length >= 4) {
    page(T.light); heading({ title: "What we will cover", kicker: "Outline" });
    const half = Math.ceil(agenda.length / 2);
    agenda.forEach((t, i) => {
      const col = i < half ? 0 : 1, row = col ? i - half : i, x = 0.6 + col * 6.2, y = 2.1 + row * 0.8;
      doc.circle((x + 0.275) * U, (y + 0.275) * U, 0.275 * U).fill(hex(T.mid));
      txt(String(i + 1), x, y + 0.14, 0.55, 0.3, { size: 12, font: "Helvetica-Bold", color: "FFFFFF", align: "center" });
      txt(t, x + 0.75, y, 5.2, 0.6, { size: 14, min: 9 });
    });
    footer(false);
  }
  for (const s of deck.slides) {
    if (s.layout === "summary") {
      page(T.dark); doc.rect(0, 0, 18, 473.6).fill(hex(T.accent));
      txt((s.kicker || "Summary").toUpperCase(), 0.9, 0.5, 9, 0.3, { size: 9, font: "Helvetica-Bold", color: T.accent, cs: 2 });
      txt(s.title, 0.9, 0.85, 11.5, 0.9, { size: 28, font: "Times-Bold", color: "FFFFFF" });
      const items = s.bullets.slice(0, 6), rowH = Math.min(0.95, 4.6 / items.length);
      items.forEach((b, i) => {
        const y = 2.1 + i * rowH;
        doc.circle(0.9 * U + 13, y * U + 14, 13).fill(hex(T.accent));
        txt(String(i + 1), 0.9, y + 0.1, 0.42, 0.3, { size: 11, font: "Helvetica-Bold", color: T.dark, align: "center" });
        txt(b, 1.6, y, 11, rowH - 0.1, { size: 15, min: 10, color: "FFFFFF" });
      });
      footer(true); continue;
    }
    page(T.light); heading(s);
    if (s.layout === "steps") {
      const k = s.steps.length, gap = 0.3, cw = (12.1 - gap * (k - 1)) / k;
      s.steps.forEach((st, i) => {
        const x = 0.6 + i * (cw + gap); card(x, 2.1, cw, 4.3);
        doc.circle((x + 0.6) * U, 2.7 * U, 22).fill(hex(T.mid));
        txt(String(i + 1), x + 0.25, 2.55, 0.7, 0.4, { size: 16, font: "Times-Bold", color: "FFFFFF", align: "center" });
        txt(st.head, x + 0.25, 3.25, cw - 0.5, 0.7, { size: 14, font: "Helvetica-Bold" });
        txt(st.text, x + 0.25, 4.0, cw - 0.5, 2.2, { size: 12, color: T.muted });
      });
    } else if (s.layout === "compare") {
      [[s.left, T.mid, 0.6], [s.right, T.accent, 6.85]].forEach(([c, col, x]) => {
        card(x, 2.1, 5.85, 4.5); doc.rect(x * U, 2.1 * U, 5.85 * U, 0.75 * U).fill(hex(col));
        txt(c.head, x + 0.3, 2.3, 5.25, 0.4, { size: 15, font: "Helvetica-Bold", color: col === T.accent ? T.dark : "FFFFFF" });
        bulletList(c.bullets, x + 0.3, 3.1, 5.3, 3.4, T.ink, 13);
      });
    } else if (s.layout === "facts") {
      const k = s.facts.length, gap = 0.3, cw = (12.1 - gap * (k - 1)) / k, many = s.bullets.length > 0;
      s.facts.forEach((f, i) => {
        const x = 0.6 + i * (cw + gap); card(x, 2.1, cw, many ? 2.2 : 3.4);
        txt(f.value, x + 0.2, many ? 2.5 : 2.9, cw - 0.4, 0.8, { size: 30, min: 16, font: "Times-Bold", color: T.mid, align: "center" });
        txt(f.label, x + 0.2, many ? 3.4 : 4.1, cw - 0.4, 0.9, { size: 12, color: T.muted, align: "center" });
      });
      if (many) bulletList(s.bullets.slice(0, 3), 0.8, 4.6, 11.7, 2.2, T.ink, 15);
    } else {
      const c = chosen(s), has = c && imgs.has(c.url), chars = s.bullets.join("").length;
      bulletList(s.bullets, has ? 0.6 : 0.95, 2.0, has ? 7.1 : 11.6, 4.8, T.ink, chars > 450 ? 14 : 17);
      if (has) picture(c, 8.2, 1.95, 4.6, 4.2);
    }
    footer(false, s);
  }
  const credits = [deck.cover, ...deck.slides].map((o) => chosen(o)).filter((c) => c && imgs.has(c.url)).map((c) => c.credit);
  if (credits.length || deck.sources.length) {
    page(T.light); heading({ title: "Sources and picture credits", kicker: "References" });
    const col = (title, lines, x) => {
      doc.font("Helvetica-Bold").fontSize(11).fillColor(hex(T.mid)).text(title, x * U, 2.0 * U, { width: 5.8 * U });
      doc.font("Helvetica").fontSize(8).fillColor(hex(T.ink));
      let y = doc.y + 6;
      for (const l of lines) { if (y > 6.3 * U) break; doc.text(pdfSafe(l), x * U, y, { width: 5.8 * U }); y = doc.y + 4; }
    };
    if (deck.sources.length) col("Read more", deck.sources.map((x) => x.title + (x.url ? " - " + x.url : "")), 0.6);
    if (credits.length) col("Pictures", credits, 6.9);
    txt(deck.fromGuide ? "Every source is listed in full in the study guide PDF. Keep the picture credits when you share this." : "Check the facts against your textbooks. Keep the picture credits when you share this.", 0.6, 6.55, 12, 0.3, { size: 8, color: T.muted });
    footer(false);
  }
  doc.end();
  return done;
}

// ---------------------------------------------------------------------------------------
// Study guide
// ---------------------------------------------------------------------------------------
function normalizeGuide(raw, fallbackTitle) {
  const g = raw && typeof raw === "object" ? raw : {};
  const srcs = (Array.isArray(g.sources) ? g.sources : []).slice(0, 400).map((x, i) => ({
    n: Number.isInteger(+x?.n) && +x.n > 0 ? +x.n : i + 1, site: tidy(x?.site, 60), title: tidy(x?.title, 160),
    url: /^https?:\/\//.test(x?.url) ? String(x.url).slice(0, 200) : "",
    links: (Array.isArray(x?.links) ? x.links : []).slice(0, 8).map((l) => ({ title: tidy(l?.title, 60), url: /^https?:\/\//.test(l?.url) ? String(l.url).slice(0, 260) : "" })).filter((l) => l.url),
  })).filter((x) => x.title || x.site);
  return {
    kind: g.kind === "presentation" ? "presentation" : "guide",
    title: tidy(g.title, 100) || tidy(fallbackTitle, 100) || "Study guide",
    overview: tidy(g.overview, 900),
    objectives: list(g.objectives, 20, 400),
    sections: (Array.isArray(g.sections) ? g.sections : []).slice(0, 160).map((s) => normalizeSection(s, s?.heading)).filter((s) => s.heading && (s.points.length || s.intro)),
    glossary: (Array.isArray(g.glossary) ? g.glossary : []).slice(0, 300).map((x) => ({ term: tidy(x?.term, 60), def: tidy(x?.def, 260) })).filter((x) => x.term && x.def),
    high_yield: list(g.high_yield, 200, 260),
    pitfalls: list(g.pitfalls, 120, 260),
    questions: (Array.isArray(g.questions) ? g.questions : []).slice(0, 300).map((x) => ({ q: tidy(x?.q, 320), a: tidy(x?.a, 600) })).filter((x) => x.q && x.a),
    sources: srcs,
  };
}
// one table: {title, head:[2-5 columns], rows}; a section may carry up to 3 (drug sections use two: actions and uses, then safety and dose)
function normalizeTable(t) {
  if (!t || typeof t !== "object") return null;
  const head = list(t.head, 5, 40);
  const rows = (Array.isArray(t.rows) ? t.rows : []).slice(0, 45).map((r) => (Array.isArray(r) ? r : []).slice(0, head.length || 4).map((c) => tidy(c, 420))).filter((r) => r.length && r.some(Boolean));
  return head.length >= 2 && rows.length >= 2 ? { title: tidy(t.title, 90), head, rows: rows.map((r) => head.map((_, i) => r[i] || "")) } : null;
}
const IMG_HOST = /(^|\.)(wikimedia\.org|wikipedia\.org|openverse\.org)$/i;
const okUrl = (u) => { try { const x = new URL(u); return x.protocol === "https:" && IMG_HOST.test(x.hostname) ? String(u).slice(0, 400) : ""; } catch { return ""; } };
// a reaction or formula: {name, eq (with real symbols), note}
const eqTerm = (t) => {
  if (typeof t === "string") { const m = /^(.*?)\s*\((.+)\)$/.exec(t.trim()); return m ? { name: tidy(m[1], 60), formula: tidy(m[2], 70) } : { name: tidy(t, 60), formula: "" }; }
  return { name: tidy(t?.name, 60), formula: tidy(t?.formula, 70), img: okUrl(t?.img) };
};
// a reaction as a textbook writes it: reactants, an arrow with the enzyme on it, products. Or a plain formula: {name, eq, note}
const normalizeEquations = (a) => (Array.isArray(a) ? a : []).slice(0, 20).map((e) => {
  const side = (x) => (Array.isArray(x) ? x : []).slice(0, 5).map(eqTerm).filter((t) => t.name || t.formula);
  const reactants = side(e?.reactants), products = side(e?.products), rx = reactants.length && products.length;
  return { name: tidy(e?.name, 110), reactants: rx ? reactants : [], products: rx ? products : [], enzyme: tidy(e?.enzyme, 80), conditions: tidy(e?.conditions, 140), reversible: !!e?.reversible, eq: tidy(e?.eq, 300), note: tidy(e?.note, 380) };
}).filter((e) => e.eq || (e.reactants.length && e.products.length));
const eqLine = (e) => (e.reactants?.length ? `${e.reactants.map((t) => t.name).join(" + ")} ${e.reversible ? "<->" : "->"} ${e.products.map((t) => t.name).join(" + ")}${e.enzyme ? " [" + e.enzyme + "]" : ""}` : e.eq);
// a pathway (chain) or cycle: {title, type, nodes, steps:[{label, in, out}]}
function normalizeDiagram(d) {
  if (!d || typeof d !== "object") return null;
  const nodes = list(d.nodes, 16, 40); if (nodes.length < 3) return null;
  const type = d.type === "cycle" ? "cycle" : "chain", want = type === "cycle" ? nodes.length : nodes.length - 1;
  const steps = (Array.isArray(d.steps) ? d.steps : []).slice(0, want).map((x) => ({ label: tidy(x?.label ?? x?.enzyme, 40), in: tidy(x?.in, 40), out: tidy(x?.out, 40) }));
  while (steps.length < want) steps.push({ label: "", in: "", out: "" });
  return { title: tidy(d.title, 90), type, nodes, steps };
}
// a picture found on the open web (Wikimedia): {query, caption, url, credit, page}
const normalizeFigure = (f) => (f && typeof f === "object" && (f.query || f.url) ? { query: tidy(f.query, 120), caption: tidy(f.caption, 200), url: okUrl(f.url), credit: tidy(f.credit, 240), page: okUrl(f.page) || (/^https:\/\//.test(f.page || "") ? String(f.page).slice(0, 300) : "") } : null);
function normalizeSection(s, heading) {
  const raw = Array.isArray(s?.tables) && s.tables.length ? s.tables : s?.table ? [s.table] : []; // old guides carry one "table"; new ones carry "tables" (and "table" = the first)
  const tables = raw.map(normalizeTable).filter(Boolean).slice(0, 3);
  return {
    heading: tidy(heading || s?.heading, 90), script: tidy(s?.script, 2000), intro: tidy(s?.intro, 900), points: list(s?.points, 16, 420), mnemonic: tidy(s?.mnemonic, 220), clinical: tidy(s?.clinical, 500),
    table: tables[0] || null, tables, equations: normalizeEquations(s?.equations), diagram: normalizeDiagram(s?.diagram), figure: normalizeFigure(s?.figure),
    refs: (Array.isArray(s?.refs) ? s.refs : []).map((n) => Math.round(+n)).filter((n) => n > 0 && n < 1000).slice(0, 12),
  };
}
const normalizeExtras = (x) => {
  const g = normalizeGuide({ glossary: x?.glossary, high_yield: x?.high_yield, pitfalls: x?.pitfalls, questions: x?.questions }, "x");
  return { glossary: g.glossary, high_yield: g.high_yield, pitfalls: g.pitfalls, questions: g.questions };
};
const guideText = (g) => [
  g.title, "", g.overview, "",
  ...(g.objectives.length ? ["WHAT YOU SHOULD KNOW", ...g.objectives.map((p) => "- " + p), ""] : []),
  ...g.sections.flatMap((s, i) => [`${i + 1}. ${s.heading.toUpperCase()}`, ...(s.intro ? [s.intro] : []), ...s.points.map((p) => "- " + p),
    ...(s.tables || (s.table ? [s.table] : [])).flatMap((t) => [...(t.title ? [t.title] : []), t.head.join(" | "), ...t.rows.map((r) => r.join(" | "))]),
    ...(s.equations?.length ? ["REACTIONS AND FORMULAS", ...s.equations.map((e) => `${e.name ? e.name + ": " : ""}${eqLine(e)}${e.note ? " (" + e.note + ")" : ""}`)] : []),
    ...(s.diagram ? [`${s.diagram.title || "Pathway"}: ` + s.diagram.nodes.map((n, k) => n + (s.diagram.steps[k]?.label ? ` [${s.diagram.steps[k].label}] ->` : " ->")).join(" ")] : []),
    ...(s.script ? ["What to say: " + s.script] : []),
    ...(s.mnemonic ? ["Memory aid: " + s.mnemonic] : []), ...(s.clinical ? ["Clinical link: " + s.clinical] : []), ""]),
  ...(g.glossary.length ? ["GLOSSARY", ...g.glossary.map((x) => `- ${x.term}: ${x.def}`), ""] : []),
  ...(g.high_yield.length ? ["HIGH-YIELD", ...g.high_yield.map((p) => "- " + p), ""] : []),
  ...(g.pitfalls.length ? ["COMMON PITFALLS", ...g.pitfalls.map((p) => "- " + p), ""] : []),
  ...(g.questions.length ? ["PRACTICE QUESTIONS", ...g.questions.flatMap((x, i) => [`${i + 1}. ${x.q}`, "   Answer: " + x.a]), ""] : []),
  ...(g.sources.length ? ["SOURCES", ...g.sources.map((x) => `[${x.n}] ${x.site}: ${x.title}${x.url ? " " + x.url : ""}`)] : []),
].join("\n");

async function buildGuidePdf(g, meta, themeKey = "clinical") {
  const T = theme(themeKey);
  const fonts = loadFonts();
  const pdfSafe = fonts ? uniSafe : pdfSafeLatin; // shadows the module-level one inside this builder // with the DejaVu fonts every symbol can stay
  // pictures first (downloaded together, so one slow picture does not hold the rest back)
  const figs = new Map(), structs = new Map();
  await pool(g.sections.map((s) => s.figure?.url).filter(Boolean), 5, async (u) => { const im = await fetchImage(u, 900000); if (im) figs.set(u, im); }, Date.now() + 20000);
  const sUrls = [...new Set(g.sections.flatMap((s) => (s.equations || []).flatMap((e) => [...(e.reactants || []), ...(e.products || [])]).map((t) => t.img).filter(Boolean)))].slice(0, 60);
  await pool(sUrls, 6, async (u) => { const im = await fetchImage(u, 300000); if (im) structs.set(u, im); }, Date.now() + 15000);
  const doc = new PDFDocument({ size: "A4", margins: { top: 60, bottom: 56, left: 54, right: 54 }, bufferPages: true, info: { Title: pdfSafe(g.title), Author: pdfSafe(meta.owner), Producer: "", Creator: "" } });
  if (fonts) { for (const [k, buf] of Object.entries(fonts)) doc.registerFont(k, buf); delete doc._fontFamilies?.Helvetica; doc.font("Helvetica"); } // the default font was opened before registering, so open it again from the new file
  const done = collect(doc);
  const L = 54, W = 595 - 108, BOT = 842 - 60;
  const room = (h) => { if (doc.y + h > BOT) doc.addPage(); };
  const hh = (s, o = {}) => doc.font(o.font || "Helvetica").fontSize(o.size || 11).heightOfString(pdfSafe(s), { width: o.w || W, lineGap: o.gap ?? 2 });
  const refs = (a) => (a && a.length ? " [" + a.join("] [") + "]" : "");

  // banner
  doc.rect(0, 0, 595, 150).fill(hex(T.dark)); doc.rect(0, 150, 595, 4).fill(hex(T.accent));
  if (meta.course) doc.font("Helvetica-Bold").fontSize(9).fillColor(hex(T.accent)).text(pdfSafe(meta.course).toUpperCase(), L, 34, { width: W, characterSpacing: 2 });
  doc.font("Times-Bold").fontSize(g.title.length > 50 ? 22 : 28).fillColor("#FFFFFF").text(pdfSafe(g.title), L, 52, { width: W, height: 74, ellipsis: true });
  doc.font("Helvetica").fontSize(9).fillColor(hex(T.soft)).text(pdfSafe(`${g.kind === "presentation" ? "Detailed presentation" : "Detailed study guide"}  |  ${g.sections.length} sections  |  ${g.sources.length} sources  |  ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`), L, 128, { width: W });
  doc.y = 172;
  if (g.overview) { doc.font("Helvetica").fontSize(11.5).fillColor(hex(T.ink)).text(pdfSafe(g.overview), L, doc.y, { width: W, lineGap: 3 }); doc.moveDown(0.8); }

  const bullets = (items, color = T.mid, x = L, w = W, size = 10.5) => {
    for (const b of items) {
      const [lead, rest] = splitLead(pdfSafe(b));
      const full = (lead ? lead + ": " : "") + rest;
      room(hh(full, { w: w - 16, size }) + 5);
      const y = doc.y;
      doc.circle(x + 4, y + 5.5, 2.3).fill(hex(color));
      doc.fillColor(hex(T.ink)).fontSize(size);
      if (lead) { doc.font("Helvetica-Bold").text(lead + ": ", x + 14, y, { width: w - 16, continued: true, lineGap: 2 }); doc.font("Helvetica").text(rest, { lineGap: 2 }); }
      else doc.font("Helvetica").text(rest, x + 14, y, { width: w - 16, lineGap: 2 });
      doc.moveDown(0.3);
    }
  };
  const title = (t, color = T.mid, size = 15) => {
    room(70); doc.moveDown(0.6);
    const y = doc.y; doc.rect(L, y, 4, size + 3).fill(hex(color));
    doc.font("Times-Bold").fontSize(size).fillColor(hex(T.ink)).text(pdfSafe(t), L + 12, y + 1, { width: W - 12 });
    doc.moveDown(0.45);
  };
  const box = (label, items, bg, edge) => {
    const inner = W - 28, need = items.reduce((a, b) => a + hh(b, { w: inner - 16 }) + 6, 0) + 34;
    if (need > BOT - 100) { title(label, edge); bullets(items, edge); return; }
    room(need + 12); doc.moveDown(0.4);
    const y = doc.y;
    doc.roundedRect(L, y, W, need, 6).fill(hex(bg)); doc.rect(L, y, 4, need).fill(hex(edge));
    doc.font("Helvetica-Bold").fontSize(10).fillColor(hex(edge)).text(label.toUpperCase(), L + 16, y + 12, { width: inner, characterSpacing: 1.5 });
    doc.y = y + 30; bullets(items, edge, L + 14, inner);
    doc.y = y + need + 6;
  };
  const table = (t) => {
    const cols = t.head.length, weights = t.head.map((h, i) => Math.max(8, h.length, ...t.rows.map((r) => Math.min(60, (r[i] || "").length)))), sum = weights.reduce((a, b) => a + b, 0);
    const widths = weights.map((w) => Math.max(60, (w / sum) * W)), scale = W / widths.reduce((a, b) => a + b, 0), cw = widths.map((w) => w * scale);
    const pad = 5, rowH = (cells, bold) => Math.max(...cells.map((c, i) => hh(c, { w: cw[i] - pad * 2, size: 9.5, font: bold ? "Helvetica-Bold" : "Helvetica", gap: 1 }))) + pad * 2;
    if (t.title) { room(40); doc.font("Helvetica-Bold").fontSize(10).fillColor(hex(T.mid)).text(pdfSafe(t.title), L, doc.y + 2, { width: W }); doc.moveDown(0.3); }
    const draw = (cells, bold, shade) => {
      const h = rowH(cells, bold); room(h + 2);
      const y = doc.y; let x = L;
      if (bold) doc.rect(L, y, W, h).fill(hex(T.mid)); else if (shade) doc.rect(L, y, W, h).fill(hex(T.light));
      cells.forEach((c, i) => {
        doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9.5).fillColor(bold ? "#FFFFFF" : hex(T.ink)).text(pdfSafe(c), x + pad, y + pad, { width: cw[i] - pad * 2, lineGap: 1 });
        x += cw[i];
      });
      doc.rect(L, y, W, h).lineWidth(0.5).stroke(hex(T.soft));
      doc.y = y + h;
    };
    draw(t.head, true, false);
    t.rows.forEach((r, i) => draw(r, false, i % 2 === 1));
    doc.moveDown(0.6);
  };

  // reactions and formulas, each in a shaded box with the symbols as written
  const equations = (eqs) => {
    room(60); doc.font("Helvetica-Bold").fontSize(10).fillColor(hex(T.mid)).text("REACTIONS AND FORMULAS", L, doc.y + 2, { width: W, characterSpacing: 1.2 }); doc.moveDown(0.3);
    const tw = (t, size, font) => doc.font(font).fontSize(size).widthOfString(pdfSafe(t));
    // lay a reaction out left to right in lines: [name box] + [name box] --enzyme--> [name box]; wraps like text
    const layoutRx = (e, iw) => {
      const items = [];
      const side = (arr) => arr.forEach((t, k) => {
        if (k) items.push({ k: "plus", w: 16 });
        const pic = t.img && structs.get(t.img) ? 1 : 0, w = Math.min(iw - 8, Math.max(tw(t.name, 10, "Helvetica-Bold"), t.formula ? tw(t.formula, 8.5, "Helvetica") : 0, pic ? 84 : 0) + 14);
        items.push({ k: "term", w, t, pic });
      });
      side(e.reactants);
      items.push({ k: "arrow", w: Math.min(170, Math.max(70, tw(e.enzyme || "", 8.5, "Helvetica-Bold") + 14, tw(e.conditions || "", 8, "Helvetica-Oblique") + 14)) });
      side(e.products);
      const lines = [[]]; let x = 0;
      items.forEach((it, i) => {
        const need = it.k === "plus" ? it.w + 4 + (items[i + 1]?.w || 0) : it.w; // a "+" always travels with the compound after it
        if (x + need > iw && lines[lines.length - 1].length) { lines.push([]); x = 0; }
        it.x = x; lines[lines.length - 1].push(it); x += it.w + 4;
      });
      const rh = items.some((i) => i.pic) ? 92 : 50;
      return { lines, h: lines.length * rh, rh };
    };
    for (const e of eqs) {
      const iw = W - 28, nh = e.name ? hh(e.name, { w: iw, size: 9.5, font: "Helvetica-Bold" }) + 3 : 0, isRx = e.reactants?.length > 0;
      const rx = isRx ? layoutRx(e, iw) : null, eh = isRx ? rx.h : hh(e.eq, { w: iw, size: 12, gap: 2 }) + 2, th = e.note ? hh(e.note, { w: iw, size: 9, gap: 1 }) + 4 : 0, need = nh + eh + th + 14;
      room(need + 6); const y = doc.y;
      doc.roundedRect(L, y, W, need, 4).fill(hex(T.light)); doc.rect(L, y, 3, need).fill(hex(T.accent));
      let yy = y + 7;
      if (e.name) { doc.font("Helvetica-Bold").fontSize(9.5).fillColor(hex(T.mid)).text(pdfSafe(e.name), L + 14, yy, { width: iw }); yy += nh; }
      if (isRx) {
        rx.lines.forEach((ln, li) => {
          const yc = yy + li * rx.rh + rx.rh / 2;
          for (const it of ln) {
            const x = L + 14 + it.x;
            if (it.k === "plus") { doc.font("Helvetica-Bold").fontSize(13).fillColor(hex(T.ink)).text("+", x, yc - 8, { width: it.w, align: "center", lineBreak: false }); }
            else if (it.k === "term") {
              const pim = it.pic ? structs.get(it.t.img) : null, ih = pim ? 58 : 0, bh = (it.t.formula ? 32 : 22) + ih, top = yc - bh / 2;
              doc.roundedRect(x, top, it.w, bh, 5).lineWidth(0.8).fillAndStroke("#FFFFFF", hex(T.mid));
              if (pim) { try { doc.image(doc.openImage(ab(pim.b)), x + 4, top + 3, { fit: [it.w - 8, ih - 4], align: "center", valign: "center" }); } catch {} }
              doc.font("Helvetica-Bold").fontSize(10).fillColor(hex(T.ink)).text(pdfSafe(it.t.name), x + 2, top + ih + (it.t.formula ? 5 : 6), { width: it.w - 4, align: "center", lineBreak: false });
              if (it.t.formula) doc.font("Helvetica").fontSize(8.5).fillColor(hex(T.muted)).text(pdfSafe(it.t.formula), x + 2, top + ih + 18, { width: it.w - 4, align: "center", lineBreak: false });
            } else {
              const x1 = x + 3, x2 = x + it.w - 3, hl = 5;
              doc.lineWidth(1.1).strokeColor(hex(T.mid));
              const head = (tx, dir) => doc.fillColor(hex(T.mid)).polygon([tx, 0], [tx - dir * hl, -hl * 0.6], [tx - dir * hl, hl * 0.6]).fill();
              if (e.reversible) {
                doc.moveTo(x1, yc - 2.5).lineTo(x2 - 2, yc - 2.5).stroke(); doc.moveTo(x1 + 2, yc + 2.5).lineTo(x2, yc + 2.5).stroke();
                doc.fillColor(hex(T.mid)).polygon([x2, yc - 2.5], [x2 - hl, yc - 2.5 - hl * 0.6], [x2 - hl, yc - 2.5]).fill();
                doc.fillColor(hex(T.mid)).polygon([x1, yc + 2.5], [x1 + hl, yc + 2.5], [x1 + hl, yc + 2.5 + hl * 0.6]).fill();
              } else {
                doc.moveTo(x1, yc).lineTo(x2 - 2, yc).stroke();
                doc.fillColor(hex(T.mid)).polygon([x2, yc], [x2 - hl * 1.4, yc - hl * 0.7], [x2 - hl * 1.4, yc + hl * 0.7]).fill();
              }
              if (e.enzyme) doc.font("Helvetica-Bold").fontSize(8.5).fillColor(hex(T.mid)).text(pdfSafe(e.enzyme), x - 6, yc - 17, { width: it.w + 12, align: "center", lineBreak: false });
              if (e.conditions) doc.font("Helvetica-Oblique").fontSize(8).fillColor(hex(T.muted)).text(pdfSafe(e.conditions), x - 6, yc + 8, { width: it.w + 12, align: "center", lineBreak: false });
            }
          }
        });
        yy += rx.h;
      } else { doc.font("Helvetica").fontSize(12).fillColor(hex(T.ink)).text(pdfSafe(e.eq), L + 14, yy, { width: iw, lineGap: 2 }); yy += eh; }
      if (e.note) doc.font("Helvetica-Oblique").fontSize(9).fillColor(hex(T.muted)).text(pdfSafe(e.note), L + 14, yy + 2, { width: iw, lineGap: 1 });
      doc.y = y + need + 5;
    }
    doc.moveDown(0.2);
  };
  // pathway or cycle drawn as boxes and arrows (geometry from lib/diagram.js)
  const diagram = (d) => {
    const G = layoutDiagram(d); let sc = Math.min(1, W / G.w); if (G.h * sc > 640) sc = 640 / G.h;
    const hgt = G.h * sc; room(hgt + 44);
    if (d.title) { doc.font("Helvetica-Bold").fontSize(10).fillColor(hex(T.mid)).text(pdfSafe(d.title), L, doc.y + 2, { width: W }); doc.moveDown(0.3); }
    const x0 = L + (W - G.w * sc) / 2, y0 = doc.y;
    for (const a of G.arrows) {
      const X1 = x0 + a.x1 * sc, Y1 = y0 + a.y1 * sc, X2 = x0 + a.x2 * sc, Y2 = y0 + a.y2 * sc, ang = Math.atan2(Y2 - Y1, X2 - X1), hl = 6;
      doc.lineWidth(1).strokeColor(hex(T.mid)).moveTo(X1, Y1).lineTo(X2 - Math.cos(ang) * 2, Y2 - Math.sin(ang) * 2).stroke();
      doc.fillColor(hex(T.mid)).polygon([X2, Y2], [X2 - hl * Math.cos(ang - 0.4), Y2 - hl * Math.sin(ang - 0.4)], [X2 - hl * Math.cos(ang + 0.4), Y2 - hl * Math.sin(ang + 0.4)]).fill();
    }
    for (const b of G.boxes) {
      const bx = x0 + b.x * sc, by = y0 + b.y * sc, bw = b.w * sc, bh = b.h * sc, fs = Math.max(6.5, 10.5 * sc);
      doc.roundedRect(bx, by, bw, bh, 4).lineWidth(1).fillAndStroke(hex(T.light), hex(T.mid));
      doc.font("Helvetica-Bold").fontSize(fs).fillColor(hex(T.ink)).text(pdfSafe(b.t), bx, by + (bh - fs) / 2 + 0.5, { width: bw, align: "center", lineBreak: false });
    }
    for (const l of G.labels) {
      const fs = Math.max(6, (l.small ? 8.5 : 9.5) * sc), w = 220, lx = x0 + l.x * sc, ly = y0 + l.y * sc - fs * 0.8;
      doc.font(l.bold ? "Helvetica-Bold" : "Helvetica").fontSize(fs).fillColor(hex(l.bold ? T.mid : T.muted));
      doc.text(pdfSafe(l.t), l.anchor === "end" ? lx - w : l.anchor === "middle" ? lx - w / 2 : lx, ly, { width: w, align: l.anchor === "end" ? "right" : l.anchor === "middle" ? "center" : "left", lineBreak: false });
    }
    doc.y = y0 + hgt + 6; doc.x = L;
    doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(hex(T.muted)).text("Bold: the enzyme on that step. Small text: what goes in and what comes out (for example ATP \u2192 ADP).", L, doc.y, { width: W });
    doc.moveDown(0.6);
  };
  // a picture found on Wikimedia, with its credit
  const figure = (f) => {
    const im = figs.get(f.url); if (!im) return;
    try {
      const buf = ab(im.b), img = doc.openImage(buf), maxW = W, maxH = 270, sc = Math.min(maxW / img.width, maxH / img.height, 1.6), w = img.width * sc, h = img.height * sc;
      room(h + 46); const y = doc.y;
      doc.image(buf, L + (W - w) / 2, y, { width: w, height: h });
      doc.y = y + h + 3; doc.x = L;
      doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(hex(T.muted)).text(pdfSafe((f.caption ? f.caption + ". " : "") + "Picture: " + (f.credit || "Wikimedia Commons")), L, doc.y, { width: W });
      doc.moveDown(0.6);
    } catch { /* a picture the PDF cannot read is skipped */ }
  };

  // contents
  if (g.sections.length > 1) {
    const items = g.sections.map((s, i) => `${i + 1}.  ${s.heading}`).concat(g.glossary.length ? ["Glossary"] : [], g.questions.length ? ["Practice questions and answers"] : []);
    const need = items.length * 15 + 36;
    room(need + 10);
    const y = doc.y; doc.roundedRect(L, y, W, need, 6).fill(hex(T.light)); doc.rect(L, y, 4, need).fill(hex(T.mid));
    doc.font("Helvetica-Bold").fontSize(10).fillColor(hex(T.mid)).text("INSIDE THIS GUIDE", L + 16, y + 11, { width: W - 24, characterSpacing: 1.5 });
    items.forEach((t, i) => doc.font("Helvetica").fontSize(10.5).fillColor(hex(T.ink)).text(pdfSafe(t), L + 16, y + 30 + i * 15, { width: W - 32, lineBreak: false }));
    doc.y = y + need + 8;
  }
  if (g.objectives.length) box("What you should know after this", g.objectives, "FFFFFF", T.accent);

  g.sections.forEach((s, i) => {
    title(`${i + 1}.  ${s.heading}`, T.mid, 16);
    if (s.intro) { room(hh(s.intro, { size: 11 }) + 8); doc.font("Helvetica").fontSize(11).fillColor(hex(T.ink)).text(pdfSafe(s.intro), L, doc.y, { width: W, lineGap: 2.5 }); doc.moveDown(0.5); }
    if (s.equations?.length) equations(s.equations);
    if (s.diagram) diagram(s.diagram);
    if (s.figure?.url) figure(s.figure);
    bullets(s.points);
    for (const t of s.tables || (s.table ? [s.table] : [])) { doc.moveDown(0.3); table(t); }
    if (s.script) {
      const need = hh("What to say: " + s.script, { w: W - 28, size: 10 }) + 16;
      room(Math.min(need, 200) + 6); const y = doc.y;
      if (need < BOT - 120) { doc.roundedRect(L, y, W, need, 5).fill(hex(T.light)); doc.rect(L, y, 3, need).fill(hex(T.accent)); }
      doc.font("Helvetica-Bold").fontSize(10).fillColor(hex(T.mid)).text("What to say: ", L + 12, y + 8, { width: W - 24, continued: true }); doc.font("Helvetica").fillColor(hex(T.ink)).text(pdfSafe(s.script), { lineGap: 1.5 });
      doc.y = Math.max(doc.y, y + need) + 6;
    }
    if (s.mnemonic) { room(30); doc.font("Helvetica-Oblique").fontSize(10.5).fillColor(hex(T.mid)).text("Memory aid: " + pdfSafe(s.mnemonic), L + 14, doc.y, { width: W - 14 }); doc.moveDown(0.4); }
    if (s.clinical) {
      const need = hh("Clinical link: " + s.clinical, { w: W - 28, size: 10 }) + 16;
      room(need + 6); const y = doc.y;
      doc.roundedRect(L, y, W, need, 5).fill(hex(T.soft));
      doc.font("Helvetica-Bold").fontSize(10).fillColor(hex(T.dark)).text("Clinical link: ", L + 12, y + 8, { width: W - 24, continued: true }); doc.font("Helvetica").text(pdfSafe(s.clinical));
      doc.y = y + need + 6;
    }
    if (s.refs.length) { room(14); doc.font("Helvetica").fontSize(8.5).fillColor(hex(T.muted)).text("Sources for this section:" + refs(s.refs), L + 14, doc.y, { width: W - 14 }); doc.moveDown(0.3); }
  });
  if (g.glossary.length) {
    title("Glossary");
    for (const x of g.glossary) {
      room(hh(x.term + ": " + x.def, { size: 10.5 }) + 6);
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(hex(T.ink)).text(pdfSafe(x.term) + ": ", L, doc.y, { width: W, continued: true, lineGap: 2 });
      doc.font("Helvetica").text(pdfSafe(x.def), { lineGap: 2 }); doc.moveDown(0.25);
    }
  }
  if (g.high_yield.length) box("High-yield", g.high_yield, T.soft, T.mid);
  if (g.pitfalls.length) box("Common pitfalls", g.pitfalls, "FBE9E7", "B3261E");
  if (g.questions.length) {
    title("Practice questions");
    g.questions.forEach((x, i) => {
      room(hh(x.q, { w: W - 20, size: 11 }) + hh(x.a, { w: W - 20, size: 10.5 }) + 16);
      doc.font("Helvetica-Bold").fontSize(11).fillColor(hex(T.ink)).text(`${i + 1}.  ${pdfSafe(x.q)}`, L, doc.y, { width: W, lineGap: 2 });
      doc.font("Helvetica").fontSize(10.5).fillColor(hex(T.muted)).text("Answer: " + pdfSafe(x.a), L + 18, doc.y + 1, { width: W - 18, lineGap: 2 });
      doc.moveDown(0.55);
    });
  }
  if (g.sources.length) {
    title("Sources and further reading", T.muted, 13);
    doc.font("Helvetica").fontSize(8.5).fillColor(hex(T.muted));
    for (const x of g.sources) {
      const line = `[${x.n}] ${x.site}: ${x.title}${x.url ? " - " + x.url : ""}`;
      room(hh(line, { size: 8.5, gap: 1 }) + 4);
      doc.font("Helvetica").fontSize(8.5).fillColor(hex(T.muted)).text(pdfSafe(line), L, doc.y, { width: W, lineGap: 1 });
      for (const l of x.links.slice(0, 6)) { room(12); doc.text(pdfSafe(`      ${l.title ? l.title + " - " : ""}${l.url}`), L, doc.y, { width: W, lineGap: 1 }); }
      doc.moveDown(0.15);
    }
  }
  doc.moveDown(1); room(30);
  doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(hex(T.muted)).text("Made with Asclepius for study. Written with AI from the sources above, so check facts against your textbooks and local guidelines. Not for treating patients.", L, doc.y, { width: W });
  const r = doc.bufferedPageRange();
  for (let i = r.start; i < r.start + r.count; i++) {
    doc.switchToPage(i); doc.page.margins.bottom = 0;
    if (i > 0) doc.font("Helvetica").fontSize(8).fillColor(hex(T.muted)).text(pdfSafe(g.title), L, 28, { width: W - 60, lineBreak: false, ellipsis: true });
    doc.font("Helvetica").fontSize(8).fillColor(hex(T.muted)).text(`${i + 1} / ${r.count}`, L, 842 - 36, { width: W, align: "right", lineBreak: false });
  }
  doc.flushPages(); doc.end();
  return done;
}

export { THEMES, theme, tidy, pdfSafe, normalizeDeck, chosen, buildPptx, buildSlidePdf, normalizeGuide, normalizeSection, normalizeExtras, guideText, buildGuidePdf };
