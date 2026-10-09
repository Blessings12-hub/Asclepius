// Structure symbols: reads a SMILES string, lays the molecule out in 2D and returns plain drawing shapes (lines and text).
// No libraries and no network: the same shapes are turned into SVG for the screen and drawn as vector graphics in the PDF.
// SMILES is a one-line text code for a molecule, for example ethanol = CCO, benzene = c1ccccc1, pyruvate = CC(=O)C(=O)[O-].
// Extra: {R} or {CoA} inside a SMILES is a labelled group (a chain, a coenzyme A tail) drawn as that text.
// Stereochemistry (wedges, D/L) is not drawn: the flat skeletal formula is what a student sketches.

const SUB = "₀₁₂₃₄₅₆₇₈₉";
const sub = (n) => String(n).split("").map((d) => SUB[+d] ?? d).join("");
const SUP = { "+": "⁺", "-": "⁻", "−": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
const ZVAL = { 5: [3], 6: [4], 7: [3, 5], 8: [2], 9: [1], 14: [4], 15: [3, 5], 16: [2, 4, 6], 17: [1, 3, 5, 7], 35: [1, 3, 5], 53: [1, 3, 5], 34: [2, 4, 6], 33: [3, 5] };
const Z = { H: 1, B: 5, C: 6, N: 7, O: 8, F: 9, Si: 14, P: 15, S: 16, Cl: 17, Br: 35, I: 53, Se: 34, As: 33 };
const TWO = ["Cl", "Br", "Na", "Ca", "Mg", "Fe", "Zn", "Cu", "Mn", "Co", "Li", "Al", "Si", "Se", "As", "Sn", "Hg", "Ag", "Au", "Pt", "Ni", "Cr", "Mo", "Ba", "Sr", "Cs", "Rb", "Ti", "Ga", "Ge", "Pb", "Bi", "Sb", "Te", "Be", "Sc", "Cd", "Zr"];
const AROM = { c: "C", n: "N", o: "O", s: "S", p: "P", b: "B", se: "Se", as: "As" };

function valenceList(a) {
  const z = Z[a.el]; if (!z) return null;
  const k = z - (a.q || 0); return ZVAL[k] || null;
}

// ---------- 1. read the SMILES ----------
export function parseSmiles(src) {
  const s = String(src || "").trim();
  if (!s || s.length > 600) return null;
  const atoms = [], bonds = [], stack = [], rc = new Map();
  let prev = -1, pend = null;
  const bondOrder = (sym) => (sym === "=" ? 2 : sym === "#" ? 3 : 1);
  const link = (a, b, sym) => bonds.push({ a, b, order: bondOrder(sym), arom: sym === ":" || (!sym && atoms[a].arom && atoms[b].arom) });
  const add = (at) => { at.i = atoms.length; atoms.push(at); if (prev >= 0) link(prev, at.i, pend); pend = null; prev = at.i; };
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "(") { if (prev < 0) return null; stack.push(prev); i++; }
    else if (c === ")") { if (!stack.length) return null; prev = stack.pop(); i++; }
    else if (c === ".") { prev = -1; pend = null; i++; }
    else if ("-=#:/\\".includes(c)) { pend = c === "/" || c === "\\" ? "-" : c; i++; }
    else if (/[0-9%]/.test(c)) {
      let num; if (c === "%") { num = s.slice(i + 1, i + 3); i += 3; } else { num = c; i++; }
      if (prev < 0) return null;
      if (rc.has(num)) { const o = rc.get(num); if (o.a === prev) return null; link(o.a, prev, pend || o.sym); rc.delete(num); } else rc.set(num, { a: prev, sym: pend });
      pend = null;
    } else if (c === "[") {
      const j = s.indexOf("]", i); if (j < 0) return null;
      const m = /^(\d+)?(Cl|Br|Na|Ca|Mg|Fe|Zn|Cu|Mn|Co|Li|Al|Si|Se|As|Sn|Hg|Ag|Au|Pt|Ni|Cr|Mo|Ba|Sr|Cs|Rb|Ti|Ga|Ge|Pb|Bi|Sb|Te|Be|Sc|Cd|Zr|se|as|[A-Z]|[a-z]|\*)(@{1,2})?(?:H(\d)?)?((?:\+\+|--|[+-]\d?)?)(?::\d+)?$/.exec(s.slice(i + 1, j));
      if (!m) return null;
      let el = m[2], arom = false;
      if (AROM[el]) { arom = true; el = AROM[el]; }
      if (el === "*") el = "R";
      const inner = s.slice(i + 1, j).replace(/^\d+/, "");
      const afterSym = inner.slice(m[2].length).replace(/^@+/, "");
      const hCount = afterSym.startsWith("H") ? (m[4] !== undefined ? +m[4] : 1) : 0;
      let q = 0; const cs = m[5] || "";
      if (cs) { const sign = cs[0] === "+" ? 1 : -1; q = /^(\+\+|--)$/.test(cs) ? 2 * sign : cs.length > 1 ? sign * +cs.slice(1) : sign; }
      add({ el, arom, q, h: hCount, br: true });
      i = j + 1;
    } else if (c === "{") {
      const j = s.indexOf("}", i); if (j < 0) return null;
      add({ el: "R", label: s.slice(i + 1, j).slice(0, 8) || "R", q: 0, h: 0, br: true, pseudo: true });
      i = j + 1;
    } else {
      let el = null, arom = false;
      if (s.startsWith("Cl", i) || s.startsWith("Br", i)) { el = s.slice(i, i + 2); i += 2; }
      else if ("BCNOPSFI".includes(c)) { el = c; i++; }
      else if ("cnops".includes(c)) { el = AROM[c]; arom = true; i++; }
      else if (c === "*") { el = "R"; i++; }
      else return null;
      add(el === "R" ? { el, label: "R", q: 0, h: 0, br: true, pseudo: true } : { el, arom, q: 0, h: null });
    }
  }
  if (!atoms.length || stack.length || rc.size) return null;
  const adj = atoms.map(() => []);
  bonds.forEach((b, k) => { adj[b.a].push({ j: b.b, k }); adj[b.b].push({ j: b.a, k }); });
  const m = { atoms, bonds, adj };
  if (!kekulize(m)) return null;
  // hydrogens and a valence sanity check
  for (const a of atoms) {
    const sum = adj[a.i].reduce((t, x) => t + bonds[x.k].order, 0);
    if (a.pseudo) { a.H = 0; continue; }
    if (a.h !== null) { a.H = a.h; if (!a.br) return null; continue; }
    const vl = valenceList(a);
    if (!vl) { a.H = 0; continue; }
    const v = vl.find((x) => x >= sum);
    if (v === undefined) return null; // too many bonds for this atom
    a.H = v - sum;
  }
  return m;
}

