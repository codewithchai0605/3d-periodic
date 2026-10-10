import { useMemo, useState } from 'react'
import { ELEMENTS } from '../data/elements.js'
import { CATEGORIES, CAT_BY_ID } from '../data/categories.js'
import { CloseIcon } from './Icons.jsx'

const PROPS = [
  { id: 'z', label: 'Atomic number', get: (e) => e.z },
  { id: 'mass', label: 'Atomic mass (u)', get: (e) => e.mass },
  { id: 'density', label: 'Density (g/cm³)', get: (e) => e.density, log: true },
  { id: 'melt', label: 'Melting point (K)', get: (e) => e.melt },
  { id: 'boil', label: 'Boiling point (K)', get: (e) => e.boil },
  { id: 'en', label: 'Electronegativity', get: (e) => e.en },
  { id: 'ie', label: 'Ionisation energy (eV)', get: (e) => e.ie },
  { id: 'crust', label: 'Crust abundance (ppm)', get: (e) => e.crust, log: true },
]
const P = Object.fromEntries(PROPS.map((p) => [p.id, p]))

const INSIGHTS = {
  ie: 'The peaks are the noble gases: their full shells are very hard to disturb. Every sharp drop is an alkali metal starting a brand-new shell. Ionisation energy repeats like a wave, which is the periodic law drawn as a graph.',
  en: 'Electronegativity climbs across each period toward the halogens, then falls when a new period begins. Most noble gases have no value, so the line breaks there.',
  density: 'Density builds through each period and peaks in the middle of period 6 — osmium and iridium. The light gases sit at the very bottom. (Log scale.)',
  melt: 'Carbon and the tough transition metals around tungsten melt hottest. The noble gases and halogens melt at low temperatures because their atoms barely cling to each other.',
  boil: 'Boiling points peak with the strongly bonded metals (tungsten, rhenium) and bottom out with the noble gases — helium boils at just 4 K.',
  mass: 'Mass climbs almost steadily because each element adds protons and neutrons. The odd kinks (argon–potassium, cobalt–nickel, tellurium–iodine) are famous historical puzzles.',
  crust: 'Abundance plunges as atomic number rises, and it zigzags: even-numbered elements are more common than their odd neighbours (the Oddo–Harkins rule). Oxygen and silicon alone are about three-quarters of the crust. (Log scale.)',
  z: 'Atomic number against itself is just a line, so try another property on the Y axis.',
}

function niceStep(raw) {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  const f = raw / pow
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * pow
}

function makeScale(prop, vals, a, b) {
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  if (prop.log) {
    const e0 = Math.floor(Math.log10(lo))
    const e1 = Math.ceil(Math.log10(hi))
    const ticks = []
    for (let e = e0; e <= e1; e += Math.max(1, Math.round((e1 - e0) / 7))) ticks.push(e)
    return { f: (v) => a + ((Math.log10(v) - e0) / (e1 - e0 || 1)) * (b - a), ticks: ticks.map((e) => ({ v: Math.pow(10, e), label: e >= 4 || e <= -3 ? `10${String(e).replace('-', '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}` : String(Math.pow(10, e)) })) }
  }
  const step = niceStep((hi - lo || 1) / 6)
  const t0 = prop.id === 'z' ? 0 : Math.floor(lo / step) * step
  const t1 = Math.ceil(hi / step) * step
  const ticks = []
  for (let v = t0; v <= t1 + 1e-9; v += step) ticks.push({ v, label: v.toLocaleString() })
  return { f: (v) => a + ((v - t0) / (t1 - t0 || 1)) * (b - a), ticks }
}

