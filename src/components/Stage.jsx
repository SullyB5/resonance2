export default function Stage() {
  return (
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
  )
}
