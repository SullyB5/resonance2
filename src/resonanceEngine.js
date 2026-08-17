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
  let patternSource = "manual", manN = 6, manM = 4, flipH = false, flipV = false, family = "orb", manP = 5;
  let yaw = 0.7, pitch = 0.42, dragging = false, lastX = 0, lastY = 0, base3 = [], base3Key = "";
  let orbPts = [], orbKey = "";
  const GS = 96;
  const SURF_GS = reduce ? 48 : 64;
  const MODE_MAX = 500;
  const SAND_MODE_MAX = 48;
  const FRES = 640;
  let paceVal = 3;
  const THREE_D = () => family === "curve3d" || family === "surface" || family === "orb" || family === "drum3d";
  const ROTATABLE = () => THREE_D() || family === "harmono";
  const USES_PITCH = () => family === "square" || family === "round" || family === "ripple";
  const spinRate = () => (reduce || paused || dragging) ? 0 : 0.0015 * (paceVal / 3);
  let surfKey = "", surfH = null, surfNX = null, surfNY = null, surfNZ = null, patternRev = 0;

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
  const playBtn = $("play"), playTxt = $("playTxt"), modeNM = $("modeNM");
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

  function applyFreqFromSlider(v) {
    freq = sliderToFreq(v);
    paintFreq();
    retune();
    if (patternSource === "pitch" && USES_PITCH()) invalidatePattern();
  }
  if (freqSlider) {
    freqSlider.addEventListener("input", e => applyFreqFromSlider(+e.target.value));
    freqSlider.addEventListener("change", e => applyFreqFromSlider(+e.target.value));
  }
  volSlider.addEventListener("input", e => { vol = (+e.target.value) / 100 * 0.8; if (ctx && playing) master.gain.setTargetAtTime(vol, ctx.currentTime, 0.02); });
  playBtn.addEventListener("click", () => playing ? stop() : start());
  document.querySelectorAll("#waves button").forEach(b => b.addEventListener("click", () => {
    wave = b.dataset.w; document.querySelectorAll("#waves button").forEach(x => x.setAttribute("aria-pressed", x === b));
    if (playing) { buildVoices(); master.gain.setValueAtTime(vol, ctx.currentTime); }
  }));
  document.querySelectorAll("#modes button").forEach(b => b.addEventListener("click", () => {
    mode = b.dataset.m; document.querySelectorAll("#modes button").forEach(x => x.setAttribute("aria-pressed", x === b));
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
  let appPage = "studio";
  const STUDIO_FAMS = ["harmono", "curve3d", "surface", "orb", "drum3d"];
  const LAB_FAMS = ["square", "round", "ripple"];
  function isStudioFamily(f) { return STUDIO_FAMS.includes(f); }
  function syncFamilyButtons() {
    document.querySelectorAll("#familiesStudio button").forEach(x => x.setAttribute("aria-pressed", x.dataset.f === family));
    document.querySelectorAll("#familiesLab button").forEach(x => x.setAttribute("aria-pressed", x.dataset.f === family));
  }
  function modeCap() { return USES_PITCH() ? SAND_MODE_MAX : (isStudioFamily(family) ? 120 : MODE_MAX); }
  function setPatternSource(src) {
    patternSource = src;
    document.querySelectorAll("#psource button").forEach(x => x.setAttribute("aria-pressed", x.dataset.p === src));
    if (src === "manual" && sweeping) {
      sweeping = false;
      paintSweep();
    }
    invalidatePattern();
  }
  function updateStageControls() {
    const pitchPattern = USES_PITCH();
    const onLab = appPage === "lab";
    const psourceBlock = $("psourceBlock");
    const sweepBlock = $("sweepBlock");
    const viewGroup = $("views");
    const mirrorBtn = $("mirror");
    if (psourceBlock) psourceBlock.hidden = !onLab;
    if (sweepBlock) sweepBlock.hidden = !onLab;
    if (viewGroup) viewGroup.hidden = !onLab || !pitchPattern;
    if (mirrorBtn) mirrorBtn.hidden = !onLab || !pitchPattern;
    if (!pitchPattern) {
      if (patternSource === "pitch") setPatternSource("manual");
      else if (sweeping) { sweeping = false; paintSweep(); }
    }
    syncModeSliderCaps();
  }
  function syncModeSliderCaps() {
    if (!nSlider || !mSlider) return;
    const cap = modeCap(), min = USES_PITCH() ? 2 : 1;
    nSlider.min = String(min); mSlider.min = String(min);
    nSlider.max = String(cap); mSlider.max = String(cap);
    manN = Math.max(min, Math.min(cap, manN));
    manM = Math.max(min, Math.min(cap, manM));
    if (manN === manM) manM = Math.min(cap, manM + 1);
    nSlider.value = String(manN); mSlider.value = String(manM);
    nLabel.textContent = manN; mLabel.textContent = manM;
  }
  function invalidatePattern() {
    patternRev++;
    lastFieldKey = "";
    surfKey = ""; surfH = null; surfNX = null; surfNY = null; surfNZ = null;
    base3Key = ""; orbKey = ""; orbPts = [];
    if (USES_PITCH() && plateView === "sand") seedGrains();
  }
  function setManualFromSliders(changed) {
    const cap = modeCap(), min = USES_PITCH() ? 2 : 1;
    nSlider.max = String(cap); mSlider.max = String(cap);
    manN = Math.max(min, Math.min(cap, +nSlider.value));
    manM = Math.max(min, Math.min(cap, +mSlider.value));
    if (manN === manM) {
      if (changed === "n") manM = Math.min(cap, manM + 1);
      else manN = Math.min(cap, manN + 1);
      if (manN === manM) manM = Math.max(min, manM - 1);
    }
    nSlider.value = String(manN); mSlider.value = String(manM);
    nLabel.textContent = manN; mLabel.textContent = manM;
    setPatternSource("manual");
  }
  nSlider.addEventListener("input", () => setManualFromSliders("n"));
  mSlider.addEventListener("input", () => setManualFromSliders("m"));
  nSlider.addEventListener("change", () => setManualFromSliders("n"));
  mSlider.addEventListener("change", () => setManualFromSliders("m"));
  document.querySelectorAll("#psource button").forEach(b => b.addEventListener("click", () => {
    setPatternSource(b.dataset.p);
  }));
  function sandModesFromFreq(f) {
    const t = Math.log(Math.max(f, FMIN) / FMIN) / Math.log(FMAX / FMIN);
    let n = Math.max(2, Math.min(SAND_MODE_MAX, Math.round(2 + t * (SAND_MODE_MAX - 2))));
    let m = Math.max(2, Math.min(SAND_MODE_MAX, Math.round(2 + t * (SAND_MODE_MAX - 2) * 0.82)));
    if (n === m) m = Math.min(SAND_MODE_MAX, m + 1);
    return { n, m };
  }
  function currentNM() {
    if (patternSource === "pitch" && USES_PITCH()) return sandModesFromFreq(freq);
    return { n: manN, m: manM };
  }

  const pSlider = $("pSlider"), pLabel = $("pLabel"), zLine = $("zLine");
  pSlider.addEventListener("input", () => { manP = +pSlider.value; pLabel.textContent = manP; setPatternSource("manual"); });
  pSlider.addEventListener("change", () => { manP = +pSlider.value; pLabel.textContent = manP; setPatternSource("manual"); });
  function updateZLine() { zLine.style.display = family === "curve3d" ? "flex" : "none"; }
  function updateGrab() { plate.classList.toggle("grab", ROTATABLE()); }
  function updateModelChip() { $("saveModel").style.display = ROTATABLE() ? "inline-block" : "none"; }
  $("saveImg").addEventListener("click", exportPNG);
  $("saveModel").addEventListener("click", exportOBJ);
  function current3() {
    return { n: manN, m: manM, p: manP };
  }

  function resetViewForFamily() {
    if (family === "surface" || family === "drum3d") { yaw = 0.55; pitch = 1.05; }
    else if (family === "curve3d" || family === "orb") { yaw = 0.7; pitch = 0.42; }
    else if (family === "harmono") { yaw = 0; pitch = 0; }
  }
  function applyState(s) {
    if (s.family) family = s.family;
    syncFamilyButtons();
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
    syncModeSliderCaps();
    if (s.n != null || s.m != null || s.p != null) setPatternSource("manual");
    else invalidatePattern();
    seedGrains();
    updateZLine(); updateGrab(); updateModelChip(); updateStageControls();
  }
  document.querySelectorAll("#familiesStudio button").forEach(b => b.addEventListener("click", () => {
    applyState({ family: b.dataset.f, n: 6, m: 4, p: 5 });
    setPatternSource("manual");
    paintLook("");
  }));
  document.querySelectorAll("#familiesLab button").forEach(b => b.addEventListener("click", () => {
    applyState({ family: b.dataset.f, n: 6, m: 4, view: "sand" });
    setPatternSource("pitch");
    paintLook("");
  }));
  $("dice").addEventListener("click", () => {
    const onLab = appPage === "lab";
    const fams = onLab ? LAB_FAMS : STUDIO_FAMS;
    const randMode = () => {
      if (onLab) return 2 + Math.floor(Math.random() * (SAND_MODE_MAX - 1));
      const r = Math.random();
      if (r < 0.7) return 2 + Math.floor(Math.random() * 20);
      return 20 + Math.floor(Math.random() * 40);
    };
    let n = randMode(), m = randMode();
    const cap = onLab ? SAND_MODE_MAX : 120;
    if (n === m) m = Math.min(cap, m + 1);
    applyState({
      family: fams[Math.floor(Math.random() * fams.length)],
      n, m, p: randMode(),
      view: onLab ? (Math.random() < 0.5 ? "field" : "sand") : "field"
    });
    if (onLab) setPatternSource("pitch");
    paintLook("");
  });
  const LOOKS = {
    galaxy: { family: "orb", n: 6, m: 4, view: "field", invert: false },
    nebula: { family: "orb", n: 11, m: 5, view: "field", invert: false },
    drum: { family: "drum3d", n: 5, m: 3, view: "field", invert: false },
    infinity: { family: "harmono", n: 2, m: 1, view: "field", invert: false }
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

  const plate = $("plate"), pctx = plate.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  function fit(cv, c) { const r = cv.getBoundingClientRect(); cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr); c.setTransform(dpr, 0, 0, dpr, 0, 0); return { w: r.width, h: r.height }; }
  let PL = fit(plate, pctx);
  const onResize = () => { PL = fit(plate, pctx); seedGrains(); };
  window.addEventListener("resize", onResize);

  plate.addEventListener("pointerdown", e => { if (!ROTATABLE()) return; dragging = true; lastX = e.clientX; lastY = e.clientY; try { plate.setPointerCapture(e.pointerId); } catch (_) {} });
  plate.addEventListener("pointermove", e => { if (!dragging) return; yaw += (e.clientX - lastX) * 0.01; pitch += (e.clientY - lastY) * 0.01; pitch = Math.max(-1.45, Math.min(1.45, pitch)); lastX = e.clientX; lastY = e.clientY; });
  const endDrag = () => { dragging = false; };
  plate.addEventListener("pointerup", endDrag); plate.addEventListener("pointercancel", endDrag); plate.addEventListener("pointerleave", endDrag);
  plate.addEventListener("wheel", e => {
    e.preventDefault();
    setZoom(viewZoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  }, { passive: false });

  let vizBg = "#F3FBFF";
  let modelRgb = { r: 27, g: 157, b: 232 };
  let accentRgb = { r: 255, g: 126, b: 110 };
  function hexToRgb(hex) {
    const h = (hex || "#000000").replace("#", "");
    const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
    return {
      r: parseInt(full.slice(0, 2), 16) || 0,
      g: parseInt(full.slice(2, 4), 16) || 0,
      b: parseInt(full.slice(4, 6), 16) || 0
    };
  }
  function applyVizColors() {
    plate.style.background = vizBg;
  }
  function fillVizBg(w, h) {
    pctx.fillStyle = vizBg;
    pctx.fillRect(0, 0, w, h);
  }
  function modelChannel(base, peak, hn, depth) {
    const t = hn >= 0 ? hn : -hn;
    const d = 0.42 + 0.58 * depth;
    return Math.min(255, (base + (peak - base) * t) * d);
  }
  function modelDotColor(v, depth) {
    let hn = invert ? -v : v;
    const t = depth < 0 ? 0 : depth > 1 ? 1 : depth;
    let r, g, b;
    if (hn >= 0) {
      r = modelChannel(40, modelRgb.r, hn, t);
      g = modelChannel(90, modelRgb.g, hn, t);
      b = modelChannel(160, modelRgb.b, hn, t);
    } else {
      r = modelChannel(200, accentRgb.r, -hn, t);
      g = modelChannel(120, accentRgb.g, -hn, t);
      b = modelChannel(110, accentRgb.b, -hn, t);
    }
    const a = 0.52 + 0.46 * t;
    const s = 1.6 + 2.4 * t;
    return { r, g, b, a, s };
  }
  function modelLineColor(v, depth) {
    const c = modelDotColor(v, depth);
    return { r: c.r, g: c.g, b: c.b, a: 0.38 + 0.58 * depth };
  }
  function surfaceShade(hAvg, diff) {
    let hn = hAvg / 1.6;
    if (hn > 1) hn = 1; else if (hn < -1) hn = -1;
    if (invert) hn = -hn;
    const df = diff;
    let r, g, b;
    if (hn >= 0) {
      r = 244 + (modelRgb.r - 244) * hn;
      g = 251 + (modelRgb.g - 251) * hn;
      b = 255 + (modelRgb.b - 255) * hn;
    } else {
      const t = -hn;
      r = 244 + (accentRgb.r - 244) * t;
      g = 251 + (accentRgb.g - 251) * t;
      b = 255 + (accentRgb.b - 255) * t;
    }
    r = Math.min(255, r * df);
    g = Math.min(255, g * df);
    b = Math.min(255, b * df);
    return { r: r | 0, g: g | 0, b: b | 0 };
  }
  const vizBgInput = $("vizBg"), vizModelInput = $("vizModel"), vizAccentInput = $("vizAccent");
  function wireColorInput(el, key) {
    if (!el) return;
    el.addEventListener("input", () => {
      const rgb = hexToRgb(el.value);
      if (key === "bg") vizBg = el.value;
      else if (key === "model") modelRgb = rgb;
      else accentRgb = rgb;
      applyVizColors();
    });
  }
  wireColorInput(vizBgInput, "bg");
  wireColorInput(vizModelInput, "model");
  wireColorInput(vizAccentInput, "accent");
  applyVizColors();

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

  let grains = []; const GRAINS = reduce ? 4000 : 7200;
  function seedGrains() { grains = new Array(GRAINS); for (let i = 0; i < GRAINS; i++) grains[i] = { x: Math.random(), y: Math.random() }; }
  seedGrains();

  const fieldCanvas = document.createElement("canvas"); fieldCanvas.width = FRES; fieldCanvas.height = FRES;
  const fctx = fieldCanvas.getContext("2d");
  let fieldImg = fctx.createImageData(FRES, FRES); let lastFieldKey = "";
  const BASE = [244, 251, 255], UP = [27, 157, 232], DN = [255, 126, 110];
  function putPix(d, idx, v) {
    if (v > 1) v = 1; else if (v < -1) v = -1;
    const t = invert ? -v : v, tg = (t >= 0 ? UP : DN);
    const mag = Math.pow(Math.abs(t), 0.78);
    d[idx] = BASE[0] + (tg[0] - BASE[0]) * mag;
    d[idx + 1] = BASE[1] + (tg[1] - BASE[1]) * mag;
    d[idx + 2] = BASE[2] + (tg[2] - BASE[2]) * mag;
    d[idx + 3] = 255;
  }
  function renderField(n, m) {
    const key = family + "|" + n + "|" + m + "|" + invert;
    if (lastFieldKey === key) return; lastFieldKey = key;
    const d = fieldImg.data;
    if (family === "square") {
      const cN = new Float32Array(FRES), cM = new Float32Array(FRES);
      for (let i = 0; i < FRES; i++) { const x = i / (FRES - 1); cN[i] = Math.cos(n * Math.PI * x); cM[i] = Math.cos(m * Math.PI * x); }
      for (let j = 0; j < FRES; j++) {
        const y = j / (FRES - 1), cNy = Math.cos(n * Math.PI * y), cMy = Math.cos(m * Math.PI * y);
        for (let i = 0; i < FRES; i++) { putPix(d, (j * FRES + i) * 4, (cN[i] * cMy - cM[i] * cNy) / 1.35); }
      }
    } else {
      const div = (family === "round") ? 0.62 : 0.88;
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
    fillVizBg(w, h);
    if (!paused && !reduce) hPhase += 0.0015 * (paceVal / 3);
    if (!paused && !dragging && !reduce) yaw += spinRate();
    const a = Math.max(1, n), b = Math.max(1, m);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.46 * viewZoom;
    const dt = 0.22 / Math.max(a, b, 2), STEPS = 3600, decay = 3.6 / (STEPS * dt), ph = hPhase + Math.PI / 2;
    const ca = Math.cos(yaw), sa = Math.sin(yaw), cb = Math.cos(pitch), sb = Math.sin(pitch);
    const fx = flipH ? -1 : 1, fy = flipV ? -1 : 1;
    pctx.lineWidth = 2.2; pctx.lineJoin = "round";
    let prev = null;
    for (let i = 0; i < STEPS; i++) {
      const t = i * dt, env = Math.exp(-decay * t);
      const x = env * Math.sin(a * t + ph), y = env * Math.sin(b * t), z = 0;
      const x1 = x * ca + z * sa, z1 = -x * sa + z * ca;
      const y2 = y * cb - z1 * sb, z2 = y * sb + z1 * cb;
      const X = cx + fx * R * x1, Y = cy - fy * R * y2;
      if (prev) {
        let d = (z2 / 1.75 + 1) / 2; if (d < 0) d = 0; else if (d > 1) d = 1;
        const lc = modelLineColor(env, d);
        pctx.strokeStyle = "rgba(" + (lc.r | 0) + "," + (lc.g | 0) + "," + (lc.b | 0) + "," + lc.a + ")";
        pctx.beginPath(); pctx.moveTo(prev[0], prev[1]); pctx.lineTo(X, Y); pctx.stroke();
      }
      prev = [X, Y];
    }
    drawMirrorLines(w, h); label(n, m);
  }

  function build3(n, m, p) {
    const key = patternRev + "|" + n + "|" + m + "|" + p; if (key === base3Key) return; base3Key = key;
    base3 = []; const N = 2000, TWO = 6.283185307, px = Math.PI / 2, py = Math.PI / 4;
    for (let i = 0; i <= N; i++) { const t = i / N * TWO; base3.push([Math.sin(n * t + px), Math.sin(m * t + py), Math.sin(p * t)]); }
  }
  function drawCurve3D(w, h, n, m, p) {
    fillVizBg(w, h);
    build3(n, m, p);
    if (!paused && !dragging && !reduce) yaw += spinRate();
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.44 * viewZoom;
    const ca = Math.cos(yaw), sa = Math.sin(yaw), cb = Math.cos(pitch), sb = Math.sin(pitch);
    const fx = flipH ? -1 : 1, fy = flipV ? -1 : 1;
    pctx.lineWidth = 2.4; pctx.lineJoin = "round";
    let prev = null;
    for (let i = 0; i < base3.length; i++) {
      const P = base3[i], x = P[0], y = P[1], z = P[2];
      const x1 = x * ca + z * sa, z1 = -x * sa + z * ca;
      const y2 = y * cb - z1 * sb, z2 = y * sb + z1 * cb;
      const X = cx + fx * R * x1, Y = cy - fy * R * y2;
      if (prev) {
        let t = (z2 / 1.75 + 1) / 2; if (t < 0) t = 0; else if (t > 1) t = 1;
        const lc = modelLineColor(y, t);
        pctx.strokeStyle = "rgba(" + (lc.r | 0) + "," + (lc.g | 0) + "," + (lc.b | 0) + "," + lc.a + ")";
        pctx.beginPath(); pctx.moveTo(prev[0], prev[1]); pctx.lineTo(X, Y); pctx.stroke();
      }
      prev = [X, Y];
    }
    modeNM.textContent = "3D curve · " + n + ":" + m + ":" + p;
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
  let surfPx = null, surfPy = null, surfPz = null, surfDepth = null, surfQuadOrder = null;
  function buildSurface(n, m, kind) {
    kind = kind || "plate";
    const key = patternRev + "|" + kind + "|" + n + "|" + m; if (key === surfKey && surfH) return; surfKey = key;
    const G = SURF_GS, W = G + 1;
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
    fillVizBg(w, h);
    buildSurface(n, m, kind);
    if (!paused && !dragging && !reduce) yaw += spinRate();
    const G = SURF_GS, W = G + 1, amp = 0.9, quadCount = G * G;
    const ca = Math.cos(yaw), sa = Math.sin(yaw), cb = Math.cos(pitch), sb = Math.sin(pitch);
    const fx = flipH ? -1 : 1, fy = flipV ? -1 : 1, cx = w / 2, cy = h / 2, R = Math.min(w, h) * (kind === "drum" ? 0.58 : 0.62) * viewZoom;
    const Lx = 0.35, Ly = 0.45, Lz = 0.82;
    const vertCount = W * W;
    if (!surfPx || surfPx.length < vertCount) {
      surfPx = new Float32Array(vertCount);
      surfPy = new Float32Array(vertCount);
      surfPz = new Float32Array(vertCount);
    }
    if (!surfDepth || surfDepth.length < quadCount) {
      surfDepth = new Float32Array(quadCount);
      surfQuadOrder = new Uint32Array(quadCount);
    }
    for (let j = 0; j < W; j++) {
      for (let i = 0; i < W; i++) {
        const idx = j * W + i;
        const hgt = Number.isFinite(surfH[idx]) ? surfH[idx] : 0;
        const mx = (i / G - 0.5), my = hgt * amp * 0.5, mz = (j / G - 0.5);
        const x1 = mx * ca + mz * sa, z1 = -mx * sa + mz * ca;
        const y2 = my * cb - z1 * sb, z2 = my * sb + z1 * cb;
        surfPx[idx] = cx + fx * R * x1;
        surfPy[idx] = cy - fy * R * y2;
        surfPz[idx] = z2;
      }
    }
    for (let j = 0; j < G; j++) {
      for (let i = 0; i < G; i++) {
        const qi = j * G + i;
        const a = j * W + i, b = j * W + i + 1, c = (j + 1) * W + i + 1, dd = (j + 1) * W + i;
        if (kind === "drum" && (!Number.isFinite(surfH[a]) || !Number.isFinite(surfH[b]) || !Number.isFinite(surfH[c]) || !Number.isFinite(surfH[dd]))) {
          surfDepth[qi] = 1e9;
          surfQuadOrder[qi] = qi;
          continue;
        }
        const depth = (surfPz[a] + surfPz[b] + surfPz[c] + surfPz[dd]) * 0.25;
        surfDepth[qi] = depth + qi * 1e-7;
        surfQuadOrder[qi] = qi;
      }
    }
    const order = Array.from(surfQuadOrder.subarray(0, quadCount));
    order.sort((a, b) => surfDepth[a] - surfDepth[b]);
    pctx.imageSmoothingEnabled = false;
    for (let k = 0; k < order.length; k++) {
      const qi = order[k];
      if (surfDepth[qi] > 1e8) continue;
      const j = Math.floor(qi / G), i = qi % G;
      const a = j * W + i, b = j * W + i + 1, c = (j + 1) * W + i + 1, dd = (j + 1) * W + i;
      const hAvg = (surfH[a] + surfH[b] + surfH[c] + surfH[dd]) * 0.5;
      const nX = surfNX[a] + surfNX[b] + surfNX[c] + surfNX[dd];
      const nY = surfNY[a] + surfNY[b] + surfNY[c] + surfNY[dd];
      const nZ = surfNZ[a] + surfNZ[b] + surfNZ[c] + surfNZ[dd];
      const nx1 = nX * ca + nZ * sa, nz1 = -nX * sa + nZ * ca;
      const ny2 = nY * cb - nz1 * sb, nz2 = nY * sb + nz1 * cb;
      const Ln = Math.hypot(nx1, ny2, nz2) || 1;
      let diff = (nx1 * Lx + ny2 * Ly + nz2 * Lz) / Ln;
      diff = 0.45 + 0.78 * Math.max(0, diff);
      const sh = surfaceShade(hAvg, diff);
      pctx.fillStyle = "rgb(" + sh.r + "," + sh.g + "," + sh.b + ")";
      pctx.beginPath();
      pctx.moveTo(surfPx[a], surfPy[a]);
      pctx.lineTo(surfPx[b], surfPy[b]);
      pctx.lineTo(surfPx[c], surfPy[c]);
      pctx.lineTo(surfPx[dd], surfPy[dd]);
      pctx.closePath();
      pctx.fill();
    }
    pctx.imageSmoothingEnabled = true;
    modeNM.textContent = (kind === "drum" ? "3D drum" : "surface") + " · " + n + "×" + m;
  }

  function buildOrb(n, m) {
    const key = patternRev + "|" + n + "|" + m; if (key === orbKey && orbPts.length) return; orbKey = key;
    const N = 4800, ga = Math.PI * (3 - Math.sqrt(5));
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
    fillVizBg(w, h);
    buildOrb(n, m);
    if (!paused && !dragging && !reduce) yaw += spinRate();
    const ca = Math.cos(yaw), sa = Math.sin(yaw), cb = Math.cos(pitch), sb = Math.sin(pitch);
    const fx = flipH ? -1 : 1, fy = flipV ? -1 : 1, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.46 * viewZoom;
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
      const dc = modelDotColor(P.v, t);
      pctx.fillStyle = "rgba(" + (dc.r | 0) + "," + (dc.g | 0) + "," + (dc.b | 0) + "," + dc.a + ")";
      pctx.fillRect(P.X - dc.s * 0.5, P.Y - dc.s * 0.5, dc.s, dc.s);
    }
    modeNM.textContent = "3D orb · " + n + "×" + m;
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
      const nm = currentNM(); buildSurface(nm.n, nm.m, kind); const G = SURF_GS, W = G + 1, amp = 0.9;
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
    pctx.fillStyle = "rgba(244,251,255,0.1)"; pctx.fillRect(0, 0, w, h);
    const dens = 1 + (n + m) / 65;
    const step = ((reduce ? 0.006 : 0.0085) * (paceVal / 3)) / Math.sqrt(dens);
    const jitter = (0.00085 * (paceVal / 3)) / (1 + (n + m) / 100);
    const wander = 0.016 / Math.sqrt(dens);
    const grainSize = reduce ? 0.95 : (n + m > 50 ? 0.9 : 1.1);
    pctx.save(); applyFlip(w, h);
    pctx.fillStyle = invert ? "rgba(255,100,88,0.9)" : "rgba(10,78,140,0.86)";
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
      const gs = Math.max(1.1, grainSize * Math.min(1.15, 0.78 + viewZoom * 0.14));
      pctx.fillRect(zx * w, zy * h, gs, gs);
    }
    pctx.restore(); drawMirrorLines(w, h); label(n, m);
  }
  function label(n, m) {
    modeNM.textContent = family === "harmono" ? ("harmonograph · " + n + ":" + m) : (family + " · " + n + "×" + m);
    if (patternSource === "pitch" && USES_PITCH()) {
      nLabel.textContent = n;
      mLabel.textContent = m;
    }
  }

  const SWEEP_LO = 240, SWEEP_HI = 1000;
  let sweepDir = -1, sweepSpeedVal = 3;
  let rafId = 0;
  function loop() {
    if (sweeping && !paused) {
      const speed = 0.12 + sweepSpeedVal * 0.16;
      let v = +freqSlider.value + sweepDir * speed;
      if (v >= SWEEP_HI) { v = SWEEP_HI; sweepDir = -1; } if (v <= SWEEP_LO) { v = SWEEP_LO; sweepDir = 1; }
      freqSlider.value = v; freq = sliderToFreq(v); paintFreq(); retune();
    }
    drawPlate();
    rafId = requestAnimationFrame(loop);
  }

  function setAppPage(page) {
    appPage = page === "lab" ? "lab" : "studio";
    if (appPage === "lab") {
      if (!USES_PITCH()) applyState({ family: "square", n: 6, m: 4, view: "sand" });
      setPatternSource("pitch");
    } else if (USES_PITCH()) {
      applyState({ family: "orb", n: 6, m: 4, p: 5, view: "field" });
      setPatternSource("manual");
    }
    updateStageControls();
  }
  const onResonancePage = (e) => setAppPage(e.detail);
  window.addEventListener("resonance-page", onResonancePage);

  updateZLine(); updateGrab(); updateModelChip(); updateStageControls();
  rafId = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("resonance-page", onResonancePage);
    stop();
  };
}
