import { useEffect, useState } from 'react'
import { startResonanceEngine } from './resonanceEngine.js'
import './resonance.css'

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [view, setView] = useState('studio')

  useEffect(() => {
    const stop = startResonanceEngine()
    return stop
  }, [])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('resonance-page', { detail: view }))
    if (view === 'studio' || view === 'lab') window.dispatchEvent(new Event('resize'))
  }, [view])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  function go(next) {
    setView(next)
    setMenuOpen(false)
  }

  const inWorkspace = view === 'studio' || view === 'lab'

  return (
    <div className="wrap">
      <header>
        <div className="header-brand">
          <div className="mark" />
          <div>
            <div className="brand">Reson<em>ance</em></div>
            <div className="tag">watch a pool of sound organize itself</div>
          </div>
        </div>
        <button
          type="button"
          className="menu-btn"
          aria-label="Open more"
          aria-expanded={menuOpen}
          aria-controls="morePanel"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span /><span /><span />
        </button>
      </header>

      {menuOpen && (
        <button type="button" className="more-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
      )}
      <aside id="morePanel" className={'more-panel' + (menuOpen ? ' open' : '')} aria-hidden={!menuOpen}>
        <div className="more-head">
          <div className="more-title">More</div>
          <button type="button" className="more-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}>✕</button>
        </div>
        <nav className="more-nav" aria-label="Pages">
          <button type="button" className="more-item" aria-current={view === 'studio' ? 'page' : undefined} onClick={() => go('studio')}>
            <span className="more-item-name">Studio</span>
            <span className="more-item-note">3D shapes and harmonograph</span>
          </button>
          <button type="button" className="more-item" aria-current={view === 'lab' ? 'page' : undefined} onClick={() => go('lab')}>
            <span className="more-item-name">Lab</span>
            <span className="more-item-note">sand plates and sweep</span>
          </button>
        </nav>
      </aside>

      <div className="dashboard" hidden={!inWorkspace}>
        <section className="card panel col-pattern">
          <h2 className="panel-heading">{view === 'lab' ? 'Plates' : 'Pattern'}</h2>
          <div className="pattern-panel-body">
            <div className="pattern-panel-studio" hidden={view !== 'studio'}>
              <h3 className="plabel">Pattern type</h3>
              <div className="seg fam" id="familiesStudio" role="group" aria-label="pattern family">
                <button type="button" data-f="harmono" aria-pressed="false">harmonograph</button>
                <button type="button" data-f="curve3d" aria-pressed="false">3D curve</button>
                <button type="button" data-f="surface" aria-pressed="false">3D surface</button>
                <button type="button" data-f="orb" aria-pressed="true">3D orb</button>
                <button type="button" data-f="drum3d" aria-pressed="false">3D drum</button>
              </div>
              <h3 className="plabel">Motion</h3>
              <div className="nm-line pace-line">
                <span className="lab">detail</span>
                <input id="pace" className="cool" type="range" min="1" max="10" defaultValue="3" aria-label="motion pace" />
                <span className="lab">flow</span>
              </div>
            </div>
            <div className="pattern-panel-lab" hidden={view !== 'lab'}>
              <h3 className="plabel">Plate type</h3>
              <div className="seg fam" id="familiesLab" role="group" aria-label="plate family">
                <button type="button" data-f="square" aria-pressed="true">square plate</button>
                <button type="button" data-f="round" aria-pressed="false">round drum</button>
                <button type="button" data-f="ripple" aria-pressed="false">ripple pool</button>
              </div>
              <div id="psourceBlock">
                <h3 className="plabel">Pattern source</h3>
                <div className="seg" id="psource" role="group" aria-label="pattern source">
                  <button type="button" data-p="pitch" aria-pressed="true">link sweep to Hz</button>
                  <button type="button" data-p="manual" aria-pressed="false">manual modes</button>
                </div>
              </div>
              <div id="sweepBlock">
                <h3 className="plabel">Sweep</h3>
                <div className="sweep-row">
                  <button type="button" className="chip sweep-btn" id="sweepBtn" aria-pressed="false">sweep</button>
                  <span className="lab">speed</span>
                  <input id="sweepSpeed" className="cool" type="range" min="1" max="10" defaultValue="3" aria-label="sweep speed" />
                </div>
              </div>
            </div>
          </div>
          <div className="pattern-panel-tail">
            <div className="pattern-brand" aria-hidden="true">
              <div className="pattern-brand-mark" />
              <div className="pattern-brand-text">
                <div className="pattern-brand-name">Reson<em>ance</em></div>
                <div className="pattern-brand-tag">
                  {view === 'lab' ? 'sand and frequency experiments' : 'watch a pool of sound organize itself'}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="card stage col-stage">
          <div className="plate-shell">
            <canvas className="plate-canvas" id="plate" />
            <div className="hud hud-tl"><span id="freqVal">220</span><span className="u">Hz</span></div>
            <div className="hud hud-tr"><span id="noteName">A3</span><span className="cap">nearest note</span></div>
            <div className="hud hud-bl" id="modeNM">orb · 6×4</div>
            <div className="hud hud-br zoom-pad">
              <button type="button" id="zoomOut" aria-label="zoom out">−</button>
              <span id="zoomVal">100%</span>
              <button type="button" id="zoomIn" aria-label="zoom in">+</button>
            </div>
          </div>
          <div className="stage-bar" id="stageBar">
            <div className="pitch-row" id="hzBlock">
              <span className="lab">Hz</span>
              <input id="freq" type="range" min="0" max="1000" defaultValue="500" aria-label="tone frequency" />
            </div>
            <div className="stage-modes nm" id="stageModes">
              <div className="nm-line"><span className="nm-tag">n</span><input id="nSlider" className="cool" type="range" min="1" max="500" step="1" defaultValue="6" aria-label="mode n" /><span className="nm-val" id="nLabel">6</span></div>
              <div className="nm-line"><span className="nm-tag">m</span><input id="mSlider" className="cool" type="range" min="1" max="500" step="1" defaultValue="4" aria-label="mode m" /><span className="nm-val" id="mLabel">4</span></div>
              <div className="nm-line" id="zLine" style={{ display: 'none' }}><span className="nm-tag">z</span><input id="pSlider" className="cool" type="range" min="1" max="500" step="1" defaultValue="5" aria-label="depth frequency z" /><span className="nm-val" id="pLabel">5</span></div>
            </div>
          </div>
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

        <section className="card panel col-sound" hidden={view !== 'studio'}>
          <h2 className="panel-heading">Sound</h2>
          <div className="sound-stack">
            <div className="sound-box">
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
            </div>
            <div className="sound-box">
              <h3 className="plabel">Looks</h3>
              <div className="seg looks" id="looks" role="group" aria-label="named looks">
                <button type="button" data-look="galaxy" aria-pressed="true">galaxy</button>
                <button type="button" data-look="nebula" aria-pressed="false">nebula</button>
                <button type="button" data-look="drum" aria-pressed="false">drum</button>
                <button type="button" data-look="infinity" aria-pressed="false">infinity</button>
              </div>
            </div>
          </div>
        </section>

        <section className="col-signals" hidden={view !== 'studio'}>
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
    </div>
  )
}
