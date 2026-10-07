// Web Push without extra packages: VAPID (RFC 8292) signing + aes128gcm payload encryption (RFC 8291), using only Node's crypto.
// Used to show notifications on the phone while the app is closed.
import crypto from "crypto";

const b64u = (b) => Buffer.from(b).toString("base64url");
const unb64u = (s) => Buffer.from(String(s || ""), "base64url");
const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();

// ---- VAPID keys: from the environment, or created once and kept in the database ----
export async function getVapid(kv, env = process.env) {
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) return { pub: env.VAPID_PUBLIC_KEY, d: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT || "mailto:asclepius@example.com" };
  let v = await kv.get("vapid", null);
  if (!v || !v.pub || !v.d) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const pj = publicKey.export({ format: "jwk" }), dj = privateKey.export({ format: "jwk" });
    v = { pub: b64u(Buffer.concat([Buffer.from([4]), unb64u(pj.x), unb64u(pj.y)])), d: dj.d };
    await kv.set("vapid", v);
  }
  return { ...v, subject: env.VAPID_SUBJECT || "mailto:asclepius@example.com" };
}

function privateKeyOf(v) {
  const pub = unb64u(v.pub);
  return crypto.createPrivateKey({ key: { kty: "EC", crv: "P-256", d: v.d, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) }, format: "jwk" });
}

export function vapidHeader(v, endpoint, now = Date.now()) {
  const aud = new URL(endpoint).origin;
  const head = b64u(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const body = b64u(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: v.subject }));
  const sig = crypto.sign("sha256", Buffer.from(head + "." + body), { key: privateKeyOf(v), dsaEncoding: "ieee-p1363" });
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${v.pub}`;
}

// ---- payload encryption (RFC 8291, one record) ----
// `fixed` lets tests supply the sender key and salt from the RFC's worked example.
export function encryptPayload(sub, text, fixed = {}) {
  const uaPublic = unb64u(sub.keys.p256dh), authSecret = unb64u(sub.keys.auth);
  if (uaPublic.length !== 65 || authSecret.length !== 16) throw new Error("Bad push subscription keys");
  const ecdh = crypto.createECDH("prime256v1");
  if (fixed.asPrivate) ecdh.setPrivateKey(unb64u(fixed.asPrivate)); else ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const secret = ecdh.computeSecret(uaPublic);
  const prkKey = hmac(authSecret, secret);
  const ikm = hmac(prkKey, Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic, Buffer.from([1])]));
  const salt = fixed.salt ? unb64u(fixed.salt) : crypto.randomBytes(16);
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.concat([Buffer.from("Content-Encoding: aes128gcm\0"), Buffer.from([1])])).subarray(0, 16);
  const nonce = hmac(prk, Buffer.concat([Buffer.from("Content-Encoding: nonce\0"), Buffer.from([1])])).subarray(0, 12);
  const plain = Buffer.concat([Buffer.from(text, "utf8"), Buffer.from([2])]);
  if (plain.length > 3900) throw new Error("Notification text is too long");
  const c = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const enc = Buffer.concat([c.update(plain), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return { body: Buffer.concat([salt, rs, Buffer.from([65]), asPublic, enc]), debug: { ikm: b64u(ikm), cek: b64u(cek), nonce: b64u(nonce) } };
}

// Sends one notification. Returns {ok, gone} where gone=true means the device unsubscribed and should be forgotten.
export async function sendPush(vapid, sub, payload, { ttl = 3600, urgency = "normal" } = {}) {
  try {
    const { body } = encryptPayload(sub, JSON.stringify(payload));
    const r = await fetch(sub.endpoint, {
      method: "POST",
      headers: { "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: String(ttl), Urgency: urgency, Authorization: vapidHeader(vapid, sub.endpoint) },
      body, signal: AbortSignal.timeout(15000),
    });
    if (r.status === 404 || r.status === 410) return { ok: false, gone: true, status: r.status };
    return { ok: r.status >= 200 && r.status < 300, gone: false, status: r.status };
  } catch (e) {
    return { ok: false, gone: false, error: e.message };
  }
}
