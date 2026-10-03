// AI provider layer. Free options first: Google Gemini (free tier) and Groq (free tier).
// Any OpenAI-compatible service also works, and Anthropic still works if you ever want it.
// Pick one with AI_PROVIDER, or just set one key and it is chosen automatically.
const E = process.env;
const list = (s, d) => String(s || d).split(",").map((x) => x.trim()).filter(Boolean);

const PROVIDERS = {
  gemini: {
    key: E.GEMINI_API_KEY || E.GOOGLE_API_KEY,
    models: list(E.AI_MODELS || E.GEMINI_MODELS, "gemini-3.5-flash-lite,gemini-3.8-flash"),
    vision: true, ctx: 120000,
  },
  groq: {
    key: E.GROQ_API_KEY,
    base: "https://api.groq.com/openai/v1",
    models: list(E.AI_MODELS || E.GROQ_MODELS, "llama-3.3-70b-versatile,llama-3.1-8b-instant"),
    visionModels: list(E.GROQ_VISION_MODELS, "meta-llama/llama-4-scout-17b-16e-instruct"),
    vision: true, ctx: 14000, // Groq's free tier has small per-minute token limits
  },
  openai: {
    key: E.OPENAI_COMPAT_API_KEY,
    base: (E.OPENAI_COMPAT_BASE_URL || "").replace(/\/$/, ""),
    models: list(E.AI_MODELS || E.OPENAI_COMPAT_MODELS, ""),
    vision: false, ctx: 30000,
  },
  anthropic: {
    key: E.ANTHROPIC_API_KEY,
    models: list(E.AI_MODELS || E.MODEL, "claude-sonnet-4-6"),
    vision: true, ctx: 40000,
  },
};

const ORDER = ["gemini", "groq", "openai", "anthropic"];
const usable = (n) => PROVIDERS[n]?.key && (n !== "openai" || (PROVIDERS.openai.base && PROVIDERS.openai.models.length));
const name = (E.AI_PROVIDER && PROVIDERS[E.AI_PROVIDER.toLowerCase()] ? E.AI_PROVIDER.toLowerCase() : ORDER.find(usable)) || null;
const P = name ? PROVIDERS[name] : null;
// overridable base URLs (used by tests)
const GEM = (E.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
const ANT = (E.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
if (P && E.GROQ_BASE_URL && name === "groq") P.base = E.GROQ_BASE_URL.replace(/\/$/, "");

const info = () => ({ provider: name, configured: !!(P && usable(name)), models: P?.models || [], vision: !!P?.vision });
const ctxChars = P ? P.ctx : 30000;

const fail = (msg, status) => Object.assign(new Error(msg), { status });

async function post(url, headers, body) {
  let r;
  try {
    r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(110000) });
  } catch (e) {
    throw fail("Could not reach the AI service (" + (e.name === "TimeoutError" ? "it took too long" : e.message) + ")", 502);
  }
  const text = await r.text();
  let j; try { j = JSON.parse(text); } catch { j = {}; }
  if (!r.ok) {
    const m = j.error?.message || (typeof j.error === "string" ? j.error : "") || text.slice(0, 200) || "AI request failed";
    throw fail(m, r.status);
  }
  return j;
}

async function callOne(model, system, user, max, image) {
  if (name === "gemini") {
    const parts = [];
    if (image) parts.push({ inlineData: { mimeType: image.mime, data: image.data } });
    parts.push({ text: user });
    const j = await post(`${GEM}/models/${model}:generateContent`, { "x-goog-api-key": P.key }, {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts }],
      generationConfig: { maxOutputTokens: max * 2 },
    });
    const c = j.candidates?.[0];
    const t = (c?.content?.parts || []).map((p) => p.text || "").join("");
    if (!t) throw fail(j.promptFeedback?.blockReason ? "The AI declined this request (" + j.promptFeedback.blockReason + ")" : "The AI returned an empty answer", 502);
    return t;
  }
  if (name === "anthropic") {
    const content = image
      ? [{ type: "image", source: { type: "base64", media_type: image.mime, data: image.data } }, { type: "text", text: user }]
      : user;
    const j = await post(`${ANT}/v1/messages`, { "x-api-key": P.key, "anthropic-version": "2023-06-01" }, {
      model, max_tokens: max, system, messages: [{ role: "user", content }],
    });
    return (j.content || []).map((c) => c.text || "").join("");
  }
  // groq / generic OpenAI-compatible
  const content = image
    ? [{ type: "image_url", image_url: { url: `data:${image.mime};base64,${image.data}` } }, { type: "text", text: user }]
    : user;
  const j = await post(`${P.base}/chat/completions`, { authorization: "Bearer " + P.key }, {
    model, max_tokens: max, messages: [{ role: "system", content: system }, { role: "user", content }],
  });
  const t = j.choices?.[0]?.message?.content;
  if (!t) throw fail("The AI returned an empty answer", 502);
  return t;
}

const friendly = (e, model) => {
  const s = e.status;
  if (s === 429) return `The free AI limit was reached for now (${model}). Wait a minute and try again, or tomorrow if you have used up the daily allowance.`;
  if (s === 401 || s === 403) return "The AI key was rejected. Check that the key is copied in full, has no spaces, and is for the provider you chose.";
  if (s === 404) return `The AI model "${model}" was not found. Model names change; set AI_MODELS to a current model name from your provider.`;
  return e.message;
};

// ai(system, user, max, { image: { mime, data(base64) } })
async function ai(system, user, max = 4000, opts = {}) {
  if (!P || !usable(name)) {
    throw fail("No AI key is set. Add GEMINI_API_KEY (free from Google AI Studio) or GROQ_API_KEY (free from Groq) to your environment variables.", 503);
  }
  let models = P.models;
  if (opts.image) {
    if (!P.vision) throw fail("This AI provider cannot read photos. Use Gemini, or Groq with a vision model.", 400);
    if (P.visionModels) models = P.visionModels;
  }
  let last;
  for (const m of models) {
    try { return await callOne(m, system, user, max, opts.image); }
    catch (e) {
      last = Object.assign(e, { message: friendly(e, m) });
      // try the next model only for "not found", "rate limited" or server trouble
      if (![404, 429, 500, 502, 503, 504].includes(e.status)) break;
    }
  }
  throw last;
}

// Pull JSON out of an AI answer even if it is wrapped in text or code fences.
function parseJSON(t) {
  const s = String(t).replace(/```json|```/gi, "").trim();
  try { return JSON.parse(s); } catch {}
  const a = s.search(/[\[{]/);
  const open = s[a], close = open === "[" ? "]" : "}";
  const b = s.lastIndexOf(close);
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} }
  throw fail("The AI did not return a usable answer. Please try again.", 502);
}

export { ai, parseJSON, info, ctxChars, name as provider };
