// Serverless proxy to Gemini — keeps GEMINI_API_KEY hidden from the browser.
const MODEL = "gemini-3.1-flash-image";

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object") return resolve(req.body);
    if (typeof req.body === "string") {
      try { return resolve(JSON.parse(req.body || "{}")); } catch (e) { return reject(e); }
    }
    let d = "";
    req.on("data", (c) => { d += c; });
    req.on("end", () => {
      try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function splitDataUrl(image) {
  const m = String(image).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (m) return { mime: m[1], data: m[2] };
  return { mime: "image/jpeg", data: String(image).replace(/^data:[^;]+;base64,/, "") };
}

function extractImage(data) {
  if (!data || typeof data !== "object") return null;
  const direct = data.output_image || data.outputImage;
  if (direct && direct.data) {
    return { mime: direct.mime_type || direct.mimeType || "image/png", data: direct.data };
  }
  const outs = data.outputs || data.output || [];
  for (const o of Array.isArray(outs) ? outs : [outs]) {
    if (!o) continue;
    if (o.type === "image" && o.data) return { mime: o.mime_type || o.mimeType || "image/png", data: o.data };
    const img = o.image || o.inline_data || o.inlineData;
    if (img && img.data) return { mime: img.mime_type || img.mimeType || "image/png", data: img.data };
    if (Array.isArray(o.content)) {
      for (const p of o.content) {
        const inline = p && (p.inlineData || p.inline_data || (p.type === "image" ? p : null));
        if (inline && inline.data) return { mime: inline.mime_type || inline.mimeType || "image/png", data: inline.data };
      }
    }
  }
  const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
  if (Array.isArray(parts)) {
    for (const p of parts) {
      const inline = p.inlineData || p.inline_data;
      if (inline && inline.data) return { mime: inline.mimeType || inline.mime_type || "image/png", data: inline.data };
    }
  }
  return null;
}

function geminiError(data, status) {
  const err = data && data.error;
  if (!err) return "Gemini image error (" + status + ").";
  if (typeof err === "string") return err;
  if (err.message) return err.message;
  return JSON.stringify(err);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only." });
  }

  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    return res.status(500).json({
      error: "The Gemini key isn't set yet. In Vercel open Settings → Environment Variables, add GEMINI_API_KEY, then Redeploy."
    });
  }

  try {
    const body = await readBody(req);
    const { image, prompt, strength } = body || {};
    if (!image || !prompt) {
      return res.status(400).json({ error: "Need both an image and a prompt." });
    }

    const s = typeof strength === "number" ? Math.min(0.95, Math.max(0.1, strength)) : 0.5;
    const keep = Math.round((1 - s) * 100);
    const reimagine = Math.round(s * 100);
    const { mime, data: b64 } = splitDataUrl(image);
    const text =
      "This attached image is a cymatics / resonance pattern (sand or field lines on a plate). " +
      "Turn it into a finished picture. Keep the same symmetry, geometry, and nodal lines. " +
      "User description: " + String(prompt).trim() + " " +
      "Follow the original pattern at about " + keep + "% and reimagine at about " + reimagine + "%. " +
      "No captions, watermarks, or UI chrome.";

    let r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text },
            { inline_data: { mime_type: mime, data: b64 } }
          ]
        }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"]
        }
      })
    });

    let data = await r.json().catch(() => ({}));

    if (!r.ok) {
      r = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key
        },
        body: JSON.stringify({
          model: MODEL,
          input: [
            { type: "text", text },
            { type: "image", mime_type: mime, data: b64 }
          ]
        })
      });
      data = await r.json().catch(() => ({}));
    }

    if (!r.ok) {
      return res.status(r.status).json({ error: geminiError(data, r.status) });
    }

    const img = extractImage(data);
    if (!img) {
      return res.status(502).json({ error: "Gemini did not return an image. Try a shorter description." });
    }

    return res.status(200).json({ url: "data:" + img.mime + ";base64," + img.data });
  } catch (e) {
    return res.status(500).json({ error: (e && e.message) ? e.message : "Server error." });
  }
}
