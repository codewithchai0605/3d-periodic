import { useMemo } from 'react'
import { MOL_BY_ID, MOLS, hill, keyMeasure, topicLabel, distance, angle, dihedral, prettyFormula } from '../lib/chem.js'
import { bySymbol } from '../data/elements.js'
import { CAT_BY_ID } from '../data/categories.js'
import { RulerIcon } from './Icons.jsx'

function Fact({ label, value, wide }) {
  if (value == null || value === '' || value === '—') return null
  return (
    <div className={`rounded-xl bg-white/[0.045] px-3 py-2 ${wide ? 'col-span-2' : ''}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-[15px] font-semibold leading-snug">{value}</div>
    </div>
  )
}

/** Live readout for the atoms the user has picked. */
export function measureText(mol, picks) {
  if (picks.length === 2) {
    const d = distance(mol, ...picks)
    return { title: `${mol.atoms[picks[0]][0]}–${mol.atoms[picks[1]][0]} distance`, value: `${(d * 100).toFixed(0)} pm`, sub: `${d.toFixed(3)} Å` }
  }
  if (picks.length === 3) {
    const a = angle(mol, ...picks)
    return { title: `${mol.atoms[picks[0]][0]}–${mol.atoms[picks[1]][0]}–${mol.atoms[picks[2]][0]} angle`, value: `${a.toFixed(1)}°` }
  }
  if (picks.length === 4) {
    const a = dihedral(mol, ...picks)
    return { title: 'Dihedral (torsion) angle', value: `${a.toFixed(1)}°` }
  }
  return null
}

export default function MolInfo({ mol, picks, setPicks, onPickMol, onOpenElement }) {
  const k = useMemo(() => keyMeasure(mol), [mol])
  const live = measureText(mol, picks)
  const related = useMemo(() => {
    if (mol.model || mol.kind === 'lattice') return []
    return MOLS.filter((m) => m.id !== mol.id && m.kind !== 'lattice' && hill(m.comp) === hill(mol.comp))
  }, [mol])
  const polar = mol.polar == null ? null : mol.polar ? `Polar${mol.dipole ? ` · μ ≈ ${mol.dipole} D` : ''}` : 'Non-polar'
  const elements = mol.elements ?? Object.keys(mol.comp ?? {})
  const charge = mol.charge ? `${Math.abs(mol.charge) > 1 ? Math.abs(mol.charge) : ''}${mol.charge > 0 ? '+' : '−'}` : null

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-display text-2xl font-bold leading-tight tracking-tight md:text-[28px]">{mol.name}</h2>
          {charge && <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-muted">ion · charge {charge}</span>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-display text-xl font-semibold text-accent">{mol.formula}</span>
          <span className="text-sm text-muted">{mol.model ? 'illustrative model' : topicLabel(mol.topic)}</span>
        </div>
      </div>

      {mol.facts ? (
        <dl className="grid grid-cols-2 gap-2">
          {Object.entries(mol.facts).map(([a, b]) => (
            <Fact key={a} label={a} value={b} wide={String(b).length > 26} />
          ))}
        </dl>
      ) : (
        <dl className="grid grid-cols-2 gap-2">
          <Fact label="Molecular shape" value={mol.shape} wide />
          <Fact label="Electron-pair geometry" value={mol.geom} />
          <Fact label="Hybridisation" value={mol.hybrid} />
          <Fact label="Bond angle" value={mol.angle} />
          <Fact label="Polarity" value={polar} />
          {mol.lone != null && <Fact label="Lone pairs on central atom" value={mol.lone} />}
          {mol.sigma != null && <Fact label="σ and π bonds" value={`${mol.sigma} σ + ${mol.pi} π`} />}
          {mol.cip && <Fact label="Chirality (CIP)" value={mol.cip} />}
        </dl>
      )}

      {(k || live) && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-muted"><RulerIcon className="size-3.5" />Measure</div>
              {live ? (
                <div className="mt-1">
                  <div className="text-sm text-muted">{live.title}</div>
                  <div className="font-display text-2xl font-bold text-[#ffd23f]">{live.value} {live.sub && <span className="text-sm font-normal text-muted">{live.sub}</span>}</div>
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted">Click atoms in the 3D view: two for a distance, three for an angle (the middle atom is the vertex).</p>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              {k && (
                <button onClick={() => setPicks(k.atoms)} className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs transition hover:bg-white/10">
                  Show {k.label}
                </button>
              )}
              {picks.length > 0 && <button onClick={() => setPicks([])} className="rounded-lg px-2.5 py-1 text-xs text-muted transition hover:text-snow">Clear</button>}
            </div>
          </div>
          {k && !live && <p className="mt-2 text-sm">Key value: <b>{k.label}</b> = <b className="text-[#ffd23f]">{k.value.toFixed(k.unit === '°' ? 1 : 0)}{k.unit}</b></p>}
        </div>
      )}

      {mol.notes?.length > 0 && (
        <div>
          <h3 className="mb-1.5 font-display text-[17px] font-semibold">Exam notes</h3>
          <ul className="space-y-2">
            {mol.notes.map((n, i) => (
              <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {elements.length > 0 && (
        <div>
          <h3 className="mb-1.5 font-display text-[17px] font-semibold">Elements in it</h3>
          <div className="flex flex-wrap gap-1.5">
            {elements.map((s) => {
              const e = bySymbol[s.toLowerCase()]
              if (!e) return null
              return (
                <button key={s} onClick={() => onOpenElement(e.z)} title={`Open ${e.name} in the periodic table`} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-sm transition hover:bg-white/10">
                  <span className="grid size-7 place-items-center rounded-lg font-display text-sm font-bold text-ink" style={{ background: CAT_BY_ID[e.category].color }}>{e.symbol}</span>
                  {e.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div>
          <h3 className="mb-1 font-display text-[17px] font-semibold">Same formula, different structure</h3>
          <p className="mb-1.5 text-sm text-muted">{prettyFormula(mol.comp)} — isomers or conformations of the same composition:</p>
          <div className="flex flex-wrap gap-1.5">
            {related.map((m) => (
              <button key={m.id} onClick={() => onPickMol(m.id)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-left text-sm transition hover:bg-white/10">{m.name}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export const molById = (id) => MOL_BY_ID[id]
