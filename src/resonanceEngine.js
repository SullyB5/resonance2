// Resonance engine — runs after mount, wired to DOM ids in App.jsx.
export function startResonanceEngine() {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let ctx = null, master = null, analyser = null, voices = [], playing = false;
  const FMIN = 20, FMAX = 6000;
  const sliderToFreq = (v) => FMIN * Math.pow(FMAX / FMIN, v / 1000);
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const noteFor = (f) => noteNames[((Math.round(69 + 12 * Math.log2(f / 440)) % 12) + 12) % 12] + (Math.floor(Math.round(69 + 12 * Math.log2(f / 440)) / 12) - 1);

  let freq = sliderToFreq(500), wave = "sine", vol = 0.40, mode = "tone";
  let showMirror = false, plateView = "sand", invert = false, paused = false;
  let patternSource = "pitch", manN = 6, manM = 4, flipH = false, flipV = false, family = "orb", manP = 5;
  let yaw = 0.7, pitch = 0.42, dragging = false, lastX = 0, lastY = 0, base3 = [], base3Key = "";
  let orbPts = [], orbKey = "";
  const GS = 96;
  const MODE_MAX = 500;
  const FRES = 640;
  let paceVal = 3;
  const THREE_D = () => family === "curve3d" || family === "surface" || family === "orb" || family === "drum3d";
  const ROTATABLE = () => THREE_D() || family === "harmono";
  const spinRate = () => (reduce || paused || dragging) ? 0 : 0.0015 * (paceVal / 3);
  let surfKey = "", surfH = null, surfNX = null, surfNY = null, surfNZ = null;

  function ensureCtx() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0;
    analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.75;
    master.connect(analyser); analyser.connect(ctx.destination);
  }
  function clearVoices() { voices.forEach(v => { try { v.osc.stop(); } catch (e) {} try { v.osc.disconnect(); v.g.disconnect(); } catch (e) {} }); voices = []; }
  function voiceSpecs() {
    switch (mode) {
      case "harmonics": { const a = []; for (let n = 1; n <= 6; n++) a.push({ ratio: n, gain: 0.9 / n }); return a; }
      case "beat": return [{ ratio: 1, gain: 0.5 }, { ratio: 1, gain: 0.5, detuneHz: 4 }];
      case "chord": return [{ ratio: 1, gain: 0.42 }, { ratio: 5 / 4, gain: 0.36 }, { ratio: 3 / 2, gain: 0.36 }];
      default: return [{ ratio: 1, gain: 0.8 }];
    }
  }
  function buildVoices() {
    clearVoices();
    voiceSpecs().forEach(s => {
      const osc = ctx.createOscillator(); osc.type = s.type || wave;
      osc.frequency.value = freq * s.ratio + (s.detuneHz || 0);
      const g = ctx.createGain(); g.gain.value = s.gain;
      osc.connect(g); g.connect(master); osc.start();
      voices.push({ osc, g, ratio: s.ratio, detuneHz: s.detuneHz || 0 });
    });
  }
  function retune() { if (!voices.length || !ctx) return; const t = ctx.currentTime; voices.forEach(v => v.osc.frequency.setTargetAtTime(freq * v.ratio + v.detuneHz, t, 0.02)); }
  function start() { ensureCtx(); if (ctx.state === "suspended") ctx.resume(); buildVoices(); const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(vol, t + 0.03); playing = true; paintPlay(); }
  function stop() { if (!ctx) { playing = false; paintPlay(); return; } const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + 0.04); setTimeout(clearVoices, 70); playing = false; paintPlay(); }

  const $ = (id) => document.getElementById(id);
  const freqSlider = $("freq"), volSlider = $("vol"), freqVal = $("freqVal"), noteName = $("noteName");
  const playBtn = $("play"), playTxt = $("playTxt"), modeHint = $("modeHint"), modeNM = $("modeNM");
  const hints = {
    tone: "One clean tone. Slide Pitch and watch the pool rearrange.",
    harmonics: "Six tones stacked 1·2·3·4·5·6 — the recipe for a full sound. Look at the mix.",
    beat: "Two tones a few Hz apart drift in and out of step, so it throbs. Listen for the pulse.",
    chord: "Three notes at once — a major chord. Busier wave; the pool follows the lowest note."
  };

  let sweeping = false;
  const sweepBtn = $("sweepBtn"), sweepSpeed = $("sweepSpeed");
  function paintSweep() {
    sweepBtn.setAttribute("aria-pressed", sweeping);
    sweepBtn.classList.toggle("active", sweeping);
    sweepBtn.textContent = sweeping ? "sweeping…" : "sweep";
  }
  sweepBtn.addEventListener("click", () => {
    sweeping = !sweeping;
    if (sweeping) setPatternSource("pitch");
    paintSweep();
  });
  sweepSpeed.addEventListener("input", () => { sweepSpeedVal = +sweepSpeed.value; });
  function paintFreq() { freqVal.textContent = Math.round(freq); noteName.textContent = noteFor(freq); }
  function paintPlay() { playBtn.classList.toggle("playing", playing); playTxt.textContent = playing ? "Stop" : "Play"; playBtn.setAttribute("aria-pressed", playing); }

  freqSlider.addEventListener("input", e => { freq = sliderToFreq(+e.target.value); paintFreq(); retune(); });
  volSlider.addEventListener("input", e => { vol = (+e.target.value) / 100 * 0.8; if (ctx && playing) master.gain.setTargetAtTime(vol, ctx.currentTime, 0.02); });
  playBtn.addEventListener("click", () => playing ? stop() : start());
  document.querySelectorAll("#waves button").forEach(b => b.addEventListener("click", () => {
    wave = b.dataset.w; document.querySelectorAll("#waves button").forEach(x => x.setAttribute("aria-pressed", x === b));
    if (playing) { buildVoices(); master.gain.setValueAtTime(vol, ctx.currentTime); }
  }));
  document.querySelectorAll("#modes button").forEach(b => b.addEventListener("click", () => {
    mode = b.dataset.m; document.querySelectorAll("#modes button").forEach(x => x.setAttribute("aria-pressed", x === b));
    modeHint.textContent = hints[mode];
    if (playing) { buildVoices(); master.gain.setValueAtTime(vol, ctx.currentTime); }
  }));

  const mirrorBtn = $("mirror"), invertBtn = $("invert"), pauseBtn = $("pause");
  mirrorBtn.addEventListener("click", () => { showMirror = !showMirror; mirrorBtn.setAttribute("aria-pressed", showMirror); });
  invertBtn.addEventListener("click", () => { invert = !invert; invertBtn.setAttribute("aria-pressed", invert); lastFieldKey = ""; });
  pauseBtn.addEventListener("click", () => { paused = !paused; pauseBtn.setAttribute("aria-pressed", paused); pauseBtn.textContent = paused ? "▶ resume" : "⏸ pause"; });
  document.querySelectorAll("#views button").forEach(b => b.addEventListener("click", () => {
    plateView = b.dataset.v; document.querySelectorAll("#views button").forEach(x => x.setAttribute("aria-pressed", x === b));
  }));
  const flipHBtn = $("flipH"), flipVBtn = $("flipV");
  flipHBtn.addEventListener("click", () => { flipH = !flipH; flipHBtn.setAttribute("aria-pressed", flipH); });
  flipVBtn.addEventListener("click", () => { flipV = !flipV; flipVBtn.setAttribute("aria-pressed", flipV); });

  const nSlider = $("nSlider"), mSlider = $("mSlider"), nLabel = $("nLabel"), mLabel = $("mLabel");
  function setPatternSource(src) {
    patternSource = src;
    document.querySelectorAll("#psource button").forEach(x => x.setAttribute("aria-pressed", x.dataset.p === src));
    if (src === "manual" && sweeping) {
      sweeping = false;
      paintSweep();
    }
  }
  function setManualFromSliders(changed) {
    manN = +nSlider.value; manM = +mSlider.value;
    if (manN === manM) { if (changed === "n") { manM = manM < MODE_MAX ? manM + 1 : manM - 1; mSlider.value = manM; } else { manN = manN < MODE_MAX ? manN + 1 : manN - 1; nSlider.value = manN; } }
    nLabel.textContent = manN; mLabel.textContent = manM; lastFieldKey = "";
  }
  nSlider.addEventListener("input", () => { setManualFromSliders("n"); setPatternSource("manual"); });
  mSlider.addEventListener("input", () => { setManualFromSliders("m"); setPatternSource("manual"); });
  document.querySelectorAll("#psource button").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.p === "manual") { const c = modeNumbers(freq); manN = c.n; manM = c.m; manP = Math.max(1, Math.min(MODE_MAX, Math.round((c.n + c.m) / 1.6))); nSlider.value = manN; mSlider.value = manM; nLabel.textContent = manN; mLabel.textContent = manM; pSlider.value = manP; pLabel.textContent = manP; }
    setPatternSource(b.dataset.p);
  }));
  function syncModeSliders(n, m) { if (patternSource !== "pitch") return; nSlider.value = n; mSlider.value = m; nLabel.textContent = n; mLabel.textContent = m; }
  function currentNM() { return patternSource === "manual" ? { n: manN, m: manM } : modeNumbers(freq); }

  const pSlider = $("pSlider"), pLabel = $("pLabel"), zLine = $("zLine");
  pSlider.addEventListener("input", () => { manP = +pSlider.value; pLabel.textContent = manP; setPatternSource("manual"); });
  function updateZLine() { zLine.style.display = family === "curve3d" ? "flex" : "none"; }
  function updateGrab() { plate.classList.toggle("grab", ROTATABLE()); }
  function updateModelChip() { $("saveModel").style.display = ROTATABLE() ? "inline-block" : "none"; }
  $("saveImg").addEventListener("click", exportPNG);
  $("saveModel").addEventListener("click", exportOBJ);
  function current3() { if (patternSource === "manual") return { n: manN, m: manM, p: manP }; const c = modeNumbers(freq); return { n: c.n, m: c.m, p: Math.max(1, Math.min(MODE_MAX, Math.round((c.n + c.m) / 1.6))) }; }

  function resetViewForFamily() {
    if (family === "surface" || family === "drum3d") { yaw = 0.55; pitch = 1.05; }
    else if (family === "curve3d" || family === "orb") { yaw = 0.7; pitch = 0.42; }
    else if (family === "harmono") { yaw = 0; pitch = 0; }
  }
  function applyState(s) {
    if (s.family) family = s.family;
    document.querySelectorAll("#families button").forEach(x => x.setAttribute("aria-pressed", x.dataset.f === family));
    if (s.n != null) { manN = s.n; nSlider.value = manN; nLabel.textContent = manN; }
    if (s.m != null) { manM = s.m; mSlider.value = manM; mLabel.textContent = manM; }
    if (s.p != null) { manP = s.p; pSlider.value = manP; pLabel.textContent = manP; }
    if (s.view) {
      plateView = s.view;
      document.querySelectorAll("#views button").forEach(x => x.setAttribute("aria-pressed", x.dataset.v === plateView));
    }
    if (s.invert != null) { invert = s.invert; invertBtn.setAttribute("aria-pressed", invert); }
    if (s.flipH != null) { flipH = s.flipH; flipHBtn.setAttribute("aria-pressed", flipH); }
    if (s.flipV != null) { flipV = s.flipV; flipVBtn.setAttribute("aria-pressed", flipV); }
    resetViewForFamily();
    if (s.n != null || s.m != null || s.p != null) setPatternSource("manual");
    seedGrains(); lastFieldKey = ""; surfKey = ""; base3Key = ""; orbKey = "";
    updateZLine(); updateGrab(); updateModelChip();
  }
  document.querySelectorAll("#families button").forEach(b => b.addEventListener("click", () => {
    applyState({ family: b.dataset.f });
    paintLook("");
  }));
  $("dice").addEventListener("click", () => {
    const fams = ["square", "round", "ripple", "harmono", "curve3d", "surface", "orb", "drum3d"];
    const randMode = () => {
      const r = Math.random();
      if (r < 0.55) return 2 + Math.floor(Math.random() * 36);
      if (r < 0.88) return 40 + Math.floor(Math.random() * 100);
      return 140 + Math.floor(Math.random() * (MODE_MAX - 139));
    };
    let n = randMode(), m = randMode();
    if (n === m) m = Math.min(MODE_MAX, m + 1);
    applyState({
      family: fams[Math.floor(Math.random() * fams.length)],
      n, m, p: randMode(),
      view: Math.random() < 0.5 ? "field" : "sand"
    });
    paintLook("");
  });
  const LOOKS = {
    galaxy: { family: "orb", n: 6, m: 4, view: "sand", invert: false },
    nebula: { family: "orb", n: 11, m: 5, view: "sand", invert: false },
    knot: { family: "curve3d", n: 3, m: 5, p: 7, view: "sand", invert: false },
    shell: { family: "surface", n: 8, m: 5, view: "field", invert: false },
    drum: { family: "drum3d", n: 5, m: 3, view: "field", invert: false },
    infinity: { family: "harmono", n: 2, m: 1, view: "sand", invert: false }
  };
  function paintLook(name) {
    document.querySelectorAll("#looks [data-look]").forEach(x => x.setAttribute("aria-pressed", x.dataset.look === name));
  }
  document.querySelectorAll("#looks [data-look]").forEach(b => b.addEventListener("click", () => {
    const look = LOOKS[b.dataset.look];
    if (look) { applyState(look); paintLook(b.dataset.look); }
  }));
  $("pace").addEventListener("input", e => { paceVal = +e.target.value; });

  let viewZoom = 1;
  const ZOOM_MIN = 0.6, ZOOM_MAX = 2.4, ZOOM_STEP = 0.2;
  const zoomVal = $("zoomVal"), zoomIn = $("zoomIn"), zoomOut = $("zoomOut");
  function paintZoom() { if (zoomVal) zoomVal.textContent = Math.round(viewZoom * 100) + "%"; }
  function setZoom(z) {
    viewZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 10) / 10));
    paintZoom();
  }
  if (zoomIn) zoomIn.addEventListener("click", () => setZoom(viewZoom + ZOOM_STEP));
  if (zoomOut) zoomOut.addEventListener("click", () => setZoom(viewZoom - ZOOM_STEP));
  paintZoom();

  paintFreq(); paintPlay();

  const scope = $("scope"), sctx = scope.getContext("2d");
  const spec = $("spectrum"), spctx = spec.getContext("2d");
  const plate = $("plate"), pctx = plate.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  function fit(cv, c) { const r = cv.getBoundingClientRect(); cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr); c.setTransform(dpr, 0, 0, dpr, 0, 0); return { w: r.width, h: r.height }; }
  let SC = fit(scope, sctx), SP = fit(spec, spctx), PL = fit(plate, pctx);
  const onResize = () => { SC = fit(scope, sctx); SP = fit(spec, spctx); PL = fit(plate, pctx); seedGrains(); };
  window.addEventListener("resize", onResize);

  plate.addEventListener("pointerdown", e => { if (!ROTATABLE()) return; dragging = true; lastX = e.clientX; lastY = e.clientY; try { plate.setPointerCapture(e.pointerId); } catch (_) {} });
  plate.addEventListener("pointermove", e => { if (!dragging) return; yaw += (e.clientX - lastX) * 0.01; pitch += (e.clientY - lastY) * 0.01; pitch = Math.max(-1.45, Math.min(1.45, pitch)); lastX = e.clientX; lastY = e.clientY; });
  const endDrag = () => { dragging = false; };
  plate.addEventListener("pointerup", endDrag); plate.addEventListener("pointercancel", endDrag); plate.addEventListener("pointerleave", endDrag);
  plate.addEventListener("wheel", e => {
    e.preventDefault();
    setZoom(viewZoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  }, { passive: false });

  const timeBuf = new Uint8Array(2048), freqBuf = new Uint8Array(1024);
  function drawScope() {
    const { w, h } = SC; sctx.clearRect(0, 0, w, h);
    const idle = performance.now() / 900;
    sctx.strokeStyle = "rgba(214,180,92,0.22)"; sctx.lineWidth = 1;
    sctx.beginPath(); sctx.moveTo(0, h / 2); sctx.lineTo(w, h / 2); sctx.stroke();
    sctx.strokeStyle = "rgba(27,157,232,0.10)";
    sctx.beginPath(); sctx.arc(w * 0.18, h * 0.5, h * 0.28, 0, Math.PI * 2); sctx.stroke();
    sctx.beginPath(); sctx.arc(w * 0.82, h * 0.5, h * 0.22, 0, Math.PI * 2); sctx.stroke();
    if (analyser && playing) analyser.getByteTimeDomainData(timeBuf);
    sctx.lineWidth = 2.4; sctx.strokeStyle = "#1B9DE8"; sctx.shadowColor = "rgba(27,157,232,0.45)"; sctx.shadowBlur = 8;
    sctx.beginPath(); const N = timeBuf.length, step = w / N;
    for (let i = 0; i < N; i++) {
      const live = playing ? (timeBuf[i] - 128) / 128 : Math.sin(i / N * Math.PI * 4 + idle) * 0.16;
      const x = i * step, y = h / 2 + live * (h / 2 - 8);
      i ? sctx.lineTo(x, y) : sctx.moveTo(x, y);
    }
    sctx.stroke(); sctx.shadowBlur = 0;
  }
  function drawSpectrum() {
    const { w, h } = SP; spctx.clearRect(0, 0, w, h);
    const idle = performance.now() / 700;
    if (analyser && playing) analyser.getByteFrequencyData(freqBuf);
    const bars = 64, bw = w / bars;
    for (let i = 0; i < bars; i++) {
      const live = playing ? freqBuf[i] / 255 : 0.08 + 0.14 * (0.5 + 0.5 * Math.sin(idle + i * 0.22));
      const bh = live * (h - 6), t = i / bars;
      const r = Math.round(27 * (1 - t) + 47 * t), g = Math.round(157 * (1 - t) + 203 * t), b = Math.round(232 * (1 - t) + 190 * t);
      spctx.fillStyle = playing ? `rgba(${r},${g},${b},0.95)` : `rgba(${r},${g},${b},0.38)`;
      spctx.fillRect(i * bw + 1, h - bh, bw - 2, bh);
    }
  }

  function besselJ(m, x) {
    x = Math.abs(x);
    m = Math.max(0, Math.round(m));
    if (x < 8) {
      const h = x / 2;
      let term = 1;
      for (let i = 1; i <= m; i++) term *= h / i;
      let sum = term;
      for (let k = 1; k < 40; k++) {
        term *= -(h * h) / (k * (k + m));
        sum += term;
        if (Math.abs(term) < 1e-10) break;
      }
      return sum;
    }
    return Math.sqrt(2 / (Math.PI * x)) * Math.cos(x - m * Math.PI / 2 - Math.PI / 4);
  }
  function modeNumbers(f) {
    const t = Math.log(Math.max(f, FMIN) / FMIN) / Math.log(FMAX / FMIN);
    let n = Math.max(1, Math.min(MODE_MAX, Math.round(1 + t * 220)));
    let m = Math.max(1, Math.min(MODE_MAX, Math.round(2 + t * 140)));
    if (n === m) { m = Math.min(MODE_MAX, m + 1); if (n === m) n = Math.max(1, n - 1); }
    return { n, m };
  }
  function fieldVal(x, y, n, m) {
    if (family === "round") {
      const X = 2 * x - 1, Y = 2 * y - 1, r = Math.sqrt(X * X + Y * Y);
      if (r > 1) return 2.0;
      return besselJ(m, (2.4 * n + 1.8) * r) * Math.cos(m * Math.atan2(Y, X));
    }
    if (family === "ripple") {
      const src = 2 + ((m - 1) % 4), k = Math.PI * (2 + n * 1.4); let sum = 0;
      for (let s = 0; s < src; s++) { const a = s / src * 6.2831853; const sx = 0.5 + 0.32 * Math.cos(a), sy = 0.5 + 0.32 * Math.sin(a); sum += Math.cos(k * Math.sqrt((x - sx) * (x - sx) + (y - sy) * (y - sy))); }
      return sum / src;
    }
    return Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y) - Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y);
  }

  let grains = []; const GRAINS = reduce ? 2400 : 6200;
  function seedGrains() { grains = new Array(GRAINS); for (let i = 0; i < GRAINS; i++) grains[i] = { x: Math.random(), y: Math.random() }; }
  seedGrains();

  const fieldCanvas = document.createElement("canvas"); fieldCanvas.width = FRES; fieldCanvas.height = FRES;
  const fctx = fieldCanvas.getContext("2d");
  let fieldImg = fctx.createImageData(FRES, FRES); let lastFieldKey = "";
  const BASE = [244, 251, 255], UP = [27, 157, 232], DN = [255, 126, 110];
  function putPix(d, idx, v) { if (v > 1) v = 1; else if (v < -1) v = -1; const t = (invert ? -v : v), tg = (t >= 0 ? UP : DN), mag = Math.abs(t); d[idx] = BASE[0] + (tg[0] - BASE[0]) * mag; d[idx + 1] = BASE[1] + (tg[1] - BASE[1]) * mag; d[idx + 2] = BASE[2] + (tg[2] - BASE[2]) * mag; d[idx + 3] = 255; }
  function renderField(n, m) {
    const key = family + "|" + n + "|" + m + "|" + invert;
    if (lastFieldKey === key) return; lastFieldKey = key;
    const d = fieldImg.data;
    if (family === "square") {
      const cN = new Float32Array(FRES), cM = new Float32Array(FRES);
      for (let i = 0; i < FRES; i++) { const x = i / (FRES - 1); cN[i] = Math.cos(n * Math.PI * x); cM[i] = Math.cos(m * Math.PI * x); }
      for (let j = 0; j < FRES; j++) {
        const y = j / (FRES - 1), cNy = Math.cos(n * Math.PI * y), cMy = Math.cos(m * Math.PI * y);
        for (let i = 0; i < FRES; i++) { putPix(d, (j * FRES + i) * 4, (cN[i] * cMy - cM[i] * cNy) / 1.6); }
      }
    } else {
      const div = (family === "round") ? 0.7 : 1.0;
      for (let j = 0; j < FRES; j++) {
        const y = j / (FRES - 1);
        for (let i = 0; i < FRES; i++) {
          const x = i / (FRES - 1), raw = fieldVal(x, y, n, m), idx = (j * FRES + i) * 4;
          if (family === "round" && raw === 2.0) { d[idx] = BASE[0]; d[idx + 1] = BASE[1]; d[idx + 2] = BASE[2]; d[idx + 3] = 255; continue; }
          putPix(d, idx, raw / div);
        }
      }
    }
    fctx.putImageData(fieldImg, 0, 0);
  }

  function drawMirrorLines(w, h) {
    if (!showMirror) return;
    pctx.save(); pctx.strokeStyle = "rgba(12,109,182,0.55)"; pctx.lineWidth = 1.4; pctx.setLineDash([6, 7]);
    pctx.beginPath(); pctx.moveTo(0, 0); pctx.lineTo(w, h); pctx.moveTo(w, 0); pctx.lineTo(0, h); pctx.stroke(); pctx.restore();
  }
  function applyFlip(w, h) { if (flipH || flipV) { pctx.translate(flipH ? w : 0, flipV ? h : 0); pctx.scale(flipH ? -1 : 1, flipV ? -1 : 1); } }

  let hPhase = 0;
  function drawHarmono(w, h, n, m) {
    pctx.fillStyle = "#F3FBFF"; pctx.fillRect(0, 0, w, h);
    if (!paused && !reduce) hPhase += 0.0015 * (paceVal / 3);
    if (!paused && !dragging && !reduce) yaw += spinRate();
    const a = Math.max(1, n), b = Math.max(1, m);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.42 * viewZoom;
    const dt = 0.22 / Math.max(a, b, 2), STEPS = 3600, decay = 3.6 / (STEPS * dt), ph = hPhase + Math.PI / 2;
    const ca = Math.cos(yaw), sa = Math.sin(yaw), cb = Math.cos(pitch), sb = Math.sin(pitch);
    const fx = flipH ? -1 : 1, fy = flipV ? -1 : 1;
    pctx.lineWidth = 1.6; pctx.lineJoin = "round";
    let prev = null;
    for (let i = 0; i < STEPS; i++) {
      const t = i * dt, env = Math.exp(-decay * t);
      const x = env * Math.sin(a * t + ph), y = env * Math.sin(b * t), z = 0;
      const x1 = x * ca + z * sa, z1 = -x * sa + z * ca;
      const y2 = y * cb - z1 * sb, z2 = y * sb + z1 * cb;
      const X = cx + fx * R * x1, Y = cy - fy * R * y2;
      if (prev) {
        let d = (z2 / 1.75 + 1) / 2; if (d < 0) d = 0; else if (d > 1) d = 1;
        const A = 0.28 + 0.64 * d; let r, g, bl;
        if (invert) { r = 255; g = (105 + 80 * d) | 0; bl = (85 + 70 * d) | 0; }
        else { r = (12 + 28 * d) | 0; g = (105 + 98 * d) | 0; bl = (182 + 20 * d) | 0; }
        pctx.strokeStyle = "rgba(" + r + "," + g + "," + bl + "," + A + ")";
        pctx.beginPath(); pctx.moveTo(prev[0], prev[1]); pctx.lineTo(X, Y); pctx.stroke();
      }
      prev = [X, Y];
    }
    drawMirrorLines(w, h); label(n, m);
  }

  function build3(n, m, p) {
    const key = n + "|" + m + "|" + p; if (key === base3Key) return; base3Key = key;
    base3 = []; const N = 2000, TWO = 6.283185307, px = Math.PI / 2, py = Math.PI / 4;
    for (let i = 0; i <= N; i++) { const t = i / N * TWO; base3.push([Math.sin(n * t + px), Math.sin(m * t + py), Math.sin(p * t)]); }
  }
  function drawCurve3D(w, h, n, m, p) {
    pctx.fillStyle = "#F3FBFF"; pctx.fillRect(0, 0, w, h);
    build3(n, m, p);
    if (!paused && !dragging && !reduce) yaw += spinRate();
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.40 * viewZoom;
    const ca = Math.cos(yaw), sa = Math.sin(yaw), cb = Math.cos(pitch), sb = Math.sin(pitch);
    const fx = flipH ? -1 : 1, fy = flipV ? -1 : 1;
    pctx.lineWidth = 1.7; pctx.lineJoin = "round";
    let prev = null;
    for (let i = 0; i < base3.length; i++) {
      const P = base3[i], x = P[0], y = P[1], z = P[2];
      const x1 = x * ca + z * sa, z1 = -x * sa + z * ca;
      const y2 = y * cb - z1 * sb, z2 = y * sb + z1 * cb;
      const X = cx + fx * R * x1, Y = cy - fy * R * y2;
      if (prev) {
        let t = (z2 / 1.75 + 1) / 2; if (t < 0) t = 0; else if (t > 1) t = 1;
        const A = 0.30 + 0.64 * t; let r, g, b;
        if (invert) { r = 255; g = (105 + 80 * t) | 0; b = (85 + 70 * t) | 0; } else { r = (12 + 28 * t) | 0; g = (105 + 98 * t) | 0; b = (182 + 20 * t) | 0; }
        pctx.strokeStyle = "rgba(" + r + "," + g + "," + b + "," + A + ")";
        pctx.beginPath(); pctx.moveTo(prev[0], prev[1]); pctx.lineTo(X, Y); pctx.stroke();
      }
      prev = [X, Y];
    }
    modeNM.textContent = "3D curve · " + n + ":" + m + ":" + p;
    if (patternSource === "pitch") { nSlider.value = n; mSlider.value = m; nLabel.textContent = n; mLabel.textContent = m; pSlider.value = p; pLabel.textContent = p; }
  }

  function heightAt(kind, n, m, x, y) {
    if (kind === "drum") {
      const X = 2 * x - 1, Y = 2 * y - 1, r = Math.sqrt(X * X + Y * Y);
      if (r > 1) return NaN;
      return besselJ(m, (2.4 * n + 1.8) * r) * Math.cos(m * Math.atan2(Y, X));
    }
    return Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y) - Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y);
  }
  function numOr(v, d) { return Number.isFinite(v) ? v : d; }
  function buildSurface(n, m, kind) {
    kind = kind || "plate";
    const key = kind + "|" + n + "|" + m; if (key === surfKey && surfH) return; surfKey = key;
    const G = GS, W = G + 1;
    surfH = new Float32Array(W * W);
    for (let j = 0; j < W; j++) { for (let i = 0; i < W; i++) { surfH[j * W + i] = heightAt(kind, n, m, i / G, j / G); } }
    surfNX = new Float32Array(W * W); surfNY = new Float32Array(W * W); surfNZ = new Float32Array(W * W);
    const amp = 0.9, d = 1 / G;
    for (let j = 0; j < W; j++) { for (let i = 0; i < W; i++) {
      if (!Number.isFinite(surfH[j * W + i])) { surfNX[j * W + i] = 0; surfNY[j * W + i] = 0; surfNZ[j * W + i] = 1; continue; }
      const hL = numOr(surfH[j * W + Math.max(0, i - 1)], surfH[j * W + i]);
      const hR = numOr(surfH[j * W + Math.min(W - 1, i + 1)], surfH[j * W + i]);
      const hD = numOr(surfH[Math.max(0, j - 1) * W + i], surfH[j * W + i]);
      const hU = numOr(surfH[Math.min(W - 1, j + 1) * W + i], surfH[j * W + i]);
      const dzx = (hR - hL) * amp / (2 * d), dzy = (hU - hD) * amp / (2 * d);
      let nx = -dzx, ny = -dzy, nz = 1, L = Math.hypot(nx, ny, nz) || 1;
      surfNX[j * W + i] = nx / L; surfNY[j * W + i] = ny / L; surfNZ[j * W + i] = nz / L;
    } }
  }
  function drawSurface(w, h, n, m, kind) {
    kind = kind || "plate";
    pctx.fillStyle = "#F3FBFF"; pctx.fillRect(0, 0, w, h);
    buildSurface(n, m, kind);
    if (!paused && !dragging && !reduce) yaw += spinRate();
    const G = GS, W = G + 1, amp = 0.9;
    const ca = Math.cos(yaw), sa = Math.sin(yaw), cb = Math.cos(pitch), sb = Math.sin(pitch);
    const fx = flipH ? -1 : 1, fy = flipV ? -1 : 1, cx = w / 2, cy = h / 2, R = Math.min(w, h) * (kind === "drum" ? 0.58 : 0.62) * viewZoom;
    const Lx = 0.35, Ly = 0.45, Lz = 0.82;
    const px = new Float32Array(W * W), py = new Float32Array(W * W), pz = new Float32Array(W * W);
    const nrx = new Float32Array(W * W), nry = new Float32Array(W * W), nrz = new Float32Array(W * W);
    for (let j = 0; j < W; j++) { for (let i = 0; i < W; i++) { const idx = j * W + i;
      const hgt = Number.isFinite(surfH[idx]) ? surfH[idx] : 0;
      const mx = (i / G - 0.5), my = hgt * amp * 0.5, mz = (j / G - 0.5);
      const x1 = mx * ca + mz * sa, z1 = -mx * sa + mz * ca, y2 = my * cb - z1 * sb, z2 = my * sb + z1 * cb;
      px[idx] = cx + fx * R * x1; py[idx] = cy - fy * R * y2; pz[idx] = z2;
      const nX = surfNX[idx], nY = surfNZ[idx], nZ = surfNY[idx];
      const nx1 = nX * ca + nZ * sa, nz1 = -nX * sa + nZ * ca, ny2 = nY * cb - nz1 * sb, nz2 = nY * sb + nz1 * cb;
      nrx[idx] = nx1; nry[idx] = ny2; nrz[idx] = nz2;
    } }
    const quads = [];
    for (let j = 0; j < G; j++) { for (let i = 0; i < G; i++) {
      const a = j * W + i, b = j * W + i + 1, c = (j + 1) * W + i + 1, dd = (j + 1) * W + i;
      if (kind === "drum" && (!Number.isFinite(surfH[a]) || !Number.isFinite(surfH[b]) || !Number.isFinite(surfH[c]) || !Number.isFinite(surfH[dd]))) continue;
      const depth = (pz[a] + pz[b] + pz[c] + pz[dd]) * 0.25, hAvg = (surfH[a] + surfH[b] + surfH[c] + surfH[dd]) * 0.5;
      let nx = nrx[a] + nrx[b] + nrx[c] + nrx[dd], ny = nry[a] + nry[b] + nry[c] + nry[dd], nz = nrz[a] + nrz[b] + nrz[c] + nrz[dd];
      const Ln = Math.hypot(nx, ny, nz) || 1; let diff = (nx * Lx + ny * Ly + nz * Lz) / Ln; diff = 0.4 + 0.72 * Math.max(0, diff);
      quads.push({ a, b, c, d: dd, depth, h: hAvg, diff });
    } }
    quads.sort((p, q) => p.depth - q.depth);
    for (const Q of quads) {
      let hn = Q.h / 1.6; if (hn > 1) hn = 1; else if (hn < -1) hn = -1; if (invert) hn = -hn;
      let r, g, b;
      if (hn >= 0) { r = 244 + (27 - 244) * hn; g = 251 + (157 - 251) * hn; b = 255 + (232 - 255) * hn; }
      else { const t = -hn; r = 244 + (255 - 244) * t; g = 251 + (126 - 251) * t; b = 255 + (110 - 255) * t; }
      const df = Q.diff; r = r * df; g = g * df; b = b * df;
      r = r > 255 ? 255 : r; g = g > 255 ? 255 : g; b = b > 255 ? 255 : b;
      pctx.fillStyle = "rgb(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + ")"; pctx.strokeStyle = pctx.fillStyle; pctx.lineWidth = 1;
      pctx.beginPath(); pctx.moveTo(px[Q.a], py[Q.a]); pctx.lineTo(px[Q.b], py[Q.b]); pctx.lineTo(px[Q.c], py[Q.c]); pctx.lineTo(px[Q.d], py[Q.d]); pctx.closePath(); pctx.fill(); pctx.stroke();
    }
    modeNM.textContent = (kind === "drum" ? "3D drum" : "surface") + " · " + n + "×" + m;
    if (patternSource === "pitch") { nSlider.value = n; mSlider.value = m; nLabel.textContent = n; mLabel.textContent = m; }
  }

  function buildOrb(n, m) {
    const key = n + "|" + m; if (key === orbKey && orbPts.length) return; orbKey = key;
    const N = 3600, ga = Math.PI * (3 - Math.sqrt(5));
    orbPts = new Array(N);
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const radXY = Math.sqrt(Math.max(0, 1 - y * y));
      const phi = i * ga;
      const x = Math.cos(phi) * radXY, z = Math.sin(phi) * radXY;
      const theta = Math.acos(Math.max(-1, Math.min(1, y)));
      const disp = Math.cos(n * theta) * Math.cos(m * Math.atan2(z, x));
      const rad = 0.68 + 0.32 * disp;
      orbPts[i] = [x * rad, y * rad, z * rad, disp];
    }
  }
  function drawOrb(w, h, n, m) {
    pctx.fillStyle = "#F3FBFF"; pctx.fillRect(0, 0, w, h);
    buildOrb(n, m);
    if (!paused && !dragging && !reduce) yaw += spinRate();
    const ca = Math.cos(yaw), sa = Math.sin(yaw), cb = Math.cos(pitch), sb = Math.sin(pitch);
    const fx = flipH ? -1 : 1, fy = flipV ? -1 : 1, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.42 * viewZoom;
    const pts = new Array(orbPts.length);
    for (let i = 0; i < orbPts.length; i++) {
      const P = orbPts[i], x = P[0], y = P[1], z = P[2];
      const x1 = x * ca + z * sa, z1 = -x * sa + z * ca;
      const y2 = y * cb - z1 * sb, z2 = y * sb + z1 * cb;
      pts[i] = { X: cx + fx * R * x1, Y: cy - fy * R * y2, z: z2, v: P[3] };
    }
    pts.sort((a, b) => a.z - b.z);
    for (let i = 0; i < pts.length; i++) {
      const P = pts[i];
      let t = (P.z / 1.6 + 1) / 2; if (t < 0) t = 0; else if (t > 1) t = 1;
      let hn = invert ? -P.v : P.v;
      let r, g, b;
      if (hn >= 0) { r = 12 + 28 * t; g = 105 + 98 * t; b = 182 + 40 * t; }
      else { r = 255; g = 110 + 40 * t; b = 100 + 30 * t; }
      const a = 0.22 + 0.72 * t, s = 1.05 + 1.55 * t;
      pctx.fillStyle = "rgba(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + "," + a + ")";
      pctx.fillRect(P.X, P.Y, s, s);
    }
    modeNM.textContent = "3D orb · " + n + "×" + m;
    if (patternSource === "pitch") { nSlider.value = n; mSlider.value = m; nLabel.textContent = n; mLabel.textContent = m; }
  }

  function downloadBlob(name, text, type) {
    const blob = new Blob([text], { type: type || "text/plain" }), url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 120);
  }
  function exportPNG() {
    const finish = (url) => { const a = document.createElement("a"); a.href = url; a.download = "frequency-" + family + ".png"; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 120); };
    try { plate.toBlob(b => { const url = URL.createObjectURL(b); finish(url); setTimeout(() => URL.revokeObjectURL(url), 200); }, "image/png"); }
    catch (e) { finish(plate.toDataURL("image/png")); }
  }
  function exportOBJ() {
    let obj = "# Resonance — " + family + "\n", name;
    if (family === "curve3d") {
      const c = current3(); build3(c.n, c.m, c.p);
      for (const P of base3) obj += "v " + (P[0] * 50).toFixed(4) + " " + (P[1] * 50).toFixed(4) + " " + (P[2] * 50).toFixed(4) + "\n";
      obj += "l"; for (let i = 1; i <= base3.length; i++) obj += " " + i; obj += "\n";
      name = "frequency-curve-" + c.n + "-" + c.m + "-" + c.p + ".obj";
    } else if (family === "harmono") {
      const nm = currentNM();
      const a = Math.max(1, nm.n), b = Math.max(1, nm.m), N = 2000, dt = 0.22 / Math.max(a, b, 2), decay = 3.6 / (N * dt);
      for (let i = 0; i <= N; i++) {
        const t = i * dt, env = Math.exp(-decay * t);
        obj += "v " + (env * Math.sin(a * t + Math.PI / 2) * 50).toFixed(4) + " " + (env * Math.sin(b * t) * 50).toFixed(4) + " 0\n";
      }
      obj += "l"; for (let i = 1; i <= N + 1; i++) obj += " " + i; obj += "\n";
      name = "frequency-harmonograph-" + a + "-" + b + ".obj";
    } else if (family === "orb") {
      const nm = currentNM(); buildOrb(nm.n, nm.m);
      for (const P of orbPts) obj += "v " + (P[0] * 50).toFixed(4) + " " + (P[1] * 50).toFixed(4) + " " + (P[2] * 50).toFixed(4) + "\n";
      name = "frequency-orb-" + nm.n + "-" + nm.m + ".obj";
    } else {
      const kind = family === "drum3d" ? "drum" : "plate";
      const nm = currentNM(); buildSurface(nm.n, nm.m, kind); const G = GS, W = G + 1, amp = 0.9;
      for (let j = 0; j < W; j++) { for (let i = 0; i < W; i++) {
        const hgt = Number.isFinite(surfH[j * W + i]) ? surfH[j * W + i] : 0;
        const X = (i / G - 0.5) * 100, Yy = hgt * amp * 0.5 * 100, Z = (j / G - 0.5) * 100;
        obj += "v " + X.toFixed(3) + " " + Yy.toFixed(3) + " " + Z.toFixed(3) + "\n";
      } }
      for (let j = 0; j < G; j++) { for (let i = 0; i < G; i++) {
        const ia = j * W + i, ib = j * W + i + 1, ic = (j + 1) * W + i + 1, id = (j + 1) * W + i;
        if (kind === "drum" && (!Number.isFinite(surfH[ia]) || !Number.isFinite(surfH[ib]) || !Number.isFinite(surfH[ic]) || !Number.isFinite(surfH[id]))) continue;
        obj += "f " + (ia + 1) + " " + (ib + 1) + " " + (ic + 1) + " " + (id + 1) + "\n";
      } }
      name = "frequency-" + (kind === "drum" ? "drum" : "surface") + "-" + nm.n + "-" + nm.m + ".obj";
    }
    downloadBlob(name, obj, "text/plain");
  }

  function drawPlate() {
    const { w, h } = PL;
    if (family === "curve3d") { const c = current3(); drawCurve3D(w, h, c.n, c.m, c.p); return; }
    if (family === "surface") { const s = currentNM(); drawSurface(w, h, s.n, s.m, "plate"); return; }
    if (family === "drum3d") { const s = currentNM(); drawSurface(w, h, s.n, s.m, "drum"); return; }
    if (family === "orb") { const s = currentNM(); drawOrb(w, h, s.n, s.m); return; }
    const { n, m } = currentNM();
    if (family === "harmono") { drawHarmono(w, h, n, m); return; }
    if (plateView === "field") {
      renderField(n, m);
      pctx.save(); applyFlip(w, h); pctx.imageSmoothingEnabled = true;
      const dw = w * viewZoom, dh = h * viewZoom;
      pctx.drawImage(fieldCanvas, (w - dw) / 2, (h - dh) / 2, dw, dh);
      pctx.restore();
      drawMirrorLines(w, h); label(n, m); return;
    }
    pctx.fillStyle = "rgba(244,251,255,0.16)"; pctx.fillRect(0, 0, w, h);
    const dens = 1 + (n + m) / 70;
    const step = ((reduce ? 0.007 : 0.010) * (paceVal / 3)) / dens;
    const jitter = (0.00105 * (paceVal / 3)) / (1 + (n + m) / 110);
    const wander = 0.018 / dens;
    const grainSize = reduce ? 1.0 : (n + m > 80 ? 0.95 : 1.15);
    pctx.save(); applyFlip(w, h);
    pctx.fillStyle = invert ? "rgba(255,110,92,0.85)" : "rgba(13,88,151,0.82)";
    for (let i = 0; i < grains.length; i++) {
      const p = grains[i];
      if (!paused) {
        const cur = Math.abs(fieldVal(p.x, p.y, n, m));
        const nx = Math.min(1, Math.max(0, p.x + (Math.random() * 2 - 1) * step));
        const ny = Math.min(1, Math.max(0, p.y + (Math.random() * 2 - 1) * step));
        if (Math.abs(fieldVal(nx, ny, n, m)) < cur || Math.random() < wander) { p.x = nx; p.y = ny; }
        p.x = Math.min(1, Math.max(0, p.x + (Math.random() * 2 - 1) * jitter));
        p.y = Math.min(1, Math.max(0, p.y + (Math.random() * 2 - 1) * jitter));
      }
      const zx = 0.5 + (p.x - 0.5) * viewZoom, zy = 0.5 + (p.y - 0.5) * viewZoom;
      if (zx < -0.08 || zx > 1.08 || zy < -0.08 || zy > 1.08) continue;
      const gs = grainSize * Math.min(1.35, 0.85 + viewZoom * 0.2);
      pctx.fillRect(zx * w, zy * h, gs, gs);
    }
    pctx.restore(); drawMirrorLines(w, h); label(n, m);
  }
  function label(n, m) { modeNM.textContent = family === "harmono" ? ("harmonograph · " + n + ":" + m) : (family + " · " + n + "×" + m); syncModeSliders(n, m); }

  const SWEEP_LO = 240, SWEEP_HI = 1000;
  let sweepDir = -1, sweepSpeedVal = 3;
  let rafId = 0;
  function loop() {
    if (sweeping && !paused) {
      const speed = 0.12 + sweepSpeedVal * 0.16;
      let v = +freqSlider.value + sweepDir * speed;
      if (v >= SWEEP_HI) { v = SWEEP_HI; sweepDir = -1; } if (v <= SWEEP_LO) { v = SWEEP_LO; sweepDir = 1; }
      freqSlider.value = v; freq = sliderToFreq(v); paintFreq(); retune();
      lastFieldKey = "";
    }
    drawScope(); drawSpectrum(); drawPlate();
    rafId = requestAnimationFrame(loop);
  }

  const genOverlay = $("genOverlay"), genThumb = $("genThumb"), genPrompt = $("genPrompt"),
    genStrength = $("genStrength"), genGo = $("genGo"), genStatus = $("genStatus"),
    genForm = $("genForm"), genResultWrap = $("genResultWrap"), genOut = $("genOut");
  let genImgData = "";
  function captureSquare(size) {
    const c = document.createElement("canvas"); c.width = size; c.height = size;
    const g = c.getContext("2d"); g.fillStyle = "#F3FBFF"; g.fillRect(0, 0, size, size);
    g.drawImage(plate, 0, 0, size, size); return c.toDataURL("image/jpeg", 0.85);
  }
  function openGen() { genImgData = captureSquare(1024); genThumb.src = genImgData; genResultWrap.hidden = true; genForm.style.display = ""; genStatus.textContent = ""; genOverlay.hidden = false; }
  function closeGen() { genOverlay.hidden = true; }
  $("genOpen").addEventListener("click", openGen);
  $("genClose").addEventListener("click", closeGen);
  genOverlay.addEventListener("click", e => { if (e.target === genOverlay) closeGen(); });
  $("genAgain").addEventListener("click", () => { genResultWrap.hidden = true; genForm.style.display = ""; genStatus.textContent = ""; });
  $("genSave").addEventListener("click", async e => {
    e.preventDefault();
    try { const r = await fetch(genOut.src); const b = await r.blob(); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = "frequency-render.png"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 200); }
    catch (_) { window.open(genOut.src, "_blank"); }
  });
  async function generate() {
    const prompt = genPrompt.value.trim();
    if (!prompt) { genStatus.textContent = "Type a description first."; return; }
    genGo.disabled = true; genForm.style.display = "none"; genResultWrap.hidden = true;
    genStatus.innerHTML = '<div class="gen-spin"></div>Generating image…';
    try {
      const resp = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: genImgData, prompt, strength: (+genStrength.value) / 100 }) });
      let j = {}; try { j = await resp.json(); } catch (_) {}
      if (resp.ok && j.url) { genOut.src = j.url; genStatus.textContent = ""; genResultWrap.hidden = false; }
      else { genForm.style.display = ""; genStatus.textContent = (j && j.error) ? j.error : ("Render failed (" + resp.status + "). Add GEMINI_API_KEY in Vercel, then Redeploy."); }
    } catch (err) { genForm.style.display = ""; genStatus.textContent = "Can't reach the AI server — the live Vercel site is required (localhost won't call Gemini)."; }
    genGo.disabled = false;
  }
  genGo.addEventListener("click", generate);

  updateZLine(); updateGrab(); updateModelChip();
  rafId = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", onResize);
    stop();
  };
}
