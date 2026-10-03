// Storage layer with two backends behind one interface.
//   local: one JSON file (data/db.json) + data/uploads. For running on your own computer.
//   cloud: Supabase (one table + one private Storage bucket). Required on Vercel, whose disk is read-only.
// The cloud backend only uses plain fetch, so there are no extra dependencies to install.
import fs from "fs";
import path from "path";

const env = process.env;
const BASE = (env.SUPABASE_URL || "").replace(/\/+$/, "");
const KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "";
export const BUCKET = env.SUPABASE_BUCKET || "asclepius";
export const cloud = !!(BASE && KEY);
export const onVercel = !!env.VERCEL;
export const ready = cloud || !onVercel; // Vercel's disk is read-only, so local mode cannot work there
export const mode = cloud ? "cloud" : "local";
export const UPLOAD_DIR = "data/uploads";

// Numeric index column, so "which cards are due" is one query instead of loading every card.
const NUM = { cards: (o) => o.due };
const pick = (o, fields) => ({ id: o.id, courseId: o.courseId, ...Object.fromEntries(fields.map((f) => [f, o[f]])) });

// =====================================================================================
// LOCAL
// =====================================================================================
const DB = "data/db.json";
let db = null;
const load = () => {
  if (db) return db;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync("data/backups", { recursive: true });
  db = fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB, "utf8")) : {};
  return db;
};
const flush = () => {
  fs.writeFileSync(DB + ".tmp", JSON.stringify(db));
  fs.renameSync(DB + ".tmp", DB);
};

const local = {
  async kvGet(k, d) {
    const v = load()[k];
    return v === undefined ? d : structuredClone(v);
  },
  async kvSet(k, v) { load()[k] = structuredClone(v); flush(); },
  async list(coll, o = {}) {
    let a = load()[coll] || [];
    if (o.courseId) a = a.filter((x) => x.courseId === o.courseId);
    const num = NUM[coll];
    if (o.numLte !== undefined && num) a = a.filter((x) => num(x) <= o.numLte);
    if (o.sortNum && num) a = [...a].sort((x, y) => num(x) - num(y));
    if (o.limit) a = a.slice(0, o.limit);
    return o.project ? a.map((x) => pick(x, o.project)) : structuredClone(a);
  },
  async get(coll, id) {
    const x = (load()[coll] || []).find((r) => r.id === id);
    return x ? structuredClone(x) : null;
  },
  async putMany(coll, objs) {
    const a = (load()[coll] ||= []);
    for (const o of objs) {
      const i = a.findIndex((r) => r.id === o.id);
      if (i >= 0) a[i] = structuredClone(o); else a.push(structuredClone(o));
    }
    flush();
  },
  async del(coll, id) { const d = load(); d[coll] = (d[coll] || []).filter((r) => r.id !== id); flush(); },
  async clear(coll) { load()[coll] = []; flush(); },
  backups: {
    async list() {
      load();
      return fs.readdirSync("data/backups").filter((f) => f.endsWith(".meta")).map((f) => {
        const meta = JSON.parse(fs.readFileSync("data/backups/" + f, "utf8"));
        const snap = "data/backups/" + meta.id + ".json";
        return { ...meta, bytes: fs.existsSync(snap) ? fs.statSync(snap).size : 0 };
      });
    },
    async put(id, { meta, snap }) {
      load();
      fs.writeFileSync(`data/backups/${id}.json`, JSON.stringify(snap));
      fs.writeFileSync(`data/backups/${id}.meta`, JSON.stringify(meta));
    },
    async get(id) {
      const f = `data/backups/${id}.json`;
      return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null;
    },
    async del(id) {
      fs.rmSync(`data/backups/${id}.json`, { force: true });
      fs.rmSync(`data/backups/${id}.meta`, { force: true });
    },
  },
  files: {
    async signUpload() { return null; }, // local mode uploads through the server
    async put(key, buf) { load(); fs.writeFileSync(path.join(UPLOAD_DIR, key), buf); },
    async read(key) { return fs.readFileSync(path.join(UPLOAD_DIR, key)); },
    async url() { return null; },
    async del(key) { fs.rmSync(path.join(UPLOAD_DIR, key), { force: true }); },
  },
};