// aromatic rings written in lower case: choose which bonds are double (Kekule form)
function kekulize(m) {
  const { atoms, bonds, adj } = m;
  const need = new Set();
  for (const a of atoms) {
    if (!a.arom) continue;
    let subv = a.h || 0, nA = 0;
    for (const x of adj[a.i]) { const b = bonds[x.k]; if (b.arom) nA++; else subv += b.order; }
    const vl = valenceList(a) || [4];
    const v = vl.find((x) => x >= subv + nA) ?? vl[vl.length - 1];
    if (v - subv - nA >= 1) need.add(a.i);
  }
  const aromBonds = bonds.map((b, k) => (b.arom ? k : -1)).filter((k) => k >= 0);
  const covered = new Set(), pick = new Set();
  const order = [...need];
  const go = () => {
    const a = order.find((x) => !covered.has(x));
    if (a === undefined) return true;
    for (const x of adj[a]) {
      const b = bonds[x.k];
      if (!b.arom || covered.has(x.j) || !need.has(x.j)) continue;
      covered.add(a); covered.add(x.j); pick.add(x.k);
      if (go()) return true;
      covered.delete(a); covered.delete(x.j); pick.delete(x.k);
    }
    return false;
  };
  const ok = go();
  for (const k of aromBonds) bonds[k].order = ok && pick.has(k) ? 2 : 1;
  return true; // a failed Kekule search only means every ring bond is drawn single
}

