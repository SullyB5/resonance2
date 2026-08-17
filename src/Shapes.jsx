export default function Shapes() {
  return (
    <section className="card panel col-pattern">
      <h2 className="panel-heading">Shapes</h2>
      <div className="pattern-panel-body">
        <h3 className="plabel">Shape type</h3>
        <div className="seg fam" id="familiesShapes" role="group" aria-label="shape family">
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
        <h3 className="plabel">Looks</h3>
        <div className="seg looks" id="looks" role="group" aria-label="named looks">
          <button type="button" data-look="galaxy" aria-pressed="true">galaxy</button>
          <button type="button" data-look="nebula" aria-pressed="false">nebula</button>
          <button type="button" data-look="drum" aria-pressed="false">drum</button>
          <button type="button" data-look="infinity" aria-pressed="false">infinity</button>
        </div>
        <h3 className="plabel">Colors</h3>
        <div className="color-row">
          <label className="color-pick">
            <span className="color-pick-lab">background</span>
            <input id="vizBg" type="color" value="#f3fbff" aria-label="background color" />
          </label>
          <label className="color-pick">
            <span className="color-pick-lab">model</span>
            <input id="vizModel" type="color" value="#1b9de8" aria-label="model color" />
          </label>
          <label className="color-pick">
            <span className="color-pick-lab">accent</span>
            <input id="vizAccent" type="color" value="#ff7e6e" aria-label="accent color" />
          </label>
        </div>
      </div>
      <div className="pattern-panel-tail">
        <div className="pattern-brand" aria-hidden="true">
          <div className="pattern-brand-mark" />
          <div className="pattern-brand-text">
            <div className="pattern-brand-name">Reson<em>ance</em></div>
            <div className="pattern-brand-tag">watch a pool of sound organize itself</div>
          </div>
        </div>
      </div>
    </section>
  )
}