// =====================================================================================
// CLOUD (Supabase)
// =====================================================================================
const PAGE = 1000;
const enc = encodeURIComponent;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// The key goes in BOTH headers with the identical value. That is what the official client does and
// the only combination Supabase accepts for the newer sb_secret_ keys on Storage as well as the database.
const sbHeaders = (extra) => ({ apikey: KEY, authorization: "Bearer " + KEY, ...extra });

function explain(where, status, text) {
  let msg = String(text || "");
  try { const j = JSON.parse(msg); msg = j.message || j.error_description || j.error || msg; } catch {}
  if (/asclepius_kv/.test(msg) && /(does not exist|schema cache)/i.test(msg))
    return "The database table is missing. In Supabase open SQL Editor, paste the contents of schema.sql, run it, then reload.";
  if (status === 401 || /invalid api key|invalid jwt|compact jws|jwt/i.test(msg))
    return `Supabase rejected the key (${String(msg).slice(0, 120)}). Check SUPABASE_URL and SUPABASE_SECRET_KEY in your environment variables. If a new sb_secret_ key keeps failing on file uploads, use the legacy service_role key instead.`;
  return `Supabase ${where} error ${status}: ${String(msg).slice(0, 200)}`;
}

async function sb(url, opt = {}, label = "request") {
  for (let i = 0; ; i++) {
    let r;
    try {
      r = await fetch(url, { ...opt, headers: sbHeaders(opt.headers), signal: AbortSignal.timeout(30000) });
    } catch {
      if (i < 1) { await sleep(300); continue; }
      throw new Error(`Could not reach Supabase (${label}). Check SUPABASE_URL.`);
    }
    if (r.status >= 500 && i < 1) { await sleep(300); continue; }
    if (!r.ok) throw new Error(explain(label, r.status, await r.text()));
    return r;
  }
}
const rest = (q, opt, label) => sb(`${BASE}/rest/v1/${q}`, opt, label);
const JSONH = { "content-type": "application/json" };

