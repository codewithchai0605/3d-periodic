import { useMemo } from 'react'
import { ELEMENTS, bySymbol } from '../data/elements.js'
import { atomColor } from './MoleculeViewer.jsx'
import { MOL_BY_ID, sub, suggestions, prettyFormula } from '../lib/chem.js'
import { luminance } from '../lib/scales.js'
import { PlusIcon, MinusIcon, TrashIcon, CloseIcon } from './Icons.jsx'

const TRAY = ['H', 'C', 'N', 'O', 'F', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'K', 'Ca', 'Fe', 'Cu', 'Zn', 'Br', 'Ag', 'I', 'Xe']
const EXAMPLES = [
  ['H₂O', { H: 2, O: 1 }], ['NH₃', { N: 1, H: 3 }], ['CH₄', { C: 1, H: 4 }], ['CO₂', { C: 1, O: 2 }], ['NaCl', { Na: 1, Cl: 1 }], ['MgO', { Mg: 1, O: 1 }],
  ['H₂SO₄', { H: 2, S: 1, O: 4 }], ['SF₆', { S: 1, F: 6 }], ['XeF₄', { Xe: 1, F: 4 }], ['C₂H₅OH', { C: 2, H: 6, O: 1 }], ['P₄O₁₀', { P: 4, O: 10 }], ['CrO₅', { Cr: 1, O: 5 }],
]
const MAXN = 64

