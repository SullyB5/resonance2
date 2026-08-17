import { useEffect } from 'react'
import { startResonanceEngine } from './resonanceEngine.js'
import './resonance.css'

export default function App() {
  useEffect(() => startResonanceEngine(), [])

  return (
    <div className="wrap">
      <header>
        <div className="mark" />
        <div>
          <div className="brand">Reson<em>ance</em></div>
          <div className="tag">watch a pool of sound organize itself</div>
        </div>
      </header>

      <div className="dashboard">
        <section className="card panel col-pattern">
          <h2 className="panel-heading">Pattern</h2>
          <h3 className="plabel">Pattern type</h3>
          <div className="seg fam" id="families" role="group" aria-label="pattern family">
            <button type="button" data-f="square" aria-pressed="true">square plate</button>
            <button type="button" data-f="round" aria-pressed="false">round drum</button>
            <button type="button" data-f="ripple" aria-pressed="false">ripple pool</button>
            <button type="button" data-f="harmono" aria-pressed="false">harmonograph</button>
            <button type="button" data-f="curve3d" aria-pressed="false">3D curve</button>
            <button type="button" data-f="surface" aria-pressed="false">3D surface</button>
          </div>
          <h3 className="plabel">Pattern source</h3>
          <div className="seg" id="psource" role="group" aria-label="pattern source">
            <button type="button" data-p="pitch" aria-pressed="true">follow pitch</button>
            <button type="button" data-p="manual" aria-pressed="false">pick it yourself</button>
          </div>
          <div className="nm">
            <div className="nm-line"><span className="nm-tag">n</span><input id="nSlider" className="cool" type="range" min="1" max="100" step="1" defaultValue="3" aria-label="mode n" /><span className="nm-val" id="nLabel">3</span></div>
            <div className="nm-line"><span className="nm-tag">m</span><input id="mSlider" className="cool" type="range" min="1" max="100" step="1" defaultValue="2" aria-label="mode m" /><span className="nm-val" id="mLabel">2</span></div>
            <div className="nm-line" id="zLine" style={{ display: 'none' }}><span className="nm-tag">z</span><input id="pSlider" className="cool" type="range" min="1" max="100" step="1" defaultValue="5" aria-label="depth frequency z" /><span className="nm-val" id="pLabel">5</span></div>
          </div>
          <h3 className="plabel">Sweep</h3>
          <div className="sweep-row">
            <button type="button" className="chip sweep-btn" id="sweepBtn" aria-pressed="false">sweep</button>
            <span className="lab">speed</span>
            <input id="sweepSpeed" className="cool" type="range" min="1" max="10" defaultValue="5" aria-label="sweep speed" />
          </div>
          <div className="hint" id="sweepHint">Glide pitch and patterns together. Use follow pitch above so shapes animate with the sound.</div>
          <h3 className="plabel">AI picture</h3>
          <button type="button" className="gen-open-btn" id="genOpen">✨ turn pattern into image</button>
          <div className="hint">Snap the pattern → describe it → AI paints it. Only works on the live site after you add a fal.ai key (see steps below).</div>
        </section>

        <section className="card stage col-stage">
          <div className="plate-shell">
            <canvas className="plate-canvas" id="plate" />
            <div className="hud hud-tl"><span id="freqVal">220</span><span className="u">Hz</span></div>
            <div className="hud hud-tr"><span id="noteName">A3</span><span className="cap">nearest note</span></div>
            <div className="hud hud-bl" id="modeNM">square · 3×2</div>
          </div>
          <div className="pitch-row"><span className="lab">Pitch</span><input id="freq" type="range" min="0" max="1000" defaultValue="500" aria-label="pitch" /></div>
          <div className="transport">
            <button type="button" className="play" id="play"><span className="ico" /><span id="playTxt">Play</span></button>
            <div className="vol-row"><span className="lab">Vol</span><input id="vol" className="cool" type="range" min="0" max="100" defaultValue="40" aria-label="volume" /></div>
          </div>
          <div className="view-row">
            <div className="vgroup" id="views" role="group" aria-label="view">
              <button type="button" data-v="sand" aria-pressed="true">sand</button>
              <button type="button" data-v="field" aria-pressed="false">field</button>
            </div>
            <button type="button" className="chip" id="invert" aria-pressed="false">invert</button>
            <button type="button" className="chip" id="flipH" aria-pressed="false">flip ↔</button>
            <button type="button" className="chip" id="flipV" aria-pressed="false">flip ↕</button>
            <button type="button" className="chip" id="pause" aria-pressed="false">⏸ pause</button>
            <button type="button" className="chip" id="mirror" aria-pressed="false">◫ mirror</button>
            <button type="button" className="chip" id="saveImg">⤓ image</button>
            <button type="button" className="chip" id="saveModel" style={{ display: 'none' }}>⤓ model</button>
            <button type="button" className="chip dice" id="dice">🎲 surprise</button>
          </div>
        </section>

        <section className="card panel col-sound">
          <h2 className="panel-heading">Sound</h2>
          <h3 className="plabel">Wave shape</h3>
          <div className="seg" id="waves" role="group" aria-label="waveform">
            <button type="button" data-w="sine" aria-pressed="true">sine</button>
            <button type="button" data-w="triangle" aria-pressed="false">triangle</button>
            <button type="button" data-w="square" aria-pressed="false">square</button>
            <button type="button" data-w="sawtooth" aria-pressed="false">saw</button>
          </div>
          <h3 className="plabel">Try these</h3>
          <div className="seg warm" id="modes" role="group" aria-label="experiment">
            <button type="button" data-m="tone" aria-pressed="true">pure tone</button>
            <button type="button" data-m="harmonics" aria-pressed="false">harmonics</button>
            <button type="button" data-m="beat" aria-pressed="false">beat</button>
            <button type="button" data-m="chord" aria-pressed="false">chord</button>
          </div>
          <div className="hint" id="modeHint">One clean tone. Slide Pitch and watch the pool rearrange.</div>
        </section>

        <section className="col-signals">
          <div className="card signal-card">
            <h3>The wave <span className="sub">shape</span></h3>
            <canvas id="scope" />
          </div>
          <div className="card signal-card">
            <h3>The mix <span className="sub">frequencies</span></h3>
            <canvas id="spectrum" />
          </div>
        </section>
      </div>

      <div className="learn">
        <div className="b"><div className="k">Four makers</div><p>Square plate, round drum, ripple pool, and a harmonograph that draws curves from two frequencies — four different ways to turn sound into shape.</p></div>
        <div className="b"><div className="k">Higher = busier</div><p>Push pitch or the n and m dials up and the lines multiply. There&apos;s no real ceiling — it just keeps subdividing.</p></div>
        <div className="b"><div className="k">Made for ideas</div><p>Hit 🎲 to jump somewhere unexpected. Pause on a shape you like — it&apos;s a ready-made icon or logo seed.</p></div>
      </div>

      <div className="foot">headphones optional · nothing is recorded · 🎲 for chaos</div>

      <div className="gen-overlay" id="genOverlay" hidden>
        <div className="gen-card">
          <button type="button" className="gen-close" id="genClose" aria-label="close">✕</button>
          <div className="gen-title">Turn this pattern into a picture</div>
          <img className="gen-thumb" id="genThumb" alt="captured pattern" />
          <div id="genForm">
            <label className="gen-label" htmlFor="genPrompt">Describe what it becomes</label>
            <textarea id="genPrompt" rows="2" placeholder="this swirl is a black hole pulling everything in…" />
            <div className="gen-strength"><span>keep shape</span><input id="genStrength" className="cool" type="range" min="20" max="85" defaultValue="50" aria-label="how much to reimagine" /><span>reimagine</span></div>
            <button type="button" className="gen-go" id="genGo">Generate image</button>
          </div>
          <div className="gen-status" id="genStatus" />
          <div id="genResultWrap" hidden>
            <img className="gen-out" id="genOut" alt="AI render" />
            <div className="gen-actions"><a className="chip" id="genSave" href="#">⤓ save</a><button type="button" className="chip" id="genAgain">try again</button></div>
          </div>
        </div>
      </div>
    </div>
  )
}