async function upsert(rows) {
  const at = new Date().toISOString();
  let batch = [], size = 0;
  const send = async () => {
    if (!batch.length) return;
    await rest("asclepius_kv?on_conflict=coll,id", {
      method: "POST",
      headers: { ...JSONH, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(batch),
    }, "save");
    batch = []; size = 0;
  };
  for (const r of rows) {
    const row = { course_id: null, num: null, ...r, updated_at: at };
    const n = JSON.stringify(row).length;
    if (batch.length && (size + n > 3e6 || batch.length >= 200)) await send();
    batch.push(row); size += n;
  }
  await send();
}
const rowFor = (coll, o) => ({ coll, id: o.id, course_id: o.courseId ?? null, num: NUM[coll] ? NUM[coll](o) : null, data: o });

const storageUrl = (p) => (p.startsWith("/storage/v1") ? BASE + p : BASE + "/storage/v1" + p);
let bucketOk = false;
async function ensureBucket() {
  if (bucketOk) return;
  let r;
  try {
    r = await fetch(`${BASE}/storage/v1/bucket`, {
      method: "POST", headers: sbHeaders(JSONH), body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
      signal: AbortSignal.timeout(20000),
    });
  } catch { throw new Error("Could not reach Supabase Storage. Check SUPABASE_URL."); }
  if (!r.ok) {
    const t = await r.text();
    if (!/already exists|duplicate/i.test(t)) throw new Error(explain("storage", r.status, t));
  }
  bucketOk = true;
}

const remote = {
  async kvGet(k, d) {
    const a = await (await rest(`asclepius_kv?coll=eq.kv&id=eq.${enc(k)}&select=data`, {}, "read")).json();
    return a.length ? a[0].data : d;
  },
  async kvSet(k, v) { await upsert([{ coll: "kv", id: k, data: v }]); },
  async list(coll, o = {}) {
    const sel = o.project ? ["id", "course_id", ...o.project.map((f) => `d_${f}:data->${f}`)].join(",") : "data";
    const q = [`coll=eq.${coll}`, `select=${sel}`];
    if (o.courseId) q.push(`course_id=eq.${enc(o.courseId)}`);
    if (o.numLte !== undefined) q.push(`num=lte.${Math.floor(o.numLte)}`);
    q.push(o.sortNum ? "order=num.asc,id.asc" : "order=created_at.asc,id.asc");
    const out = [];
    let offset = 0;
    for (;;) {
      const lim = o.limit ? Math.min(o.limit - out.length, PAGE) : PAGE;
      const r = await rest(`asclepius_kv?${q.join("&")}&limit=${lim}&offset=${offset}`, { headers: { Prefer: "count=exact" } }, "read");
      const rows = await r.json();
      for (const w of rows)
        out.push(o.project
          ? { id: w.id, courseId: w.course_id ?? undefined, ...Object.fromEntries(o.project.map((f) => [f, w["d_" + f]])) }
          : w.data);
      offset += rows.length;
      const total = +((r.headers.get("content-range") || "").split("/")[1]);
      const more = Number.isFinite(total) ? offset < total : rows.length === lim;
      if (!rows.length || !more || (o.limit && out.length >= o.limit)) break;
    }
    return out;
  },
  async get(coll, id) {
    const a = await (await rest(`asclepius_kv?coll=eq.${coll}&id=eq.${enc(id)}&select=data`, {}, "read")).json();
    return a.length ? a[0].data : null;
  },
  async putMany(coll, objs) {
    // rows inserted in one batch would all get the same timestamp; space them out so their order is kept
    const t0 = Date.now();
    await upsert(objs.map((o, i) => ({ ...rowFor(coll, o), ...(objs.length > 1 ? { created_at: new Date(t0 + i).toISOString() } : {}) })));
  },
  async del(coll, id) { await rest(`asclepius_kv?coll=eq.${coll}&id=eq.${enc(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }, "delete"); },
  async clear(coll) { await rest(`asclepius_kv?coll=eq.${coll}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }, "delete"); },
  backups: {
    async list() {
      const rows = await (await rest("asclepius_kv?coll=eq.backups&select=id,meta:data->meta&order=id.desc&limit=200", {}, "read")).json();
      return rows.map((r) => r.meta).filter(Boolean);
    },
    async put(id, bk) { await upsert([{ coll: "backups", id, data: bk }]); },
    async get(id) { return (await remote.get("backups", id))?.snap || null; },
    async del(id) { await remote.del("backups", id); },
  },
  files: {
    async signUpload(key) {
      await ensureBucket();
      const j = await (await sb(`${BASE}/storage/v1/object/upload/sign/${BUCKET}/${key}`, { method: "POST", headers: { ...JSONH, "x-upsert": "true" }, body: "{}" }, "upload")).json();
      return storageUrl(j.url);
    },
    async put(key, buf, ct = "application/octet-stream") {
      await ensureBucket();
      await sb(`${BASE}/storage/v1/object/${BUCKET}/${key}`, { method: "POST", headers: { "content-type": ct, "x-upsert": "true" }, body: buf }, "upload");
    },
    async read(key) {
      return Buffer.from(await (await sb(`${BASE}/storage/v1/object/${BUCKET}/${key}`, {}, "download")).arrayBuffer());
    },
    async url(key) {
      const j = await (await sb(`${BASE}/storage/v1/object/sign/${BUCKET}/${key}`, { method: "POST", headers: JSONH, body: JSON.stringify({ expiresIn: 3600 }) }, "download")).json();
      return storageUrl(j.signedURL);
    },
    async del(key) {
      await sb(`${BASE}/storage/v1/object/${BUCKET}`, { method: "DELETE", headers: JSONH, body: JSON.stringify({ prefixes: [key] }) }, "delete").catch(() => {});
    },
  },
};

const B = cloud ? remote : local;
export const kv = { get: (k, d) => B.kvGet(k, d), set: (k, v) => B.kvSet(k, v) };
export const docs = {
  list: (c, o) => B.list(c, o),
  get: (c, id) => B.get(c, id),
  put: (c, o) => B.putMany(c, [o]),
  putMany: (c, a) => B.putMany(c, a),
  del: (c, id) => B.del(c, id),
  clear: (c) => B.clear(c),
};
export const backups = B.backups;
export const files = B.files;
