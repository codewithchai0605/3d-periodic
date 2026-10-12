import { useMemo, useState } from 'react'
import { MOLS, TOPICS, searchMolecules } from '../lib/chem.js'
import { SearchIcon, CloseIcon } from './Icons.jsx'

/** VSEPR cheat sheet: every row opens an example in the viewer. */
const VSEPR = [
  [2, 0, 'Linear', 'sp', 180, 'becl2'], [3, 0, 'Trigonal planar', 'sp²', 120, 'bf3'], [2, 1, 'Bent', 'sp²', '<120', 'so2'],
  [4, 0, 'Tetrahedral', 'sp³', 109.5, 'ch4'], [3, 1, 'Trigonal pyramidal', 'sp³', '<109.5', 'nh3'], [2, 2, 'Bent', 'sp³', '<109.5', 'h2o'],
  [5, 0, 'Trigonal bipyramidal', 'sp³d', '90, 120', 'pcl5'], [4, 1, 'See-saw', 'sp³d', '≈173, 102', 'sf4'], [3, 2, 'T-shaped', 'sp³d', '≈87.5', 'clf3'], [2, 3, 'Linear', 'sp³d', 180, 'xef2'],
  [6, 0, 'Octahedral', 'sp³d²', 90, 'sf6'], [5, 1, 'Square pyramidal', 'sp³d²', '≈85–90', 'brf5'], [4, 2, 'Square planar', 'sp³d²', 90, 'xef4'],
  [7, 0, 'Pentagonal bipyramidal', 'sp³d³', '72, 90', 'if7'],
]

function Cheat({ onPick, current }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-white/[0.06] text-xs text-muted">
          <tr><th className="px-2 py-1.5 font-medium">BP</th><th className="px-1 py-1.5 font-medium">LP</th><th className="px-2 py-1.5 font-medium">Shape</th><th className="px-1 py-1.5 font-medium">Hyb.</th><th className="px-1 py-1.5 font-medium">Example</th></tr>
        </thead>
        <tbody>
          {VSEPR.map(([bp, lp, shape, hyb, , id]) => {
            const m = MOLS.find((x) => x.id === id)
            return (
              <tr key={id} className={`cursor-pointer border-t border-white/5 transition hover:bg-white/[0.08] ${current === id ? 'bg-accent/15' : ''}`} onClick={() => onPick(id)}>
                <td className="px-2 py-1.5 font-semibold">{bp}</td>
                <td className="px-1 py-1.5">{lp}</td>
                <td className="px-2 py-1.5">{shape}</td>
                <td className="px-1 py-1.5 text-muted">{hyb}</td>
                <td className="px-1 py-1.5 font-display font-semibold text-accent">{m?.formula}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="border-t border-white/5 bg-white/[0.03] px-2.5 py-1.5 text-xs text-muted">BP = bond pairs, LP = lone pairs on the central atom. Select a row to see it in 3D.</p>
    </div>
  )
}

export default function LabStructures({ molId, onPick }) {
  const [q, setQ] = useState('')
  const [topic, setTopic] = useState('all')
  const [cheat, setCheat] = useState(false)

  const list = useMemo(() => {
    const base = q.trim() ? searchMolecules(q) : MOLS
    return topic === 'all' ? base : base.filter((m) => m.topic === topic)
  }, [q, topic])
  const groups = useMemo(() => {
    if (q.trim()) return [{ id: 'results', label: `${list.length} result${list.length === 1 ? '' : 's'}`, items: list }]
    return TOPICS.map((t) => ({ ...t, items: list.filter((m) => m.topic === t.id) })).filter((g) => g.items.length)
  }, [list, q])

  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="H2O, XeF4, benzene, tetrahedral…" aria-label="Search structures" className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.05] pl-10 pr-9 text-[15px] placeholder:text-muted/80" spellCheck={false} autoComplete="off" />
        {q && <button onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-white/10"><CloseIcon className="size-4" /></button>}
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scroll-thin" role="group" aria-label="Topic">
        {[{ id: 'all', label: 'All' }, ...TOPICS].map((t) => (
          <button key={t.id} onClick={() => setTopic(t.id)} aria-pressed={topic === t.id} className={`shrink-0 rounded-full border px-3 py-1 text-[13px] transition ${topic === t.id ? 'border-white/60 bg-white/15' : 'border-white/10 text-muted hover:text-snow'}`}>
            {t.label.replace(/ \(.*\)/, '')}
          </button>
        ))}
      </div>

      {(topic === 'vsepr' || topic === 'all') && !q && (
        <div>
          <button onClick={() => setCheat(!cheat)} aria-expanded={cheat} className="flex w-full items-center justify-between rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-left text-sm font-medium transition hover:bg-accent/20">
            VSEPR cheat sheet (shape · hybridisation)
            <span className="text-muted">{cheat ? 'Hide' : 'Show'}</span>
          </button>
          {cheat && <div className="mt-2" style={{ animation: 'fade-in .2s both' }}><Cheat onPick={onPick} current={molId} /></div>}
        </div>
      )}

      {groups.map((g) => (
        <section key={g.id}>
          <h3 className="mb-1.5 mt-2 text-xs font-semibold uppercase tracking-wide text-muted/90">{g.label}</h3>
          <ul className="grid grid-cols-1 gap-1">
            {g.items.map((m) => (
              <li key={m.id}>
                <button onClick={() => onPick(m.id)} aria-current={molId === m.id} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${molId === m.id ? 'bg-accent/20 ring-1 ring-accent/50' : 'hover:bg-white/[0.07]'}`}>
                  <span className="w-[5.2rem] shrink-0 truncate font-display text-[15px] font-semibold text-accent" title={m.formula}>{m.formula}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!list.length && <p className="rounded-xl bg-white/[0.04] p-3 text-sm text-muted">Nothing matches “{q}”. Try a formula (CO2), a name, a shape (octahedral) or a topic word (isomer, chair, sp3d).</p>}
    </div>
  )
}
