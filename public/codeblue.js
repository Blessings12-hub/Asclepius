/* Code blue simulator (Practice > Code blue). Adult cardiac arrest teaching case, played turn by turn.
   Works offline and needs no AI key. Based on the general shape of the AHA and ERC adult algorithms.
   It is a study tool, not a protocol: follow your hospital's and the national resuscitation guideline, and check drug doses there. */
(function () {
const CAUSES = [
 ["hypovolaemia", "Hypovolaemia: IV fluids or blood, stop the bleeding"],
 ["hypoxia", "Hypoxia: oxygen, secure the airway, ventilate"],
 ["acidosis", "Hydrogen ions (acidosis): treat the cause, ventilate"],
 ["kalaemia", "Hyper or hypokalaemia: IV calcium, insulin and glucose (high K); potassium (low K)"],
 ["hypothermia", "Hypothermia: rewarm, continue CPR until warm"],
 ["tension", "Tension pneumothorax: needle decompression, then chest drain"],
 ["tamponade", "Cardiac tamponade: pericardiocentesis or emergency thoracotomy"],
 ["toxins", "Toxins: specific antidote and supportive care"],
 ["pe", "Thrombosis (pulmonary embolism): thrombolysis"],
 ["mi", "Thrombosis (coronary): reperfusion once the heart is beating again"]
];
const SC = [
 { id: "vf-mi", rhythm: "vf", cause: null, title: "Collapse in the ward corridor", story: "58-year-old man, crushing chest pain for an hour, collapses in front of you. Unresponsive, not breathing normally.", clues: ["Earlier ECG: ST elevation in the anterior leads", "No signs of bleeding, chest is moving equally", "Glucose 7 mmol/L, potassium 4.2 mmol/L"], why: "Ventricular fibrillation from a coronary thrombosis. This is the shockable pathway: early defibrillation with high-quality CPR is the treatment. The coronary cause is treated with reperfusion after the heart restarts." },
 { id: "pvt-hf", rhythm: "pvt", cause: null, title: "Heart failure clinic", story: "64-year-old woman with known heart failure, palpitations then collapse. No pulse. The monitor shows a fast wide-complex rhythm.", clues: ["Known low ejection fraction", "Potassium 4.5 mmol/L, magnesium normal", "No chest injury, breath sounds equal"], why: "Pulseless ventricular tachycardia: managed exactly as VF. No single reversible cause stands out; defibrillate, give drugs on schedule and keep compressions going." },
 { id: "pea-k", rhythm: "pea", cause: "kalaemia", title: "Dialysis patient", story: "72-year-old woman who missed two dialysis sessions, now weak and collapses. No pulse. Slow wide-complex rhythm on the monitor.", clues: ["Peaked T waves on the ECG from this morning", "Potassium 7.9 mmol/L on the point-of-care test", "Fistula in the left arm"], why: "PEA from severe hyperkalaemia. Non-shockable. CPR and epinephrine, but the patient only recovers if the cause is treated: IV calcium first, then insulin with glucose." },
 { id: "pea-tamp", rhythm: "pea", cause: "tamponade", title: "Stab wound to the chest", story: "24-year-old man with a stab wound left of the sternum, collapses in the casualty. No pulse, organised rhythm on the monitor.", clues: ["Distended neck veins, muffled heart sounds", "Ultrasound: fluid around the heart", "Breath sounds equal on both sides"], why: "PEA from cardiac tamponade. Fluid in the pericardium stops the heart filling. Compressions alone will not work: drain the pericardium (pericardiocentesis or thoracotomy)." },
 { id: "pea-ptx", rhythm: "pea", cause: "tension", title: "Motorbike crash", story: "30-year-old rider, chest injury, becomes more breathless then arrests. No pulse, organised rhythm on a fast narrow QRS.", clues: ["No breath sounds on the right, hyper-resonant", "Trachea pushed to the left, neck veins distended", "Bruising over the right chest"], why: "PEA from tension pneumothorax. It is a clinical diagnosis: decompress the chest immediately, do not wait for an X-ray." },
 { id: "pea-bleed", rhythm: "pea", cause: "hypovolaemia", title: "After childbirth", story: "35-year-old woman, delivered two hours ago, heavy bleeding, now unresponsive with no pulse. Organised fast rhythm.", clues: ["Soaked bed linen, uterus soft and boggy", "Haemoglobin 4.1 g/dL", "Flat neck veins, cold peripheries"], why: "PEA from severe haemorrhage (hypovolaemia). Restore volume fast with blood and fluids and stop the bleeding while CPR continues." },
 { id: "pea-pe", rhythm: "pea", cause: "pe", title: "Collapse after a long journey", story: "45-year-old man, 14-hour bus journey, swollen right calf, sudden breathlessness then collapse. No pulse, organised rhythm.", clues: ["Swollen, tender right calf", "Right heart strain pattern on the ECG, dilated right ventricle on ultrasound", "Breath sounds equal, neck veins distended"], why: "PEA from massive pulmonary embolism. Treat with thrombolysis, and keep CPR going for as long as it takes (often 60 to 90 minutes after thrombolysis)." },
 { id: "asy-cold", rhythm: "asystole", cause: "hypothermia", title: "Found outside in the cold", story: "65-year-old man found outdoors on a cold night, unresponsive, looks lifeless. Flat line on the monitor.", clues: ["Core temperature 27 degrees Celsius", "Rigid-feeling cold skin, no injuries", "Glucose 3.5 mmol/L"], why: "Asystole from severe hypothermia. Nobody is dead until warm and dead: rewarm the patient and continue resuscitation." },
 { id: "asy-op", rhythm: "asystole", cause: "toxins", title: "Farm worker with pesticide exposure", story: "40-year-old farmer who sprayed pesticide without protection, vomiting and drooling, then collapse. Flat line on the monitor.", clues: ["Pinpoint pupils, wet chest sounds, sweating", "Smell of pesticide on the clothes", "Slow heart rate before the arrest"], why: "Cardiac arrest from organophosphate poisoning (toxins). Along with CPR, the specific treatment is atropine in large doses; protect yourself from contamination." },
 { id: "pea-hyp", rhythm: "pea", cause: "hypoxia", title: "Severe asthma", story: "28-year-old woman with a severe asthma attack, silent chest, becomes drowsy and arrests. No pulse, slow organised rhythm.", clues: ["Cyanosed, saturation 62 percent before arrest", "Very little air entry, wheeze gone quiet", "Neck veins not distended, trachea central"], why: "PEA from hypoxia. In respiratory arrests, oxygen and ventilation are the priority: secure the airway, ventilate with high-flow oxygen, and treat the underlying asthma." }
];
const RH = { vf: "Ventricular fibrillation", pvt: "Ventricular tachycardia (no pulse)", asystole: "Asystole", pea: "Organised rhythm, no pulse (PEA)", rosc: "Organised rhythm with a pulse" };
const shockable = (r) => r === "vf" || r === "pvt";
const fmt = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");

let S = null, raf = 0;

function newGame(sc) {
 S = { sc, t: 0, cycles: 0, good: 0, cprOn: false, cprAt: null, pads: false, atCheck: false, iv: false, airway: false, shocks: 0, epi: 0, amio: 0, lastEpi: -1e9, lookedAt: false, treated: false, wrongTx: 0, withheld: 0, rhythm: sc.rhythm, showClues: false, hands: 0, log: [], pts: 0, ended: false, rosc: false, started: Date.now() };
}
function ev(ok, pts, msg) { S.log.push({ ok, pts, msg, t: S.t }); S.pts += pts; }
function ready() {
 const sc = S.sc;
 if (sc.cause) return S.treated && S.good >= 2 && S.epi >= 1;
 return S.shocks >= 3 && S.epi >= 1 && S.amio >= 1 && S.good >= 3;
}
function finish(rosc) {
 S.ended = true; S.rosc = rosc;
 if (rosc) ev(true, 15, "Return of spontaneous circulation (ROSC) at " + fmt(S.t) + ".");
 else ev(false, 0, "No ROSC. The team stopped the attempt after " + fmt(S.t) + ".");
 try { post("/api/results", { courseId: ((window.courses || courses || []).find((c) => c.title === "Emergency Medicine") || {}).id || "", topic: "Code blue: " + S.sc.title.slice(0, 40), correct: rosc && S.pts >= 70, day: localDay() }).catch(() => {}); } catch (e) {}
}

/* ---------- actions ---------- */
const A = {
 cpr() {
  S.cprOn = true; S.cprAt = S.t;
  ev(true, S.pads ? 0 : 10, S.pads ? "Compressions started." : "Compressions started first, before anything else. Good: every second without compressions costs.");
 },
 pads() {
  S.pads = true; S.atCheck = true; S.t += 20;
  ev(true, S.cprOn ? 5 : 0, S.cprOn ? "Monitor and pads on while compressions continued." : "Pads on, but compressions had not started. Start CPR while the defibrillator is being set up.");
 },
 shock() {
  if (!shockable(S.rhythm)) { ev(false, -15, "Shock delivered to a non-shockable rhythm (" + RH[S.rhythm] + "). A shock cannot help here and wastes time off the chest."); S.hands += 8; }
  else { S.shocks++; ev(true, 8, "Shock " + S.shocks + " delivered for " + RH[S.rhythm] + ", then compressions resumed straight away. Use the energy recommended for your defibrillator."); S.hands += 5; }
  S.t += 5; resume();
 },
 noshock() {
  if (shockable(S.rhythm)) { S.withheld++; ev(false, -12, "Shock withheld in a shockable rhythm. Defibrillation is the most important treatment here."); }
  else ev(true, 8, "No shock: " + RH[S.rhythm] + " is not shockable. Compressions resumed.");
  S.hands += 3; resume();
 },
 pulse() {
  S.t += 10; S.hands += 10;
  if (S.rhythm === "rosc") { finish(true); return; }
  if (shockable(S.rhythm)) { ev(false, -5, "You checked for a pulse during VF or pulseless VT. Shock first; do not delay defibrillation to feel for a pulse."); }
  else ev(true, 0, "Pulse check: no pulse. Continue CPR.");
  S.atCheck = false; resumeSilent();
 },
 iv() { S.iv = true; ev(true, 4, "IV or IO access established without stopping compressions."); },
 airway() { S.airway = true; ev(true, 0, "Advanced airway placed. Give continuous compressions and about 10 breaths a minute once it is in."); },
 epi() {
  const sh = shockable(S.rhythm), since = S.t - S.lastEpi;
  if (S.epi > 0 && since < 150) { ev(false, -6, "Epinephrine repeated too soon (" + fmt(since) + " since the last dose). The interval is every 3 to 5 minutes."); }
  else if (sh && S.shocks < 2 && S.epi === 0) { ev(false, -4, "Epinephrine given before the second shock. In a shockable rhythm it follows the second to third shock (AHA and ERC differ a little)."); }
  else ev(true, 8, "Epinephrine 1 mg IV or IO" + (sh ? "" : ", early, as soon as access was ready (non-shockable rhythm)") + ".");
  S.epi++; S.lastEpi = S.t;
 },
 amio() {
  const sh = shockable(S.rhythm);
  if (!sh) ev(false, -8, "Amiodarone is for shockable rhythms (VF or pulseless VT) that persist after shocks. It has no place here.");
  else if (S.shocks < 3 && S.amio === 0) ev(false, -4, "Amiodarone 300 mg is given after the third shock, not earlier.");
  else ev(true, 8, S.amio === 0 ? "Amiodarone 300 mg IV or IO after three shocks." : "Second dose, amiodarone 150 mg.");
  S.amio++;
 },
 look() { S.lookedAt = true; S.showClues = true; ev(true, 8, "You searched for reversible causes (the Hs and Ts)."); },
 treat(key) {
  const c = S.sc.cause;
  if (!c) { S.wrongTx++; ev(false, -5, "Treated: " + labelOf(key) + ". No specific reversible cause was present in this case, so that treatment was not indicated."); }
  else if (key === c) { S.treated = true; ev(true, 20, "Correct cause treated: " + labelOf(key) + "."); }
  else { S.wrongTx++; ev(false, -6, "Treated: " + labelOf(key) + ". The findings point to a different cause."); }
 },
 cycle() {
  if (!S.cprOn) { return; }
  S.t += 120; S.cycles++; S.good++;
  S.atCheck = true;
  if (S.cycles >= 8) { finish(false); return; }
  S.rhythm = nextRhythm();
 }
};
const labelOf = (k) => (CAUSES.find((c) => c[0] === k) || ["", k])[1].split(":")[0];
function resume() { S.atCheck = false; S.cprOn = true; }
function resumeSilent() { S.cprOn = true; }
function nextRhythm() {
 if (ready()) return "rosc";
 if (S.withheld >= 2 && shockable(S.sc.rhythm)) return "asystole";
 return S.rhythm === "rosc" ? S.sc.rhythm : S.rhythm;
}

/* ---------- waveform ---------- */
function wave(r, x, cpr) {
 if (cpr) return Math.sin(x * 11.5) * 0.65 + Math.sin(x * 3) * 0.1 + (Math.random() - 0.5) * 0.15;
 if (r === "vf") return (Math.sin(x * 7.3) * 0.5 + Math.sin(x * 12.9 + 1) * 0.35 + Math.sin(x * 3.1) * 0.25) * (0.6 + 0.4 * Math.sin(x * 0.9)) + (Math.random() - 0.5) * 0.1;
 if (r === "pvt") return Math.sin(x * 9) * 0.85;
 if (r === "asystole") return (Math.random() - 0.5) * 0.04;
 const rate = r === "rosc" ? 1.25 : 1.0, p = (x * rate) % (Math.PI * 2) / (Math.PI * 2);
 const g = (c, w, h) => h * Math.exp(-Math.pow((p - c) / w, 2));
 if (r === "pea") return g(0.5, 0.018, 0.55) - g(0.48, 0.01, 0.12) + g(0.72, 0.05, 0.12) + (Math.random() - 0.5) * 0.02;
 return g(0.2, 0.03, 0.12) + g(0.5, 0.012, 0.95) - g(0.48, 0.008, 0.14) + g(0.72, 0.045, 0.25) + (Math.random() - 0.5) * 0.015;
}
function animate() {
 cancelAnimationFrame(raf);
 const cv = document.getElementById("cbw"); if (!cv || !S) return;
 const ctx = cv.getContext("2d"), W = cv.width, H = cv.height, buf = []; let x = 0;
 const step = () => {
  if (!document.getElementById("cbw")) return;
  const cpr = S.cprOn && !S.atCheck && !S.ended, r = S.pads || S.ended ? (S.ended && !S.rosc ? "asystole" : S.rhythm) : "asystole";
  for (let i = 0; i < 3; i++) { x += 0.05; buf.push(wave(S.pads || S.ended ? r : "asystole", x, S.pads && cpr)); }
  while (buf.length > W) buf.shift();
  ctx.fillStyle = "#06120c"; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = "#34d37a"; ctx.lineWidth = 2; ctx.beginPath();
  buf.forEach((v, i) => { const y = H / 2 - v * (H * 0.4); i ? ctx.lineTo(i, y) : ctx.moveTo(i, y); }); ctx.stroke();
  raf = requestAnimationFrame(step);
 };
 step();
}

/* ---------- screens ---------- */
function startScreen() {
 const ap = $("#pbody");
 ap.innerHTML = `<div class="card"><h3>Code blue simulator</h3><p class="muted sm">An adult cardiac arrest, played step by step like a real code. Start compressions, attach the monitor, read the rhythm, shock or not, give drugs on time, and find the reversible cause. You get a scored debrief. No internet or AI needed.</p><p class="sm"><b>Teaching tool.</b> It follows the general shape of the AHA and ERC adult algorithms. Your hospital's protocol and the Zambian guideline come first, and drug doses should be checked there. Guidelines are revised every few years.</p>
 <div class="row"><button class="p" id="cbr">Random case</button><select id="cbs">${SC.map((s, i) => `<option value="${i}">${esc(s.title)}</option>`).join("")}</select><button id="cbp">Play this case</button></div></div>
 <details class="card"><summary><b>Quick reference: adult cardiac arrest</b></summary>${REF}</details>`;
 $("#cbr").onclick = () => play(SC[Math.floor(Math.random() * SC.length)]);
 $("#cbp").onclick = () => play(SC[+$("#cbs").value]);
}
const REF = `<ul class="sm"><li><b>Start:</b> unresponsive and not breathing normally: call for help and the defibrillator, start compressions at once. Rate 100 to 120 a minute, depth about 5 cm (not over 6 cm), full recoil, minimal pauses.</li>
<li><b>Shockable (VF or pulseless VT):</b> shock, resume CPR for 2 minutes. Epinephrine 1 mg after the second to third shock, then every 3 to 5 minutes. Amiodarone 300 mg after the third shock, 150 mg after the fifth (lidocaine is an alternative).</li>
<li><b>Non-shockable (asystole or PEA):</b> CPR and epinephrine 1 mg as soon as access is in, then every 3 to 5 minutes. Look hard for the cause.</li>
<li><b>Every 2 minutes:</b> pause briefly to check the rhythm (under 10 seconds). Change the person doing compressions.</li>
<li><b>Hs:</b> hypovolaemia, hypoxia, hydrogen ions, hyper or hypokalaemia, hypothermia. <b>Ts:</b> tension pneumothorax, tamponade, toxins, thrombosis (pulmonary), thrombosis (coronary).</li>
<li><b>After ROSC:</b> ABCDE, oxygen to a saturation of 94 to 98 percent, 12-lead ECG, avoid low blood pressure, check glucose, treat the cause, and move to critical care.</li></ul>`;

function play(sc) { newGame(sc); draw(true); }

function draw(first) {
 const ap = $("#pbody");
 if (first || !document.getElementById("cbw")) {
  ap.innerHTML = `<div class="card"><p class="sm muted">Case</p><h3 style="margin:0">${esc(S.sc.title)}</h3><p>${esc(S.sc.story)}</p><canvas id="cbw" width="360" height="90" style="width:100%;border-radius:6px;background:#06120c"></canvas><p class="sm" id="cbst"></p><div id="cbc"></div></div><div class="card"><h4 style="margin-top:0">What happened</h4><div id="cbl" class="sm"></div></div>`;
  animate();
 }
 const sc = S.sc;
 const rhythmLine = !S.pads ? "No monitor yet: you cannot see the rhythm." : S.ended ? "" : S.atCheck ? "Rhythm check (compressions paused): <b>" + RH[S.rhythm] + "</b>" : S.cprOn ? "Compressions in progress. The monitor shows compression artefact until the next rhythm check." : "Rhythm: " + RH[S.rhythm];
 $("#cbst").innerHTML = `Clock <b>${fmt(S.t)}</b> · cycle ${S.cycles + 1}${S.pads ? " · shocks " + S.shocks : ""}${S.epi ? " · epinephrine ×" + S.epi : ""}${S.amio ? " · amiodarone ×" + S.amio : ""}${S.iv ? " · IV/IO in" : ""}<br>${rhythmLine}`;
 const b = (id, t, cls) => `<button ${cls ? `class="${cls}"` : ""} data-a="${id}">${t}</button>`;
 let h = "";
 if (S.ended) {
  h = debrief();
 } else if (!S.cprOn && !S.pads) {
  h = `<p class="sm">The patient is unresponsive and not breathing normally. What is your first action?</p><div class="row" style="flex-wrap:wrap">${b("cpr", "Start chest compressions", "p")}${b("pads", "Attach monitor and pads first")}</div>`;
 } else if (S.atCheck) {
  const sh = shockable(S.rhythm);
  h = `<p class="sm">Rhythm check: pause compressions for no more than 10 seconds.</p><div class="row" style="flex-wrap:wrap">${b("shock", "Shock", sh ? "p" : "")}${b("noshock", "No shock, resume CPR")}${b("pulse", "Check for a pulse")}</div>`;
 } else {
  h = `<p class="sm">CPR in progress. Do these without stopping compressions, then continue to the next rhythm check.</p><div class="row" style="flex-wrap:wrap">${!S.cprOn ? b("cpr", "Start chest compressions", "p") : ""}${!S.pads ? b("pads", "Attach monitor and pads") : ""}${S.pads ? (S.iv ? "" : b("iv", "IV or IO access")) : ""}${S.pads && S.iv ? b("epi", "Epinephrine 1 mg") + b("amio", S.amio ? "Amiodarone 150 mg" : "Amiodarone 300 mg") : ""}${S.airway ? "" : b("airway", "Advanced airway")}${S.lookedAt ? "" : b("look", "Look for reversible causes (Hs and Ts)")}</div>`;
  if (S.pads && S.iv === false) h += `<p class="sm muted">Drugs need IV or IO access first.</p>`;
  if (S.showClues) h += `<div class="card"><b>Findings</b><ul class="sm">${sc.clues.map((c) => `<li>${esc(c)}</li>`).join("")}</ul><label class="f">Treat a cause<select id="cbt"><option value="">Choose treatment…</option>${CAUSES.map((c) => `<option value="${c[0]}">${esc(c[1])}</option>`).join("")}</select></label><button id="cbtg">Give this treatment</button></div>`;
  if (S.pads) h += `<div class="row">${b("cycle", "Continue CPR for 2 minutes, then rhythm check", "p")}</div>`;
 }
 $("#cbc").innerHTML = h;
 $("#cbl").innerHTML = S.log.length ? S.log.slice().reverse().map((l) => `<p style="margin:.3em 0">${l.ok ? "✓" : "✗"} <span class="muted">${fmt(l.t)}</span> ${esc(l.msg)}</p>`).join("") : '<p class="muted">Nothing yet.</p>';
 document.querySelectorAll("#cbc [data-a]").forEach((el) => (el.onclick = () => { const k = el.dataset.a; if (k === "cpr" && S.pads === false && !S.cprOn) { A.cpr(); } else A[k](); draw(); }));
 const g = $("#cbtg"); if (g) g.onclick = () => { const v = $("#cbt").value; if (!v) return; A.treat(v); draw(); };
 const ag = $("#cbagain"); if (ag) ag.onclick = () => startScreen();
}

function debrief() {
 const score = Math.max(0, Math.min(100, S.pts)), mm = Math.round(S.hands / 6) / 10;
 return `<div class="card"><h3 style="margin-top:0">${S.rosc ? "ROSC: the patient has a pulse" : "No ROSC: the attempt was stopped"}</h3><p><b>Score ${score} / 100</b> · clock ${fmt(S.t)} · shocks ${S.shocks} · epinephrine ×${S.epi} · amiodarone ×${S.amio} · about ${mm} minutes off the chest for rhythm checks and shocks</p>
 <p><b>What this case was.</b> ${esc(S.sc.why)}</p>
 ${S.rosc ? `<p><b>Now (post-arrest care).</b> ABCDE; oxygen to a saturation of 94 to 98 percent; 12-lead ECG; keep blood pressure up; check glucose and electrolytes; treat the cause (for a coronary cause, urgent reperfusion); avoid fever; move to critical care.</p>` : `<p class="sm muted">Not every arrest can be reversed, even with perfect care. Look at what went wrong below and try the case again.</p>`}
 <div class="row"><button class="p" id="cbagain">Play another case</button></div></div>`;
}

window.pCode = async function () { courses = courses && courses.length ? courses : await api("/api/courses"); if (S && !S.ended && document.getElementById("cbw")) return draw(); startScreen(); };
})();
