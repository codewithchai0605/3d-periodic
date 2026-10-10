import { useEffect, useMemo, useRef, useState } from 'react'
import { searchElements } from '../data/elements.js'
import { CAT_BY_ID } from '../data/categories.js'
import { SearchIcon, QuizIcon, HelpIcon, CloseIcon, CompassIcon, ChartIcon, DiceIcon, MoreIcon } from './Icons.jsx'

function Mark() {
  // a tiny emission-spectrum motif: bright lines on a dark slit
  const lines = [['#ff5d6c', 7], ['#f0cc4d', 11], ['#43c59e', 15], ['#38b6e8', 19], ['#9b7bf3', 23]]
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      <rect x="1" y="1" width="32" height="32" rx="9" fill="#0d1020" stroke="rgb(255 255 255 / .22)" />
      {lines.map(([c, x], i) => (
        <rect key={c} x={x - 1} y={7 + (i % 2) * 2} width="2" height={20 - (i % 2) * 4} rx="1" fill={c} />
      ))}
    </svg>
  )
}

function Search({ query, setQuery, onPick, inputRef }) {
  const all = useMemo(() => searchElements(query), [query])
  const results = all.slice(0, 7)
  const [active, setActive] = useState(0)
  const open = query.trim().length > 0

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter' && results[active]) { onPick(results[active].z); setQuery(''); e.currentTarget.blur() }
    else if (e.key === 'Escape') { setQuery(''); e.currentTarget.blur() }
  }

  return (
    <div className="relative w-full max-w-[420px]">
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setActive(0) }}
        onKeyDown={onKey}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="search-results"
        aria-label="Search elements by name, symbol, number, or a word like radioactive or noble"
        placeholder="Search elements"
        className="glass h-11 w-full rounded-full pl-10 pr-4 text-[15px] md:pr-16 text-snow placeholder:text-muted/80"
        autoComplete="off"
        spellCheck={false}
      />
      {open ? (
        <button onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-snow">
          <CloseIcon className="size-4" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-white/15 px-1.5 text-xs text-muted md:block">/</kbd>
      )}
      {open && (
        <ul id="search-results" role="listbox" className="glass absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-2xl p-1.5" style={{ animation: 'pop-in .18s both' }}>
          {results.length === 0 && <li className="px-3 py-3 text-sm text-muted">No element matches “{query}”. Try a name (“iron”), a symbol (“Fe”), a number, or a word like “radioactive”, “gas”, “noble” or “battery”.</li>}
          {results.map((e, i) => (
            <li key={e.z} role="option" aria-selected={i === active}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => { onPick(e.z); setQuery('') }}
                className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left ${i === active ? 'bg-white/10' : ''}`}
              >
                <span className="grid size-9 place-items-center rounded-lg font-display text-sm font-bold text-ink" style={{ background: CAT_BY_ID[e.category].color }}>{e.symbol}</span>
                <span className="flex-1 font-medium">{e.name}</span>
                <span className="text-xs text-muted">No. {e.z}</span>
              </button>
            </li>
          ))}
          {all.length > results.length && (
            <li className="px-3 py-2 text-xs text-muted">+ {all.length - results.length} more, highlighted on the table</li>
          )}
        </ul>
      )}
    </div>
  )
}

function Menu({ items }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const on = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', on)
    return () => document.removeEventListener('pointerdown', on)
  }, [open])
  return (
    <div ref={ref} className="relative md:hidden">
      <button onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label="More" className="glass grid size-11 place-items-center rounded-full text-snow"><MoreIcon /></button>
      {open && (
        <ul role="menu" className="glass absolute right-0 top-[calc(100%+8px)] w-52 rounded-2xl p-1.5" style={{ animation: 'pop-in .18s both' }}>
          {items.map(([label, Icon, fn]) => (
            <li key={label} role="none">
              <button role="menuitem" onClick={() => { setOpen(false); fn() }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/10">
                <Icon className="size-[18px] text-muted" />{label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const ghost = 'glass hidden size-11 place-items-center rounded-full text-muted transition hover:text-snow md:grid'

export default function TopBar({ query, setQuery, onPick, inputRef, onQuiz, onHelp, onTour, onTrends, onRandom, rightInset = 0 }) {
  return (
    <header className="pointer-events-none fixed left-0 top-0 z-20 flex items-center gap-3 px-3 pt-3 transition-[right] duration-300 md:px-4" style={{ right: rightInset }}>
      <div className="pointer-events-auto flex shrink-0 items-center gap-2.5">
        <Mark />
        <div className="hidden leading-none sm:block">
          <div className="font-display text-[22px] font-bold tracking-tight">Elementary</div>
          <div className="mt-0.5 text-xs text-muted">The periodic table in 3D</div>
        </div>
      </div>
      <div className="pointer-events-auto mx-auto w-full max-w-[420px] flex-1">
        <Search query={query} setQuery={setQuery} onPick={onPick} inputRef={inputRef} />
      </div>
      <div className="pointer-events-auto flex shrink-0 items-center gap-2">
        <button onClick={onTour} className="glass hidden h-11 items-center gap-2 rounded-full px-4 font-medium text-snow transition hover:bg-white/10 md:flex" title="A 2-minute guided tour">
          <CompassIcon className="size-[18px]" /><span className="hidden xl:inline">Tour</span>
        </button>
        <button onClick={onTrends} className={ghost} aria-label="Trends explorer" title="Trends explorer"><ChartIcon /></button>
        <button onClick={onRandom} className={ghost} aria-label="Show a random element" title="Surprise me"><DiceIcon /></button>
        <button onClick={onQuiz} className="flex h-11 items-center gap-2 rounded-full bg-snow px-4 font-semibold text-ink shadow-lg transition hover:bg-white">
          <QuizIcon className="size-[18px]" />
          <span className="hidden sm:inline">Quiz</span>
          <span className="sr-only sm:hidden">Quiz</span>
        </button>
        <button onClick={onHelp} aria-label="How to use this site" className={ghost}><HelpIcon /></button>
        <Menu items={[['Guided tour', CompassIcon, onTour], ['Trends explorer', ChartIcon, onTrends], ['Surprise me', DiceIcon, onRandom], ['How to use', HelpIcon, onHelp]]} />
      </div>
    </header>
  )
}