function hash(i) {
  const x = Math.sin(i * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/** The flask: coloured bubbles for every atom added. */
function Flask({ flask, outcome }) {
  const atoms = useMemo(() => {
    const out = []
    for (const [s, n] of Object.entries(flask)) for (let i = 0; i < Math.min(n, 30); i++) out.push(s)
    return out.slice(0, 54)
  }, [flask])
  const formed = outcome?.type === 'compound' && outcome.results[0]?.complete
  return (
    <div className="relative mx-auto h-[190px] w-full max-w-[330px] overflow-hidden rounded-[26px_26px_60px_60px] border border-white/15 bg-gradient-to-b from-white/[0.03] to-accent/[0.10]" aria-label={`Flask with ${Object.values(flask).reduce((a, b) => a + b, 0)} atoms`}>
      {atoms.length === 0 && <p className="absolute inset-0 grid place-items-center px-8 text-center text-sm text-muted">The flask is empty. Add atoms from the tray below.</p>}
      {atoms.map((s, i) => {
        const e = bySymbol[s.toLowerCase()]
        const r = 15 + Math.min(10, (e?.z ?? 6) / 12)
        const x = 8 + hash(i + 1) * 84
        const y = 16 + hash(i + 77) * 70
        const col = atomColor(s)
        return (
          <span
            key={i}
            className="absolute grid place-items-center rounded-full text-[11px] font-bold shadow-md"
            style={{
              left: `${x}%`, top: `${y}%`, width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r, background: `radial-gradient(circle at 32% 30%, #ffffffaa, ${col} 55%)`, color: luminance(col) > 0.6 ? '#0d1020' : '#fff',
              '--dx': `${(hash(i + 5) - 0.5) * 12}px`, '--dy': `${(hash(i + 9) - 0.5) * 12}px`,
              animation: `bob ${2.4 + hash(i + 3) * 2}s ease-in-out ${hash(i) * 2}s infinite, settle .5s ${i * 0.025}s both`,
            }}
          >
            {s}
          </span>
        )
      })}
      {formed && <span className="absolute bottom-2 right-3 rounded-full bg-good/20 px-2 py-0.5 text-xs font-semibold text-good" style={{ animation: 'pop-in .3s both' }}>reacts completely</span>}
    </div>
  )
}

export function MixTools({ flask, setFlask, outcome }) {
  const total = Object.values(flask).reduce((a, b) => a + b, 0)
  const add = (s, n = 1) => setFlask((f) => (total + n > MAXN ? f : { ...f, [s]: (f[s] || 0) + n }))
  const set = (s, n) => setFlask((f) => {
    const nf = { ...f }
    if (n <= 0) delete nf[s]
    else nf[s] = Math.min(n, MAXN)
    return nf
  })
  return (
    <div className="space-y-4">
      <Flask flask={flask} outcome={outcome} />

      <div className="space-y-1.5">
        {Object.entries(flask).map(([s, n]) => {
          const e = bySymbol[s.toLowerCase()]
          return (
            <div key={s} className="flex items-center gap-2 rounded-xl bg-white/[0.045] py-1.5 pl-1.5 pr-1">
              <span className="grid size-9 place-items-center rounded-lg font-display font-bold" style={{ background: atomColor(s), color: luminance(atomColor(s)) > 0.6 ? '#0d1020' : '#fff' }}>{s}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{e?.name}</span>
              <button onClick={() => set(s, n - 1)} aria-label={`Remove one ${e?.name} atom`} className="grid size-8 place-items-center rounded-lg border border-white/10 hover:bg-white/10"><MinusIcon className="size-4" /></button>
              <input type="number" min={0} max={MAXN} value={n} onChange={(ev) => set(s, +ev.target.value || 0)} aria-label={`Number of ${e?.name} atoms`} className="h-8 w-12 rounded-lg border border-white/10 bg-ink-3 text-center text-sm font-semibold" />
              <button onClick={() => set(s, n + 1)} aria-label={`Add one ${e?.name} atom`} className="grid size-8 place-items-center rounded-lg border border-white/10 hover:bg-white/10"><PlusIcon className="size-4" /></button>
              <button onClick={() => set(s, 0)} aria-label={`Remove all ${e?.name}`} className="grid size-8 place-items-center rounded-lg text-muted hover:text-bad"><CloseIcon className="size-4" /></button>
            </div>
          )
        })}
        {total > 0 && (
          <button onClick={() => setFlask({})} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted transition hover:text-snow"><TrashIcon className="size-3.5" />Empty the flask</button>
        )}
      </div>

      <div>
        <div className="mb-1.5 text-sm font-semibold">Add atoms</div>
        <div className="flex flex-wrap gap-1.5">
          {TRAY.map((s) => (
            <button key={s} onClick={() => add(s)} title={bySymbol[s.toLowerCase()].name} className="grid h-9 min-w-9 place-items-center rounded-lg px-1.5 font-display text-sm font-bold transition hover:scale-110" style={{ background: atomColor(s), color: luminance(atomColor(s)) > 0.6 ? '#0d1020' : '#fff' }}>{s}</button>
          ))}
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm text-muted">
          Any element
          <select value="" onChange={(e) => e.target.value && add(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-ink-3 px-2.5 py-1.5 text-snow">
            <option value="">Choose…</option>
            {ELEMENTS.map((e) => <option key={e.z} value={e.symbol}>{e.z} · {e.name} ({e.symbol})</option>)}
          </select>
        </label>
      </div>

      <div>
        <div className="mb-1.5 text-sm font-semibold">Try an example</div>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map(([label, f]) => (
            <button key={label} onClick={() => setFlask(f)} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-display text-sm font-semibold text-accent transition hover:bg-white/10">{label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

const Chips = ({ items }) => (
  <span className="inline-flex flex-wrap gap-1">
    {items.map(([s, n]) => <span key={s} className="rounded-md bg-white/10 px-1.5 py-0.5 text-xs font-semibold">{n} {s}</span>)}
  </span>
)

export function MixResult({ flask, outcome, sel, setSel, form, setForm, setFlask }) {
  const total = Object.values(flask).reduce((a, b) => a + b, 0)
  const sugg = useMemo(() => (outcome?.type === 'compound' ? suggestions(flask) : []), [outcome, flask])

  if (!total) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-muted">
        <b className="text-snow">Mix atoms, get compounds.</b> Add atoms to the flask and the lab works out which compound they form, the balanced equation, and shows its real 3D structure. Try 2 H + 1 O, or 1 Xe + 4 F.
      </div>
    )
  }
  if (outcome.type === 'element') {
    return (
      <div className="space-y-2 rounded-2xl bg-white/[0.045] p-4 text-[15px]">
        <h3 className="font-display text-lg font-semibold">{bySymbol[outcome.sym.toLowerCase()].name} on its own</h3>
        {outcome.noble ? (
          <p>Noble gases have full outer shells, so {outcome.sym} does not combine with other atoms under ordinary conditions (only Kr, Xe and Rn form compounds with F or O). Add fluorine to {outcome.sym === 'Xe' ? 'see XeF₂, XeF₄ and XeF₆…' : 'try'}.</p>
        ) : outcome.forms.length ? (
          <>
            <p>Add a different element to make a compound. On its own {outcome.sym} exists as the structure{outcome.forms.length > 1 ? 's' : ''} below.</p>
            <div className="flex flex-wrap gap-1.5">
              {outcome.forms.map((f, i) => (
                <button key={f.id} onClick={() => setForm(i)} aria-pressed={form === i} className={`rounded-xl border px-3 py-1.5 text-sm transition ${form === i ? 'border-white/60 bg-white/15' : 'border-white/10 hover:bg-white/10'}`}>{f.name}</button>
              ))}
            </div>
          </>
        ) : <p>Add a different kind of atom to make a compound.</p>}
      </div>
    )
  }
  const r = outcome.results[sel] ?? outcome.results[0]
  const first = r && (r.source === 'library' ? MOL_BY_ID[r.ids[0]] : null)
  if (!r) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-white/[0.045] p-4">
          <h3 className="font-display text-lg font-semibold">No compound yet</h3>
          <p className="mt-1 text-[15px] text-muted">These atoms can’t make any compound in our library in these amounts.</p>
        </div>
        <Sugg sugg={sugg} setFlask={setFlask} />
      </div>
    )
  }
  const left = Object.entries(r.left)
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-accent/15 to-transparent p-4">
        <div className="text-xs text-muted">{r.source === 'predicted' ? 'Predicted ionic compound' : 'Compound formed'}</div>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3">
          <span className="font-display text-3xl font-bold">{r.units > 1 ? `${r.units} × ` : ''}{r.display}</span>
          <span className="text-[15px] text-muted">{first ? (r.ids.length > 1 ? `${r.ids.length} isomers` : first.name) : r.pr.name}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {r.complete ? (
            <span className="rounded-full bg-good/15 px-2.5 py-0.5 font-semibold text-good">All atoms used</span>
          ) : (
            <span className="text-muted">Left over: <Chips items={left} /> (not enough partners)</span>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white/[0.045] p-4">
        <div className="text-xs text-muted">Balanced equation (formation from the elements)</div>
        <div className="mt-1 font-display text-[19px] font-semibold leading-snug">{r.equation.text}</div>
      </div>

      {r.source === 'predicted' && (
        <div className="rounded-2xl bg-white/[0.045] p-4 text-[15px] leading-relaxed">
          <b>How we know:</b> {Object.keys(r.comp)[0]} usually forms <b>{Object.keys(r.comp)[0]}{String(r.pr.q).replace(/\d/, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}⁺</b> and {Object.keys(r.comp)[1]} forms <b>{Object.keys(r.comp)[1]}{'⁰¹²³⁴⁵⁶⁷⁸⁹'[r.pr.p]}⁻</b>; charges must cancel, so the ratio is {r.comp[Object.keys(r.comp)[0]]} : {r.comp[Object.keys(r.comp)[1]]}.
          {!r.model && <span className="mt-1 block text-sm text-muted">There is no simple lattice model for this compound in our library.</span>}
        </div>
      )}

      {r.ids?.length > 1 && (
        <div>
          <div className="mb-1.5 text-sm font-semibold">These atoms can arrange in {r.ids.length} ways (isomers). Pick one:</div>
          <div className="flex flex-wrap gap-1.5">
            {r.ids.map((id, i) => (
              <button key={id} onClick={() => setForm(i)} aria-pressed={form === i} className={`rounded-xl border px-3 py-1.5 text-sm transition ${form === i ? 'border-white/60 bg-white/15' : 'border-white/10 hover:bg-white/10'}`}>{MOL_BY_ID[id].name}</button>
            ))}
          </div>
        </div>
      )}

      {outcome.results.length > 1 && (
        <div>
          <div className="mb-1.5 text-sm font-semibold">Other products from these atoms</div>
          <div className="grid gap-1.5">
            {outcome.results.map((o, i) => i === sel ? null : (
              <button key={i} onClick={() => { setSel(i); setForm(0) }} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:bg-white/10">
                <span className="font-display text-lg font-semibold">{o.units > 1 ? `${o.units} × ` : ''}{o.display}</span>
                <span className="text-xs text-muted">{o.complete ? 'uses every atom' : `uses ${o.used} of ${total} atoms`}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {!r.complete && <Sugg sugg={sugg} setFlask={setFlask} />}
    </div>
  )
}

function Sugg({ sugg, setFlask }) {
  if (!sugg.length) return null
  return (
    <div>
      <div className="mb-1.5 text-sm font-semibold">Want a different compound? These need other amounts:</div>
      <div className="flex flex-wrap gap-1.5">
        {sugg.map((s) => (
          <button key={s.id} onClick={() => setFlask(s.comp)} title={`Set the flask to ${prettyFormula(s.comp)}`} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-left text-sm transition hover:bg-white/10">
            <span className="font-display font-semibold text-accent">{s.formula}</span> <span className="text-muted">{Object.entries(s.comp).map(([e, n]) => `${n}${e}`).join(' ')}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