// ---------- 2. rings ----------
function findRings(m) {
  const { atoms, bonds, adj } = m, n = atoms.length;
  // a bond is in a ring if its two atoms are still connected without it
  const cand = [];
  for (let k = 0; k < bonds.length; k++) {
    const { a, b } = bonds[k];
    const par = new Array(n).fill(-1); par[a] = a;
    const q = [a];
    for (let h = 0; h < q.length && par[b] < 0; h++) for (const x of adj[q[h]]) if (x.k !== k && par[x.j] < 0) { par[x.j] = q[h]; q.push(x.j); }
    if (par[b] < 0) continue;
    const path = []; for (let v = b; v !== a; v = par[v]) path.push(v); path.push(a);
    cand.push(path);
  }
  cand.sort((x, y) => x.length - y.length);
  const edgeOf = new Map(bonds.map((b, k) => [Math.min(b.a, b.b) + "-" + Math.max(b.a, b.b), k]));
  const vec = (cyc) => { const v = new Uint8Array(bonds.length); for (let i = 0; i < cyc.length; i++) { const p = cyc[i], q = cyc[(i + 1) % cyc.length]; v[edgeOf.get(Math.min(p, q) + "-" + Math.max(p, q))] ^= 1; } return v; };
  const basis = [], rings = [], seen = new Set();
  for (const cyc of cand) {
    const key = [...cyc].sort((x, y) => x - y).join(",");
    if (seen.has(key)) continue; seen.add(key);
    const v = vec(cyc);
    let r = v.slice();
    for (const [piv, bv] of basis) if (r[piv]) for (let t = 0; t < r.length; t++) r[t] ^= bv[t];
    const piv = r.findIndex((x) => x);
    if (piv < 0) continue;
    basis.push([piv, r]); rings.push(cyc);
  }
  return rings;
}

// ---------- 3. layout ----------
const TAU = Math.PI * 2, norm = (a) => ((a % TAU) + TAU) % TAU;
const dirv = (t) => ({ x: Math.cos(t), y: Math.sin(t) });

