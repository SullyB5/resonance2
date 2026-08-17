import { useEffect, useState } from 'react'
import { startResonanceEngine } from './resonanceEngine.js'
import Shapes from './Shapes.jsx'
import Plates from './Plates.jsx'
import Stage from './components/Stage.jsx'
import EngineAudioHidden from './components/EngineAudioHidden.jsx'
import './resonance.css'

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [view, setView] = useState('shapes')

  useEffect(() => {
    const stop = startResonanceEngine()
    return stop
  }, [])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('resonance-page', { detail: view }))
    if (view === 'shapes' || view === 'plates') window.dispatchEvent(new Event('resize'))
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

  const inWorkspace = view === 'shapes' || view === 'plates'

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
          <button type="button" className="more-item" aria-current={view === 'shapes' ? 'page' : undefined} onClick={() => go('shapes')}>
            <span className="more-item-name">Shapes</span>
            <span className="more-item-note">3D models and harmonograph</span>
          </button>
          <button type="button" className="more-item" aria-current={view === 'plates' ? 'page' : undefined} onClick={() => go('plates')}>
            <span className="more-item-name">Plates</span>
            <span className="more-item-note">sand plates and sweep</span>
          </button>
        </nav>
      </aside>

      {inWorkspace && (
        <div className="dashboard">
          {view === 'shapes' ? <Shapes /> : <Plates />}
          <Stage />
          <EngineAudioHidden />
        </div>
      )}
    </div>
  )
}
