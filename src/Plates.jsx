export default function Plates() {
  return (
    <section className="card panel col-pattern">
      <h2 className="panel-heading">Plates</h2>
      <div className="pattern-panel-body">
        <div className="plates-sounds">
          <div className="plates-seg">
            <h3 className="plabel">Plate type</h3>
            <div className="seg fam" id="familiesPlates" role="group" aria-label="plate family">
              <button type="button" data-f="square" aria-pressed="true">square plate</button>
              <button type="button" data-f="round" aria-pressed="false">round drum</button>
              <button type="button" data-f="ripple" aria-pressed="false">ripple pool</button>
            </div>
          </div>
          <div className="hz-side" id="hzSide">
            <span className="lab">Hz</span>
            <input id="freqPlates" type="range" min="0" max="1000" defaultValue="500" aria-label="frequency in hertz" />
            <span className="hz-side-val" id="hzSideVal">220</span>
            <span className="hz-lock-note" id="hzLockNote" hidden>locked</span>
          </div>
          <div className="sounds-seg">
            <h3 className="plabel">Sounds</h3>
            <h4 className="slabel">Tones</h4>
            <div className="seg" id="tones" role="group" aria-label="tones">
              <button type="button" data-tone="pure" aria-pressed="true">pure</button>
              <button type="button" data-tone="harmonics" aria-pressed="false">harmonics</button>
              <button type="button" data-tone="fifth" aria-pressed="false">fifth</button>
              <button type="button" data-tone="octave" aria-pressed="false">octave</button>
              <button type="button" data-tone="chord" aria-pressed="false">chord</button>
            </div>
            <h4 className="slabel">Beats</h4>
            <div className="seg warm" id="beats" role="group" aria-label="beats">
              <button type="button" data-beat="slow" aria-pressed="false">slow</button>
              <button type="button" data-beat="heart" aria-pressed="false">heart</button>
              <button type="button" data-beat="pulse" aria-pressed="false">pulse</button>
              <button type="button" data-beat="flutter" aria-pressed="false">flutter</button>
              <button type="button" data-beat="wobble" aria-pressed="false">wobble</button>
            </div>
            <div className="hint" id="modeHint">One clean tone. Slide Hz and watch the pool rearrange.</div>
          </div>
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
      <div className="pattern-panel-tail">
        <div className="pattern-brand" aria-hidden="true">
          <div className="pattern-brand-mark" />
          <div className="pattern-brand-text">
            <div className="pattern-brand-name">Reson<em>ance</em></div>
            <div className="pattern-brand-tag">sand and frequency experiments</div>
          </div>
        </div>
      </div>
    </section>
  )
}