function layoutOnce(m, rings, variant) {
  const { atoms, bonds, adj } = m, n = atoms.length;
  const P = new Array(n).fill(null), turn = new Array(n).fill(0);
  const ringAtoms = new Set(rings.flat());
  const ringsOf = atoms.map((_, i) => rings.filter((r) => r.includes(i)));
  let fail = false;
  const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

  // components
  const comp = new Array(n).fill(-1); let nc = 0;
  for (let i = 0; i < n; i++) if (comp[i] < 0) { const st = [i]; comp[i] = nc; while (st.length) { const u = st.pop(); for (const x of adj[u]) if (comp[x.j] < 0) { comp[x.j] = nc; st.push(x.j); } } nc++; }

  const ringCenter = (r) => { const pts = r.filter((i) => P[i]); return { x: pts.reduce((t, i) => t + P[i].x, 0) / pts.length, y: pts.reduce((t, i) => t + P[i].y, 0) / pts.length }; };
  const placePolygon = (r, C, startIdx, startAngle, dir) => {
    const nn = r.length, R = 1 / (2 * Math.sin(Math.PI / nn));
    for (let t = 0; t < nn; t++) { const idx = (startIdx + t) % nn, ang = startAngle + dir * (TAU / nn) * t; if (!P[r[idx]]) P[r[idx]] = { x: C.x + R * Math.cos(ang), y: C.y + R * Math.sin(ang) }; }
  };
  const fuseRings = () => {
    let again = true;
    while (again) {
      again = false;
      for (const r of rings) {
        const nn = r.length, placed = r.map((i) => !!P[i]);
        if (placed.every(Boolean) || !placed.some(Boolean)) continue;
        const R = 1 / (2 * Math.sin(Math.PI / nn)), ap = R * Math.cos(Math.PI / nn);
        // a bond of this ring that is already placed: grow the polygon on the far side of it
        let at = -1; for (let t = 0; t < nn; t++) if (placed[t] && placed[(t + 1) % nn]) { at = t; break; }
        if (at >= 0) {
          const u = P[r[at]], v = P[r[(at + 1) % nn]], mid = { x: (u.x + v.x) / 2, y: (u.y + v.y) / 2 };
          const ex = v.x - u.x, ey = v.y - u.y, el = Math.hypot(ex, ey) || 1, nx = -ey / el, ny = ex / el;
          // the placed neighbour ring that holds this bond tells which side to avoid
          const nb = rings.find((o) => o !== r && o.includes(r[at]) && o.includes(r[(at + 1) % nn]) && o.every((i) => P[i]));
          const oc = nb ? ringCenter(nb) : ringCenter(r);
          const side = (oc.x - mid.x) * nx + (oc.y - mid.y) * ny > 0 ? -1 : 1;
          const C = { x: mid.x + side * nx * ap, y: mid.y + side * ny * ap };
          const a0 = Math.atan2(u.y - C.y, u.x - C.x), a1 = Math.atan2(v.y - C.y, v.x - C.x);
          let d = a1 - a0; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
          placePolygon(r, C, at, a0, d > 0 ? 1 : -1);
        } else {
          const t0 = placed.indexOf(true), p = P[r[t0]];
          if (placed.filter(Boolean).length > 1) { fail = true; for (let t = 0; t < nn; t++) if (!P[r[t]]) P[r[t]] = { x: p.x + t * 0.3, y: p.y + 0.7 }; continue; }
          // a ring that shares a single atom (spiro) or hangs on a placed atom: point it away from that atom's other bonds
          const others = adj[r[t0]].filter((x) => P[x.j]).map((x) => Math.atan2(P[x.j].y - p.y, P[x.j].x - p.x));
          let out = others.length ? Math.atan2(-others.reduce((t, a) => t + Math.sin(a), 0), -others.reduce((t, a) => t + Math.cos(a), 0)) : 0;
          if (!others.length) out = 0;
          const C = { x: p.x + R * Math.cos(out), y: p.y + R * Math.sin(out) };
          placePolygon(r, C, t0, out + Math.PI, 1);
        }
        again = true;
      }
    }
  };
  const subtree = (c, from, seen) => { let cnt = 0; const st = [c]; seen.add(c); while (st.length) { const u = st.pop(); cnt++; for (const x of adj[u]) if (!P[x.j] && x.j !== from && !seen.has(x.j)) { seen.add(x.j); st.push(x.j); } } return cnt; };
  const isLinear = (a) => { const o = adj[a].map((x) => bonds[x.k].order); return o.length === 2 && (o[0] + o[1] >= 4) && !ringAtoms.has(a); };
  const clearance = (from, d) => { let mn = 9; for (const s of [1, 2, 3]) { const p = { x: from.x + d.x * s, y: from.y + d.y * s }; for (let i = 0; i < n; i++) if (P[i] && P[i] !== from) mn = Math.min(mn, dist(p, P[i]) / (s === 1 ? 1 : 1)); } return mn; };

  const queue = [];
  const expand = (a) => {
    if (!P[a]) return;
    const U = adj[a].map((x) => x.j).filter((j) => !P[j]);
    if (!U.length) return;
    let angs = adj[a].map((x) => x.j).filter((j) => P[j]).map((j) => norm(Math.atan2(P[j].y - P[a].y, P[j].x - P[a].x)));
    const virtual = !angs.length;
    if (virtual) angs = [norm((Math.PI * 7) / 6 + (variant & 1 ? Math.PI / 3 : 0))];
    angs.sort((x, y) => x - y);
    let g = TAU, gs = angs[0];
    if (angs.length > 1) { g = 0; for (let t = 0; t < angs.length; t++) { const gap = norm(angs[(t + 1) % angs.length] - angs[t]); if (gap > g) { g = gap; gs = angs[t]; } } }
    const k = U.length, step = isLinear(a) ? Math.PI : Math.min(g / (k + 1), TAU / 3);
    const fwd = Array.from({ length: k }, (_, t) => gs + step * (t + 1)), bwd = Array.from({ length: k }, (_, t) => gs + g - step * (t + 1));
    const prevAtom = adj[a].map((x) => x.j).find((j) => P[j]);
    const prevTurn = prevAtom !== undefined ? turn[prevAtom] : 0;
    const score = (set) => Math.min(...set.map((t) => clearance(P[a], dirv(t))));
    let sf = score(fwd), sb = score(bwd);
    // zig-zag: a chain bends left, then right, then left
    const want = variant & 2 ? prevTurn : -prevTurn;
    const turnOf = (set) => (k === 1 && prevAtom !== undefined ? Math.sign(Math.sin(set[0] - (angs[0] + Math.PI))) : 0);
    if (!ringAtoms.has(a) && k === 1 && want) { if (turnOf(fwd) === want) sf += 0.35; if (turnOf(bwd) === want) sb += 0.35; }
    if (variant >= 4) { const r = Math.sin((a + 1) * 12.9898 + variant * 78.233) * 43758.5453; sf += ((r - Math.floor(r)) - 0.5) * 1.6; }
    let dirs = sf >= sb ? fwd : bwd;
    // the biggest branch takes the most open direction
    const seen = new Set(); const kids = U.map((c) => ({ c, size: subtree(c, a, seen) })).sort((x, y) => y.size - x.size);
    const open = dirs.map((t) => ({ t, s: clearance(P[a], dirv(t)) })).sort((x, y) => y.s - x.s);
    kids.forEach((kd, t) => {
      const ang = open[t].t, d = dirv(ang), c = kd.c;
      if (P[c]) return;
      const pos = { x: P[a].x + d.x, y: P[a].y + d.y };
      if (ringsOf[c].length && !ringsOf[a].some((r) => r.includes(c))) {
        const r = ringsOf[c].find((rr) => rr.some((i) => !P[i])) || ringsOf[c][0], nn = r.length, R = 1 / (2 * Math.sin(Math.PI / nn));
        P[c] = pos; const C = { x: pos.x + d.x * R, y: pos.y + d.y * R };
        placePolygon(r, C, r.indexOf(c), ang + Math.PI, 1);
        fuseRings(); r.forEach((i) => queue.push(i));
      } else { P[c] = pos; queue.push(c); }
      turn[c] = k === 1 ? Math.sign(Math.sin(ang - (angs[0] + Math.PI))) || 1 : 0;
    });
  };

  const xs = []; let ox = 0;
  for (let ci = 0; ci < nc; ci++) {
    const idx = []; for (let i = 0; i < n; i++) if (comp[i] === ci) idx.push(i);
    const cr = rings.filter((r) => comp[r[0]] === ci);
    if (cr.length) {
      const r0 = cr.reduce((b, r) => (r.length > b.length ? r : b), cr[0]), R = 1 / (2 * Math.sin(Math.PI / r0.length));
      placePolygon(r0, { x: 0, y: 0 }, 0, Math.PI / 2 + (variant & 1 ? Math.PI / r0.length : 0), 1);
      fuseRings();
      r0.forEach((i) => queue.push(i)); void R;
      for (const r of cr) r.forEach((i) => { if (P[i] && !queue.includes(i)) queue.push(i); });
    } else {
      // chains start at one end of the longest path
      const far = (s) => { const d = new Map([[s, 0]]), q = [s]; for (let h = 0; h < q.length; h++) for (const x of adj[q[h]]) if (!d.has(x.j)) { d.set(x.j, d.get(q[h]) + 1); q.push(x.j); } return q[q.length - 1]; };
      const st = far(far(idx[0]));
      P[st] = { x: 0, y: 0 }; queue.push(st);
    }
    for (let h = 0; h < queue.length; h++) {
      expand(queue[h]);
      // rings placed during expansion can still have unplaced neighbours
      if (h === queue.length - 1) for (const i of idx) if (P[i] && !queue.includes(i)) queue.push(i);
    }
    // anything left over (should not happen) goes beside the rest
    for (const i of idx) if (!P[i]) { fail = true; P[i] = { x: 0.3 * i, y: 1.2 }; }
    const mn = Math.min(...idx.map((i) => P[i].x));
    idx.forEach((i) => { P[i].x += ox - mn; });
    ox = Math.max(...idx.map((i) => P[i].x)) + 1.6;
    xs.push(idx); queue.length = 0;
  }
  // overlaps: two atoms closer than half a bond
  let bad = fail ? 5 : 0; const pairs = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const lim = atoms[i].el !== "C" || atoms[j].el !== "C" ? 0.6 : 0.45; if (dist(P[i], P[j]) < lim) { bad++; pairs.push([i, j]); } }
  return { P, bad, pairs };
}

