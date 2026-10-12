import { useEffect, useMemo, useRef, useState } from 'react'
import AtomViewer from './AtomViewer.jsx'
import OrbitalViewer from './OrbitalViewer.jsx'
import { CloseIcon, ChevronL, ChevronR, ShareIcon } from './Icons.jsx'
import { ELEMENTS } from '../data/elements.js'
import { CAT_BY_ID, BLOCK_BY_ID } from '../data/categories.js'
import { stateAt } from '../lib/phase.js'
import { configString } from '../lib/config.js'
import { ANGULAR, L_NAMES, SHAPE_NOTES } from '../lib/orbitals.js'
import { useUnit, fmtTemp, altUnit } from '../lib/units.js'
import { compoundsWith } from '../lib/chem.js'
import { FlaskIcon } from './Icons.jsx'

const SHELL_NAMES = ['K', 'L', 'M', 'N', 'O', 'P', 'Q']
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const sup = (n) => String(n).split('').map((d) => SUP[+d]).join('')
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

function fmtDensity(d) {
  if (d == null) return null
  if (d < 0.01) return `${(d * 1000).toPrecision(3)} g/L`
  return `${+d.toPrecision(4)} g/cm³`
}
function fmtCrust(v) {
  if (v == null) return null
  if (v >= 100) return `${Math.round(v).toLocaleString()} ppm`
  if (v >= 0.1) return `${+v.toPrecision(2)} ppm`
  return `${v.toExponential(1)} ppm`
}

function neighbours(el) {
  const find = (col, row) => ELEMENTS.find((e) => e.col === col && e.row === row) ?? null
  return { up: find(el.col, el.row - 1), down: find(el.col, el.row + 1), left: find(el.col - 1, el.row), right: find(el.col + 1, el.row) }
}

/** A property card. Tap it to see a plain-language explanation. */
function Stat({ label, value, sub, wide, info }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      className={`group rounded-xl bg-white/[0.045] px-3 py-2.5 text-left transition hover:bg-white/[0.08] ${wide ? 'col-span-2' : ''}`}
    >
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span>{label}</span>
        <span aria-hidden className={`grid size-4 place-items-center rounded-full border border-white/20 text-[10px] leading-none transition ${open ? 'bg-accent/30 text-snow' : 'group-hover:text-snow'}`}>?</span>
      </div>
      <div className={`mt-0.5 text-[15px] font-semibold ${value ? 'text-snow' : 'text-faint'}`}>{value ?? '—'}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
      {open && <p className="mt-2 border-t border-white/10 pt-2 text-xs leading-relaxed text-muted" style={{ animation: 'fade-in .2s both' }}>{info}</p>}
    </button>
  )
}

