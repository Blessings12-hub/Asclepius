// Looks things up on the open web for study guides and presentations.
//  - research(): short article extracts from Wikipedia, used as reference text
//  - findPictures(): candidate pictures from Wikimedia Commons, Wikipedia articles and Openverse
//  - fetchImage(): downloads one picture (only from the hosts listed in ALLOWED)
// Everything is free and needs no key. Every call has a short timeout and fails quietly, so a slow site never breaks a build.
const UA = { "user-agent": "Asclepius/0.5 (personal study app)", accept: "application/json" };
const ALLOWED = /(^|\.)(wikimedia\.org|wikipedia\.org|openverse\.org)$/i;

const getJson = async (url, ms = 7000) => {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
};
const strip = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const q = encodeURIComponent;

// run fn over items, n at a time, and stop starting new work after a deadline
async function pool(items, n, fn, deadline = Infinity) {
  const out = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = Date.now() > deadline ? null : await fn(items[i], i).catch(() => null);
    }
  }));
  return out;
}

// ---- reference text ----
async function research(topic, limit = 4) {
  const t = String(topic || "").trim().slice(0, 120);
  if (!t) return [];
  try {
    const j = await getJson(`https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${q(t)}&gsrlimit=${limit}&prop=extracts|info&exintro=1&explaintext=1&exlimit=max&inprop=url`);
    return Object.values(j.query?.pages || {})
      .sort((a, b) => (a.index || 0) - (b.index || 0))
      .map((p) => ({ title: p.title, url: p.fullurl, text: strip(p.extract).slice(0, 1500) }))
      .filter((p) => p.text.length > 80);
  } catch { return []; }
}
const referenceText = (refs) => refs.map((r) => `[${r.title}] ${r.text}`).join("\n\n");

// ---- pictures ----
const BAD = /\b(logo|icon|flag of|coat of arms|signature|seal of|stamp|banner|poster|cover|advert|screenshot|portrait of|map of|location map|chart of accounts)\b/i;
const cleanTitle = (t) => String(t || "").replace(/^File:/, "").replace(/\.\w{2,4}$/, "").replace(/_/g, " ");

async function commons(query) {
  const j = await getJson(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=10&gsrsearch=${q(query)}&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=800`);
  const out = [];
  for (const p of Object.values(j.query?.pages || {})) {
    const i = p.imageinfo?.[0];
    if (!i || !/^image\/(jpeg|png|svg\+xml)$/.test(i.mime || "") || !/\.(jpe?g|png)$/i.test(i.thumburl || "")) continue;
    if ((i.width || 0) < 400 || (i.height || 0) < 250) continue;
    const m = i.extmetadata || {};
    const who = strip(m.Artist?.value).slice(0, 50), lic = strip(m.LicenseShortName?.value) || "see source";
    out.push({
      url: i.thumburl, w: i.thumbwidth || i.width, h: i.thumbheight || i.height, title: cleanTitle(p.title), src: "commons", rank: 2,
      credit: `${cleanTitle(p.title).slice(0, 70)}${who ? ", " + who : ""}, ${lic}. Wikimedia Commons`,
      page: i.descriptionurl,
    });
  }
  return out;
}
async function wikiLead(query) {
  const j = await getJson(`https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${q(query)}&gsrlimit=4&prop=pageimages|info&piprop=thumbnail&pithumbsize=800&inprop=url`);
  return Object.values(j.query?.pages || {}).filter((p) => p.thumbnail && /\.(jpe?g|png)$/i.test(p.thumbnail.source)).map((p) => ({
    url: p.thumbnail.source, w: p.thumbnail.width, h: p.thumbnail.height, title: p.title, src: "wikipedia", rank: 3,
    credit: `Wikipedia article "${p.title}" (picture from Wikimedia Commons; see the article for its licence)`, page: p.fullurl,
  }));
}
async function openverse(query) {
  const j = await getJson(`https://api.openverse.org/v1/images/?q=${q(query)}&page_size=8&license_type=commercial,modification&mature=false`);
  return (j.results || []).filter((r) => r.thumbnail && (r.width || 0) >= 500).map((r) => ({
    url: r.thumbnail, w: r.width, h: r.height, title: r.title || "", src: "openverse", rank: 1,
    credit: strip(r.attribution) || `${r.title || "Image"}, ${r.creator || "unknown"}, ${String(r.license || "").toUpperCase()} ${r.license_version || ""}`.trim(),
    page: r.foreign_landing_url,
  }));
}

function score(c, words) {
  const ratio = c.w / Math.max(1, c.h), t = c.title.toLowerCase();
  return c.rank + (ratio > 0.7 && ratio < 2.1 ? 1 : 0) + (c.w >= 600 ? 1 : 0) + Math.min(3, words.filter((w) => t.includes(w)).length);
}

// queries: array of search phrases, best first. Returns up to `max` different candidates, best first.
async function findPictures(queries, max = 4) {
  const qs = [...new Set(queries.map((s) => String(s || "").trim()).filter(Boolean))].slice(0, 3);
  const all = [];
  for (const query of qs) {
    const [a, b] = await Promise.all([commons(query).catch(() => []), wikiLead(query).catch(() => [])]);
    all.push(...a.map((c) => ({ ...c, q: query })), ...b.map((c) => ({ ...c, q: query })));
    if (all.length >= max + 2) break;
  }
  if (all.length < 2) for (const query of qs.slice(0, 2)) all.push(...(await openverse(query).catch(() => [])));
  const words = qs.join(" ").toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const seen = new Set();
  return all
    .filter((c) => c.url && !BAD.test(c.title) && !seen.has(c.url) && seen.add(c.url))
    .map((c) => ({ ...c, s: score(c, words) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, max)
    .map(({ url, w, h, credit, page, src }) => ({ url, w, h, credit, page, src }));
}

// Download one picture for a file. Only well-known open-image hosts are allowed.
async function fetchImage(url, maxBytes = 650000) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !ALLOWED.test(u.hostname)) return null;
    const r = await fetch(u, { headers: { "user-agent": UA["user-agent"] }, signal: AbortSignal.timeout(9000) });
    if (!r.ok) return null;
    const type = (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!/^image\/(jpeg|png)$/.test(type)) return null;
    const b = Buffer.from(await r.arrayBuffer());
    return b.length && b.length <= maxBytes ? { b, mime: type } : null;
  } catch { return null; }
}

export { research, referenceText, findPictures, fetchImage, pool, strip };