function layoutMol(m) {
  const rings = findRings(m);
  m.rings = rings;
  let best = null;
  for (let v = 0; v < 40; v++) { const r = layoutOnce(m, rings, v); if (!best || r.bad < best.bad) best = r; if (!r.bad) break; }
  // rotate so the longest direction is horizontal (in steps of 30 degrees so bonds stay tidy)
  const P = best.P, N = P.length; let cx = 0, cy = 0; P.forEach((p) => { cx += p.x; cy += p.y; }); cx /= N; cy /= N;
  let sxx = 0, syy = 0, sxy = 0; P.forEach((p) => { sxx += (p.x - cx) ** 2; syy += (p.y - cy) ** 2; sxy += (p.x - cx) * (p.y - cy); });
  let rot = 0;
  if (N > 2 && Math.abs(sxx - syy) + Math.abs(sxy) > 1e-3) rot = -Math.round(((0.5 * Math.atan2(2 * sxy, sxx - syy)) / (Math.PI / 6))) * (Math.PI / 6);
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const Q = P.map((p) => ({ x: (p.x - cx) * cs - (p.y - cy) * sn, y: -((p.x - cx) * sn + (p.y - cy) * cs) })); // y is flipped: screen coordinates
  return { pos: Q, bad: best.bad, pairs: best.pairs };
}