function Section({ title, children, aside }) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-[17px] font-semibold tracking-tight">{title}</h3>
        {aside && <span className="text-xs text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

/** Solid / liquid / gas strip with a marker for the current temperature. */
function PhaseStrip({ el, temp }) {
  const { unit } = useUnit()
  const MAX = 6000
  const pct = (k) => `${Math.min(100, Math.max(0, (k / MAX) * 100))}%`
  const { melt, boil } = el
  if (melt == null && boil == null) {
    return <p className="rounded-xl bg-white/[0.045] px-3 py-3 text-sm text-muted">No melting or boiling point has been measured for {el.name} yet.</p>
  }
  const sublimes = melt != null && boil != null && boil <= melt
  const segs = []
  if (melt == null) segs.push(['liquid', 0, boil], ['gas', boil, MAX])
  else if (sublimes) segs.push(['solid', 0, boil], ['gas', boil, MAX])
  else {
    segs.push(['solid', 0, melt])
    if (boil == null) segs.push(['liquid', melt, MAX])
    else segs.push(['liquid', melt, boil], ['gas', boil, MAX])
  }
  const colors = { solid: '#6a8cff', liquid: '#2fd0c0', gas: '#ff7aa0' }
  const now = stateAt(el, temp)
  return (
    <div className="rounded-xl bg-white/[0.045] px-3 pb-3 pt-3.5">
      <div className="relative h-3 overflow-hidden rounded-full">
        {segs.map(([k, a, b]) => (
          <div key={k} className="absolute inset-y-0" style={{ left: pct(a), width: `calc(${pct(b)} - ${pct(a)})`, background: colors[k] }} />
        ))}
      </div>
      <div className="relative mt-1 h-9 text-xs text-muted">
        <span className="absolute -top-[22px] h-6 w-0.5 -translate-x-1/2 rounded bg-white" style={{ left: pct(temp) }} />
        {melt != null && !sublimes && <span className="absolute -translate-x-1/2 whitespace-nowrap pt-1.5" style={{ left: `clamp(10%, ${pct(melt)}, 86%)` }}>melts {fmtTemp(melt, unit)}</span>}
        {boil != null && (
          <span className="absolute -translate-x-1/2 whitespace-nowrap pt-1.5" style={{ left: `clamp(14%, ${pct(boil)}, 88%)`, top: melt != null && !sublimes && Math.abs(boil - melt) < 900 ? 16 : 0 }}>
            {sublimes ? 'sublimes' : 'boils'} {fmtTemp(boil, unit)}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm">
        At <b>{fmtTemp(temp, unit)}</b>, {el.name.toLowerCase()} is a{' '}
        <b style={{ color: now === 'unknown' ? undefined : colors[now] }}>{now}</b>.
      </p>
    </div>
  )
}

const COMPARE_ROWS = [
  ['Atomic mass', (e) => e.mass, (v) => `${v} u`],
  ['Density', (e) => e.density, fmtDensity],
  ['Melting point', (e) => e.melt, (v, u) => fmtTemp(v, u)],
  ['Boiling point', (e) => e.boil, (v, u) => fmtTemp(v, u)],
  ['Electronegativity', (e) => e.en, (v) => v.toFixed(2)],
  ['Ionisation energy', (e) => e.ie, (v) => `${v} eV`],
  ['Crust abundance', (e) => e.crust, fmtCrust],
]

function Compare({ el }) {
  const { unit } = useUnit()
  const [otherZ, setOtherZ] = useState('')
  const other = otherZ ? ELEMENTS[+otherZ - 1] : null
  const colorA = CAT_BY_ID[el.category].color
  const colorB = other ? CAT_BY_ID[other.category].color : '#fff'
  return (
    <Section title="Compare">
      <label className="flex items-center gap-2 text-sm text-muted">
        <span className="shrink-0">{el.name} vs</span>
        <select value={otherZ} onChange={(e) => setOtherZ(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-ink-3 px-2.5 py-2 text-snow">
          <option value="">Choose an element…</option>
          {ELEMENTS.filter((e) => e.z !== el.z).map((e) => (
            <option key={e.z} value={e.z}>{e.z} · {e.name} ({e.symbol})</option>
          ))}
        </select>
      </label>
      {other && (
        <div className="mt-3 space-y-3 rounded-xl bg-white/[0.045] p-3">
          {COMPARE_ROWS.map(([label, get, fmt]) => {
            const a = get(el), b = get(other)
            if (a == null && b == null) return null
            const max = Math.max(a ?? 0, b ?? 0) || 1
            const row = (v, color, name) => (
              <div className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-xs font-semibold text-muted">{name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full transition-[width] duration-500" style={{ width: v == null ? 0 : `${Math.max(2, (v / max) * 100)}%`, background: color }} />
                </div>
                <span className="w-24 shrink-0 text-right text-xs">{v == null ? <span className="text-faint">—</span> : fmt(v, unit)}</span>
              </div>
            )
            return (
              <div key={label}>
                <div className="mb-1 text-xs text-muted">{label}</div>
                {row(a, colorA, el.symbol)}
                <div className="h-1" />
                {row(b, colorB, other.symbol)}
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}

/** Atom model / orbital explorer with tabs. */
function Visual({ el, view, setView, orb, setOrb, mi, setMi }) {
  const occupied = useMemo(
    () =>
      Object.entries(el.cfg.full)
        .filter(([, c]) => c > 0)
        .map(([o, c]) => ({ o, c, n: +o[0], l: 'spdf'.indexOf(o[1]) }))
        .sort((a, b) => a.n - b.n || a.l - b.l),
    [el],
  )
  const protons = el.z
  const outer = el.shells[el.shells.length - 1]
  const orientations = ANGULAR[orb.l]
  const orbLabel = `${orb.n}${L_NAMES[orb.l]}`

  return (
    <div>
      <div role="tablist" aria-label="Visualisation" className="mb-2 flex rounded-xl border border-white/10 bg-white/[0.04] p-0.5">
        {[['atom', 'Atom model'], ['orbitals', 'Orbitals']].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`flex-1 rounded-[10px] px-3 py-1.5 text-sm font-medium transition ${view === id ? 'bg-snow text-ink shadow' : 'text-muted hover:text-snow'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[radial-gradient(circle_at_50%_45%,#1e2a5e,#0d1230_75%)]">
        {view === 'atom' ? (
          <AtomViewer el={el} className="h-[236px] w-full" />
        ) : (
          <OrbitalViewer n={orb.n} l={orb.l} mi={mi} className="h-[236px] w-full" label={`3D cloud of the ${orbLabel} ${orientations[mi].label} orbital`} />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-3 bg-gradient-to-t from-ink/80 to-transparent px-3 pb-2 pt-8 text-xs">
          {view === 'atom' ? (
            <>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#ff6b6b]" />{protons} protons</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#a9b4d6]" />{el.neutrons} neutrons</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#7be0ff]" />{el.z} electrons</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#4dcfff]" />positive lobe</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#ff7092]" />negative lobe</span>
            </>
          )}
        </div>
      </div>

      {view === 'atom' ? (
        <p className="mt-1.5 text-center text-xs text-faint">Drag to turn the atom. Neutrons shown for the most common or longest-lived isotope.</p>
      ) : (
        <div className="mt-2.5">
          <div className="text-xs text-muted">Pick one of {el.name}’s occupied orbitals</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Occupied orbitals">
            {occupied.map(({ o, c, n, l }) => {
              const on = orb.n === n && orb.l === l
              return (
                <button key={o} onClick={() => { setOrb({ n, l }); setMi(0) }} aria-pressed={on}
                  className={`rounded-lg border px-2 py-1 text-sm transition ${on ? 'border-white/60 bg-white/15' : 'border-white/10 bg-white/[0.04] text-muted hover:text-snow'}`}>
                  <span style={{ color: BLOCK_BY_ID[o[1]].color }} className="font-semibold">{o}</span>
                  <span className="text-[0.7em] text-muted">{sup(c)}</span>
                </button>
              )
            })}
          </div>
          {orientations.length > 1 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5" role="group" aria-label="Orientation">
              <span className="text-xs text-muted">Orientation</span>
              {orientations.map((a, i) => (
                <button key={a.id} onClick={() => setMi(i)} aria-pressed={mi === i}
                  className={`rounded-lg border px-2 py-0.5 text-xs transition ${mi === i ? 'border-accent/70 bg-accent/20' : 'border-white/10 text-muted hover:text-snow'}`}>
                  {a.label}
                </button>
              ))}
            </div>
          )}
          <p className="mt-2.5 rounded-xl bg-white/[0.045] p-3 text-sm leading-relaxed text-muted">
            <b className="text-snow">{orbLabel} · {SHAPE_NOTES[orb.l].split('.')[0]}.</b> {SHAPE_NOTES[orb.l].split('. ').slice(1).join('. ')}
            <span className="mt-1.5 block text-xs text-faint">Each dot is a place the electron might be found. These are hydrogen-like shapes, drawn with slightly sharpened lobes; in bigger atoms the sizes shift but the shapes hold. {outer ? `Outer shell holds ${outer} electron${outer === 1 ? '' : 's'}.` : ''}</span>
          </p>
        </div>
      )}
    </div>
  )
}

function Compounds({ el, onOpenLab }) {
  const list = compoundsWith(el.symbol)
  return (
    <Section title="Compounds and structures" aside={list.length ? `${list.length} in the lab` : undefined}>
      {list.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {list.slice(0, 14).map((m) => (
            <button key={m.id} onClick={() => onOpenLab({ tab: 'structures', molId: m.id })} title={m.name} className="rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-1 font-display text-[15px] font-semibold text-accent transition hover:bg-white/10">{m.formula}</button>
          ))}
          {list.length > 14 && <button onClick={() => onOpenLab({ tab: 'structures', molId: list[0].id })} className="rounded-xl px-2.5 py-1 text-sm text-muted hover:text-snow">+{list.length - 14} more</button>}
        </div>
      ) : <p className="text-sm text-muted">No structures with {el.name} in the lab yet, but you can still combine it with other atoms.</p>}
      <button onClick={() => onOpenLab({ tab: 'combine', flask: { [el.symbol]: 1 } })} className="mt-2.5 flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10"><FlaskIcon className="size-4" />Mix {el.name} with other atoms</button>
    </Section>
  )
}

function Content({ el, temp, onSelect, scrollTop, onOpenLab }) {
  const { unit } = useUnit()
  const cat = CAT_BY_ID[el.category]
  const nb = neighbours(el)
  const outer = el.shells[el.shells.length - 1]
  const last = el.cfg.parts[el.cfg.parts.length - 1][0]
  const [view, setView] = useState('atom')
  const [orb, setOrb] = useState({ n: +last[0], l: 'spdf'.indexOf(last[1]) })
  const [mi, setMi] = useState(0)

  const showOrbital = (o) => {
    setOrb({ n: +o[0], l: 'spdf'.indexOf(o[1]) })
    setMi(0)
    setView('orbitals')
    scrollTop()
  }
  const alt = altUnit(unit)

  return (
    <>
      <Visual el={el} view={view} setView={setView} orb={orb} setOrb={setOrb} mi={mi} setMi={setMi} />

      <Section title="Did you know?">
        <p className="rounded-2xl border border-white/[0.07] bg-white/[0.045] p-3.5 text-[15px] leading-relaxed">{el.fact}</p>
      </Section>

      <Section title="Used for">
        <ul className="flex flex-wrap gap-1.5">
          {el.uses.map((u) => (
            <li key={u} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-sm">{u}</li>
          ))}
        </ul>
      </Section>

      <Section title="Properties" aside={el.estimated ? 'some values are estimates' : 'tap a card to learn what it means'}>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Atomic mass" value={`${el.bracketMass ? `[${el.mass}]` : el.mass} u`} sub={el.bracketMass ? 'most stable isotope' : undefined}
            info="The average mass of one atom in atomic mass units (1 u is about the mass of one proton). Square brackets mean no stable isotope exists, so the most stable one is shown." />
          <Stat label="State at 25 °C" value={el.phase === 'unknown' ? null : cap(el.phase)} sub={el.radioactive ? 'radioactive' : undefined}
            info="Whether it is a solid, liquid or gas at room temperature and normal air pressure. Only bromine and mercury are liquids." />
          <Stat label="Melting point" value={fmtTemp(el.melt, unit)} sub={el.melt != null ? fmtTemp(el.melt, alt) : undefined}
            info="The temperature where the solid turns to liquid. Higher means the atoms are held together more strongly." />
          <Stat label="Boiling point" value={fmtTemp(el.boil, unit)} sub={el.boil != null ? fmtTemp(el.boil, alt) : undefined}
            info="The temperature where the liquid turns to gas. Gases such as helium boil only a few degrees above absolute zero." />
          <Stat label="Density" value={fmtDensity(el.density)}
            info="Mass per unit volume. Water is 1 g/cm³. Gases are shown in g/L, because they are about a thousand times lighter." />
          <Stat label="Electronegativity" value={el.en != null ? el.en.toFixed(2) : null} sub="Pauling scale"
            info="How strongly an atom pulls on the electrons it shares in a bond. Fluorine is the highest (3.98). Most noble gases form so few bonds that they have no value." />
          <Stat label="First ionisation energy" value={el.ie != null ? `${el.ie} eV` : null}
            info="Energy needed to remove the outermost electron from a gas atom, in electron-volts. Metals lose electrons easily (low); noble gases hold on tight (high)." />
          <Stat label="In Earth’s crust" value={fmtCrust(el.crust)} sub={el.crust != null ? 'by mass' : undefined}
            info="Share of the Earth’s crust made of this element, in parts per million by mass. Oxygen is 461,000 ppm (46%); gold is just 0.004 ppm." />
        </div>
      </Section>

      <Section title="When does it melt or boil?">
        <PhaseStrip el={el} temp={temp} />
      </Section>

      <Section title="Electrons">
        <div className="rounded-2xl bg-white/[0.045] p-3.5">
          <div className="flex items-baseline justify-between text-xs text-muted">
            <span>Configuration</span>
            <span>tap an orbital to see it</span>
          </div>
          <p className="mt-1 font-display text-lg font-semibold leading-snug">
            {el.cfg.coreSym && <span className="text-muted">[{el.cfg.coreSym}] </span>}
            {el.cfg.parts.map(([orb, n]) => (
              <button key={orb} onClick={() => showOrbital(orb)} title={`Show the ${orb} orbital`} className="mr-1.5 inline-block whitespace-nowrap rounded-md px-0.5 transition hover:bg-white/10" style={{ color: BLOCK_BY_ID[orb[1]].color }}>
                {orb}<span className="text-[0.75em]">{sup(n)}</span>
              </button>
            ))}
          </p>
          <p className="sr-only">{configString(el.cfg)}</p>
          <div className="mt-3 text-xs text-muted">Electrons per shell</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {el.shells.map((n, i) => (
              <span key={i} className="rounded-lg bg-white/[0.07] px-2.5 py-1 text-sm"><span className="text-muted">{SHELL_NAMES[i]}</span> <b>{n}</b></span>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">
            The outer shell holds <b className="text-snow">{outer}</b> electron{outer === 1 ? '' : 's'}
            {el.block === 's' || el.block === 'p' ? '. Elements in the same group share this count, which is why they react in similar ways.' : '.'}
          </p>
        </div>
      </Section>

      <Section title="Discovery">
        <div className="rounded-2xl bg-white/[0.045] p-3.5 text-sm">
          <div className="font-display text-2xl font-semibold">{el.year === 0 ? 'Ancient' : el.year}</div>
          <div className="mt-0.5 text-muted">{el.by}</div>
        </div>
      </Section>

      <Compounds el={el} onOpenLab={onOpenLab} />

      <Section title="Around it in the table">
        <div className="mx-auto grid w-fit grid-cols-3 gap-1.5">
          {[null, 'up', null, 'left', 'self', 'right', null, 'down', null].map((slot, i) => {
            if (!slot) return <span key={i} className="size-[76px]" />
            const e = slot === 'self' ? el : nb[slot]
            if (!e) return <span key={i} className="grid size-[76px] place-items-center rounded-xl border border-dashed border-white/10 text-xs text-faint">none</span>
            const c = CAT_BY_ID[e.category].color
            return (
              <button key={i} disabled={slot === 'self'} onClick={() => onSelect(e.z)}
                className="relative grid size-[76px] place-items-center rounded-xl text-ink transition enabled:hover:scale-[1.06]"
                style={{ background: c, outline: slot === 'self' ? '2px solid white' : 'none', outlineOffset: 2 }}
                aria-label={slot === 'self' ? `${e.name} (selected)` : `${e.name}, ${slot}`}>
                <span className="absolute left-1.5 top-1 text-[11px] font-semibold">{e.z}</span>
                <span className="font-display text-2xl font-extrabold leading-none">{e.symbol}</span>
                <span className="absolute bottom-1 text-[10px] font-medium">{e.name}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-center text-xs text-muted">Elements in the same column share chemistry; across a row they gain one proton at a time.</p>
      </Section>

      <Compare key={el.z} el={el} />
    </>
  )
}

export default function DetailPanel({ el, temp, onClose, onSelect, onOpenLab, onPrev, onNext, sheet, expanded, setExpanded }) {
  const scroller = useRef(null)
  const drag = useRef(null)
  const [copied, setCopied] = useState(false)
  const cat = CAT_BY_ID[el.category]
  const scrollTop = () => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [el.z])

  const share = async () => {
    try {
      await navigator.clipboard.writeText(location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { /* clipboard unavailable */ }
  }

  // swipe the grab handle: up expands, down collapses (or closes when already collapsed)
  const onHandleDown = (e) => {
    drag.current = e.clientY
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onHandleUp = (e) => {
    if (drag.current == null) return
    const dy = e.clientY - drag.current
    drag.current = null
    if (Math.abs(dy) < 8) setExpanded(!expanded)
    else if (dy < -24) setExpanded(true)
    else if (dy > 24) (expanded ? setExpanded(false) : onClose())
  }

  const groupLabel = el.group ? `, group ${el.group}` : ''

  return (
    <aside
      aria-label={`${el.name} details`}
      className={`glass fixed z-20 flex flex-col overflow-hidden transition-[height] duration-300 ${
        sheet ? 'inset-x-0 bottom-0 rounded-t-3xl' : 'bottom-3 right-3 top-3 w-[404px] max-w-[calc(100vw-1.5rem)] rounded-3xl'
      }`}
      style={{ ...(sheet ? { height: expanded ? '90dvh' : '52dvh' } : {}), animation: `${sheet ? 'slide-in-up' : 'slide-in-right'} .38s cubic-bezier(.2,.8,.2,1) both` }}
    >
      {sheet && (
        <button aria-label={expanded ? 'Collapse details' : 'Expand details'} onPointerDown={onHandleDown} onPointerUp={onHandleUp} style={{ touchAction: 'none' }} className="grid h-6 w-full shrink-0 place-items-center">
          <span className="h-1.5 w-11 rounded-full bg-white/25" />
        </button>
      )}
      <header className="relative shrink-0 px-4 pb-4 pt-2 md:pt-4" style={{ background: `linear-gradient(135deg, ${cat.color}33, transparent 70%)` }}>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <button onClick={onPrev} disabled={el.z <= 1} aria-label="Previous element" className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-snow disabled:opacity-30"><ChevronL /></button>
            <button onClick={onNext} disabled={el.z >= 118} aria-label="Next element" className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-snow disabled:opacity-30"><ChevronR /></button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={share} aria-label="Copy link to this element" className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-muted transition hover:bg-white/10 hover:text-snow">
              <ShareIcon className="size-4" />
              {copied ? 'Link copied' : 'Share'}
            </button>
            <button onClick={onClose} aria-label="Close details" className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-snow"><CloseIcon /></button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-4">
          <div className="relative grid size-[92px] shrink-0 place-items-center rounded-2xl text-ink shadow-lg" style={{ background: cat.color, boxShadow: `0 10px 36px -8px ${cat.color}aa` }}>
            <span className="absolute left-2.5 top-1.5 text-sm font-semibold">{el.z}</span>
            <span className="font-display text-[44px] font-extrabold leading-none">{el.symbol}</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-[34px] font-bold leading-[1.05] tracking-tight">{el.name}</h2>
            <p className="mt-1 text-sm text-muted">
              <span className="font-medium" style={{ color: cat.color }}>{cat.label}</span>
              {el.predictedChem && ' (predicted)'}
            </p>
            <p className="text-sm text-muted">Period {el.period}{groupLabel}, {el.block}-block</p>
          </div>
        </div>
      </header>

      <div ref={scroller} className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        <Content key={el.z} el={el} temp={temp} onSelect={onSelect} scrollTop={scrollTop} onOpenLab={onOpenLab} />
      </div>
    </aside>
  )
}
