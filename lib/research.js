// Deep research for study guides. Reads many different open websites at the same time:
//   StatPearls (NCBI Bookshelf), Wikipedia (full articles), MedlinePlus (NIH), Wikibooks, Wikiversity,
//   Europe PMC / PubMed review abstracts, and (with a Gemini key) a Google-grounded web search that reads
//   pages such as NHS, Mayo Clinic, Merck Manual and university sites.
// Everything is free and needs no extra key. Every site is tried separately and fails quietly, so one slow
// or blocked site never breaks the guide. The result says which sites worked.
import { ai, provider } from "./ai.js";
import { pool } from "./media.js";

const UA = "Asclepius/1.2 (personal study app)";

// What kind of subject is this? "drugs" makes the research and the guide list EVERY medicine, class by class.
export const subjectKind = (courseTitle = "", topic = "") =>
  /pharmac|therapeutic|antimicrob|antibiotic|antiviral|antifungal|antimalarial|anthelmint|chemotherap|psychopharm|toxicolog|anaesthe|anesthe/i.test(courseTitle + " " + topic) ? "drugs" : "general";
const q = encodeURIComponent;
const decode = (s) => String(s || "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
// decode first, then drop tags (MedlinePlus sends highlight tags in escaped form)
const clean = (s) => decode(decode(s)).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const getJson = async (url, ms = 9000) => {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
};
const getText = async (url, ms = 10000) => {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/xml,text/xml,*/*" }, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.text();
};
const within = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

// ---- Wikipedia, Wikibooks, Wikiversity (same MediaWiki interface) ----
const CUT = /^\s*={2,}\s*(references|external links|see also|further reading|notes|bibliography|footnotes|sources|citations|gallery|notes and references)\s*={2,}\s*$/im;
const wikiClean = (t, max) => {
  let s = String(t || "");
  const m = CUT.exec(s); if (m) s = s.slice(0, m.index);
  return s.replace(/\n{3,}/g, "\n\n").replace(/^={2,}\s*(.*?)\s*={2,}$/gm, "## $1").trim().slice(0, max);
};
async function wiki(host, label, topic, caps, { lists = false } = {}) {
  const j = await getJson(`https://${host}/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${q(topic)}&srlimit=${caps.length + 3}&srprop=`);
  const titles = (j.query?.search || []).map((s) => s.title).filter((t) => !(lists ? /^(index of|template:|category:)/i : /^(list of|index of|template:|category:)/i).test(t)).slice(0, caps.length);
  const got = await pool(titles, 3, async (t, i) => {
    const p = await getJson(`https://${host}/w/api.php?action=query&format=json&origin=*&prop=extracts|info&explaintext=1&redirects=1&inprop=url&titles=${q(t)}`, 12000);
    const pg = Object.values(p.query?.pages || {})[0];
    if (!pg || pg.missing !== undefined) return null;
    const text = wikiClean(pg.extract, caps[i]);
    return text.length < 300 ? null : { site: label, title: pg.title, url: pg.fullurl || `https://${host}/wiki/${q(String(t).replace(/ /g, "_"))}`, text };
  });
  return got.filter(Boolean);
}

// ---- MedlinePlus (US National Library of Medicine, patient-level health topics) ----
async function medline(topic) {
  const x = await getText(`https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&term=${q(topic)}&retmax=4`);
  const out = [];
  for (const m of x.matchAll(/<document\b[^>]*\burl="([^"]+)"[^>]*>([\s\S]*?)<\/document>/g)) {
    const field = (n) => { const f = new RegExp(`<content\\s+name="${n}"[^>]*>([\\s\\S]*?)</content>`).exec(m[2]); return f ? clean(f[1]) : ""; };
    const text = field("FullSummary") || field("snippet");
    if (text.length > 150) out.push({ site: "MedlinePlus (NIH)", title: field("title") || "Health topic", url: decode(m[1]), text: text.slice(0, 3000) });
  }
  return out.slice(0, 3);
}

// ---- Europe PMC (includes PubMed): abstracts of review papers ----
async function epmc(topic) {
  const run = async (query) => (await getJson(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${q(query)}&format=json&resultType=core&pageSize=8`)).resultList?.result || [];
  let r = await run(`${topic} AND HAS_ABSTRACT:y AND (PUB_TYPE:"Review")`).catch(() => []);
  if (r.length < 4) r = r.concat(await run(`${topic} AND HAS_ABSTRACT:y`).catch(() => []));
  const seen = new Set();
  return r.filter((x) => x.title && x.abstractText && clean(x.abstractText).length > 400 && !seen.has(x.id) && seen.add(x.id)).slice(0, 5).map((x) => ({
    site: "Europe PMC / PubMed", title: clean(x.title).replace(/\.$/, ""),
    url: x.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${x.pmid}/` : x.doi ? `https://doi.org/${x.doi}` : `https://europepmc.org/article/${x.source}/${x.id}`,
    text: `${[x.journalTitle, x.pubYear].filter(Boolean).join(" ")}. ${clean(x.abstractText)}`.slice(0, 2200),
  }));
}

// ---- StatPearls on NCBI Bookshelf (free clinical textbook chapters) ----
function articleText(h, max) {
  h = String(h).replace(/<(script|style|nav|header|footer|aside|form|figure|table)\b[\s\S]*?<\/\1>/gi, " ");
  const out = [];
  for (const m of h.matchAll(/<(h[2-4]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const t = clean(m[2]); if (!t) continue;
    if (/^h/i.test(m[1])) {
      if (/^(references|review questions|questions|comment on this article|continuing education|disclosure|bibliography)/i.test(t)) { if (out.length > 3) break; continue; }
      out.push("## " + t);
    } else if (t.length >= 45) out.push(t);
  }
  return out.join("\n").slice(0, max);
}
async function bookshelf(topic, n = 3) {
  const es = async (term) => (await getJson(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=books&retmode=json&retmax=${n + 2}&term=${q(term)}`)).esearchresult?.idlist || [];
  let ids = await es(`${topic} AND StatPearls[Book]`).catch(() => []);
  if (!ids.length) ids = await es(`${topic} StatPearls`).catch(() => []);
  ids = ids.slice(0, n);
  if (!ids.length) return [];
  const sm = (await getJson(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=books&retmode=json&id=${ids.join(",")}`)).result || {};
  const items = ids.map((id) => sm[id]).filter((r) => r && (r.accessionid || r.accession)).map((r) => ({ acc: r.accessionid || r.accession, title: clean(r.title || "") }));
  const got = await pool(items, 3, async (it, i) => {
    const url = `https://www.ncbi.nlm.nih.gov/books/${it.acc}/`;
    const text = articleText(await getText(url, 12000), i === 0 ? 10000 : 6000);
    return text.length < 500 ? null : { site: "StatPearls (NCBI Bookshelf)", title: it.title || "StatPearls chapter", url, text };
  });
  return got.filter(Boolean);
}

// ---- Google-grounded web search (Gemini only). Reads real web pages and returns notes plus the pages used ----
async function webNotes(topic, courseTitle, kind = "general") {
  if (provider !== "gemini") return [];
  const sys = "You are researching for a medical student. Use web search to read several different trustworthy pages (university sites, NHS, Mayo Clinic, Cleveland Clinic, Merck Manual, StatPearls, textbooks, society guidelines) and write detailed plain-text study notes: definition, mechanism or structure, clinical features, investigations, management principles, complications, key numbers, and common exam points. Short headings, no markdown symbols, no drug doses. Say when sources disagree.";
  const drugSys = "You are researching for a medical student's pharmacology course. Use web search to read several different trustworthy pages (university sites, StatPearls, Merck Manual, WHO Essential Medicines List, BNF or national formularies, society guidelines, pharmacology textbooks). Write plain-text notes that LIST EVERY drug that belongs to this topic, grouped by class and subclass, naming each one: generic names first, and newer agents too. For each class give the shared mechanism in one line. For each drug give its main uses, its important adverse effects, usual adult dose and route (and paediatric or renal adjustment when stated), contraindications and cautions, key drug interactions, monitoring, and anything special (prodrug, antidote, pregnancy, drug of choice). Group by type and subtype (for example receptor subtypes). Do not spend words on physiology. Short headings, no markdown symbols. Say when sources disagree.";
  const r = await ai(kind === "drugs" ? drugSys : sys, `Topic: ${topic}\nCourse: ${courseTitle || ""}`, kind === "drugs" ? 6000 : 3500, { grounded: true });
  const text = String(r?.text || "").replace(/\*\*|__|`/g, "").trim();
  if (text.length < 400) return [];
  const links = (r.sources || []).filter((s) => s.url).slice(0, 8);
  const hosts = [...new Set(links.map((l) => l.title).filter(Boolean))].slice(0, 6);
  return [{ site: "Web search (Google)", title: hosts.length ? "Pages read: " + hosts.join(", ") : "Web study notes", url: "", links, text: text.slice(0, kind === "drugs" ? 20000 : 12000) }];
}

// trim every source so the total fits the AI's context window
export function fitSources(sources, budget) {
  const total = sources.reduce((a, s) => a + s.text.length, 0);
  if (total <= budget) return sources;
  const per = Math.max(600, Math.floor(budget / Math.max(1, sources.length)));
  // short sources keep their full text, long ones share what is left
  let spare = budget - sources.reduce((a, s) => a + Math.min(s.text.length, per), 0);
  return sources.map((s) => {
    if (s.text.length <= per) return s;
    const extra = Math.min(s.text.length - per, Math.max(0, spare)); spare -= extra;
    return { ...s, text: s.text.slice(0, per + extra) };
  });
}
export const sourceBlock = (sources) => sources.map((s) => `[${s.n}] ${s.site}: ${s.title}\n${s.text}`).join("\n\n");

const NONMED = /organic|general.*chem|inorganic|physics|latin|informatics|language|philosoph|history of med|sociolog|psycholog/i;
export async function deepResearch(topic, { courseTitle = "", grounded = true } = {}) {
  const kind = subjectKind(courseTitle, topic);
  const drugs = kind === "drugs";
  const med = !NONMED.test(courseTitle) || /bio|patho|pharm|physio|anat|medic|clinic/i.test(topic);
  const jobs = [
    ["StatPearls", med, () => bookshelf(drugs ? topic + " drug" : topic, drugs ? 6 : 3), drugs ? 24000 : 16000],
    ["Wikipedia", true, () => wiki("en.wikipedia.org", "Wikipedia", topic, drugs ? [9000, 6000, 4000] : [8000, 4500, 3000]), 16000],
    // drug lists and ATC code pages name every drug of a class, so list pages are allowed here
    ["Drug lists", drugs, async () => (await Promise.all([
      wiki("en.wikipedia.org", "Wikipedia (drug list)", topic + " drugs list", [9000, 6000, 4000], { lists: true }).catch(() => []),
      wiki("en.wikipedia.org", "Wikipedia (ATC)", "ATC code " + topic, [7000, 5000], { lists: true }).catch(() => []),
    ])).flat(), 20000],
    ["MedlinePlus", med, () => medline(topic), 12000],
    ["Wikibooks", true, () => wiki("en.wikibooks.org", "Wikibooks", topic, [4000, 3000]), 14000],
    ["Wikiversity", true, () => wiki("en.wikiversity.org", "Wikiversity", topic, [3000]), 14000],
    ["Europe PMC", med && !drugs, () => epmc(topic), 14000],
    ["Web search", grounded, () => webNotes(topic, courseTitle, kind), drugs ? 70000 : 40000],
  ].filter((j) => j[1]);
  const results = await Promise.all(jobs.map(async ([name, , run, ms]) => {
    try { const r = await within(run(), ms); return { name, items: r || [], ok: true }; }
    catch (e) { return { name, items: [], ok: false, why: e.message === "timeout" ? "too slow" : String(e.message).slice(0, 60) }; }
  }));
  const order = ["StatPearls", "Wikipedia", "Drug lists", "MedlinePlus", "Wikibooks", "Wikiversity", "Web search", "Europe PMC"];
  const seen = new Set(), sources = [];
  for (const name of order) for (const it of results.find((r) => r.name === name)?.items || []) {
    const key = it.url || it.title; if (seen.has(key)) continue; seen.add(key);
    sources.push({ n: sources.length + 1, ...it });
  }
  const report = results.map((r) => ({ site: r.name, ok: r.ok && r.items.length > 0, count: r.items.length, note: r.ok ? (r.items.length ? "" : "nothing found") : r.why }));
  return { topic, kind, sources, report };
}
