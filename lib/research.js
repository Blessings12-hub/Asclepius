// Deep research for study guides. Reads many different open websites at the same time:
//   StatPearls (NCBI Bookshelf), Wikipedia (full articles), MedlinePlus (NIH), Wikibooks, Wikiversity,
//   Europe PMC / PubMed review abstracts, and (with a Gemini key) a Google-grounded web search that reads
//   pages such as NHS, Mayo Clinic, Merck Manual and university sites.
// Everything is free and needs no extra key. Every site is tried separately and fails quietly, so one slow
// or blocked site never breaks the guide. The result says which sites worked.
import { ai, provider } from "./ai.js";
import { pool } from "./media.js";

const UA = "Asclepius/1.2 (personal study app)";

// What kind of subject is this?
//   "drugs"    -> a drug topic: the guide lists EVERY medicine class by class (types, subtypes, effects, uses, adverse effects, doses)
//   "pharmgen" -> general pharmacology (kinetics, dynamics, interactions, adverse reactions, prescribing): normal guide with formulas and tables
//   "general"  -> everything else
const PHARM = /pharmac|therapeutic|antimicrob|antibiotic|antiviral|antifungal|antimalarial|anthelmint|antiparasit|chemotherap|psychopharm|toxicolog|relaxant|pain management|drug|regimen|antitubercul|antiretroviral|antiemetic|antiepilep|antidepress|antipsychot|anticoag|antiplatelet|analges|diuretic|antihypertens|bronchodilat|corticosteroid|immunosuppress|antidote|vasopressor|inotrope|insulin|antidiabet|contracepti|uterotonic/i;
const PHARM_GENERAL = /general (pharmacology|principles)|principles of (pharmacology|drug|therapeutics)|pharmacokinetic|pharmacodynamic|drug (interaction|development|discovery|nomenclature|metabolism|absorption|dosing|monitoring|safety)|adverse (drug )?(reaction|effect|event)|prescribing|therapeutic drug monitoring|pharmacovigilance|pharmacogen|dose.response|routes? of (drug )?administration|clinical trial|rational (use|prescribing)|special groups|polypharmacy|prescription writing|drugs? in (pregnancy|children|the elderly)|pregnancy and breastfeeding|essential medicines/i;
// Courses that are not about drugs at all (their topics are never drug lists, even if a word like "ethics" or "terms" appears)
const NOT_DRUG_COURSE = /forensic|history of|latin|english|ethic|terminolog|behavioural|sociolog|psycholog|informatics/i;
// A whole course that is about drugs: every topic in it is a drug topic (except the general-principles ones above)
const DRUG_COURSE = /pharmac|toxicolog|chemotherap/i;
export const subjectKind = (courseTitle = "", topic = "") => {
  if (NOT_DRUG_COURSE.test(courseTitle)) return "general";
  // conditions CAUSED by drugs, and resistance or stewardship, are ordinary clinical topics, not drug lists
  if (!DRUG_COURSE.test(courseTitle) && /allergy|eruption|induced|abuse|addiction|stewardship|resistance|poisoning/i.test(topic)) return "general";
  if (PHARM_GENERAL.test(topic) && /pharmac|drug|therapeutic|prescrib/i.test(courseTitle + " " + topic) && !/antibiotic|antimicrob|anti-?tb/i.test(topic)) return "pharmgen";
  return DRUG_COURSE.test(courseTitle) || PHARM.test(topic) ? "drugs" : "general";
};

