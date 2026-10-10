import { useEffect, useMemo, useRef, useState } from 'react'
import { ELEMENTS } from '../data/elements.js'
import { CATEGORIES, BLOCKS, ERAS, STATES } from '../data/categories.js'
import { MODES, MODE_BY_ID, RAMP_CSS, NO_DATA, styleFor } from '../lib/scales.js'
import { LAYOUTS } from '../lib/layouts.js'
import { UNITS, useUnit, fmtTemp, altUnit } from '../lib/units.js'
import { BarsIcon, SpinIcon, PlusIcon, MinusIcon, ResetIcon, ChevronD, UpIcon } from './Icons.jsx'

const PRESETS = [
  ['Absolute zero', 0],
  ['Liquid nitrogen', 77],
  ['Room temperature', 293],
  ['Water boils', 373],
  ['Iron melts', 1811],
  ['Sun’s surface', 5772],
]

const DISCRETE = {
  category: CATEGORIES,
  state: STATES,
  block: BLOCKS,
  era: ERAS,
}

function IconBtn({ active, children, label, ...rest }) {
  return (
    <button
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`grid size-9 place-items-center rounded-xl border transition ${
        active ? 'border-accent/60 bg-accent/20 text-snow' : 'border-white/10 bg-white/[0.04] text-muted hover:bg-white/10 hover:text-snow'
      } disabled:opacity-40`}
      {...rest}
    >
      {children}
    </button>
  )
}

