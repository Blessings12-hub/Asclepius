// Layout for pathway and cycle diagrams. Pure geometry (no drawing), so the same numbers can be drawn as SVG on screen
// and as vector shapes in the PDF. A copy of layoutDiagram() lives in public/index.html: keep the two in step.
// d = { title, type: "chain" | "cycle", nodes: [text], steps: [{ label, in, out }] }  (steps[i] joins nodes[i] to nodes[i+1]; a cycle also joins the last to the first)
// the small molecules that go in and come out at one step, written the way a textbook does: "ATP → ADP", "+ H₂O", "→ CO₂"
const io = (s, m = 16) => { const a = String(s?.in || "").slice(0, m), b = String(s?.out || "").slice(0, m); return a && b ? `${a} → ${b}` : a ? `+ ${a}` : b ? `→ ${b}` : ""; };
export const MOL_W = 124, MOL_H = 78; // room for a structure symbol above the name of a step
export function layoutDiagram(d) {
  const n = d.nodes.length, cw = 6.4, cut = (s, m) => String(s || "").slice(0, m);
  const has = d.nodes.map((_, i) => !!(d.mols && d.mols[i])), anyMol = has.some(Boolean);
  const mol = (i) => (has[i] ? d.mols[i] : "");
  const tw = (s) => Math.ceil(String(s).length * cw);
  const boxes = [], arrows = [], labels = [];
  if (d.type === "cycle") {
    const bw = d.nodes.map((t, i) => Math.max(has[i] ? MOL_W + 12 : 0, Math.min(190, tw(cut(t, 30)) + 16))), bhs = d.nodes.map((_, i) => (has[i] ? 24 + MOL_H + 6 : 24)), bh = 24;
    const R = Math.max(120, n * 15 + 30, anyMol ? n * 27 + 70 : 0), cx = R + 150, cy = R + 55, W = cx * 2, H = cy * 2;
    const pos = d.nodes.map((_, i) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / n; return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), a }; });
    d.nodes.forEach((t, i) => boxes.push({ x: pos[i].x - bw[i] / 2, y: pos[i].y - bhs[i] / 2, w: bw[i], h: bhs[i], t: cut(t, 30), mol: mol(i), ty: has[i] ? pos[i].y + bhs[i] / 2 - 8 : pos[i].y + 4 }));
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, a = pos[i], b = pos[j], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      // start and end the arrow on the edge of each box
      const edge = (p, w, s, hgt) => { const tx = (w / 2 + 3) / Math.max(1e-6, Math.abs(ux)), ty = (hgt / 2 + 3) / Math.max(1e-6, Math.abs(uy)); const k = Math.min(tx, ty); return { x: p.x + s * ux * k, y: p.y + s * uy * k }; };
      const p1 = edge(a, bw[i], 1, bhs[i]), p2 = edge(b, bw[j], -1, bhs[j]);
      if (Math.hypot(p2.x - p1.x, p2.y - p1.y) > 6) arrows.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
      const s = d.steps[i]; if (!s) continue;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, ox = mx - cx, oy = my - cy, ol = Math.hypot(ox, oy) || 1;
      const lx = mx + (ox / ol) * 34, ly = my + (oy / ol) * 22, side = ox > 8 ? "start" : ox < -8 ? "end" : "middle";
      if (s.label) labels.push({ x: lx, y: ly, t: cut(s.label, 24), anchor: side, bold: true });
      const sub = io(s);
      if (sub) labels.push({ x: lx, y: ly + 12, t: sub, anchor: side, small: true });
    }
    return { w: W, h: H, boxes, arrows, labels };
  }
  // chain: one column, arrows pointing down, the enzyme on the right of each arrow, what is used on the left
  const bw = Math.min(230, Math.max(anyMol ? MOL_W + 16 : 0, ...d.nodes.map((t) => tw(cut(t, 36)) + 18)), 230), bh = 26, gap = 40, cx = 250, W = cx * 2;
  const hs = d.nodes.map((_, i) => (has[i] ? bh + MOL_H + 6 : bh)); let y = 10;
  d.nodes.forEach((t, i) => {
    boxes.push({ x: cx - bw / 2, y, w: bw, h: hs[i], t: cut(t, 36), mol: mol(i), ty: has[i] ? y + hs[i] - 9 : y + hs[i] / 2 + 4 });
    if (i < n - 1) {
      arrows.push({ x1: cx, y1: y + hs[i] + 2, x2: cx, y2: y + hs[i] + gap - 2 });
      const s = d.steps[i];
      if (s) {
        const my = y + hs[i] + gap / 2 + 4;
        if (s.label) labels.push({ x: cx + 10, y: my, t: cut(s.label, 34), anchor: "start", bold: true });
        const sub = io(s, 14);
        if (sub) labels.push({ x: cx - 10, y: my, t: sub, anchor: "end", small: true });
      }
    }
    y += hs[i] + gap;
  });
  return { w: W, h: y - gap + 10, boxes, arrows, labels };
}