// Which discipline is this course? Gives the writer a checklist of what a full course in that subject expects.
const DISC = [
  ["topo", /topograph|operative surg/i, "TOPOGRAPHIC ANATOMY CHECKLIST: for every region give its boundaries and surface landmarks, the layers from skin to deep, the fascia and cellular spaces with how pus and blood spread, the neurovascular bundles with their projections (holotopy, skeletotopy, syntopy), lymph drainage, weak points, puncture points, surgical approaches, and the operations with their steps and complications."],
  ["pathology", /patholog/i, "PATHOLOGY CHECKLIST: for every disease give the definition, classification (WHO or standard system), aetiology, pathogenesis, gross and microscopic appearance, grading and staging, complications, and the typical lab or imaging findings; list every type and subtype."],
  ["anatomy", /anatom|topograph|operative surg/i, "ANATOMY CHECKLIST: for every structure give position and parts, relations, blood supply, venous and lymphatic drainage, nerve supply, and clinical (applied) anatomy. For muscles use a table with origin, insertion, nerve supply and action; for nerves, roots, course, branches and what is lost when injured; for arteries, origin, course, branches and territory."],
  ["histology", /histolog|embryolog|cytolog/i, "HISTOLOGY AND EMBRYOLOGY CHECKLIST: every tissue and cell type with its structure, stain and function; for organs, the layers in order and the cells of each layer; for embryology, the week-by-week events, the germ layer origin of each organ, and the malformations with their cause."],
  ["physics", /physics|biophysic/i, "MEDICAL PHYSICS CHECKLIST: every law and formula with its units and a worked example, the physical principle of each instrument and imaging method, and the biological effect."],
  ["physiology", /physiolog|biophysic|neuroscience/i, "PHYSIOLOGY CHECKLIST: for every process give the mechanism step by step, the controlling factors (nervous, hormonal, local), normal values and units, the equations, and what changes in disease or exercise. Use tables for comparisons (types of receptors, channels, transporters, fibre types, hormones and their actions)."],
  ["genetics", /genetic|medical biology/i, "GENETICS CHECKLIST: every inheritance pattern with an example disease and the risk, every chromosomal disorder with its karyotype, and the molecular basis of each disease."],
  ["chem", /(?<!bio)chemistry/i, "CHEMISTRY CHECKLIST: every definition, law and formula with a worked calculation, every reaction with its conditions and mechanism."],
  ["biochem", /biochem|molecular|chemistry|genetics|medical biology/i, "BIOCHEMISTRY AND CHEMISTRY CHECKLIST: every pathway with its steps, enzymes, cofactors, regulation and energy yield; every vitamin, hormone or macromolecule with its structure, function, deficiency or excess; inborn errors with the enzyme defect and the clinical picture; reactions with their mechanism and examples; formulas, units and worked values."],
  ["immuno", /immunolog/i, "IMMUNOLOGY CHECKLIST: every cell, organ, molecule and cytokine with its function, every response as a sequence, every hypersensitivity type and immunodeficiency with its defect and example."],
  ["micro", /microbiolog|parasitolog|virolog|mycolog|infection control|immunolog/i, "MICROBIOLOGY CHECKLIST: for every organism give its classification, morphology and staining, culture, virulence factors, transmission, disease caused, laboratory diagnosis, treatment (drug of choice with dose) and prevention; use one table row per organism. For immune topics list every cell, cytokine, immunoglobulin class, hypersensitivity type and immunodeficiency with its defect."],
  ["publichealth", /community|epidemiolog|public health|hygiene|\becolog|biostat|informatics|health (management|policy|system)|family medicine|occupational|disaster|forensic/i, "PUBLIC HEALTH CHECKLIST: every definition, formula (with a worked example), study design with its strengths and weaknesses, measure of disease frequency and association, screening criterion, level of prevention, programme and its targets (Zambia and WHO), and legal or ethical principle."],
  ["clinical", /medicine|infectious|revision|surg|cardiolog|pulmonolog|gastro|hepat|nephrolog|haematolog|hematolog|rheumat|endocrin|neurolog|psychiatr|paediatr|pediatr|obstet|gynae|gynec|urolog|dermat|geriatr|oncolog|ophthalm|\bent\b|orthop|emergency|anaesthes|intensive|phthisiolog|tubercul|palliative|rehabilit|propaedeutic|clinical|radiolog|imaging|nutrition|dietetic|neurosurg/i, "CLINICAL COURSE CHECKLIST: for every disease give definition, epidemiology (including Zambia and sub-Saharan Africa where relevant), classification and staging, aetiology and risk factors, pathophysiology in 2-3 sentences, symptoms and signs, investigations with the expected findings, diagnostic criteria, differential diagnosis, management (non-drug, then drugs: the first-line drug, alternatives, usual adult dose, route and duration, and surgery or procedures), complications, prognosis and prevention. Use a table for classifications, criteria, scores and drug treatment."],
];