// ---------- 4. shapes ----------
const COLOR = { O: "#c62828", N: "#1d4ed8", S: "#a16207", P: "#c2410c", F: "#15803d", Cl: "#15803d", Br: "#15803d", I: "#15803d", Se: "#a16207" };
const INK = "#1b2733";
const glyphW = (t, fs) => { let w = 0; for (const ch of String(t)) w += SUB.includes(ch) || "⁺⁻⁰¹²³⁴⁵⁶⁷⁸⁹".includes(ch) ? 0.5 * fs : /[A-Z]/.test(ch) ? 0.68 * fs : /[a-z]/.test(ch) ? 0.56 * fs : 0.6 * fs; return w; };

export function molShapes(m, opt = {}) {
  const L = opt.L || 30, fs = opt.fs || 13, { atoms, bonds, adj } = m;
  const lay = layoutMol(m), pos = lay.pos.map((p) => ({ x: p.x * L, y: p.y * L }));
  const lines = [], texts = [];
  // which atoms get a letter
  const label = atoms.map((a) => {
    const deg = adj[a.i].length;
    if (a.pseudo) return { main: a.label, pre: "", suf: "", q: 0, bold: true, fill: INK };
    if (a.el === "C" && a.q === 0 && deg > 0) return null;
    const H = a.H || 0, hT = H ? "H" + (H > 1 ? sub(H) : "") : "";
    let pre = "", suf = "";
    if (hT) {
      if (!deg) { if ("OSFClBrI".includes(a.el)) pre = hT; else suf = hT; }
      else {
        let sx = 0; for (const x of adj[a.i]) sx += Math.sign(pos[x.j].x - pos[a.i].x) * (Math.abs(pos[x.j].x - pos[a.i].x) > 0.3 * L ? 1 : 0.2);
        if (sx > 0.3) pre = hT; else suf = hT;
      }
    }
    return { main: a.el, pre, suf, q: a.q, fill: COLOR[a.el] || INK };
  });
  const box = atoms.map((a, i) => (label[i] ? { hw: glyphW(label[i].main, fs) / 2 + 2.5, hh: fs * 0.5 + 2 } : null));
  // trim a bond where it meets a letter
  const trim = (i, dx, dy) => { const b = box[i]; if (!b) return 0; const ax = Math.abs(dx), ay = Math.abs(dy); return Math.min(ax > 1e-6 ? b.hw / ax : 1e9, ay > 1e-6 ? b.hh / ay : 1e9); };
  const ringOfBond = (b) => m.rings.find((r) => r.includes(b.a) && r.includes(b.b) && r.length >= 3);
  bonds.forEach((b) => {
    const A = pos[b.a], B = pos[b.b], dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const ta = trim(b.a, ux, uy), tb = trim(b.b, -ux, -uy);
    const seg = (o, s0, s1) => lines.push({ x1: A.x + nx * o + ux * s0, y1: A.y + ny * o + uy * s0, x2: B.x + nx * o - ux * s1, y2: B.y + ny * o - uy * s1 });
    if (b.order === 1) seg(0, ta, tb);
    else if (b.order === 3) { const o = 0.13 * L; seg(0, ta, tb); seg(o, ta, tb); seg(-o, ta, tb); }
    else {
      const rg = ringOfBond(b), o = 0.2 * L;
      const sideOf = (r) => { const c = { x: 0, y: 0 }; r.forEach((i) => { c.x += pos[i].x / r.length; c.y += pos[i].y / r.length; }); return Math.sign((c.x - A.x) * nx + (c.y - A.y) * ny) || 1; };
      let s = 0;
      if (rg) s = sideOf(rg);
      else {
        // chain double bond: put the second line on the side where the neighbours are; terminal atom or a straight bond: two equal lines
        let t = 0; for (const e of [b.a, b.b]) for (const x of adj[e]) if (x.j !== b.a && x.j !== b.b) t += Math.sign((pos[x.j].x - A.x) * nx + (pos[x.j].y - A.y) * ny);
        const term = adj[b.a].length === 1 || adj[b.b].length === 1;
        s = term || t === 0 ? 0 : Math.sign(t);
      }
      if (s === 0) { seg(o / 2, ta, tb); seg(-o / 2, ta, tb); }
      else { seg(0, ta, tb); const sh = rg ? 0.16 * L : 0.1 * L; lines.push({ x1: A.x + nx * o * s + ux * Math.max(ta, sh), y1: A.y + ny * o * s + uy * Math.max(ta, sh), x2: B.x + nx * o * s - ux * Math.max(tb, sh), y2: B.y + ny * o * s - uy * Math.max(tb, sh) }); }
    }
  });
  atoms.forEach((a, i) => {
    const lb = label[i]; if (!lb) return; const p = pos[i], hw = glyphW(lb.main, fs) / 2;
    texts.push({ x: p.x, y: p.y + fs * 0.35, t: lb.main, anchor: "middle", size: fs, fill: lb.fill, bold: !!lb.bold });
    if (lb.pre) texts.push({ x: p.x - hw, y: p.y + fs * 0.35, t: lb.pre, anchor: "end", size: fs, fill: lb.fill });
    let cx = p.x + hw;
    if (lb.suf) { texts.push({ x: cx, y: p.y + fs * 0.35, t: lb.suf, anchor: "start", size: fs, fill: lb.fill }); cx += glyphW(lb.suf, fs); }
    if (lb.q) { const ch = Math.abs(lb.q) > 1 ? String(Math.abs(lb.q)) : "", t = ch + (lb.q > 0 ? "+" : "−"); texts.push({ x: cx + 0.5, y: p.y - fs * 0.25, t, anchor: "start", size: fs * 0.72, fill: lb.fill }); }
  });
  // bounds
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const grow = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  lines.forEach((l) => { grow(l.x1, l.y1); grow(l.x2, l.y2); });
  texts.forEach((t) => { const w = glyphW(t.t, t.size), l = t.anchor === "end" ? t.x - w : t.anchor === "middle" ? t.x - w / 2 : t.x; grow(l, t.y - t.size * 0.8); grow(l + w, t.y + t.size * 0.3); });
  const M = 10; if (x0 > x1) { x0 = y0 = 0; x1 = y1 = 20; }
  const dx = M - x0, dy = M - y0;
  lines.forEach((l) => { l.x1 += dx; l.x2 += dx; l.y1 += dy; l.y2 += dy; });
  texts.forEach((t) => { t.x += dx; t.y += dy; });
  return { w: Math.ceil(x1 - x0 + 2 * M), h: Math.ceil(y1 - y0 + 2 * M), lines, texts, bad: lay.bad, pairs: lay.pairs };
}