function Legend({ mode, temp, filterKey, setFilterKey }) {
  const m = MODE_BY_ID[mode]
  const items = DISCRETE[mode]
  const counts = useMemo(() => {
    const c = {}
    for (const e of ELEMENTS) {
      const k = styleFor(mode, e, { temp }).key
      c[k] = (c[k] || 0) + 1
    }
    return c
  }, [mode, temp])

  if (items) {
    return (
      <div role="group" aria-label="Colour key. Select a swatch to isolate it." className="flex gap-1.5 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0 scroll-thin">
        {items.map((it) => {
          const on = filterKey === it.id
          return (
            <button
              key={it.id}
              onClick={() => setFilterKey(on ? null : it.id)}
              aria-pressed={on}
              className={`flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 text-[13px] transition ${
                on ? 'border-white/60 bg-white/15 text-snow' : filterKey ? 'border-white/5 text-faint hover:text-snow' : 'border-white/10 bg-white/[0.04] text-snow/90 hover:bg-white/10'
              }`}
            >
              <i className="size-3.5 rounded-full" style={{ background: it.color }} />
              {it.label}
              <span className="text-xs text-muted">{counts[it.id] ?? 0}</span>
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted">low</span>
      <div className="flex-1">
        <div className="h-3 rounded-full" style={{ background: RAMP_CSS }} />
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>{m.fmt(m.min)} {m.unit}</span>
          {m.log && <span>log scale</span>}
          <span>{m.fmt(m.max)} {m.unit}</span>
        </div>
      </div>
      <span className="text-xs text-muted">high</span>
      <span className="ml-2 flex items-center gap-1.5 text-xs text-muted">
        <i className="size-3.5 rounded-full" style={{ background: NO_DATA }} /> no data
      </span>
    </div>
  )
}

export function TempControl({ temp, setTemp, compact = false }) {
  const MAX = 6000
  const { unit, setUnit } = useUnit()
  return (
    <div className={`rounded-xl border border-white/[0.07] bg-white/[0.04] p-3 ${compact ? '' : 'mb-3'}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <label htmlFor={compact ? 'temp-tour' : 'temp'} className="font-display text-[15px] font-semibold">Temperature</label>
        <div className="flex items-center gap-3">
          <output className="font-display text-xl font-semibold">
            {fmtTemp(temp, unit)} <span className="text-sm font-normal text-muted">· {fmtTemp(temp, altUnit(unit))}</span>
          </output>
          <div role="radiogroup" aria-label="Temperature unit" className="flex rounded-lg border border-white/10 p-0.5">
            {UNITS.map((u) => (
              <button key={u} role="radio" aria-checked={unit === u} onClick={() => setUnit(u)} className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${unit === u ? 'bg-snow text-ink' : 'text-muted hover:text-snow'}`}>{u}</button>
            ))}
          </div>
        </div>
      </div>
      <input
        id={compact ? 'temp-tour' : 'temp'}
        type="range"
        className="temp mt-1 w-full"
        min={0}
        max={MAX}
        step={1}
        value={temp}
        style={{ '--p': `${(temp / MAX) * 100}%` }}
        onChange={(e) => setTemp(+e.target.value)}
      />
      <div className="mt-1 flex gap-1.5 overflow-x-auto pb-0.5 scroll-thin">
        {PRESETS.map(([label, k]) => (
          <button
            key={label}
            onClick={() => setTemp(k)}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs transition ${
              temp === k ? 'border-accent/60 bg-accent/20' : 'border-white/10 text-muted hover:bg-white/10 hover:text-snow'
            }`}
          >
            {label} · {fmtTemp(k, unit)}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Dock({
  layout, setLayout, mode, setMode, temp, setTemp, bars, toggleBars, spin, setSpin,
  filterKey, setFilterKey, onReset, onZoomIn, onZoomOut, rightInset, hidden, onHeight, flat,
}) {
  const box = useRef(null)
  const [open, setOpen] = useState(typeof window === 'undefined' ? true : window.innerWidth >= 768 && window.innerHeight >= 640)
  const m = MODE_BY_ID[mode]

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => onHeight?.(e.target.getBoundingClientRect().height))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [onHeight])

  return (
    <div
      className={`pointer-events-none fixed bottom-0 left-0 z-10 flex justify-center px-2 pb-2 transition-[right,opacity,transform] duration-300 md:px-3 md:pb-3 ${
        hidden ? 'translate-y-6 opacity-0' : ''
      }`}
      style={{ right: rightInset }}
    >
      <div ref={box} className="glass pointer-events-auto w-full max-w-[1080px] rounded-2xl p-2.5 md:p-3.5">
        {mode === 'state' && <TempControl temp={temp} setTemp={setTemp} />}

        {open && (
          <div style={{ animation: 'fade-in .25s both' }}>
            <Legend mode={mode} temp={temp} filterKey={filterKey} setFilterKey={setFilterKey} />
            <p className="mt-2 hidden max-w-[88ch] text-sm leading-snug text-muted md:block">{m.blurb}</p>
          </div>
        )}

        <div className={`${open ? 'mt-2.5' : ''} flex flex-wrap items-center gap-x-3 gap-y-2`}>
          {!flat && <div role="radiogroup" aria-label="Layout" className="flex rounded-xl border border-white/10 bg-white/[0.04] p-0.5">
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                role="radio"
                aria-checked={layout === l.id}
                title={l.blurb}
                onClick={() => setLayout(l.id)}
                className={`rounded-[10px] px-3 py-1.5 text-sm font-medium transition ${
                  layout === l.id ? 'bg-snow text-ink shadow' : 'text-muted hover:text-snow'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>}

          <label className="relative flex items-center">
            <span className="sr-only">Colour by</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="h-9 appearance-none rounded-xl border border-white/10 bg-white/[0.04] py-0 pl-3 pr-8 text-sm font-medium text-snow transition hover:bg-white/10"
            >
              <optgroup label="Group by">
                {MODES.filter((x) => x.kind === 'discrete').map((x) => (
                  <option key={x.id} value={x.id}>{x.label}</option>
                ))}
              </optgroup>
              <optgroup label="Heatmap">
                {MODES.filter((x) => x.kind === 'continuous').map((x) => (
                  <option key={x.id} value={x.id}>{x.label}</option>
                ))}
              </optgroup>
            </select>
            <ChevronD className="pointer-events-none absolute right-2 size-4 text-muted" />
          </label>

          <div className="ml-auto flex items-center gap-1.5">
            {!flat && (
              <>
                <button
                  onClick={toggleBars}
                  aria-pressed={bars}
                  title="Raise each tile in proportion to the value being shown"
                  className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm transition ${
                    bars ? 'border-accent/60 bg-accent/20 text-snow' : 'border-white/10 bg-white/[0.04] text-muted hover:bg-white/10 hover:text-snow'
                  }`}
                >
                  <BarsIcon className="size-4" /> Raise by value
                </button>
                <IconBtn label="Auto-spin" active={spin} onClick={() => setSpin(!spin)}><SpinIcon /></IconBtn>
                <IconBtn label="Zoom out" onClick={onZoomOut}><MinusIcon /></IconBtn>
                <IconBtn label="Zoom in" onClick={onZoomIn}><PlusIcon /></IconBtn>
                <IconBtn label="Reset view" onClick={onReset}><ResetIcon /></IconBtn>
              </>
            )}
            <IconBtn label={open ? 'Hide colour key' : 'Show colour key'} active={false} onClick={() => setOpen(!open)}>
              <UpIcon className={`transition ${open ? 'rotate-180' : ''}`} />
            </IconBtn>
          </div>
        </div>
      </div>
    </div>
  )
}
