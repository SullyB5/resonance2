export default function Plates() {
  return (
    <section className="card panel col-pattern">
      <h2 className="panel-heading">Plates</h2>
      <div className="pattern-panel-body">
        <h3 className="plabel">Plate type</h3>
        <div className="seg fam" id="familiesPlates" role="group" aria-label="plate family">
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
