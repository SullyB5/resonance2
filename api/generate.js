// Serverless proxy to fal.ai — keeps FAL_KEY hidden from the browser.
// Model: fast SDXL image-to-image (cheap, quick, structure-preserving).
const MODEL = "fal-ai/fast-sdxl/image-to-image";

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only." }); return; }

  const key = process.env.FAL_KEY;
  if (!key) {
    res.status(500).json({ error: "The image key isn't set yet. Add FAL_KEY in Vercel → Settings → Environment Variables, then redeploy." });
    return;
  }

  try {
    // Parse body (Vercel usually parses JSON already; fall back to raw stream).
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body || "{}");
    if (!body) {
      const raw = await new Promise((resolve, reject) => {
        let d = ""; req.on("data", c => d += c); req.on("end", () => resolve(d)); req.on("error", reject);
      });
      body = raw ? JSON.parse(raw) : {};
    }

    const { image, prompt, strength } = body;
    if (!image || !prompt) { res.status(400).json({ error: "Need both an image and a prompt." }); return; }

    const s = typeof strength === "number" ? Math.min(0.95, Math.max(0.1, strength)) : 0.5;

    const r = await fetch("https://fal.run/" + MODEL, {
      method: "POST",
      headers: { "Authorization": "Key " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt,
        image_url: image,               // fal accepts a base64 data URI here
        strength: s,                    // low = keep the pattern, high = reimagine
        num_inference_steps: 25,
        guidance_scale: 7.5,
        num_images: 1,
        enable_safety_checker: true
      })
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      const m = data && (data.detail || data.error || data.message);
      res.status(r.status).json({ error: typeof m === "string" ? m : (m ? JSON.stringify(m) : "Image service error.") });
      return;
    }

    const url = data && data.images && data.images[0] && data.images[0].url;
    if (!url) { res.status(502).json({ error: "No image came back from the renderer." }); return; }

    res.status(200).json({ url: url });
  } catch (e) {
    res.status(500).json({ error: (e && e.message) ? e.message : "Server error." });
  }
};