const X = (v) => Math.round(v * 10) / 10;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function shapesSvg(sh, o = {}) {
  const bg = o.bg === false ? "" : `<rect width="${sh.w}" height="${sh.h}" rx="8" fill="#ffffff"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sh.w} ${sh.h}" width="${sh.w}" height="${sh.h}" font-family="'DejaVu Sans','Segoe UI',Arial,sans-serif">${bg}<g stroke="${INK}" stroke-width="1.6" stroke-linecap="round" fill="none">` +
    sh.lines.map((l) => `<line x1="${X(l.x1)}" y1="${X(l.y1)}" x2="${X(l.x2)}" y2="${X(l.y2)}"/>`).join("") + "</g>" +
    sh.texts.map((t) => `<text x="${X(t.x)}" y="${X(t.y)}" font-size="${X(t.size)}" text-anchor="${t.anchor}" fill="${t.fill}"${t.bold ? ' font-weight="700"' : ""}>${esc(t.t)}</text>`).join("") + "</svg>";
}

// ---------- 5. formula (used to check a SMILES against the formula that came with it) ----------
export function molFormula(m) {
  const c = {}; let H = 0, q = 0;
  for (const a of m.atoms) { if (a.pseudo) { c["{" + a.label + "}"] = (c["{" + a.label + "}"] || 0) + 1; continue; } c[a.el] = (c[a.el] || 0) + 1; H += a.H || 0; q += a.q || 0; }
  if (H) c.H = H;
  const keys = Object.keys(c).sort((x, y) => (x === "C" ? -1 : y === "C" ? 1 : x === "H" ? -1 : y === "H" ? 1 : x.localeCompare(y)));
  return keys.map((k) => k + (c[k] > 1 ? c[k] : "")).join("") + (q ? (q > 0 ? "+" : "-") + (Math.abs(q) > 1 ? Math.abs(q) : "") : "");
}
// the atoms of a written formula such as "C₆H₁₂O₆" without hydrogen and charge (null when it cannot be read)
export function heavyCounts(f) {
  let s = String(f || "").replace(/[₀-₉]/g, (d) => String(d.charCodeAt(0) - 0x2080)).replace(/[⁺⁻⁰¹²³⁴⁵⁶⁷⁸⁹]/g, "").replace(/[+\-−]\d*$/, "").trim();
  if (!s || /[()·.\[\]]/.test(s) || !/^([A-Z][a-z]?\d*)+$/.test(s)) return null;
  const c = {}; for (const [, el, n] of s.matchAll(/([A-Z][a-z]?)(\d*)/g)) if (el !== "H") c[el] = (c[el] || 0) + (n ? +n : 1);
  return c;
}
const sameCounts = (a, b) => { const k = new Set([...Object.keys(a), ...Object.keys(b)]); for (const e of k) if ((a[e] || 0) !== (b[e] || 0)) return false; return true; };
export const molHeavy = (m) => { const c = {}; for (const a of m.atoms) if (!a.pseudo && a.el !== "H") c[a.el] = (c[a.el] || 0) + 1; return c; };

// ---------- 6. the one function the rest of the app calls ----------
const cache = new Map();
// shapes for a SMILES, or null when it cannot be read or would draw badly
export function drawSmiles(smiles, opt = {}) {
  const key = String(smiles) + "|" + (opt.L || 30);
  if (cache.has(key)) return cache.get(key);
  let out = null;
  try { const m = parseSmiles(smiles); if (m) { const sh = molShapes(m, opt); if (!sh.bad && sh.w < 900 && sh.h < 700) out = sh; } } catch { out = null; }
  if (cache.size > 800) cache.clear();
  cache.set(key, out);
  return out;
}
// a SMILES offered by the AI is accepted only if it reads, draws cleanly and has the same heavy atoms as the formula given with it
export function checkSmiles(smiles, formula) {
  const s = String(smiles || "").trim(); if (!s) return "";
  try {
    const m = parseSmiles(s); if (!m) return "";
    const want = heavyCounts(formula); if (want && !m.atoms.some((a) => a.pseudo) && !sameCounts(want, molHeavy(m))) return "";
    return drawSmiles(s) ? s : "";
  } catch { return ""; }
}
