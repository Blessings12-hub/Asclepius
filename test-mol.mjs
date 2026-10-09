// Self-check for the structure library: every SMILES must read, match its formula and draw without overlaps.
// Run:  node test-mol.mjs
import { compoundList, lookupSmiles, isPill } from "./lib/compounds.js";
import { parseSmiles, molFormula, drawSmiles, checkSmiles } from "./lib/mol.js";
let bad = 0;
const norm = (f) => f.replace(/\{[^}]*\}/g, (g) => g).split(/(?=[A-Z{])/).filter(Boolean).sort().join("");
for (const c of compoundList) {
  const m = parseSmiles(c.smiles);
  if (!m) { console.log("PARSE FAIL", c.name, c.smiles); bad++; continue; }
  const f = molFormula(m);
  if (c.formula && norm(f.replace(/[+-]\d*$/, "")) !== norm(c.formula.replace(/[+-]\d*$/, ""))) { console.log("FORMULA", c.name, "got", f, "expected", c.formula); bad++; }
  if (c.formula && (f.match(/[+-]\d*$/)?.[0] || "") !== (c.formula.match(/[+-]\d*$/)?.[0] || "")) { console.log("CHARGE", c.name, "got", f, "expected", c.formula); bad++; }
  if (!drawSmiles(c.smiles)) { console.log("DRAW FAIL (overlap)", c.name); bad++; }
}
for (const [n, f, want] of [["Glucose", "", true], ["D-Glucose", "", true], ["pyruvic acid", "", true], ["Pyruvate", "C₃H₃O₃⁻", true], ["something unknown", "", false], ["", "H₂O", true], ["ATP", "", true]]) {
  const s = lookupSmiles(n, f); if (!!s !== want) { console.log("LOOKUP", n, f, s); bad++; }
}
if (checkSmiles("CCO", "C₂H₆O") !== "CCO" || checkSmiles("CCO", "C₃H₈O") !== "" || checkSmiles("C(C", "") !== "") { console.log("CHECK failed"); bad++; }
console.log(`${compoundList.length} compounds checked, ${bad} problems`);
process.exit(bad ? 1 : 0);
