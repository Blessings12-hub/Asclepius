// Puts structure symbols on the parts of a guide: reaction compounds, pathway steps and the "Structures" gallery.
// A compound is drawn when the library knows it by name or formula, or when the AI's SMILES reads, draws cleanly and has the same atoms as its formula.
import { lookupSmiles, isPill } from "./compounds.js";
import { drawSmiles, checkSmiles, shapesSvg } from "./mol.js";

export const termSmiles = (t) => {
  if (!t || !t.name || isPill(t.name)) return "";
  return lookupSmiles(t.name, t.formula) || checkSmiles(t.smiles, t.formula) || "";
};
export const structSmiles = (t) => (t && t.name ? lookupSmiles(t.name, t.formula) || checkSmiles(t.smiles, t.formula) || "" : "");

// fills in .smiles on every reaction term, diagram node and structure of a section (empty = drawn as a name box)
export function resolveSection(sec) {
  for (const e of sec.equations || []) for (const t of [...(e.reactants || []), ...(e.products || [])]) t.smiles = termSmiles(t);
  if (sec.diagram) sec.diagram.mols = sec.diagram.nodes.map((n, i) => termSmiles({ name: n, smiles: sec.diagram.mols?.[i] || "" }));
  if (sec.diagram && !sec.diagram.mols.some(Boolean)) sec.diagram.mols = [];
  if (Array.isArray(sec.structures)) sec.structures = sec.structures.map((t) => ({ ...t, smiles: structSmiles(t) })).filter((t) => t.smiles);
  return sec;
}
// SVG text for the /api/mol.svg picture, or "" when nothing can be drawn
export function molSvg({ s, n, f }) {
  const smi = (n ? lookupSmiles(n, f) : "") || checkSmiles(s, f) || "";
  const sh = smi && drawSmiles(smi);
  return sh ? shapesSvg(sh) : "";
}
