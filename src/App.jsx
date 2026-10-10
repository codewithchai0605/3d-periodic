import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SceneView from './components/SceneView.jsx'
import DetailPanel from './components/DetailPanel.jsx'
import Dock from './components/Dock.jsx'
import TopBar from './components/TopBar.jsx'
import Quiz from './components/Quiz.jsx'
import Help from './components/Help.jsx'
import Tour from './components/Tour.jsx'
import Trends from './components/Trends.jsx'
import { ELEMENTS, byZ, bySymbol, searchElements } from './data/elements.js'
import { MODE_BY_ID, styleFor } from './lib/scales.js'
import { TOUR } from './lib/tour.js'
import { UnitCtx } from './lib/units.js'

const PANEL_W = 404 + 12
const SEEN_KEY = 'elementary:seen'
const UNIT_KEY = 'elementary:unit'

const fromHash = () => {
  const h = decodeURIComponent(location.hash.replace('#', '')).toLowerCase()
  return bySymbol[h]?.z ?? (/^\d+$/.test(h) && +h >= 1 && +h <= 118 ? +h : null)
}

function useViewport() {
  const [v, setV] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const on = () => setV({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return v
}

export default function App() {
  const [layout, setLayout] = useState('table')
  const [mode, setMode] = useState('category')
  const [temp, setTemp] = useState(293)
  const [bars, setBars] = useState(false)
  const [spin, setSpin] = useState(false)
  const [selected, setSelected] = useState(fromHash)
  const [filterKey, setFilterKey] = useState(null)
  const [query, setQuery] = useState('')
  const [quiz, setQuiz] = useState(false)
  const [trends, setTrends] = useState(false)
  const [tour, setTour] = useState(null) // null or step index
  const [expanded, setExpanded] = useState(false) // mobile bottom sheet
  const [help, setHelp] = useState(() => {
    try { return !localStorage.getItem(SEEN_KEY) && fromHash() == null } catch { return false }
  })
  const [unit, setUnit] = useState(() => {
    try { return localStorage.getItem(UNIT_KEY) || 'K' } catch { return 'K' }
  })
  const [flat, setFlat] = useState(false) // true when WebGL is unavailable
  const [sceneKey, setSceneKey] = useState(0) // bump to rebuild the 3D scene ("Try 3D again")
  const [dockH, setDockH] = useState(180)
  const [tourH, setTourH] = useState(200)
  const scene = useRef(null)
  const searchRef = useRef(null)
  const { w: vw, h: vh } = useViewport()
  const mobile = vw < 768

  useEffect(() => {
    try { localStorage.setItem(UNIT_KEY, unit) } catch { /* ignore */ }
  }, [unit])

  /* ---- URL hash <-> selection ---- */
  useEffect(() => {
    const sym = selected ? byZ(selected).symbol : ''
    if (sym) history.replaceState(null, '', `#${sym}`)
    else if (location.hash) history.replaceState(null, '', location.pathname + location.search)
    document.title = selected ? `${byZ(selected).name} — Elementary` : 'Elementary — a 3D periodic table'
  }, [selected])
  useEffect(() => {
    const on = () => setSelected(fromHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  useEffect(() => {
    if (selected == null) setExpanded(false)
  }, [selected])

  /* ---- helpers ---- */
  const select = useCallback((z) => setSelected(z), [])
  const closeHelp = () => {
    setHelp(false)
    try { localStorage.setItem(SEEN_KEY, '1') } catch { /* ignore */ }
  }
  const changeMode = (m) => {
    setMode(m)
    setFilterKey(null)
    if (MODE_BY_ID[m].kind === 'discrete') setBars(false)
  }
  const toggleBars = () => {
    if (!bars && MODE_BY_ID[mode].kind === 'discrete') changeMode('density')
    setBars(!bars)
  }
  const changeLayout = (id) => {
    setLayout(id)
    setSpin(id === 'helix' || id === 'sphere')
  }
  const random = () => select(1 + Math.floor(Math.random() * 118))

  /* ---- guided tour: each step re-arranges the table ---- */
  const startTour = () => {
    closeHelp()
    setQuiz(false)
    setTrends(false)
    setQuery('')
    setTour(0)
  }
  const exitTour = () => {
    setTour(null)
    setFilterKey(null)
    setBars(false)
    setMode('category')
    setTemp(293)
    setSelected(null)
  }
  useEffect(() => {
    if (tour == null) return
    const st = TOUR[tour]
    setLayout('table')
    setSpin(false)
    setMode(st.mode)
    setFilterKey(st.filter ?? null)
    setBars(!!st.bars)
    if (st.temp != null) setTemp(st.temp)
    // on phones the bottom sheet would cover the tour card, so just frame the element
    const open = mobile ? null : st.select ?? null
    setSelected(open)
    const zs = st.frame ?? (st.select ? [st.select] : null)
    const t = setTimeout(() => { if (!open) scene.current?.frame(zs) }, 80)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour])

  /* ---- highlight set: search results win over the legend filter ---- */
  const highlight = useMemo(() => {
    const q = query.trim()
    if (q) return new Set(searchElements(q).map((e) => e.z))
    if (filterKey) return new Set(ELEMENTS.filter((e) => styleFor(mode, e, { temp }).key === filterKey).map((e) => e.z))
    return null
  }, [query, filterKey, mode, temp])

  /* ---- keyboard ---- */
  useEffect(() => {
    const onKey = (e) => {
      const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)
      if (e.key === 'Escape') {
        if (quiz) setQuiz(false)
        else if (trends) setTrends(false)
        else if (help) closeHelp()
        else if (tour != null) exitTour()
        else if (selected) setSelected(null)
        return
      }
      if (quiz || help || trends) return
      if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && !(typing && e.target === searchRef.current)) {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }
      if (typing) return
      if (tour != null) {
        if (e.key === 'ArrowRight') setTour((t) => Math.min(TOUR.length - 1, t + 1))
        if (e.key === 'ArrowLeft') setTour((t) => Math.max(0, t - 1))
        return
      }
      if (/^[1-4]$/.test(e.key)) return changeLayout(['table', 'radial', 'helix', 'sphere'][+e.key - 1])
      if (selected == null) return
      const el = byZ(selected)
      const find = (col, row) => ELEMENTS.find((x) => x.col === col && x.row === row)
      const map = {
        ArrowLeft: () => (selected > 1 ? selected - 1 : null),
        ArrowRight: () => (selected < 118 ? selected + 1 : null),
        ArrowUp: () => find(el.col, el.row - 1)?.z,
        ArrowDown: () => find(el.col, el.row + 1)?.z,
      }
      if (map[e.key]) {
        const z = map[e.key]()
        if (z) { e.preventDefault(); setSelected(z) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ---- how much of the canvas is free of UI ---- */
  const el = selected ? byZ(selected) : null
  const TOP = mobile ? 64 : 70
  const view = useMemo(() => {
    if (el && mobile) {
      const sheet = Math.round(vh * 0.52)
      return { x: 0, y: sheet - TOP, free: Math.max(0.15, (vh - sheet - TOP) / vh) }
    }
    const bottom = Math.round(tour != null ? tourH : dockH) + 14
    return { x: el ? PANEL_W : 0, y: bottom - TOP, free: Math.max(0.3, (vh - bottom - TOP) / vh) }
  }, [el, mobile, dockH, tourH, tour, vh, TOP])

  const rightInset = el && !mobile ? PANEL_W : 0

  return (
    <UnitCtx.Provider value={{ unit, setUnit }}>
      <div className="fixed inset-0 overflow-hidden">
        <SceneView
          key={sceneKey}
          ref={scene}
          layout={layout}
          mode={mode}
          temp={temp}
          bars={bars}
          highlight={highlight}
          selected={selected}
          view={view}
          spin={spin}
          onSelect={select}
          onFail={() => setFlat(true)}
          onRetry={() => {
            setFlat(false)
            setSceneKey((k) => k + 1)
          }}
        />

        <TopBar
          query={query}
          setQuery={setQuery}
          inputRef={searchRef}
          onPick={select}
          onQuiz={() => { setTour(null); setQuiz(true) }}
          onHelp={() => setHelp(true)}
          onTour={startTour}
          onTrends={() => setTrends(true)}
          onRandom={random}
          rightInset={rightInset}
        />

        <Dock
          layout={layout}
          setLayout={changeLayout}
          mode={mode}
          setMode={changeMode}
          temp={temp}
          setTemp={setTemp}
          bars={bars}
          toggleBars={toggleBars}
          spin={spin}
          setSpin={setSpin}
          filterKey={filterKey}
          setFilterKey={setFilterKey}
          onReset={() => scene.current?.reset()}
          onZoomIn={() => scene.current?.zoomIn()}
          onZoomOut={() => scene.current?.zoomOut()}
          rightInset={rightInset}
          flat={flat}
          hidden={tour != null || (!!el && mobile)}
          onHeight={setDockH}
        />

        {tour != null && (
          <Tour
            step={tour}
            setStep={(s) => setTour(Math.max(0, Math.min(TOUR.length - 1, s)))}
            onExit={exitTour}
            onQuiz={() => { exitTour(); setQuiz(true) }}
            temp={temp}
            setTemp={setTemp}
            rightInset={rightInset}
            onHeight={setTourH}
          />
        )}

        {el && (
          <DetailPanel
            key="panel"
            el={el}
            temp={temp}
            sheet={mobile}
            expanded={expanded}
            setExpanded={setExpanded}
            onClose={() => setSelected(null)}
            onSelect={select}
            onPrev={() => setSelected(Math.max(1, el.z - 1))}
            onNext={() => setSelected(Math.min(118, el.z + 1))}
          />
        )}

        {quiz && (
          <Quiz
            onClose={() => setQuiz(false)}
            onShowElement={(z) => {
              setQuiz(false)
              setSelected(z)
            }}
          />
        )}
        {trends && (
          <Trends
            onClose={() => setTrends(false)}
            onSelect={(z) => {
              setTrends(false)
              setSelected(z)
            }}
          />
        )}
        {help && (
          <Help
            onClose={closeHelp}
            onTour={startTour}
            onExplore={(z) => {
              closeHelp()
              setSelected(z)
            }}
          />
        )}
      </div>
    </UnitCtx.Provider>
  )
}