// HOW EACH SUBJECT IS STUDIED FOR AN EXAM (from study guides and course programmes): the scheme a short, exam-sized guide follows.
// "Only what is needed to pass": each scheme says what to include and what to leave out.
const SCHEME = {
  topo: "STUDY SCHEME for topographic anatomy and operative surgery (the standard scheme taught for every region): 1 Boundaries and surface landmarks. 2 Layers from skin to deep, in order. 3 Fascia and cellular spaces, and how pus or blood spreads through them. 4 Neurovascular bundles with their projection on the skin and their relations (to the skeleton, to organs, to the region). 5 Lymph nodes and drainage. 6 Weak points, and puncture points. 7 Surgical approaches and why they are placed there. 8 The common operations, their steps and complications. Use a table for layers and for bundles, a diagram or figure for the region, and give surface landmarks the student can palpate. LEAVE OUT: rare variants, small branches no one is asked about, history.",
  anatomy: "STUDY SCHEME for anatomy: break the region into compartments or layers; for each structure give position and relations (in words a student can picture in 3D), blood and nerve supply, and its clinical correlation (typical injury, hernia, nerve lesion, imaging or procedure). Muscles in one table (origin, insertion, nerve, action). Give a labelled figure of the region. LEAVE OUT: rare variants, tiny branches, lists of names without position.",
  histology: "STUDY SCHEME for histology and embryology: for each tissue or organ give what you SEE on the slide (layers in order, cell types, how to recognise it, stain), then the function that explains it. For embryology give a timeline, the germ-layer origin of each organ, and the malformations with their cause. Give a figure of the slide. LEAVE OUT: rare variants and fine ultrastructure that is not examined.",
  physics: "STUDY SCHEME for medical physics: each law and formula with units, symbols defined and one worked example; the principle of each instrument or imaging method; its biological effect and safety. LEAVE OUT: long derivations.",
  physiology: "STUDY SCHEME for physiology: for each process give the flow stimulus, mechanism, response, outcome (as a diagram), then what goes wrong in disease. Key equations with a worked example (for example MAP, GFR, compliance, lung volumes, acid-base). Hormones, receptors and transporters in tables. Normal values only for the key ones. Graphs such as the pressure-volume loop and the action potential as figures. LEAVE OUT: experimental history and derivations.",
  genetics: "STUDY SCHEME for medical genetics: inheritance patterns in one table with example diseases and recurrence risk; pedigree reading rules; chromosomal disorders with karyotype and features; the molecular basis of the main diseases. Include the risk calculations. LEAVE OUT: rare syndromes.",
  chem: "STUDY SCHEME for medical chemistry: definitions and laws with the formulas, each solved as a short worked calculation (pH, buffers, concentration, equilibrium); the key reactions with conditions and the mechanism in numbered steps; the biological relevance of each. LEAVE OUT: industrial chemistry and rare compounds.",
  biochem: "STUDY SCHEME for biochemistry: understand the flow of the pathway first. For each pathway give where it happens, the key reactions in order (drawn), the rate-limiting enzyme, how it is regulated (activators, inhibitors, hormones), the energy yield, and the diseases linked to it (enzyme deficiencies, inborn errors, vitamin and coenzyme roles). Molecular biology as sequences. Put regulation in one table. LEAVE OUT: long text, minor intermediates and details that are not examined.",
  immuno: "STUDY SCHEME for immunology: cells, organs and cytokines in tables (source, target, effect); each response as a sequence (diagram); hypersensitivity types and immunodeficiencies in one table (mechanism, example, test); vaccines and schedules. LEAVE OUT: rare receptors and history.",
  micro: "STUDY SCHEME for microbiology and parasitology (the bug approach): group organisms by system or class; for each organism give its class and the features that identify it (Gram stain, shape, catalase, oxidase, culture), the key virulence factor, the diseases it causes, the lab diagnosis, and the drug of choice, with the bug and its drug side by side in one table. For parasites give the life cycle as a diagram, hosts, diagnosis and treatment. LEAVE OUT: obscure species and taxonomy history.",
  pathology: "STUDY SCHEME for pathology: for each disease give etiology, pathogenesis (as a short chain), the gross and microscopic hallmark, the clinical significance (how the changes explain the signs), and the complications. General mechanisms (injury, inflammation, repair, neoplasia, haemodynamics) first, then how they show in each organ. Give a figure of the typical appearance. LEAVE OUT: rare entities and long classifications.",
  publichealth: "STUDY SCHEME for public health, epidemiology and biostatistics: each formula with a worked example; the 2x2 table and measures from it (sensitivity, specificity, predictive values, risk ratio, odds ratio); study designs with strengths, weaknesses and the bias each suffers; incidence and prevalence; levels of prevention; the main programmes and targets in Zambia. LEAVE OUT: regression, ROC curves, forest plots, survival curves and other low-yield statistics unless the topic is exactly that.",
  clinical: "STUDY SCHEME for clinical subjects (the illness script): for each COMMON disease give definition, causes and risk factors, the key symptoms and signs, the key investigations and what they show, management (first-line drug with dose and duration, then alternatives, then surgery), and complications. Include the Zambian context where it matters (guidelines, common local diseases). Use one table for drugs and one for criteria or scores. LEAVE OUT: rare diseases, long pathophysiology, and anything that is not asked at a final exam.",
  other: "",
};
const SCHEME_FOR = { chem: "chem", topo: "topo" };
// What to SHOW, not just say: reactions and formulas with real symbols, pathway and cycle diagrams, and a real picture
export const VIS_COMMON = "VISUALS RULE (the student must see the real thing, not only words). WRITE EVERY CHEMICAL REACTION THE WAY A TEXTBOOK DOES, as ONE entry per reaction in \"equations\": {\"name\":\"Step 1: what happens, in plain words\",\"reactants\":[{\"name\":\"full compound name\",\"formula\":\"molecular formula with subscripts, such as C₆H₁₂O₆ (leave the formula out for ATP, ADP, NAD⁺, NADH)\",\"smiles\":\"the compound as a SMILES string so that its structure can be drawn, such as CC(=O)C(=O)[O-] for pyruvate, OCC1OC(O)C(O)C(O)C1O for glucose, [Na+].[Cl-] for NaCl, O=C=O for CO2; leave it out for ATP, ADP, NAD, FAD and CoA, and for anything you are not sure of\"}],\"products\":[{\"name\":\"..\",\"formula\":\"..\"}],\"enzyme\":\"the enzyme, which is written on the arrow\",\"conditions\":\"what sits under the arrow: ions and cofactors that are not used up (Mg²⁺, Zn²⁺), and ΔG or irreversible\",\"reversible\":true or false,\"note\":\"one or two plain sentences: what the reaction does and why it matters\"}. Rules: balance every reaction for atoms and charge; show the small molecules that change (ATP → ADP + Pi, NAD⁺ → NADH + H⁺, H₂O, CO₂) as reactants or products, never hide them in the note; give each compound its name first and its formula second; number the steps of a pathway in order; one arrow per entry (never chain two reactions); no abbreviations that are not defined; keep to ONE common textbook way of writing each compound. For a formula or equation that is not a reaction (for example t½ = 0.693 × Vd / CL), use {\"name\",\"eq\",\"note\"} and define every symbol in the note, with a worked example. If the section is a pathway, cycle, feedback loop, life cycle, development sequence or algorithm, give \"diagram\": {\"title\",\"type\":\"chain\" or \"cycle\",\"nodes\":[every step or intermediate, at most 16, short names],\"steps\":[{\"label\":\"the enzyme or event on the arrow\",\"in\":\"the small molecule used there, such as ATP or NAD⁺\",\"out\":\"the one it becomes or releases, such as ADP, NADH or CO₂\"}]} (a chain has one step fewer than nodes; a cycle has as many steps as nodes, the last joining the last node back to the first). When a picture teaches better than words (a structure, a labelled anatomy drawing, a micrograph, a graph, an ECG, an organism), give \"figure\": {\"query\":\"3-6 plain words that would find a clear labelled picture on Wikimedia Commons\",\"caption\":\"what it shows\"}. Use equations, diagram and figure whenever they fit and leave them empty only when they do not. STRUCTURE SYMBOLS: the student learns chemistry by SEEING structures. Every reactant and product that is a real compound gets its SMILES (balanced SMILES with real atoms only: no abbreviations; write a group such as a CoA tail as {CoA} and an unspecified chain as {R}). Also give \"structures\": [{\"name\":\"compound or class\",\"formula\":\"..\",\"kind\":\"protein, carbohydrate, lipid, nucleic acid, vitamin, hormone, drug, organic or inorganic\",\"smiles\":\"..\",\"note\":\"what to notice in the structure: the functional groups, the bond, the repeating unit\"}] (up to 10) for every compound, bond or macromolecule the section teaches. Show a macromolecule by a short representative piece with the rest written as {R}: a protein or peptide as a tripeptide such as NCC(=O)NC(C)C(=O)NC(CO)C(O)=O (peptide bonds), starch or glycogen as a glucose trisaccharide with alpha-1,4 links, a triglyceride as {R1}C(=O)OCC(OC(=O){R2})COC(=O){R3}, a phospholipid as phosphatidylcholine, DNA or RNA as a dinucleotide. In a pathway \"diagram\", a node may be {\"name\":\"..\",\"smiles\":\"..\"} so the structure sits above the name. Never invent a reaction or formula: add '(check textbook)' in the note if unsure.";
const VIS = {
  biochem: " FOR THIS SUBJECT: every reaction of the pathway or topic is its own entry in equations, in pathway order and balanced, with substrates, products, the enzyme on the arrow, cofactors, ΔG or ATP yield when known (up to 18 entries); every pathway or cycle needs a diagram with ALL its intermediates; every structure (sugar, amino acid, peptide, protein, nucleotide, lipid, vitamin, coenzyme) goes in structures with its SMILES, and every pathway diagram node of a metabolite carries its SMILES; for chemistry also give the reaction mechanism as numbered steps in the note, and the balanced equation.",
  physiology: " FOR THIS SUBJECT: write the equations (Nernst, Goldman, Starling, Fick, GFR, clearance, compliance, resistance, Poiseuille, Henderson–Hasselbalch, gas laws, physics formulas) with every symbol defined in the note; draw feedback loops, reflex arcs and signalling cascades as diagrams; give figures for graphs and traces (action potential, pressure–volume loop, ECG, oxygen dissociation curve).",
  topo: " FOR THIS SUBJECT: give a figure of the region and a diagram for any pathway; layers and bundles go in tables.",
  anatomy: " FOR THIS SUBJECT: give a figure for the labelled drawing of the region or structure of every section, and a diagram for any nerve, blood or lymph pathway.",
  histology: " FOR THIS SUBJECT: give a figure (a micrograph or labelled drawing) for every tissue or organ, and a diagram for sequences of development.",
  micro: " FOR THIS SUBJECT: draw every life cycle (malaria, schistosomiasis, tapeworms, hookworm and others) as a cycle diagram, and give a figure for the morphology or stain of the key organism; write the pathway or cascade of immune responses as a diagram.",
  pathology: " FOR THIS SUBJECT: draw pathogenesis chains (injury to disease, coagulation and inflammation cascades) as diagrams and give a figure for the typical gross or microscopic appearance.",
  publichealth: " FOR THIS SUBJECT: write every formula in equations with a worked example in the note (sensitivity, specificity, predictive values, risk ratio, odds ratio, rates, standard error, confidence interval, sample size), and give a 2×2 table where it applies.",
  clinical: " FOR THIS SUBJECT: draw the diagnostic or management pathway as a chain diagram, give a figure for typical ECGs, X-rays or lesions, and write scores and formulas (for example anion gap, corrected calcium, creatinine clearance, Wells, CHA₂DS₂-VASc) in equations.",
};
VIS.chem = " FOR THIS SUBJECT (organic, inorganic and general chemistry): write EVERY reaction as its own entry in equations with a SMILES for each organic or inorganic compound (acids, bases, salts and ions too: NaCl as [Na+].[Cl-], H2SO4 as OS(=O)(=O)O), balanced for atoms and charge, with the reagent or catalyst on the arrow and the conditions under it; for a multi-step synthesis or mechanism use one entry per step and a chain diagram whose nodes carry their SMILES; give the mechanism steps in the note; put every functional group, named compound class and structure the section teaches in structures with its SMILES (alkane, alkene, alkyne, arene, alcohol, ether, aldehyde, ketone, carboxylic acid, ester, amide, amine, halide, heterocycle; for inorganic: the acid, base, salt, oxide and complex ion).";
const VIS_ALIAS = { physics: "physiology", immuno: "micro", genetics: "biochem" };
export const disciplineOf = (courseTitle = "", topic = "") => {
  const t = courseTitle + " " + topic;
  const hit = DISC.find((d) => d[1].test(courseTitle)) || DISC.find((d) => d[1].test(t));
  if (!hit) return { id: "other", note: "", scheme: "" };
  const v = VIS[hit[0]] || VIS[VIS_ALIAS[hit[0]]] || "";
  return { id: hit[0], note: hit[2] + v, scheme: (SCHEME[hit[0]] || "") + v };
};
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
  const disc = disciplineOf(courseTitle, topic).note;
  const sys = "You are researching for a medical student who wants everything a full university course expects. Use web search to read several different trustworthy pages (university sites, NHS, Mayo Clinic, Cleveland Clinic, Merck Manual, StatPearls, textbooks, society guidelines, WHO and Zambian guidelines where they exist) and write detailed plain-text study notes: definition, EVERY type, subtype, classification, stage and grade, mechanism or structure, clinical features, investigations, management (for clinical topics name the first-line and alternative drugs with usual adult dose, route and duration), complications, key numbers (normal values, cut-offs, criteria, formulas), and common exam points. Short headings, no markdown symbols. Say when sources disagree. " + disc;
  const drugSys = "You are researching for a medical student's pharmacology course. Use web search to read several different trustworthy pages (university sites, StatPearls, Merck Manual, WHO Essential Medicines List, BNF or national formularies, Zambian Standard Treatment Guidelines, society guidelines, pharmacology textbooks). Write plain-text notes that LIST EVERY drug that belongs to this topic as a full classification: type, then subtype (receptor, enzyme, channel or transporter subtype such as M1, M2, M3, alpha1, beta2), then under EACH subtype the drugs that activate it and the drugs that block it, each by generic name (older and newer agents, and those on the WHO list). A drug that acts on several subtypes is named under each. For each type or subtype give the target and what it does (the pharmacological effects, organ by organ, in one line each). For each drug give its main uses, important adverse effects, usual adult dose and route (and paediatric or renal adjustment when stated), contraindications and cautions, key drug interactions, monitoring, and anything special (prodrug, antidote, pregnancy, drug of choice). Do not spend words on physiology: only the receptor or target function needed to understand the drug. Short headings, no markdown symbols. Say when sources disagree.";
  const r = await ai(kind === "drugs" ? drugSys : sys, `Topic: ${topic}\nCourse: ${courseTitle || ""}`, kind === "drugs" ? 7000 : 4500, { grounded: true });
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
