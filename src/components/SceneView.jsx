import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { PeriodicEngine } from '../lib/engine.js'
import { ELEMENTS, byZ } from '../data/elements.js'
import { CAT_BY_ID } from '../data/categories.js'
import FlatTable from './FlatTable.jsx'

/** Owns the Three.js engine and mirrors React state into it. */
export default function SceneView({ ref, layout, mode, temp, bars, highlight, selected, view, spin, onSelect, onFail, onRetry }) {
  const host = useRef(null)
  const engine = useRef(null)
  const cb = useRef({})
  cb.current = { onSelect }
  const [hover, setHover] = useState(null)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [paused, setPaused] = useState(false) // the browser took the GPU away; waiting for it back
  const lostTimer = useRef(0)

  useImperativeHandle(ref, () => ({
    reset: () => engine.current?.resetView(),
    zoomIn: () => engine.current?.zoomBy(0.72),
    zoomOut: () => engine.current?.zoomBy(1.38),
    frame: (zs) => (zs && zs.length ? engine.current?.frameElements(zs) : engine.current?.resetView()),
  }))

  useEffect(() => {
    let eng
    try {
      eng = new PeriodicEngine(host.current, {
        elements: ELEMENTS,
        onSelect: (z) => cb.current.onSelect(z),
        onHover: (z, x, y) => setHover(z ? { z, x, y } : null),
        onReady: () => setReady(true),
        // Phones can reclaim the GPU context (memory pressure, app switching). Give the browser a few
        // seconds to hand it back before falling back to the flat table.
        onContext: (state) => {
          clearTimeout(lostTimer.current)
          if (state === 'lost') {
            setPaused(true)
            lostTimer.current = setTimeout(() => {
              setPaused(false)
              setFailed(true)
              onFail?.()
            }, 6000)
          } else setPaused(false)
        },
      })
    } catch (err) {
      console.error(err)
      setFailed(true)
      onFail?.()
      return
    }
    engine.current = eng
    // push the initial props — engine buffers them until its tiles exist
    eng.setView(view)
    eng.setLayout(layout)
    eng.setStyle({ mode, temp, bars })
    eng.setHighlight(highlight)
    eng.setSelected(selected)
    eng.setSpin(spin)
    return () => {
      clearTimeout(lostTimer.current)
      eng.dispose()
      engine.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { engine.current?.setLayout(layout) }, [layout])
  useEffect(() => { engine.current?.setStyle({ mode, temp, bars }) }, [mode, temp, bars])
  useEffect(() => { engine.current?.setHighlight(highlight) }, [highlight])
  useEffect(() => { engine.current?.setSelected(selected) }, [selected])
  useEffect(() => { engine.current?.setView(view) }, [view.x, view.y, view.free])
  useEffect(() => { engine.current?.setSpin(spin) }, [spin])

  const hovered = hover ? byZ(hover.z) : null

  return (
    <div className="absolute inset-0">
      <div ref={host} className="absolute inset-0 cursor-grab active:cursor-grabbing" data-testid="scene" />
      {!ready && !failed && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted" style={{ animation: 'fade-in .4s both' }}>
          Loading the elements…
        </div>
      )}
      {failed && <FlatTable mode={mode} temp={temp} highlight={highlight} selected={selected} onSelect={onSelect} onRetry={onRetry} />}
      {paused && !failed && (
        <div role="status" className="glass pointer-events-none absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full px-4 py-2 text-sm" style={{ animation: 'pop-in .25s both' }}>
          Your device paused 3D graphics. Recovering…
        </div>
      )}
      {hovered && (
        <div
          className="pointer-events-none fixed z-30 flex items-center gap-2.5 rounded-xl border border-white/10 bg-ink/90 py-1.5 pl-1.5 pr-3 text-sm shadow-xl backdrop-blur"
          style={{ left: Math.min(hover.x + 16, window.innerWidth - 220), top: Math.min(hover.y + 16, window.innerHeight - 60) }}
        >
          <span
            className="grid size-8 place-items-center rounded-lg font-display text-sm font-bold text-ink"
            style={{ background: CAT_BY_ID[hovered.category].color }}
          >
            {hovered.symbol}
          </span>
          <span className="leading-tight">
            <span className="block font-semibold">{hovered.name}</span>
            <span className="block text-xs text-muted">
              No. {hovered.z} · {CAT_BY_ID[hovered.category].label}
            </span>
          </span>
        </div>
      )}
    </div>
  )
}