export default function Trends({ onClose, onSelect }) {
  const [xId, setX] = useState('z')
  const [yId, setY] = useState('ie')
  const [join, setJoin] = useState(true)
  const [iso, setIso] = useState(null)
  const [hover, setHover] = useState(null)
  const X = P[xId], Y = P[yId]

  const W = 780, H = 440
  const m = { l: 64, r: 18, t: 14, b: 50 }

  const { pts, sx, sy } = useMemo(() => {
    const pts = ELEMENTS.map((e) => ({ e, x: X.get(e), y: Y.get(e) })).filter((p) => p.x != null && p.y != null && (!X.log || p.x > 0) && (!Y.log || p.y > 0))
    return {
      pts,
      sx: makeScale(X, pts.map((p) => p.x), m.l, W - m.r),
      sy: makeScale(Y, pts.map((p) => p.y), H - m.b, m.t),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xId, yId])

  const path = useMemo(() => {
    if (!join || xId !== 'z') return ''
    let d = ''
    let prev = null
    for (const p of pts) {
      const seq = prev && p.e.z === prev.e.z + 1
      d += `${seq ? 'L' : 'M'}${sx.f(p.x).toFixed(1)},${sy.f(p.y).toFixed(1)}`
      prev = p
    }
    return d
  }, [pts, join, xId, sx, sy])

  const hv = hover ? ELEMENTS[hover - 1] : null
  const note = xId === 'z' ? INSIGHTS[yId] : 'Each dot is an element, coloured by family. Try atomic number on the X axis to see periodic patterns, or pair two properties — for example electronegativity against ionisation energy — to see which properties travel together.'

  const select = (label, value, set) => (
    <label className="flex min-w-0 items-center gap-2 text-sm text-muted">
      {label}
      <select value={value} onChange={(e) => set(e.target.value)} className="min-w-0 rounded-lg border border-white/10 bg-ink-3 px-2.5 py-1.5 text-snow">
        {PROPS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
    </label>
  )

  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-ink/70 p-3 backdrop-blur-sm" style={{ animation: 'fade-in .2s both' }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Trends explorer" className="glass relative w-full max-w-[880px] rounded-3xl p-4 md:p-6" style={{ animation: 'pop-in .3s cubic-bezier(.2,.8,.2,1) both' }}>
        <button onClick={onClose} aria-label="Close trends" className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-snow"><CloseIcon /></button>
        <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Trends explorer</h2>
        <p className="mt-1 max-w-[60ch] text-sm text-muted">Plot any property against another and watch the periodic law appear. Hover a dot to read it; click to open the element.</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          {select('Y axis', yId, setY)}
          {select('X axis', xId, setX)}
          {xId === 'z' && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={join} onChange={(e) => setJoin(e.target.checked)} className="size-4 accent-[#8ab4ff]" /> Join the dots
            </label>
          )}
        </div>

        <div className="mt-3 min-h-[44px] rounded-xl bg-white/[0.045] px-3 py-2 text-sm" aria-live="polite">
          {hv ? (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <b className="font-display text-base" style={{ color: CAT_BY_ID[hv.category].color }}>{hv.name} ({hv.symbol})</b>
              <span className="text-muted">{X.label}: <b className="text-snow">{+(+X.get(hv)).toPrecision(4)}</b></span>
              <span className="text-muted">{Y.label}: <b className="text-snow">{+(+Y.get(hv)).toPrecision(4)}</b></span>
            </span>
          ) : (
            <span className="text-muted">{pts.length} elements have data for both properties.</span>
          )}
        </div>

        <div className="mt-2 overflow-hidden rounded-2xl border border-white/[0.07] bg-ink/40">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Scatter plot of ${Y.label} against ${X.label}`}>
            {sy.ticks.map((t) => (
              <g key={`y${t.v}`}>
                <line x1={m.l} x2={W - m.r} y1={sy.f(t.v)} y2={sy.f(t.v)} stroke="rgb(255 255 255 / .08)" />
                <text x={m.l - 8} y={sy.f(t.v) + 4} textAnchor="end" fontSize="11" fill="#9aa4cc">{t.label}</text>
              </g>
            ))}
            {sx.ticks.map((t) => (
              <g key={`x${t.v}`}>
                <line x1={sx.f(t.v)} x2={sx.f(t.v)} y1={m.t} y2={H - m.b} stroke="rgb(255 255 255 / .05)" />
                <text x={sx.f(t.v)} y={H - m.b + 18} textAnchor="middle" fontSize="11" fill="#9aa4cc">{t.label}</text>
              </g>
            ))}
            <text x={(m.l + W - m.r) / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="#c5ccec">{X.label}</text>
            <text transform={`translate(14 ${(m.t + H - m.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="#c5ccec">{Y.label}</text>
            {path && <path d={path} fill="none" stroke="rgb(255 255 255 / .22)" strokeWidth="1.2" />}
            {pts.map((p) => {
              const c = CAT_BY_ID[p.e.category].color
              const dim = iso && iso !== p.e.category
              const on = hover === p.e.z
              return (
                <g key={p.e.z} tabIndex={0} role="button" aria-label={`${p.e.name}: ${X.label} ${p.x}, ${Y.label} ${p.y}`}
                  onMouseEnter={() => setHover(p.e.z)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(p.e.z)} onBlur={() => setHover(null)}
                  onClick={() => onSelect(p.e.z)} onKeyDown={(e) => e.key === 'Enter' && onSelect(p.e.z)} className="cursor-pointer outline-none">
                  <circle cx={sx.f(p.x)} cy={sy.f(p.y)} r="11" fill="transparent" />
                  <circle cx={sx.f(p.x)} cy={sy.f(p.y)} r={on ? 8 : 5} fill={c} opacity={dim ? 0.12 : 1} stroke={on ? '#fff' : 'none'} strokeWidth="2" />
                  {on && <text x={sx.f(p.x)} y={sy.f(p.y) - 13} textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">{p.e.symbol}</text>}
                </g>
              )
            })}
          </svg>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Isolate a family">
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setIso(iso === c.id ? null : c.id)} aria-pressed={iso === c.id}
              className={`flex items-center gap-1.5 rounded-full border py-0.5 pl-1.5 pr-2.5 text-xs transition ${iso === c.id ? 'border-white/60 bg-white/15' : 'border-white/10 text-muted hover:text-snow'}`}>
              <i className="size-3 rounded-full" style={{ background: c.color }} />{c.label}
            </button>
          ))}
        </div>

        <p className="mt-4 rounded-2xl border-l-4 border-accent/70 bg-white/[0.045] p-3.5 text-[15px] leading-relaxed">{note}</p>
      </div>
    </div>
  )
}
