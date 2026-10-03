// Backups: full snapshots of everything except the uploaded files themselves
// (files already live in Storage on Vercel, or in data/uploads locally).
import { kv, docs, backups } from "./store.js";

export const KV_KEYS = ["courses", "plan", "results", "sessions", "days", "settings", "refs"];
export const DOC_COLLS = ["materials", "cards"];
const KEEP = { auto: 7, manual: 10, "pre-restore": 5 }; // how many of each kind to keep
const stamp = (d = new Date()) => d.toISOString().replace(/[-:]/g, "").slice(0, 15); // 20261002T020000
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export async function snapshot() {
  const snap = { app: "asclepius", version: 1, at: new Date().toISOString(), kv: {}, docs: {} };
  for (const k of KV_KEYS) snap.kv[k] = await kv.get(k, null);
  for (const c of DOC_COLLS) snap.docs[c] = await docs.list(c);
  return snap;
}
const counts = (s) => ({
  courses: s.kv.courses?.length || 0,
  materials: s.docs.materials?.length || 0,
  cards: s.docs.cards?.length || 0,
  results: s.kv.results?.length || 0,
  sessions: s.kv.sessions?.length || 0,
});

export async function listBackups() {
  return (await backups.list()).sort((a, b) => (a.id < b.id ? 1 : -1));
}

export async function makeBackup(kind = "manual") {
  const snap = await snapshot();
  const id = `${stamp()}-${kind}`;
  const meta = { id, kind, at: snap.at, counts: counts(snap) };
  await backups.put(id, { meta, snap });
  // keep the newest few of each kind
  const all = await listBackups();
  for (const k of Object.keys(KEEP))
    for (const b of all.filter((x) => x.kind === k).slice(KEEP[k])) await backups.del(b.id);
  return meta;
}

// Take a backup if the newest one is older than ~20 hours. Cheap to call often.
export async function backupIfStale(kind = "auto") {
  const all = await listBackups();
  const newest = all[0] && Date.parse(all[0].at);
  if (newest && Date.now() - newest < 20 * 3600e3) return null;
  return makeBackup(kind);
}

export function validate(s) {
  const ok = s && s.app === "asclepius" && s.version === 1 && s.kv && typeof s.kv === "object" && s.docs && typeof s.docs === "object";
  if (!ok) throw new Error("That does not look like an Asclepius backup file.");
  for (const k of Object.keys(s.kv)) if (!KV_KEYS.includes(k)) delete s.kv[k];
  for (const k of KV_KEYS) if (s.kv[k] != null && typeof s.kv[k] !== "object") throw new Error("Backup file is damaged.");
  for (const c of DOC_COLLS) {
    const a = s.docs[c] ?? [];
    if (!Array.isArray(a) || a.some((o) => !o || typeof o !== "object" || !SAFE_ID.test(String(o.id)))) throw new Error("Backup file is damaged.");
    s.docs[c] = a;
  }
  return s;
}

// Replace everything with the snapshot. A safety backup is taken first, so a restore can itself be undone.
export async function restore(s) {
  validate(s);
  await makeBackup("pre-restore");
  for (const k of KV_KEYS) if (s.kv[k] != null) await kv.set(k, s.kv[k]);
  for (const c of DOC_COLLS) {
    await docs.clear(c);
    if (s.docs[c].length) await docs.putMany(c, s.docs[c]);
  }
  return counts(s);
}
