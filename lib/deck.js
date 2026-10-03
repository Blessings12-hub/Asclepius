// Builds the files: PowerPoint, slide PDF and study-guide PDF, plus the cleaning that keeps AI text tidy.
import PptxGenJS from "pptxgenjs";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js"; // fonts are built into this file, so it also works on Vercel

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

// "Term: explanation" -> bold term + rest
const splitLead = (t) => { const m = /^(.{2,42}?):\s+(.+)$/.exec(t); return m && !/^https?$/i.test(m[1]) ? [m[1], m[2]] : [null, t]; };

// ---- deck normalisation (used on the way out of the AI and on the way into the export) ----
const LAYOUTS = ["bullets", "steps", "compare", "facts", "summary"];
function normalizeDeck(raw, topic) {
  const d = raw && typeof raw === "object" ? raw : {};
  const slides = (Array.isArray(d.slides) ? d.slides : []).slice(0, 18).map((s) => {
    const layout = LAYOUTS.includes(s?.layout) ? s.layout : "bullets";
    const o = {
      layout, title: tidy(s?.title, 90) || "Untitled", kicker: tidy(s?.kicker, 40), notes: tidy(s?.notes, 900),
      bullets: list(s?.bullets, 6, 170), image: tidy(s?.image, 60), image2: tidy(s?.image2, 60),
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
    slides,
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

  const footer = (sl, dark) => {
    n++;
    sl.addText(deck.title, { x: 0.6, y: 7.0, w: 9, h: 0.3, fontFace: BODY, fontSize: 10, color: dark ? T.soft : T.muted, margin: 0 });
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
  // agenda
  const agenda = deck.slides.filter((s) => s.layout !== "summary").map((s) => s.title).slice(0, 10);
  if (agenda.length >= 4) {
    const sl = p.addSlide(); sl.background = { color: T.light };
    heading(sl, { title: "What we will cover", kicker: "Outline" });
    const half = Math.ceil(agenda.length / 2);
    agenda.forEach((t, i) => {
      const col = i < half ? 0 : 1, row = col ? i - half : i, x = 0.6 + col * 6.2, y = 2.1 + row * 0.9;
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
    footer(sl);
  }
  // sources
  const credits = [deck.cover, ...deck.slides].map((o) => chosen(o)).filter((c) => c && imgs.has(c.url)).map((c) => c.credit);
  if (credits.length || deck.sources.length) {
    const sl = p.addSlide(); sl.background = { color: T.light };
    heading(sl, { title: "Sources and picture credits", kicker: "References" });
    if (deck.sources.length) sl.addText([{ text: "Read more", options: { bold: true, breakLine: true, color: T.mid, fontSize: 14 } }, ...deck.sources.map((x) => ({ text: x.title + (x.url ? " - " + x.url : ""), options: { breakLine: true, fontSize: 11 } }))], { x: 0.6, y: 2.0, w: 5.8, h: 4.7, fontFace: BODY, color: T.ink, valign: "top", margin: 0, paraSpaceAfter: 5, fit: "shrink" });
    if (credits.length) sl.addText([{ text: "Pictures", options: { bold: true, breakLine: true, color: T.mid, fontSize: 14 } }, ...credits.map((c) => ({ text: c, options: { breakLine: true, fontSize: 10 } }))], { x: 6.9, y: 2.0, w: 5.8, h: 4.7, fontFace: BODY, color: T.ink, valign: "top", margin: 0, paraSpaceAfter: 4, fit: "shrink" });
    sl.addText("Check the facts against your textbooks. Keep the picture credits when you share this.", { x: 0.6, y: 6.55, w: 12, h: 0.3, fontFace: BODY, fontSize: 10, italic: true, color: T.muted, margin: 0 });
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
  const footer = (dark) => {
    txt(deck.title, 0.6, 7.0, 9, 0.3, { size: 8, color: dark ? T.soft : T.muted });
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
      const col = i < half ? 0 : 1, row = col ? i - half : i, x = 0.6 + col * 6.2, y = 2.1 + row * 0.9;
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
    footer(false);
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
    txt("Check the facts against your textbooks. Keep the picture credits when you share this.", 0.6, 6.55, 12, 0.3, { size: 8, color: T.muted });
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
  return {
    title: tidy(g.title, 100) || tidy(fallbackTitle, 100) || "Study guide",
    overview: tidy(g.overview, 700),
    sections: (Array.isArray(g.sections) ? g.sections : []).slice(0, 10).map((s) => ({ heading: tidy(s?.heading, 80), points: list(s?.points, 10, 320), mnemonic: tidy(s?.mnemonic, 200) })).filter((s) => s.heading && s.points.length),
    high_yield: list(g.high_yield, 10, 240),
    pitfalls: list(g.pitfalls, 8, 240),
    questions: (Array.isArray(g.questions) ? g.questions : []).slice(0, 14).map((x) => ({ q: tidy(x?.q, 300), a: tidy(x?.a, 500) })).filter((x) => x.q && x.a),
    sources: (Array.isArray(g.sources) ? g.sources : []).slice(0, 6).map((x) => ({ title: tidy(x?.title, 80), url: /^https?:\/\//.test(x?.url) ? String(x.url).slice(0, 160) : "" })),
  };
}
const guideText = (g) => [
  g.title, "", g.overview, "",
  ...g.sections.flatMap((s) => [s.heading.toUpperCase(), ...s.points.map((p) => "- " + p), ...(s.mnemonic ? ["Memory aid: " + s.mnemonic] : []), ""]),
  ...(g.high_yield.length ? ["HIGH-YIELD", ...g.high_yield.map((p) => "- " + p), ""] : []),
  ...(g.pitfalls.length ? ["COMMON PITFALLS", ...g.pitfalls.map((p) => "- " + p), ""] : []),
  ...(g.questions.length ? ["PRACTICE QUESTIONS", ...g.questions.flatMap((x, i) => [`${i + 1}. ${x.q}`, "   Answer: " + x.a])] : []),
].join("\n");

async function buildGuidePdf(g, meta, themeKey = "clinical") {
  const T = theme(themeKey);
  const doc = new PDFDocument({ size: "A4", margins: { top: 56, bottom: 56, left: 54, right: 54 }, bufferPages: true, info: { Title: pdfSafe(g.title), Author: pdfSafe(meta.owner), Producer: "", Creator: "" } });
  const done = collect(doc);
  const L = 54, W = 595 - 108, BOT = 842 - 60;
  const room = (h) => { if (doc.y + h > BOT) doc.addPage(); };
  const h = (s, o = {}) => doc.font("Helvetica").fontSize(o.size || 11).heightOfString(pdfSafe(s), { width: o.w || W });

  // banner
  doc.rect(0, 0, 595, 132).fill(hex(T.dark)); doc.rect(0, 132, 595, 4).fill(hex(T.accent));
  if (meta.course) doc.font("Helvetica-Bold").fontSize(9).fillColor(hex(T.accent)).text(pdfSafe(meta.course).toUpperCase(), L, 34, { width: W, characterSpacing: 2 });
  doc.font("Times-Bold").fontSize(g.title.length > 50 ? 22 : 28).fillColor("#FFFFFF").text(pdfSafe(g.title), L, 52, { width: W, height: 70, ellipsis: true });
  doc.y = 156;
  if (g.overview) { doc.font("Helvetica").fontSize(12).fillColor(hex(T.ink)).text(pdfSafe(g.overview), L, doc.y, { width: W, lineGap: 3 }); doc.moveDown(1); }

  const bullets = (items, color = T.mid, x = L, w = W) => {
    for (const b of items) {
      const [lead, rest] = splitLead(pdfSafe(b));
      const full = (lead ? lead + ": " : "") + rest;
      room(h(full, { w: w - 16 }) + 6);
      const y = doc.y;
      doc.circle(x + 4, y + 6, 2.4).fill(hex(color));
      doc.fillColor(hex(T.ink)).fontSize(11);
      if (lead) { doc.font("Helvetica-Bold").text(lead + ": ", x + 14, y, { width: w - 16, continued: true, lineGap: 2 }); doc.font("Helvetica").text(rest, { lineGap: 2 }); }
      else doc.font("Helvetica").text(rest, x + 14, y, { width: w - 16, lineGap: 2 });
      doc.moveDown(0.35);
    }
  };
  const title = (t, color = T.mid) => {
    room(60); doc.moveDown(0.5);
    const y = doc.y; doc.rect(L, y, 4, 18).fill(hex(color));
    doc.font("Times-Bold").fontSize(15).fillColor(hex(T.ink)).text(pdfSafe(t), L + 12, y + 1, { width: W - 12 });
    doc.moveDown(0.5);
  };
  const box = (label, items, bg, edge) => {
    const inner = W - 28, need = items.reduce((a, b) => a + h(b, { w: inner - 16 }) + 8, 0) + 36;
    if (need > BOT - 90) { title(label, edge); bullets(items, edge); return; } // too tall for one box: plain list
    room(need + 12); doc.moveDown(0.4);
    const y = doc.y;
    doc.roundedRect(L, y, W, need, 6).fill(hex(bg)); doc.rect(L, y, 4, need).fill(hex(edge));
    doc.font("Helvetica-Bold").fontSize(10).fillColor(hex(edge)).text(label.toUpperCase(), L + 16, y + 12, { width: inner, characterSpacing: 1.5 });
    doc.y = y + 30;
    bullets(items, edge, L + 14, inner);
    doc.y = y + need + 6;
  };

  for (const s of g.sections) {
    title(s.heading); bullets(s.points);
    if (s.mnemonic) { room(30); doc.font("Helvetica-Oblique").fontSize(10.5).fillColor(hex(T.mid)).text("Memory aid: " + pdfSafe(s.mnemonic), L + 14, doc.y, { width: W - 14 }); doc.moveDown(0.4); }
  }
  if (g.high_yield.length) box("High-yield", g.high_yield, T.soft, T.mid);
  if (g.pitfalls.length) box("Common pitfalls", g.pitfalls, "FBE9E7", "B3261E");
  if (g.questions.length) {
    title("Practice questions");
    g.questions.forEach((x, i) => {
      room(h(x.q, { w: W - 20 }) + h(x.a, { w: W - 20 }) + 16);
      doc.font("Helvetica-Bold").fontSize(11).fillColor(hex(T.ink)).text(`${i + 1}.  ${pdfSafe(x.q)}`, L, doc.y, { width: W, lineGap: 2 });
      doc.font("Helvetica").fontSize(10.5).fillColor(hex(T.muted)).text("Answer: " + pdfSafe(x.a), L + 18, doc.y + 1, { width: W - 18, lineGap: 2 });
      doc.moveDown(0.6);
    });
  }
  if (g.sources.length) {
    title("Read more", T.muted);
    doc.font("Helvetica").fontSize(9).fillColor(hex(T.muted));
    g.sources.forEach((x) => { room(14); doc.text(pdfSafe(x.title + (x.url ? " - " + x.url : "")), L, doc.y, { width: W }); });
  }
  doc.moveDown(1);
  room(20);
  doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(hex(T.muted)).text("Made with Asclepius for study. Check facts against your textbooks and local guidelines.", L, doc.y, { width: W });
  // page numbers
  const r = doc.bufferedPageRange();
  for (let i = r.start; i < r.start + r.count; i++) {
    doc.switchToPage(i); doc.page.margins.bottom = 0; // otherwise writing in the footer area would add a blank page
    doc.font("Helvetica").fontSize(8).fillColor(hex(T.muted)).text(`${i + 1} / ${r.count}`, L, 842 - 36, { width: W, align: "right", lineBreak: false });
  }
  doc.flushPages(); doc.end();
  return done;
}

export { THEMES, theme, tidy, pdfSafe, normalizeDeck, chosen, buildPptx, buildSlidePdf, normalizeGuide, guideText, buildGuidePdf };
